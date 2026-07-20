# Series Detail: Metadaten-Anreicherung + Ambient-Hero (Design)

**Datum:** 2026-07-20 · **Status:** approved (Brainstorm mit Visual Companion, V1–V7)
**Scope:** rein lesend. Inline-Edits (Rating P2L-156, Tags/Summary P2L-157) bleiben eigene Tickets.

## Warum

Im Vergleich zu Komgas eigener Serien-Ansicht ist unsere Series-Detail-Seite spartanisch:
keine Summary (Komga fällt auf die Summary des ersten Buchs zurück), nur ein einzelner
"Autor" statt aller Credits mit Rollen, Tags nur im versteckten Metadata-Tab, Links nur
als Goodreads-Spezialfall. Alle fehlenden Daten liegen bereits im `KomgaSeriesDto`, das
die Seite sowieso lädt — es fehlt nur die Darstellung. Zusätzlich soll die Seite
visuell "weicher" werden (Ambient-Backdrop aus dem Cover-Artwork).

Gewählte Richtung (aus 3 Varianten): **B — Hero + Metadaten-Band** mit dem
Backdrop aus Variante C, iteriert zu einem **progressiven Blur-Verlauf** (V7).

## Hero

### Backdrop: progressiver horizontaler Blur (V7, final)

Vier deckungsgleiche, absolut positionierte Ebenen desselben Artworks
(`inset:-60px`, `background-size:cover`, `background-position:center 22%`),
per CSS `mask-image` horizontal ineinander übergeblendet — rechts scharf,
nach links zunehmend verblurrt:

| Ebene | Filter | Mask (`linear-gradient(to right, …)`) | Quelle |
|---|---|---|---|
| b56 (Basis) | `blur(56px) saturate(1.25)`, opacity .62 | keine (voll) | Series-Thumbnail |
| b28 | `blur(28px) saturate(1.2)`, opacity .75 | `transparent 8%, #000 60%` | HD-Seite 1 |
| b12 | `blur(12px) saturate(1.15)`, opacity .75 | `transparent 30%, #000 80%` | HD-Seite 1 |
| b0 | `saturate(1.1)`, opacity .75 | `transparent 52%, #000 98%` | HD-Seite 1 |

Darüber ein Shade-Overlay:
`linear-gradient(to right, rgba(9,9,11,.55), rgba(9,9,11,.22) 50%, rgba(9,9,11,.05))`
plus `linear-gradient(to bottom, transparent 45%, #09090b 97%)` (läuft unten in den
Seitenhintergrund aus). Lesbarkeit kommt primär aus Text-Shadows auf Titel/Byline/
Summary (`0 2px 14px rgba(0,0,0,.85)`-Klasse), nicht aus Abdunklung.

**Bildquellen & Laden:**
- Blur-Basis: `seriesThumbUrl` (ist bereits gecacht) → Backdrop steht sofort.
- Scharfe Ebenen: volle Seite 1 des ersten Buchs, `GET /api/v1/books/{bookId}/pages/1`
  (~1–3 MB Original-Scan; das Thumbnail wäre bei 300–400 % Vergrößerung pixelig).
  Lazy: per `new Image()` vorladen, `onload` → Ebenen mit Fade-in einblenden
  (CSS-Transition auf opacity). Bis dahin trägt die Blur-Basis allein.
- Erstes Buch = das erste Element der eh geladenen `useSeriesBooks`-Liste
  (Sortierung `metadata.numberSort,asc` wie bisher).
- Kein Buch vorhanden → kein Backdrop (Seite sieht aus wie heute).

### Summary mit Buch-Fallback

`metadata.summary || booksMetadata.summary`. Label über dem Text:
- Serien-Summary: `Summary`
- Fallback: `Summary · from Vol. {booksMetadata.summaryNumber}`

Dazu Clamping: `line-clamp` auf ~4 Zeilen + „Read more ▾ / Show less ▴"-Toggle
(reiner UI-State). Keine Summary → Block entfällt.
`KomgaBooksMetadata` in `types.ts` wird um `summary: string` und
`summaryNumber: string` erweitert (Komga liefert beides bereits).

### Byline (erweitert)

`{Writer} · {Publisher} · {Jahresspanne} · {Seitenzahl}`

- Jahresspanne: min–max über `books[].metadata.releaseDate` (z. B. „2010–2011";
  ein Jahr → „2010"). Ersetzt das bisherige Einzeljahr aus `booksMetadata.releaseDate`.
- Seitenzahl: Summe `books[].media.pagesCount`, formatiert „111 pages".
- Writer/Publisher bleiben klickbar (facetHref), wie heute.

### Links: eigene Pill-Zeile

Jeder Eintrag aus `metadata.links` wird ein Pill-Button direkt unter dem
Sterne-Rating: abgerundet, Rand `rgba(250,250,250,.28)`, Hintergrund
`rgba(9,9,11,.5)`, Label + „↗", `target="_blank"`. Der bisherige
Goodreads-Spezialfall (`parseGoodreads`) geht in dieser generischen Zeile auf —
der Goodreads-Link ist schlicht der erste `links`-Eintrag (Label enthält bereits
„★ 3.46 · Goodreads (7.2k)"). Keine Links → Zeile entfällt.

### Unverändert im Hero

Cover-Karte (Thumbnail), Volumes/Read-Zähler, Titel + StatusDot, Sterne-Rating,
Genre-Badges, Actions (Continue/Start reading, Mark all read/unread, Zu Liste).
Buttons bekommen halbtransparenten Hintergrund (`rgba(9,9,11,.45)`), damit sie
auf dem Artwork stehen können.

## Metadaten-Band (zwischen Hero und Tabs)

### Stat-Blöcke

Eine Grid-Zeile kompakter Kacheln (`repeat(6,1fr)`, mobil 2–3 Spalten umbrechend),
jede Kachel: Mini-Label (uppercase, muted) + Wert. Quelle: `booksMetadata.authors`
(Rollen) + Serie:

| Block | Quelle | Klickbar |
|---|---|---|
| Writer | authors role `writer` | ✓ authors-Facette |
| Art | role `penciller` (Fallback `inker`) | ✓ authors-Facette |
| Colors | role `colorist` | – |
| Editor | role `editor`, bei mehreren „{Erster} +N" | – |
| Publisher | `metadata.publisher` | ✓ publisher-Facette |
| Format | abgeleitet, s. u. | – |

Leere Blöcke entfallen (Grid füllt auf). Mehrere Namen derselben Rolle
(außer Editor): erste zwei, dann „+N".

**Format-Heuristik** (P2L-172 „total pages als Indikator"): ⌀ Seiten/Buch =
`totalPages / booksCount` → `< 48` → „Floppies", `48–249` → „TPB",
`≥ 250` → „Omnibus". Anzeige: „4 issues · ⌀ 28 p. · Floppies"
(bei 1 Buch: „1 volume · 111 p. · TPB"). Reine Funktion, unit-getestet.

### Tag-Chips

Unter den Stat-Blöcken eine Chip-Zeile mit `metadata.tags` ∪ `booksMetadata.tags`
(dedupliziert, `rating:*` gefiltert — wie im Metadata-Tab heute). Tags sind
**nicht** klickbar (es gibt keine Tag-Facette im Browser; kommt ggf. später).
Keine Tags → Zeile entfällt.

## Tabs

Unverändert: Books (Card/List), Related, Metadata. Der Metadata-Tab bleibt als
vollständige Rohdaten-Tabelle bestehen (Redundanz zum Band ist gewollt: das Band
ist die kuratierte Sicht, der Tab die vollständige).

## Nicht-Ziele / Notizen

- **Kein** Write-Pfad (Rating/Tags/Summary-Edit) — P2L-156/157.
- **Library-Browser-Default** Karten vs. Liste: Code-Default ist bereits `grid`
  (`LibraryBrowser.tsx`); abweichende Anzeige war persistierter localStorage-State.
  Keine Änderung.
- Mobile: kompakter Hero behält den Backdrop (Ebenen sind GPU-billig); Stat-Grid
  bricht auf 2 Spalten um. HD-Nachladen auch mobil (Server steht im LAN/eigenen Netz).
- `prefers-reduced-motion` betrifft nur das Fade-in (dann sofort einblenden).

## Betroffene Dateien

- `src/routes/SeriesDetail.tsx` — Hero-Umbau (Backdrop, Summary, Links, Byline),
  neues Band; ggf. Hero in eigene Komponente `SeriesHero.tsx` extrahieren, wenn
  die Datei unhandlich wird.
- `src/lib/komga/types.ts` — `KomgaBooksMetadata` + `summary`/`summaryNumber`.
- `src/lib/komga/books.ts` — `bookPageUrl(bookId, page)`, `yearRange(books)`,
  `totalPages(books)`, `formatIndicator(totalPages, count)` (pure, TDD).
- `src/lib/komga/mapping.ts` — Credits-Extraktion `creditsByRole(authors)` (pure, TDD).
- Tests analog zum Bestand (vitest, pure Logik + Komponenten-Smoke).

## Testkriterien

1. Serie ohne eigene Summary zeigt Buch-Summary mit „from Vol. n"-Label;
   Serie mit eigener Summary zeigt diese ohne Herkunfts-Zusatz.
2. `formatIndicator`: 4×28 p. → Floppies; 1×180 p. → TPB; 2×600 p. → Omnibus.
3. `yearRange`: 2010+2011 → „2010–2011"; nur 2010 → „2010"; keine Daten → null.
4. Links-Zeile rendert alle `metadata.links`, entfällt bei leerem Array.
5. Stat-Block Writer/Publisher verlinken auf gefilterte Library-Sicht.
6. Backdrop: ohne Bücher kein Backdrop; HD-Fade erst nach `onload`.
7. Bestehende Suite bleibt grün; `npm run build` clean.
