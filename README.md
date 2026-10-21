# The Long Watch

A fast, static website for tracking which of the top 250 rated films you've seen. A sub-project of [chromagraph](https://www.chromagraph.ca), hosted at **[films.chromagraph.ca](https://films.chromagraph.ca)**.

The list is built from [IMDb's official non-commercial datasets](https://datasets.imdbws.com/) using a published ranking formula — not scraped from IMDb's chart page. Movie details and posters are fetched from the TMDB API ahead of time, so visitors never call a third-party API. Progress is saved in the browser with import/export support.

---

## Features

- 250 top-rated feature films ranked by a Bayesian weighted rating
- Poster grid and compact list view
- Mark films seen/unseen; progress saved in `localStorage`
- Search, filter (genre, decade, runtime, language, country), and sort
- Detail panel with cast, overview, trailer link, and streaming providers
- Import from IMDb ratings export, IMDb list export, or Letterboxd `watched.csv`
- Export progress as JSON or CSV
- Stats panel: hours watched, breakdowns by decade, genre, language, country
- Light and dark mode

## How the list is made

- **Source:** IMDb's `title.ratings` and `title.basics` datasets (updated daily by IMDb)
- **Criteria:** feature films (`titleType = movie`) with ≥ 50,000 user votes; documentaries, TV movies, and shorts excluded; any language or country
- **Ranking:** Bayesian weighted rating — `(v / (v + m)) × R + (m / (v + m)) × C` where `R` is the film's average rating, `v` its vote count, `m = 50,000` (prior), and `C` the mean rating across all eligible films. This prevents a film that barely clears the vote minimum from outranking long-established titles on a small rating edge.
- The resulting list is similar to, but not identical to, IMDb's official Top 250, which uses an undisclosed formula counting only "regular voter" ratings.

Manual exclusions (e.g. anthology cuts that duplicate individually-eligible films) are listed in [`data/overrides.json`](data/overrides.json) with reasons.

## Tech stack

- **Frontend:** [Preact](https://preactjs.com/) + TypeScript, built with [Vite](https://vitejs.dev/)
- **Data pipeline:** Node.js + TypeScript (`tsx`), run via `npm run build-data`
- **Hosting:** GitHub Pages at `films.chromagraph.ca`
- **Data refresh:** GitHub Actions cron on the 1st of each month

## Development

```bash
npm install
npm run dev        # start local dev server
npm run build      # production build → dist/
```

## Data refresh

Requires a [TMDB API Read Access Token](https://developer.themoviedb.org/docs/getting-started) in a `.env` file at the project root:

```
TMDB_READ_TOKEN=your_token_here
```

Then:

```bash
npm run build-data
```

This will:
1. Download `title.ratings.tsv.gz` and `title.basics.tsv.gz` from IMDb (streamed; large files)
2. Filter and rank the top 250 by the criteria above
3. Enrich each film with poster, cast, overview, and streaming data from TMDB (cached in `scripts/.cache/`)
4. Write `public/data/top250.json` and `public/data/history.json`
5. Validate the output (250 films, correct ranks, vote minimums met, ≥ 240 TMDB-enriched)

The script aborts without overwriting existing data if validation fails.

## Attribution

- Film ratings and vote counts: [IMDb](https://www.imdb.com). *Information courtesy of IMDb. Used with permission.* IMDb data is licensed for personal and non-commercial use only.
- Movie details, posters, and cast: [TMDB](https://www.themoviedb.org). *This product uses the TMDB API but is not endorsed or certified by TMDB.* TMDB data is licensed for personal and non-commercial use only.

---

*Personal, non-commercial project. Not affiliated with IMDb or TMDB.*
