# Design — Library Browser "Issues" view

**Date:** 2026-07-19
**Status:** Approved (design), pending implementation

## Problem

Komga surfaces two browse dimensions per library: **Series** (grouped) and
**Books** (flat, every individual volume/issue). Our frontend only browses
**series** — books live exclusively inside `/series/:id`. A user comparing
Komga's `/libraries/:id/books` (20 items) with `/libraries/:id/series`
(12 items) sees "fewer things" in our UI and reads it as "books are missing".

Nothing is actually missing: in the example library the 20 books belong to
exactly 12 series (several are legitimate multi-volume series: Comics=6,
Monstress=3, Invincible=2; plus 8 single-volume series). Every book is
reachable by opening its series. The gap is purely **the lack of a flat
issue-level browse view**.

(Aside: the 8 identically-named "Pluto Vol.0" single-volume series are a
Komga-side data artifact — duplicate imports — not something the frontend can
or should "fix". A flat view simply offers a second lens, it does not change
grouping.)

## Goal

Add a **Series ⇄ Issues** view toggle to the Library Browser so every
individual book/issue can be browsed flat, mirroring Komga's Series/Books tabs.

Non-goals (YAGNI): a dedicated book-detail page; changing how series are
grouped; deduplicating the Pluto artifact.

## Approach

A second toggle, **orthogonal** to the existing grid/list `view` toggle,
selecting the browse *dimension*. Reuses the existing filter bar, infinite
scroll, scroll-restore, and `BookCard` — the core new work is a second query
path (`/books/list`) plus filter gating.

### 1. The toggle
- Segmented control "Serien / Issues" placed next to the grid/list toggle.
- Persisted via `usePersistentState` (own key, e.g. `komga:browseDim`), default
  `series` (current behaviour unchanged).
- Orthogonal to grid/list: both dimensions render in both grid and list.

### 2. Query path
- New `useBooksInfinite(filters)` mirroring `useSeriesInfinite`, calling
  `POST /books/list` (verified: same condition DSL, 200 OK, honours
  `libraryId`, `readStatus`, `author`, `oneShot`, `tag` (rating),
  `fullTextSearch`).
- New client method `komga.books(f, page, size)` + `flattenBooks` / `totalBooks`
  helpers analogous to the series ones.

### 3. Cards & navigation
- Reuse existing `BookCard`. In the flat view it links to the book's series:
  `/series/:seriesId` (the DTO carries `seriesId`). No new route.
  - Rationale: smallest scope, consistent with today; for single-volume series
    the user lands directly on that one volume.

### 4. Filter gating (the key decision)
`/books/list` accepts only a subset of our facets. Verified support:

| Facet | books/list |
|---|---|
| library, search (fullText), readStatus, author, rating (tag), oneshot, sort | ✅ 200 |
| publisher, genre, seriesStatus, ageRating | ❌ 400 (series-level metadata) |

In **Issues** mode the series-only facets (publisher, genre, seriesStatus,
ageRating) are rendered **disabled/greyed** with a short hint
("nur in Serien-Ansicht"). Active facets: library scope, search, read status,
author, rating, oneshot. This is explicit rather than silently dropping them.

- `filtersToCondition` gains an Issues variant (or a `dimension` arg) that emits
  only the supported nodes, so a stale disabled facet in persisted state never
  produces a 400.

### 5. Sort
Issues need their own sort field map (series `booksCount` is meaningless for a
single book; titleSort → the book's own title):

| SortKey | series field | issues field |
|---|---|---|
| titleSort | metadata.titleSort | metadata.titleSort |
| releaseDate | booksMetadata.releaseDate | metadata.releaseDate |
| createdDate | createdDate | createdDate |
| lastModified | lastModified | lastModified |
| readDate | readDate | readDate |
| random | random | random |
| booksCount | booksCount | *(hidden in Issues mode)* |

`number`/`numberSort` sort is available in Issues mode (natural issue ordering).

### 6. Empty / loading / scroll
Reuse existing infinite-scroll, skeleton, empty-state, and per-view scroll
restore. Scroll offset key should include the browse dimension so switching
dimensions doesn't cross-restore.

## Testing
- `filtersToCondition` (Issues variant): emits only supported nodes; unsupported
  facets never appear in the body.
- Toggle persistence + default (`series`).
- Issues mode disables series-only facet controls.
- `BookCard` in flat view navigates to `/series/:seriesId`.
- `useBooksInfinite` pagination/flatten mapping (mocked `/books/list`).

## Out of scope
Book-detail route; Pluto duplicate dedup; changing series grouping; a global
"all libraries" issues count badge.
