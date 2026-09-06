// Command server is the small first-party backend for comics-komga-frontend.
// It replaces the previous Caddy configuration with a few hundred lines of
// dependency-free Go:
//
//   - a single-password login (no user management) that sets a signed,
//     HttpOnly session cookie. Everything except /healthz and /login is
//     gated behind it — including the /komga/* proxy, which is the point:
//     protecting only the SPA would leave the data route wide open.
//   - static SPA serving from SRV_DIR with a client-side-routing fallback.
//   - a reverse proxy from /komga/* to the upstream Komga server that injects
//     the X-API-Key server-side, so the key never reaches the browser.
//
// Configuration is entirely via environment variables:
//
//	APP_PASSWORD     required — the instance password (the only credential)
//	KOMGA_BASE_URL   required — upstream Komga origin, scheme included
//	KOMGA_API_KEY    required — Komga API key, injected on proxied requests
//	ADDR             listen address (default ":80")
//	SRV_DIR          directory holding the built SPA (default "/srv")
//	SESSION_MAX_AGE  session cookie lifetime as a Go duration (default 720h)
//
// Security posture, stated plainly: one shared password, stateless signed
// cookies (a stolen cookie is replayable until it expires — same tradeoff as
// the Caddy basic-auth this replaces, minus the browser popup), constant-time
// credential comparison, and an in-memory failed-attempt limit on /login.
// Changing APP_PASSWORD invalidates all outstanding sessions (the cookie
// signing key is derived from the password). This is a fence for a private,
// self-hosted instance — not multi-user auth.
package main

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	_ "embed"
	"encoding/hex"
	"errors"
	"fmt"
	"html/template"
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/signal"
	"path"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
)

const (
	cookieName  = "ckf_session"
	proxyPrefix = "/komga"

	// Login rate limiting: after maxLoginFails failed attempts from one
	// client within loginWindow, further wrong-password attempts answer 429
	// until the window expires (a correct password always gets through).
	// State is in-memory and resets on restart — acceptable for a
	// single-user, self-hosted instance.
	maxLoginFails = 5
	loginWindow   = 10 * time.Minute
)

//go:embed login.html
var loginHTML string

type config struct {
	addr       string
	srvDir     string
	password   string
	komgaURL   *url.URL
	komgaKey   string
	sessionKey []byte // HMAC key for session cookies, derived from the password
	maxAge     time.Duration
}

func loadConfig() (config, error) {
	var cfg config
	var err error

	if cfg.addr = os.Getenv("ADDR"); cfg.addr == "" {
		cfg.addr = ":80"
	}
	if cfg.srvDir = os.Getenv("SRV_DIR"); cfg.srvDir == "" {
		cfg.srvDir = "/srv"
	}
	if cfg.password = os.Getenv("APP_PASSWORD"); cfg.password == "" {
		return cfg, fmt.Errorf("APP_PASSWORD is required (the instance password)")
	}

	rawBase := os.Getenv("KOMGA_BASE_URL")
	if rawBase == "" {
		return cfg, fmt.Errorf("KOMGA_BASE_URL is required (upstream Komga origin, e.g. https://komga.example.com)")
	}
	cfg.komgaURL, err = url.Parse(rawBase)
	if err != nil || cfg.komgaURL.Scheme == "" || cfg.komgaURL.Host == "" {
		return cfg, fmt.Errorf("KOMGA_BASE_URL must be a URL with scheme and host, got %q", rawBase)
	}

	if cfg.komgaKey = os.Getenv("KOMGA_API_KEY"); cfg.komgaKey == "" {
		return cfg, fmt.Errorf("KOMGA_API_KEY is required")
	}

	cfg.maxAge = 30 * 24 * time.Hour
	if v := os.Getenv("SESSION_MAX_AGE"); v != "" {
		d, derr := time.ParseDuration(v)
		if derr != nil || d <= 0 {
			return cfg, fmt.Errorf("SESSION_MAX_AGE must be a positive Go duration (e.g. 720h for 30 days), got %q", v)
		}
		cfg.maxAge = d
	}

	cfg.sessionKey = sessionKeyFor(cfg.password)
	return cfg, nil
}

// sessionKeyFor derives the cookie-signing key from the instance password, so
// rotating the password also invalidates every outstanding session and no
// second secret needs to be managed.
func sessionKeyFor(password string) []byte {
	sum := sha256.Sum256([]byte("comics-komga-frontend/session/v1\x00" + password))
	return sum[:]
}

type failBucket struct {
	count int
	start time.Time // first failure in the current window
}

type server struct {
	cfg   config
	proxy *httputil.ReverseProxy
	files http.Handler
	login *template.Template
	mu    sync.Mutex
	fails map[string]*failBucket // keyed by client IP
}

func newServer(cfg config) *server {
	upstream := *cfg.komgaURL // copy — the Rewrite func closes over it
	return &server{
		cfg: cfg,
		proxy: &httputil.ReverseProxy{
			Rewrite: func(pr *httputil.ProxyRequest) {
				// Route to the upstream origin: /komga/api/v1/x → /api/v1/x,
				// query string preserved. SetURL also rewrites the outbound
				// Host header to the upstream's host — the same behavior as
				// the previous Caddy config's `header_up Host {upstream_hostport}`.
				pr.SetURL(&upstream)
				pr.Out.URL.Path = strings.TrimPrefix(pr.Out.URL.Path, proxyPrefix)
				if pr.Out.URL.Path == "" {
					pr.Out.URL.Path = "/"
				}
				// Inject the API key server-side, and drop any inbound
				// Authorization header so edge basic-auth credentials are not
				// mistaken for Komga credentials (Komga would otherwise try
				// to authenticate them as a user and 401, ignoring the key).
				pr.Out.Header.Set("X-API-Key", cfg.komgaKey)
				pr.Out.Header.Del("Authorization")
				pr.SetXForwarded()
			},
			FlushInterval: -1, // stream responses (covers, downloads) immediately
			ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
				log.Printf("proxy error: %s %s: %v", r.Method, r.URL.Path, err)
				http.Error(w, "bad gateway", http.StatusBadGateway)
			},
		},
		files: spaHandler(cfg.srvDir),
		login: template.Must(template.New("login").Parse(loginHTML)),
		fails: make(map[string]*failBucket),
	}
}

func (s *server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Applies to everything we emit, including proxied responses.
	w.Header().Set("X-Content-Type-Options", "nosniff")

	switch {
	case r.URL.Path == "/healthz":
		// Cheap liveness endpoint — answers without touching Komga, so a
		// Komga outage doesn't fail container health checks.
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	case r.URL.Path == "/login":
		s.handleLogin(w, r)
	case r.URL.Path == "/logout":
		s.handleLogout(w, r)
	case r.URL.Path == "/auth/check":
		s.handleAuthCheck(w, r)
	case r.URL.Path == proxyPrefix || strings.HasPrefix(r.URL.Path, proxyPrefix+"/"):
		// The data route. Never redirect an API/thumbnail request to an HTML
		// login page — fail it with a plain 401.
		if !s.authenticated(r) {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		s.proxy.ServeHTTP(w, r)
	default:
		if !s.authenticated(r) {
			s.redirectToLogin(w, r)
			return
		}
		s.files.ServeHTTP(w, r)
	}
}

// redirectToLogin sends HTML navigations to the login page (remembering where
// they were headed), and bare 401s to everything else — fetch() and <img>
// requests should fail visibly, not follow a 302 into an HTML page.
func (s *server) redirectToLogin(w http.ResponseWriter, r *http.Request) {
	if strings.Contains(r.Header.Get("Accept"), "text/html") {
		target := "/login"
		if next := r.URL.RequestURI(); validNext(next) {
			target += "?next=" + url.QueryEscape(next)
		}
		http.Redirect(w, r, target, http.StatusFound)
		return
	}
	http.Error(w, "unauthorized", http.StatusUnauthorized)
}

// authenticated verifies the stateless session cookie:
//
//	"<expiry-unix>.<nonce-hex>.<hmac-hex>"
//
// signed with a key derived from the instance password. There is no
// server-side session store; a cookie is replayable until it expires, which
// is the standard tradeoff for signed-cookie auth without a database.
func (s *server) authenticated(r *http.Request) bool {
	_, ok := s.session(r)
	return ok
}

// session verifies the session cookie (see authenticated) and returns the
// expiry instant it asserts, so /auth/check can tell the SPA how long the
// session is good for.
func (s *server) session(r *http.Request) (exp int64, ok bool) {
	c, err := r.Cookie(cookieName)
	if err != nil || c.Value == "" {
		return 0, false
	}
	parts := strings.Split(c.Value, ".")
	if len(parts) != 3 {
		return 0, false
	}
	exp, err = strconv.ParseInt(parts[0], 10, 64)
	if err != nil || time.Now().Unix() > exp {
		return 0, false
	}
	want := signSession(s.cfg.sessionKey, parts[0]+"."+parts[1])
	// Fixed-size hex digests on both sides, so the compare leaks nothing.
	if subtle.ConstantTimeCompare([]byte(want), []byte(parts[2])) != 1 {
		return 0, false
	}
	return exp, true
}

// handleAuthCheck answers the SPA's "is my session still valid?" probe. It
// never redirects: 200 with the session's expiry when the cookie verifies,
// 401 when it doesn't. The frontend uses this to tell an expired instance
// session (→ bounce to /login and come back via ?next=) apart from a
// Komga-side rejection (surface the error — the session isn't the problem).
// No Komga round-trip is involved.
func (s *server) handleAuthCheck(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", "GET")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	exp, ok := s.session(r)
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte("{\"authenticated\":false}\n"))
		return
	}
	fmt.Fprintf(w, "{\"authenticated\":true,\"expiresAt\":%d}\n", exp)
}

func signSession(key []byte, payload string) string {
	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(payload))
	return hex.EncodeToString(mac.Sum(nil))
}

// issueSession sets the signed session cookie. Secure is only set when the
// request arrived over TLS (directly or via an edge that sets
// X-Forwarded-Proto), so a plain-HTTP session — e.g. localhost — still
// receives the cookie.
func (s *server) issueSession(w http.ResponseWriter, r *http.Request) {
	exp := time.Now().Add(s.cfg.maxAge)
	nonce := make([]byte, 16)
	if _, err := rand.Read(nonce); err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	payload := fmt.Sprintf("%d.%s", exp.Unix(), hex.EncodeToString(nonce))
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    payload + "." + signSession(s.cfg.sessionKey, payload),
		Path:     "/",
		MaxAge:   int(s.cfg.maxAge.Seconds()),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   requestIsTLS(r),
	})
}

func requestIsTLS(r *http.Request) bool {
	return r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https"
}

type loginData struct {
	Error bool
	Next  string
}

func (s *server) handleLogin(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		var data loginData
		if n := r.URL.Query().Get("next"); validNext(n) {
			data.Next = n
		}
		s.renderLogin(w, data, http.StatusOK)
	case http.MethodPost:
		s.handleLoginPost(w, r)
	default:
		w.Header().Set("Allow", "GET, POST")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *server) handleLoginPost(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 8<<10)
	if err := r.ParseForm(); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	next := r.PostFormValue("next")
	if !validNext(next) {
		next = ""
	}

	// Length-independent constant-time comparison (both sides hashed first).
	// The rate limit gates only wrong passwords: a legitimate user who
	// mistyped five times can still sign in with the right one, while a
	// guessing attacker gets 429s until the window expires.
	if !secureEqual(r.PostFormValue("password"), s.cfg.password) {
		s.recordLoginFail(r)
		if wait, ok := s.loginBlocked(r); !ok {
			w.Header().Set("Retry-After", strconv.Itoa(int(wait.Seconds())))
			http.Error(w, "too many failed attempts — try again later", http.StatusTooManyRequests)
			return
		}
		s.renderLogin(w, loginData{Error: true, Next: next}, http.StatusUnauthorized)
		return
	}

	s.clearLoginFails(r)
	s.issueSession(w, r)
	target := "/"
	if next != "" {
		target = next
	}
	http.Redirect(w, r, target, http.StatusSeeOther)
}

func (s *server) renderLogin(w http.ResponseWriter, data loginData, status int) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	// The page is inline HTML with one inline stylesheet and no scripts.
	w.Header().Set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'")
	w.WriteHeader(status)
	if err := s.login.Execute(w, data); err != nil {
		log.Printf("login template: %v", err)
	}
}

// handleLogout clears the session cookie and returns to the login page. GET is
// allowed so /logout can be linked and bookmarked without JS; the worst a
// cross-site GET can do is log you out.
func (s *server) handleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodPost {
		w.Header().Set("Allow", "GET, POST")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1, // delete now
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   requestIsTLS(r),
	})
	http.Redirect(w, r, "/login", http.StatusSeeOther)
}

// validNext accepts only same-origin relative redirect targets: a path
// starting with a single "/" (never "//", which browsers treat as
// protocol-relative), no scheme or authority, no control characters that
// could split the Location header, and never /login or /logout themselves.
func validNext(next string) bool {
	if next == "" || len(next) > 512 {
		return false
	}
	if !strings.HasPrefix(next, "/") || strings.HasPrefix(next, "//") {
		return false
	}
	if strings.ContainsAny(next, "\r\n") {
		return false
	}
	if next == "/login" || next == "/logout" {
		return false
	}
	u, err := url.Parse(next)
	return err == nil && u.Scheme == "" && u.Host == ""
}

// secureEqual compares two strings in constant time, independent of length:
// both sides are hashed to fixed-size digests first. An empty candidate never
// matches — an absent credential is not a credential.
func secureEqual(a, b string) bool {
	if a == "" || b == "" {
		return false
	}
	ha := sha256.Sum256([]byte(a))
	hb := sha256.Sum256([]byte(b))
	return subtle.ConstantTimeCompare(ha[:], hb[:]) == 1
}

// loginBlocked reports whether further wrong-password attempts from this
// client are throttled. It is consulted after a failed attempt is recorded,
// so the first maxLoginFails failures each get the normal error page and the
// limit only kicks in from failure maxLoginFails+1 onward. Buckets are keyed
// by client IP (first X-Forwarded-For entry, else the remote address) and
// reset after loginWindow without failures. XFF is trusted here because the
// container runs behind the operator's own edge proxy — which means a client
// that controls its XFF header can rotate buckets; at homelab scale that is
// an acceptable tradeoff against real proxy trust chains.
func (s *server) loginBlocked(r *http.Request) (time.Duration, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.maybeGC()
	b, ok := s.fails[clientIP(r)]
	if !ok || time.Since(b.start) > loginWindow || b.count <= maxLoginFails {
		return 0, true
	}
	wait := loginWindow - time.Since(b.start)
	if wait < 0 {
		wait = 0
	}
	return wait, false
}

func (s *server) recordLoginFail(r *http.Request) {
	s.mu.Lock()
	defer s.mu.Unlock()
	ip := clientIP(r)
	if b, ok := s.fails[ip]; ok && time.Since(b.start) <= loginWindow {
		b.count++
		return
	}
	s.fails[ip] = &failBucket{count: 1, start: time.Now()}
}

func (s *server) clearLoginFails(r *http.Request) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.fails, clientIP(r))
}

// maybeGC drops expired buckets so scan traffic can't grow the map without
// bound. Called with s.mu held.
func (s *server) maybeGC() {
	if len(s.fails) < 1024 {
		return
	}
	for ip, b := range s.fails {
		if time.Since(b.start) > loginWindow {
			delete(s.fails, ip)
		}
	}
}

func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		if i := strings.IndexByte(xff, ','); i >= 0 {
			xff = xff[:i]
		}
		if ip := strings.TrimSpace(xff); ip != "" {
			return ip
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// spaHandler serves the built SPA from dir. Any request that doesn't map to a
// real file falls back to index.html — the client-side router owns the path.
// Hashed Vite assets under /assets/ get long-lived immutable caching.
func spaHandler(dir string) http.Handler {
	root := http.Dir(dir)
	fileServer := http.FileServer(root)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		p := path.Clean("/" + r.URL.Path)
		f, err := root.Open(p)
		if err != nil {
			http.ServeFile(w, r, filepath.Join(dir, "index.html"))
			return
		}
		st, statErr := f.Stat()
		_ = f.Close()
		if statErr != nil || st.IsDir() {
			http.ServeFile(w, r, filepath.Join(dir, "index.html"))
			return
		}
		if strings.HasPrefix(p, "/assets/") {
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		}
		fileServer.ServeHTTP(w, r)
	})
}

func main() {
	cfg, err := loadConfig()
	if err != nil {
		log.Fatalf("server: %v", err)
	}
	if _, err := os.Stat(filepath.Join(cfg.srvDir, "index.html")); err != nil {
		log.Printf("warning: no index.html in SRV_DIR %q — the SPA will 404 until it is built there", cfg.srvDir)
	}

	srv := &http.Server{
		Addr:              cfg.addr,
		Handler:           newServer(cfg),
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       2 * time.Minute,
		// No WriteTimeout: proxied responses (full-book downloads) may
		// legitimately take longer than any fixed cap.
	}

	// Graceful shutdown so a deploy (the old container is removed once the
	// new one is healthy) doesn't cut in-flight requests.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdownCtx)
	}()

	log.Printf("server: listening on %s — serving %s, proxying %s/* → %s", cfg.addr, cfg.srvDir, proxyPrefix, cfg.komgaURL)
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("server: %v", err)
	}
}
