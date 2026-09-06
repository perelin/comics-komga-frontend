package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// newTestServer wires a server against a fake Komga upstream that echoes the
// pieces the proxy is supposed to control (path, query, API key, Authorization)
// into response headers, plus a throwaway SPA directory. Both are cleaned up
// with the test.
func newTestServer(t *testing.T) (*server, *httptest.Server) {
	t.Helper()

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("Echo-Path", r.URL.Path)
		h.Set("Echo-Query", r.URL.RawQuery)
		h.Set("Echo-Method", r.Method)
		h.Set("Echo-Api-Key", r.Header.Get("X-API-Key"))
		h.Set("Echo-Authorization", r.Header.Get("Authorization"))
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("upstream-body"))
	}))
	t.Cleanup(upstream.Close)

	upstreamURL, err := url.Parse(upstream.URL)
	if err != nil {
		t.Fatalf("parse upstream URL: %v", err)
	}

	cfg := config{
		srvDir:     spaDir(t),
		password:   "hunter2",
		komgaURL:   upstreamURL,
		komgaKey:   "test-key",
		sessionKey: sessionKeyFor("hunter2"),
		maxAge:     time.Hour,
	}
	return newServer(cfg), upstream
}

func spaDir(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	writeFile(t, filepath.Join(dir, "index.html"), "<!doctype html><title>spa</title>")
	if err := os.MkdirAll(filepath.Join(dir, "assets"), 0o755); err != nil {
		t.Fatal(err)
	}
	writeFile(t, filepath.Join(dir, "assets", "app-abc123.js"), "console.log(1)")
	return dir
}

func writeFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}

// The helper below exists so every test reads the same way: build a request,
// run it through the full handler chain, hand back the recorder.
func request(s *server, method, target string, headers map[string]string, cookie string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, target, nil)
	if cookie != "" {
		req.AddCookie(&http.Cookie{Name: cookieName, Value: cookie})
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	rec := httptest.NewRecorder()
	s.ServeHTTP(rec, req)
	return rec
}

// login performs a real POST /login and returns the response (for cookie
// extraction) so tests exercise the same path a browser would.
func login(t *testing.T, s *server, password, next string) *httptest.ResponseRecorder {
	t.Helper()
	form := url.Values{"password": {password}}
	if next != "" {
		form.Set("next", next)
	}
	req := httptest.NewRequest(http.MethodPost, "/login", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	rec := httptest.NewRecorder()
	s.ServeHTTP(rec, req)
	return rec
}

// sessionCookieOf returns the ckf_session cookie value set by a login.
func sessionCookieOf(t *testing.T, rec *httptest.ResponseRecorder) string {
	t.Helper()
	for _, c := range rec.Result().Cookies() {
		if c.Name == cookieName {
			return c.Value
		}
	}
	t.Fatal("no session cookie set on login response")
	return ""
}

func TestHealthzIsOpen(t *testing.T) {
	s, _ := newTestServer(t)
	rec := request(s, http.MethodGet, "/healthz", nil, "")
	if rec.Code != http.StatusOK || rec.Body.String() != "ok" {
		t.Fatalf("/healthz = %d %q, want 200 ok", rec.Code, rec.Body.String())
	}
}

func TestUnauthenticatedSPARouteRedirectsToLogin(t *testing.T) {
	s, _ := newTestServer(t)
	rec := request(s, http.MethodGet, "/series/some-slug?tab=metadata", map[string]string{"Accept": "text/html"}, "")
	if rec.Code != http.StatusFound {
		t.Fatalf("GET / unauthenticated = %d, want 302", rec.Code)
	}
	loc := rec.Header().Get("Location")
	if !strings.HasPrefix(loc, "/login?next=") {
		t.Fatalf("Location = %q, want a /login?next=… redirect", loc)
	}
	if next, err := url.QueryUnescape(strings.TrimPrefix(loc, "/login?next=")); err != nil || next != "/series/some-slug?tab=metadata" {
		t.Fatalf("next = %q (err %v), want the original request URI", next, err)
	}
}

func TestUnauthenticatedKomgaRequestIsPlain401(t *testing.T) {
	s, _ := newTestServer(t)
	// <img>-style request: no text/html in Accept — must not redirect.
	rec := request(s, http.MethodGet, "/komga/api/v1/series/1/thumbnail", map[string]string{"Accept": "image/*"}, "")
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("GET /komga/* unauthenticated = %d, want 401", rec.Code)
	}
}

func TestLoginWrongPassword(t *testing.T) {
	s, _ := newTestServer(t)
	rec := login(t, s, "wrong", "")
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("bad login = %d, want 401", rec.Code)
	}
	if n := len(rec.Result().Cookies()); n != 0 {
		t.Fatalf("bad login set %d cookies, want none", n)
	}
	if !strings.Contains(rec.Body.String(), "Wrong password") {
		t.Fatal("bad login page does not show the error message")
	}
}

func TestLoginSuccessSetsCookieAndRedirects(t *testing.T) {
	s, _ := newTestServer(t)
	rec := login(t, s, "hunter2", "/series/some-slug")
	if rec.Code != http.StatusSeeOther {
		t.Fatalf("good login = %d, want 303", rec.Code)
	}
	if loc := rec.Header().Get("Location"); loc != "/series/some-slug" {
		t.Fatalf("Location = %q, want /series/some-slug", loc)
	}
	c := rec.Result().Cookies()
	if len(c) != 1 || c[0].Name != cookieName {
		t.Fatalf("cookies = %+v, want exactly one %s", c, cookieName)
	}
	sc := c[0]
	if !sc.HttpOnly || sc.SameSite != http.SameSiteLaxMode {
		t.Fatalf("session cookie flags wrong: %+v (want HttpOnly, SameSite=Lax)", sc)
	}
	if sc.Secure {
		t.Fatal("session cookie must not be Secure on a plain-HTTP request (breaks localhost)")
	}
}

func TestAuthenticatedRequestServesSPA(t *testing.T) {
	s, _ := newTestServer(t)
	cookie := sessionCookieOf(t, login(t, s, "hunter2", ""))
	rec := request(s, http.MethodGet, "/series/some-slug", map[string]string{"Accept": "text/html"}, cookie)
	if rec.Code != http.StatusOK {
		t.Fatalf("authenticated GET /series/… = %d, want 200 (SPA fallback)", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "<title>spa</title>") {
		t.Fatal("SPA fallback did not serve index.html")
	}
}

func TestViteAssetsGetImmutableCacheHeaders(t *testing.T) {
	s, _ := newTestServer(t)
	cookie := sessionCookieOf(t, login(t, s, "hunter2", ""))
	rec := request(s, http.MethodGet, "/assets/app-abc123.js", nil, cookie)
	if rec.Code != http.StatusOK {
		t.Fatalf("GET /assets/… = %d, want 200", rec.Code)
	}
	if cc := rec.Header().Get("Cache-Control"); !strings.Contains(cc, "immutable") {
		t.Fatalf("Cache-Control = %q, want immutable", cc)
	}
}

func TestProxyStripsPrefixInjectsKeyDropsAuth(t *testing.T) {
	s, _ := newTestServer(t)
	cookie := sessionCookieOf(t, login(t, s, "hunter2", ""))
	rec := request(s, http.MethodGet, "/komga/api/v1/libraries?page=2",
		map[string]string{"Authorization": "Bearer leaked-edge-credentials"}, cookie)
	if rec.Code != http.StatusOK {
		t.Fatalf("proxied GET = %d, want 200", rec.Code)
	}
	h := rec.Header()
	if got := h.Get("Echo-Path"); got != "/api/v1/libraries" {
		t.Fatalf("upstream saw path %q, want /api/v1/libraries", got)
	}
	if got := h.Get("Echo-Query"); got != "page=2" {
		t.Fatalf("upstream saw query %q, want page=2", got)
	}
	if got := h.Get("Echo-Api-Key"); got != "test-key" {
		t.Fatalf("upstream saw API key %q, want test-key", got)
	}
	if got := h.Get("Echo-Authorization"); got != "" {
		t.Fatalf("upstream saw Authorization %q, want it stripped", got)
	}
}

func TestProxyForwardsNonGETMethods(t *testing.T) {
	s, _ := newTestServer(t)
	cookie := sessionCookieOf(t, login(t, s, "hunter2", ""))
	rec := request(s, http.MethodPost, "/komga/api/v1/readlists", nil, cookie)
	if rec.Code != http.StatusOK || rec.Header().Get("Echo-Method") != http.MethodPost {
		t.Fatalf("proxied POST = %d method %q, want 200 POST", rec.Code, rec.Header().Get("Echo-Method"))
	}
}

func TestTamperedCookieRejected(t *testing.T) {
	s, _ := newTestServer(t)
	valid := sessionCookieOf(t, login(t, s, "hunter2", ""))
	for _, tampered := range []string{
		valid + "x",                                  // signature extended
		strings.Replace(valid, ".", ".0", 1),         // payload edited
		"9999999999.deadbeef." + valid,               // wrong expiry format
		valid[:strings.LastIndex(valid, ".")] + ".0", // signature replaced
	} {
		rec := request(s, http.MethodGet, "/", map[string]string{"Accept": "text/html"}, tampered)
		if rec.Code != http.StatusFound {
			t.Fatalf("tampered cookie %q → %d, want 302 redirect to login", tampered, rec.Code)
		}
	}
}

func TestExpiredCookieRejected(t *testing.T) {
	s, _ := newTestServer(t)
	payload := "1.deadbeef" // expiry in 1970, validly signed with the same key
	cookie := payload + "." + signSession(s.cfg.sessionKey, payload)
	rec := request(s, http.MethodGet, "/", map[string]string{"Accept": "text/html"}, cookie)
	if rec.Code != http.StatusFound {
		t.Fatalf("expired cookie → %d, want 302 redirect to login", rec.Code)
	}
}

func TestLogoutClearsCookieAndRedirects(t *testing.T) {
	s, _ := newTestServer(t)
	rec := request(s, http.MethodGet, "/logout", map[string]string{"Accept": "text/html"}, "")
	if rec.Code != http.StatusSeeOther || rec.Header().Get("Location") != "/login" {
		t.Fatalf("GET /logout = %d %q, want 303 /login", rec.Code, rec.Header().Get("Location"))
	}
	cleared := false
	for _, c := range rec.Result().Cookies() {
		if c.Name == cookieName && c.MaxAge < 0 {
			cleared = true
		}
	}
	if !cleared {
		t.Fatal("/logout did not send a deleting session cookie")
	}
}

func TestNextRedirectTargetIsValidated(t *testing.T) {
	s, _ := newTestServer(t)
	for _, next := range []string{"//evil.com", "https://evil.com", "/login", "/logout", "/x\r\nSet-Cookie: pwned=1"} {
		rec := login(t, s, "hunter2", next)
		if rec.Code != http.StatusSeeOther {
			t.Fatalf("login with next=%q = %d, want 303", next, rec.Code)
		}
		if loc := rec.Header().Get("Location"); loc != "/" {
			t.Fatalf("login with next=%q redirected to %q, want /", next, loc)
		}
	}
}

func TestLoginRateLimitAfterRepeatedFailures(t *testing.T) {
	s, _ := newTestServer(t)
	browser := map[string]string{"X-Forwarded-For": "203.0.113.7"}
	for i := 0; i < maxLoginFails; i++ {
		rec := request(s, http.MethodPost, "/login", browser, "")
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("failed login #%d = %d, want 401", i+1, rec.Code)
		}
	}
	rec := request(s, http.MethodPost, "/login", browser, "")
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("login after %d failures = %d, want 429", maxLoginFails, rec.Code)
	}
	if rec.Header().Get("Retry-After") == "" {
		t.Fatal("429 response missing Retry-After")
	}
	// A success resets the bucket…
	rec2 := loginWithHeaders(t, s, browser, "hunter2", "")
	if rec2.Code != http.StatusSeeOther {
		t.Fatalf("good login after failures = %d, want 303 (bucket must reset on success)", rec2.Code)
	}
	// …so the next failure starts from scratch again.
	for i := 0; i < maxLoginFails; i++ {
		request(s, http.MethodPost, "/login", browser, "")
	}
	if rec := request(s, http.MethodPost, "/login", browser, ""); rec.Code != http.StatusTooManyRequests {
		t.Fatalf("login after fresh failure streak = %d, want 429", rec.Code)
	}
}

// loginWithHeaders is login() with extra request headers (for client-IP isolation).
func loginWithHeaders(t *testing.T, s *server, headers map[string]string, password, next string) *httptest.ResponseRecorder {
	t.Helper()
	form := url.Values{"password": {password}}
	if next != "" {
		form.Set("next", next)
	}
	req := httptest.NewRequest(http.MethodPost, "/login", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	rec := httptest.NewRecorder()
	s.ServeHTTP(rec, req)
	return rec
}

func TestAuthCheckProbesSessionWithoutRedirecting(t *testing.T) {
	s, _ := newTestServer(t)

	// No cookie: a bare 401, never a redirect — the SPA probes this endpoint
	// precisely to distinguish "session gone" from anything else.
	rec := request(s, http.MethodGet, "/auth/check", nil, "")
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("GET /auth/check without cookie = %d, want 401", rec.Code)
	}
	if body := rec.Body.String(); !strings.Contains(body, `"authenticated":false`) {
		t.Fatalf("body = %q, want authenticated:false", body)
	}

	// Valid cookie: 200 + the session's expiry (now + maxAge, give or take).
	cookie := sessionCookieOf(t, login(t, s, "hunter2", ""))
	rec = request(s, http.MethodGet, "/auth/check", nil, cookie)
	if rec.Code != http.StatusOK {
		t.Fatalf("GET /auth/check with cookie = %d, want 200", rec.Code)
	}
	var payload struct {
		Authenticated bool  `json:"authenticated"`
		ExpiresAt     int64 `json:"expiresAt"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("body %q is not JSON: %v", rec.Body.String(), err)
	}
	if !payload.Authenticated {
		t.Fatal("authenticated = false with a valid cookie")
	}
	wantLo := time.Now().Add(time.Hour).Add(-5 * time.Second).Unix()
	wantHi := time.Now().Add(time.Hour).Add(5 * time.Second).Unix()
	if payload.ExpiresAt < wantLo || payload.ExpiresAt > wantHi {
		t.Fatalf("expiresAt = %d, want within [%d, %d]", payload.ExpiresAt, wantLo, wantHi)
	}

	// Tampered cookie: rejected again.
	rec = request(s, http.MethodGet, "/auth/check", nil, cookie+"x")
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("GET /auth/check with tampered cookie = %d, want 401", rec.Code)
	}

	// Wrong method: 405, not 401 — don't make the probe look like an auth answer.
	rec = request(s, http.MethodPost, "/auth/check", nil, cookie)
	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("POST /auth/check = %d, want 405", rec.Code)
	}
}

func TestValidNextUnit(t *testing.T) {
	cases := []struct {
		next  string
		valid bool
	}{
		{"/", true},
		{"/series/x?tab=metadata", true},
		{"", false},
		{"//evil.com", false},
		{"https://evil.com", false},
		{"/login", false},
		{"/logout", false},
		{"/x\r\nX: y", false},
		{strings.Repeat("/", 513), false},
	}
	for _, tc := range cases {
		if got := validNext(tc.next); got != tc.valid {
			t.Errorf("validNext(%q) = %v, want %v", tc.next, got, tc.valid)
		}
	}
}

func TestSecureEqualIsLengthIndependent(t *testing.T) {
	if !secureEqual("hunter2", "hunter2") {
		t.Fatal("equal passwords compared unequal")
	}
	if secureEqual("hunter2", "hunter22") {
		t.Fatal("different-length passwords compared equal")
	}
	if secureEqual("", "") {
		t.Fatal("empty strings must not count as a match")
	}
}
