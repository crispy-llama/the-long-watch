# The Long Watch — Build Spec

**The Long Watch** (`https://films.chromagraph.ca`) is a personal, non-commercial project and a sub-site of chromagraph (`https://www.chromagraph.ca`). It's a self-hosted replacement for 250films.net: a fast, static website for checking off which of the 250 top-rated films you've seen. The ranking is computed by us from IMDb's official, downloadable ratings data using published criteria (§3.1), not scraped from IMDb's chart page. All movie data is fetched ahead of time by a scheduled build script, so visitors never call any third-party API. User progress is stored in the browser, with import/export.

---

## 1. Goals and non-goals

**Goals**
- Show the top 250 films (by the criteria in §3.1) with poster, title, year, rank, rating, vote count, runtime, genres, original language, country of origin, director, top cast and a short overview.
- Show the list's ranking criteria at the top of the list (§4.1).
- Let the user mark each film seen / not seen, saved locally in the browser.
- Let the user export and import their progress as a file.
- Refresh all movie data automatically once a month with no manual work.
- Load fast; work on phones.

**Non-goals (for v1)**
- No user accounts, passwords or server-side database.
- No runtime calls to IMDb or TMDB from the visitor's browser (except loading poster images from TMDB's image CDN; see §4.4).

---

## 2. Architecture

```
┌──────────────────────────┐    monthly (GitHub Actions cron)
│  scripts/build-data.ts   │──► download IMDb datasets (ratings + basics)
│                          │──► filter + rank by criteria → top 250 IMDb IDs
│                          │──► for each IMDb ID: TMDB /find → /movie/{id}
│                          │──► write public/data/top250.json
│                          │──► write public/data/history.json
└────────────┬─────────────┘
             │ commit + deploy
             ▼
┌──────────────────────────┐
│  Static site (Vite + TS) │  reads /data/top250.json
│                          │  progress in localStorage
└──────────────────────────┘
```

- **Frontend:** Vite + TypeScript. Vanilla TS or a light framework (Preact/Svelte) is fine; keep the bundle small. No backend.
- **Hosting:** any static host (GitHub Pages, Cloudflare Pages, Netlify).
- **Data refresh:** a Node script run by a GitHub Actions workflow on a monthly cron. It commits updated JSON, which triggers a redeploy. It must also be runnable locally with `npm run build-data`.
- **Secrets:** `TMDB_READ_TOKEN` (TMDB v4 "API Read Access Token") stored as a GitHub Actions secret and in a local `.env` (gitignored). Never shipped to the browser.

### 2.1 Hosting and domain
- Served from the subdomain **`films.chromagraph.ca`**, at the root path (Vite `base: '/'`). It's deployed independently of the main chromagraph site.
- DNS: a `CNAME` record for `films` pointing at the static host (e.g. `<user>.github.io` for GitHub Pages, or the Cloudflare Pages / Netlify target). Add the custom domain in the host's settings and enable HTTPS. For GitHub Pages, commit a `public/CNAME` file containing `films.chromagraph.ca`.
- **Don't change the domain after launch.** Browser storage is tied to the exact origin, so moving to a new address would hide every user's saved progress (they'd have to export and re-import).
- Footer link back to `https://www.chromagraph.ca`.

### 2.2 Branding
**Name:** "The Long Watch". Use title case in headings and the browser title; tagline: *"Working through the 250 greatest films, one at a time."*

**Relationship to chromagraph:** The Long Watch is a sub-brand. The header shows the chromagraph bars mark at small size next to the wordmark "The Long Watch", with a small "by chromagraph" label linking to the main site. Don't use the full chromagraph logo-with-wordmark as the site's main logo.

**Logo files** (provided by the owner; place in `public/brand/`):
- `mark.png` — the six bars alone, transparent background. Convert to SVG (six rectangles) for crisp rendering; the bars are equal width and equal spacing, with bars 1, 3 and 5 sitting higher and bars 2, 4 and 6 sitting lower (offset by roughly 13% of bar height).
- `logo-light.png` — bars + "chromagraph" wordmark, black text on white (light mode).
- `logo-dark.png` — bars + white "chromagraph" wordmark on black (dark mode).
- `logo-outline.png` — bars + outlined wordmark (not used on the site).
- Swap the light/dark versions with `<picture>` + `prefers-color-scheme` and the site's manual theme toggle.

**Palette** (approximate values sampled from the logo; confirm exact hex values from the logo files and update these tokens):
| Token | Hex | Bar |
|---|---|---|
| `--cg-red` | `#B90000` | 1 |
| `--cg-orange` | `#FA5A00` | 2 |
| `--cg-yellow` | `#FFB400` | 3 |
| `--cg-blue` | `#0778B5` | 4 |
| `--cg-green` | `#6AA637` | 5 |
| `--cg-purple` | `#951E86` | 6 |

- Neutrals: white/near-black backgrounds to match the logos (light: `#FFFFFF` bg, `#111111` text; dark: `#000000`/`#0B0B0B` bg, `#FFFFFF` text).
- Use the six colours as **accents only**, never as large backgrounds and never for body text. Yellow and green fail contrast as text on white; when coloured text is needed, use red, blue or purple on light, and yellow, green or orange on dark, and check WCAG AA.
- Primary interactive colour (links, focus ring, "seen" checkbox fill): `--cg-blue` in light mode, `--cg-yellow` in dark mode.

**Typography:** The chromagraph wordmark appears to be a heavy geometric/humanist sans with wide letter-spacing (similar to Open Sans ExtraBold). Use **Open Sans** (Google Fonts, weights 400/600/800) site-wide. Set "The Long Watch" wordmark in 800 weight, lowercase or title case to match the parent brand, with `letter-spacing: 0.08em`.

**Brand touches that tie the theme together:**
- **Progress bar as the bars mark:** the main progress indicator is six vertical bars in the logo arrangement, each representing ~1/6 of the list, that fill from bottom to top in their colour as the user's seen count grows. A thin horizontal bar version is used on narrow screens.
- **Decade colours:** stats charts cycle through the six palette colours in logo order.
- **Favicon / app icon:** the six-bar mark on a white (light) or black (dark) square; generate `favicon.svg`, `favicon.ico` (32px), `apple-touch-icon.png` (180px) and PWA icons (192/512px).
- **Social preview image** (`og-image.png`, 1200×630): black background, bar mark on the left, "The Long Watch" and the tagline in white on the right.

---

## 3. Data pipeline (`scripts/build-data.ts`)

### 3.1 Build the Top 250 from IMDb's official datasets

**Why this approach:** IMDb publishes daily-updated data files for personal and non-commercial use at `https://datasets.imdbws.com/`. Using them avoids scraping IMDb's chart page. TMDB ratings were considered and rejected as the ranking source: TMDB vote counts are roughly 1% of IMDb's (its #1 film has about 30,000 votes), so a 50,000-vote minimum would leave almost no eligible films.

**Criteria** (keep these as constants in `scripts/criteria.ts`; the site's criteria banner reads them from the data file, so code and text never disagree):
```ts
export const CRITERIA = {
  listSize: 250,
  minVotes: 50_000,          // IMDb user votes
  titleTypes: ['movie'],     // excludes TV movies, shorts, series, video
  excludeGenres: ['Documentary'],
  excludeAdult: true,
  anyLanguage: true,         // no language/country filter
  ranking: 'weighted',       // see below; 'average' also supported
  weightedPriorVotes: 50_000 // "m" in the weighted formula
};
```

**Steps** (in `scripts/imdb-datasets.ts`):
1. Download `title.ratings.tsv.gz` and `title.basics.tsv.gz`. Stream and decompress; don't load the whole basics file into memory (it's over 1 GB uncompressed). Respect HTTP caching (`If-Modified-Since`) and store downloads in the Actions cache.
2. From `title.ratings`, keep rows with `numVotes >= CRITERIA.minVotes` (this cuts the set to a few thousand IDs). Hold them in a `Map<tconst, {rating, votes}>`.
3. Stream `title.basics`; for IDs in that map, keep rows where `titleType` is in `titleTypes`, `isAdult` is `0` and `genres` doesn't include any excluded genre. Capture `primaryTitle`, `originalTitle`, `startYear`, `runtimeMinutes`, `genres`.
4. Score each film:
   - `'average'`: score = `averageRating`.
   - `'weighted'` (default; the Bayesian average IMDb itself has described using): `score = (v / (v + m)) * R + (m / (v + m)) * C`, where `R` = the film's average rating, `v` = its votes, `m` = `weightedPriorVotes`, `C` = the mean rating across all eligible films. This stops a film that barely clears 50,000 votes from outranking long-established classics on a tiny rating edge.
5. Sort by score descending; break ties by vote count descending. Take the top `listSize`.
6. Output per entry: `imdbId`, `rank`, `imdbRating`, `imdbVotes`, `score`, plus the basics fields.

**Notes for the UI and docs:**
- The resulting list will be close to, but not identical to, IMDb's own Top 250, which uses an undisclosed formula and only counts votes from "regular voters." That's expected and is stated in the criteria banner.
- IMDb's genre data is the source of truth for the documentary exclusion. Log any film where TMDB also lists "Documentary" but IMDb doesn't, for manual review; don't auto-exclude.

**Optional override file** `data/overrides.json` (committed, hand-edited) with `exclude: string[]` (IMDb IDs) and a `reason` per entry, for edge cases such as concert films or anthology compilations. Excluded films are listed on the criteria page so the list stays transparent.

### 3.2 Enrich each film from TMDB
For each `imdbId`:
1. `GET https://api.themoviedb.org/3/find/{imdbId}?external_source=imdb_id` → take `movie_results[0].id`.
2. `GET https://api.themoviedb.org/3/movie/{tmdbId}?append_to_response=credits,watch/providers,videos` (one call gets details, cast/crew, streaming providers and trailers).
3. Map to the `Movie` schema (§3.3).

Rules:
- Auth with header `Authorization: Bearer ${TMDB_READ_TOKEN}`.
- Run with a concurrency of ~5 and retry on HTTP 429 with backoff (respect `Retry-After`). About 500 calls total per run, which is well within TMDB's limits.
- **Cache by IMDb ID** in `scripts/.cache/tmdb/{imdbId}.json` (gitignored, or restored via the Actions cache). Reuse a cached entry if it's under 30 days old. Never keep TMDB data older than 6 months (TMDB terms).
- If an ID has no TMDB match, still include the film with IMDb data only and log a warning.
- From TMDB, take language and country fields: `original_language` (ISO 639-1 code; convert to a display name with `Intl.DisplayNames`), `spoken_languages`, `origin_country` and `production_countries`. Use `origin_country` for "country of origin"; fall back to `production_countries` if it's empty.

### 3.3 Output: `public/data/top250.json`
```ts
type Top250File = {
  generatedAt: string;          // ISO timestamp
  source: { imdbDatasetDate: string; tmdb: true }; // Last-Modified of the IMDb files
  criteria: typeof CRITERIA & { eligibleCount: number; meanRatingC: number }; // shown in the banner
  excluded: { imdbId: string; title: string; year: number; reason: string }[]; // from overrides.json
  movies: Movie[];              // sorted by rank
};

type Movie = {
  imdbId: string;               // "tt0111161" — primary key everywhere
  tmdbId: number | null;
  rank: number;                 // 1–250
  title: string;
  originalTitle?: string;
  year: number;
  runtime: number | null;       // minutes
  genres: string[];
  overview: string;
  tagline?: string;
  posterPath: string | null;    // TMDB path, e.g. "/abc.jpg"
  backdropPath: string | null;
  imdbRating: number;           // from title.ratings
  imdbVotes: number;            // from title.ratings
  score: number;                // ranking score (weighted or average, per criteria)
  directors: string[];
  cast: { name: string; character: string; profilePath: string | null }[]; // top 5
  originalLanguage: { code: string; name: string };   // e.g. { code: "ja", name: "Japanese" }
  spokenLanguages: string[];                          // display names
  originCountries: { code: string; name: string }[]; // e.g. [{ code: "KR", name: "South Korea" }]
  trailerYouTubeKey?: string;   // first official YouTube trailer
  watchProviders?: Record<string, { flatrate?: string[]; rent?: string[]; buy?: string[]; link?: string }>; // keyed by country code, keep US and CA at minimum
};
```

### 3.4 Validation (abort and keep the old file if any fail)
- Exactly 250 unique IMDb IDs, ranks 1–250 with no gaps.
- Every film has `imdbVotes >= minVotes`, `titleType` of `movie`, and no excluded genre (re-check after ranking).
- At least 240 entries enriched from TMDB.
- Every movie has a title and year.
- Sanity check against the previous run: if more than 25 films changed in one month, fail and require a manual run (usually a sign of a parsing bug or a dataset problem).

On failure: exit non-zero so the GitHub Action fails visibly. Don't overwrite existing data.

### 3.5 History: `public/data/history.json`
Each run, compare the new list to the previous one and append:
```ts
type HistoryEntry = { date: string; added: string[]; removed: string[] }; // IMDb IDs
```
Also keep a `formerMovies` map with minimal data (title, year, poster, last rank, date removed) for every film that has ever dropped off, so the UI can still show it.

### 3.6 GitHub Actions workflow (`.github/workflows/refresh-data.yml`)
- Triggers: `schedule: cron: '17 6 1 * *'` (1st of each month) and `workflow_dispatch` for manual runs.
- Steps: checkout → setup Node → restore TMDB and IMDb-dataset caches → `npm ci` → `npm run build-data` → if `public/data` changed, commit "Refresh Top 250 data (YYYY-MM-DD)" and push.

---

## 4. Frontend

### 4.1 Layout
- **Header:** bar mark + "The Long Watch" wordmark (with the small "by chromagraph" link), progress (e.g. "143 / 250 seen"), the six-bar progress indicator (§2.2), menu with Import / Export / Settings / About.
- **Criteria banner** (directly above the list, always visible, collapsible after first view; collapsed state remembered locally). Generated from `criteria` in the data file, never hardcoded. Example copy:
  > **How this list is made.** The 250 highest-rated feature films on IMDb with at least **50,000** user votes. Documentaries, TV movies and shorts are excluded. Films in any language and from any country are included. Ranked by a weighted rating that balances score and number of votes. Updated monthly — last updated **Oct 1, 2026**. Similar to, but not the same as, IMDb's official Top 250. [Full details]
  - "Full details" opens a page/panel explaining the formula in plain words, the number of eligible films, and any manual exclusions (from `excluded`) with reasons.
- **Toolbar:** search box, filters, sort, grid/list toggle.
- **Main:** poster grid (default) or compact list. Each card shows the poster, rank, title, year, a small country-of-origin label (flag emoji + country code, e.g. 🇯🇵 JP) and a seen checkbox/toggle. The list view adds columns for original language, country, IMDb rating and vote count.
- **Detail view:** a modal or slide-over panel opened by clicking a card. It shows the backdrop, poster, title (with the original title underneath when it differs, e.g. "Spirited Away / 千と千尋の神隠し"), year, runtime, genres, original language, country of origin, IMDb rating and vote count, director, top cast with photos, overview, a trailer link, streaming providers and links to IMDb and TMDB.

### 4.2 Interactions
- Toggle seen from the card without opening the detail view; also toggle from the detail view.
- Keyboard: `/` focuses search, `Esc` closes the detail view.
- **Filters:** All / Seen / Unseen; genre (multi-select); decade; runtime (under 2h, 2–3h, 3h+); original language (multi-select); country of origin (multi-select); "English-language / Non-English" quick toggle.
- **Sort:** rank (default), year, title, runtime, IMDb rating, vote count, date marked seen.
- **"Pick for me":** opens a random unseen film that matches the current filters.
- Filter/sort state is reflected in the URL query string so views can be bookmarked.

### 4.3 Stats panel
- Seen count and percent; total hours watched; hours remaining.
- Breakdown by decade, genre, original language and country of origin (simple bar charts, no heavy chart library), e.g. "You've seen 12 of 19 Japanese films."
- Highest- and lowest-ranked unseen film.

### 4.4 Images
- Load posters from TMDB's image CDN: `https://image.tmdb.org/t/p/w342{posterPath}` in the grid, `w500` in the detail view, `w185` for cast photos, `w1280` for backdrops. Hardcode the base URL; optionally store it from TMDB's `/configuration` in the data file.
- Use `loading="lazy"`, explicit width/height (2:3 aspect ratio) to avoid layout shift, and a plain placeholder card for missing posters.
- (Optional) Self-hosting posters is allowed in principle but adds ~10–15 MB to the repo and must be refreshed within 6 months. Default to the CDN.

### 4.5 List changes
- On load, compare the data's `generatedAt` with the last version the user saw (stored locally). If films were added or removed since then, show a dismissible notice: "3 new films joined the Top 250 since your last visit," with a link that filters to them.
- If `criteria` changed between versions (e.g. a different vote minimum), say so in the same notice so users understand why the list shifted.
- Films the user marked seen that have since dropped off are kept in their data and shown in a "Former Top 250" section, not counted toward the 250.

---

## 5. User data (local storage + import/export)

### 5.1 Storage
- Key: `longwatch:v1` in `localStorage`. Wrap all reads/writes in try/catch; the app must still work (without saving) if storage is unavailable.
- Schema:
```ts
type UserData = {
  version: 1;
  updatedAt: string;
  seen: Record<string, {        // keyed by IMDb ID
    seenAt?: string;            // ISO date, optional
    rating?: number;            // 1–10, optional
    note?: string;              // optional
  }>;
  watchlist?: string[];         // IMDb IDs flagged "watch next"
  lastSeenDataVersion?: string; // generatedAt of last data viewed (for §4.5)
  settings?: { view: 'grid' | 'list'; country: string };
};
```
- Keyed by IMDb ID, never by rank, so data survives list changes.

### 5.2 Export
- "Export progress" downloads `the-long-watch-YYYY-MM-DD.json` containing `UserData`.
- Also offer "Export as CSV" with columns `imdb_id,title,year,rank,seen,seen_at,rating,note` for spreadsheet users.

### 5.3 Import
Accept, by file picker or drag-and-drop:
1. **This app's JSON export.** Validate the schema, then let the user choose **Merge** (union of seen films; on conflict keep the entry with the newer `seenAt`) or **Replace**.
2. **IMDb ratings export CSV.** (On IMDb: Your Ratings → Export.) Read the `Const` column (IMDb IDs) and `Your Rating` / `Date Rated`; mark matching Top 250 films as seen with those values.
3. **IMDb list export CSV.** Same `Const` column; mark matches as seen.
4. **Letterboxd export** (`watched.csv`). Match by title + year against the Top 250 data; show a review screen listing any unmatched or ambiguous rows before applying.

Every import shows a summary before applying ("This will mark 87 films as seen, 12 already marked"). Keep a one-level undo of the last import.

### 5.4 Reminder to back up
Because data is per-browser, show a subtle notice in Settings: "Your progress is saved in this browser only. Export a backup or use it to move to another device." Optionally nudge once after 25+ changes since the last export.

---

## 6. Attribution and legal
- About/Credits section with the official TMDB logo (less prominent than the site's own branding, unmodified) and the text: "This product uses the TMDB API but is not endorsed or certified by TMDB."
- State that ratings and vote counts come from IMDb's non-commercial datasets (with "Information courtesy of IMDb (https://www.imdb.com). Used with permission." as IMDb's dataset terms ask), that the ranking is computed by this site, and that the site isn't affiliated with IMDb.
- Both IMDb's datasets and TMDB's API are licensed for personal and non-commercial use only. If the site ever runs ads or charges money, both need commercial licences.
- Don't cache TMDB data for more than 6 months (the monthly refresh satisfies this).

---

## 7. Quality bar
- Lighthouse performance ≥ 90 on mobile. The data JSON should be ≤ ~400 KB gzipped. If larger, split into a light list file (grid data) and a detail file loaded on demand.
- Accessible: real checkboxes/buttons with labels, visible focus, modal focus trap, alt text on posters (`"{title} ({year}) poster"`).
- Responsive from 360px wide upward; 2 columns of posters on phones.
- Light and dark mode following the system setting, with a manual toggle.
- No console errors; works offline after first load if a simple service worker is added (optional, §8).

---

## 8. Nice-to-haves (after v1)
- PWA / offline support via a service worker that caches the app shell and data file.
- Shareable read-only progress link: encode seen IMDb IDs as a compressed bitset (250 bits against the current list) in the URL hash. No server needed.
- "Compare with a friend" by pasting their share link.
- Streaming filter: "only show unseen films on my services" (from `watchProviders`, user picks services in Settings).
- Other lists using the same pipeline by changing `CRITERIA`: a Top 250 TV list, a non-English-only list, a "Top 100 per decade" view, or a documentaries-only list.
- Optional cloud sync later (e.g. Supabase) behind a feature flag, reusing the same `UserData` schema.

---

## 9. Suggested build order
1. `scripts/criteria.ts` + `scripts/imdb-datasets.ts` + `scripts/build-data.ts` producing a valid `top250.json` locally. Print the top 25 and the films ranked 240–260 to the console so the cut-off can be eyeballed.
2. Static grid rendering from the JSON, with seen toggles and localStorage.
3. Detail view, search, filters, sort.
4. JSON export/import, then IMDb CSV import, then Letterboxd import.
5. Stats panel, "Pick for me", list-change banner, history/former films.
6. GitHub Actions monthly workflow and deployment to `films.chromagraph.ca`.
7. Branding pass: logo SVG conversion, palette tokens, six-bar progress indicator, favicons, social image.
8. Attribution, accessibility pass, performance pass.

## 10. Acceptance checks
- `npm run build-data` produces 250 movies with posters for ≥ 240.
- No film in the output has fewer than 50,000 votes, is a documentary, or is a non-`movie` title type.
- The list includes non-English films, and each film shows its original language and country of origin.
- The criteria banner text matches `criteria` in the data file, including the last-updated date.
- Changing `minVotes` in `criteria.ts` and rebuilding updates both the list and the banner text.
- A failed or corrupted IMDb dataset download fails the script without touching existing data.
- Marking films seen, reloading, and the marks persist.
- Export → clear site data → import restores identical progress.
- An IMDb ratings CSV import marks the expected films.
- Site is usable on a phone and has no console errors.
- The site loads at `https://films.chromagraph.ca` over HTTPS; the correct logo shows in light and dark mode, including after using the manual theme toggle.
- All coloured text and controls pass WCAG AA contrast in both themes.
