#!/usr/bin/env tsx
/**
 * scripts/build-data.ts
 *
 * Builds public/data/top250.json and public/data/history.json from
 * IMDb's official non-commercial datasets and the TMDB API.
 *
 * Usage:  npm run build-data
 */

import { config } from 'dotenv';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import pLimit from 'p-limit';
import { CRITERIA } from './criteria.ts';
import { loadRatings, streamFilteredBasics } from './imdb-datasets.ts';
import { fetchTmdbData } from './tmdb.ts';

config(); // load .env

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'data');
const TOP250_PATH = path.join(OUT_DIR, 'top250.json');
const HISTORY_PATH = path.join(OUT_DIR, 'history.json');
const OVERRIDES_PATH = path.join(ROOT, 'data', 'overrides.json');

// ── Types (mirrors src/types.ts) ────────────────────────────────────────────

type Movie = {
  imdbId: string;
  tmdbId: number | null;
  rank: number;
  title: string;
  originalTitle?: string;
  year: number;
  runtime: number | null;
  genres: string[];
  overview: string;
  tagline?: string;
  posterPath: string | null;
  backdropPath: string | null;
  imdbRating: number;
  imdbVotes: number;
  score: number;
  directors: string[];
  cast: { name: string; character: string; profilePath: string | null }[];
  originalLanguage: { code: string; name: string };
  spokenLanguages: string[];
  originCountries: { code: string; name: string }[];
  trailerYouTubeKey?: string;
  watchProviders?: Record<string, { flatrate?: string[]; rent?: string[]; buy?: string[]; link?: string }>;
};

type Top250File = {
  generatedAt: string;
  source: { imdbDatasetDate: string; tmdb: true };
  criteria: typeof CRITERIA & { eligibleCount: number; meanRatingC: number };
  excluded: { imdbId: string; title: string; year: number; reason: string }[];
  movies: Movie[];
};

type HistoryEntry = { date: string; added: string[]; removed: string[] };
type HistoryFile = {
  entries: HistoryEntry[];
  formerMovies: Record<string, { imdbId: string; title: string; year: number; posterPath: string | null; lastRank: number; removedDate: string }>;
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function weightedScore(rating: number, votes: number, C: number, m: number): number {
  return (votes / (votes + m)) * rating + (m / (votes + m)) * C;
}

function averageScore(rating: number): number {
  return rating;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== The Long Watch — build-data ===\n');

  // 1. Load ratings
  const { ratings, datasetDate } = await loadRatings();

  // 2. Stream basics and collect eligible films
  type Candidate = {
    imdbId: string;
    primaryTitle: string;
    originalTitle: string;
    year: number;
    runtime: number | null;
    genres: string[];
    rating: number;
    votes: number;
  };

  const overridesRaw = JSON.parse(readFileSync(OVERRIDES_PATH, 'utf8')) as {
    exclude: { imdbId: string; reason: string }[];
  };
  const overrideExcludeIds = new Set(overridesRaw.exclude.map((e) => e.imdbId));

  const candidates: Candidate[] = [];
  console.log('Streaming title.basics…');
  for await (const basics of streamFilteredBasics(ratings)) {
    if (overrideExcludeIds.has(basics.tconst)) continue;
    const r = ratings.get(basics.tconst)!;
    candidates.push({
      imdbId: basics.tconst,
      primaryTitle: basics.primaryTitle,
      originalTitle: basics.originalTitle,
      year: basics.startYear,
      runtime: basics.runtimeMinutes,
      genres: basics.genres,
      rating: r.rating,
      votes: r.votes,
    });
  }
  console.log(`Eligible candidates: ${candidates.length}\n`);

  // 3. Compute scores
  const meanC =
    candidates.reduce((s, c) => s + c.rating, 0) / candidates.length;
  const m = CRITERIA.weightedPriorVotes;

  const scored = candidates
    .map((c) => ({
      ...c,
      score:
        CRITERIA.ranking === 'weighted'
          ? weightedScore(c.rating, c.votes, meanC, m)
          : averageScore(c.rating),
    }))
    .sort((a, b) => b.score - a.score || b.votes - a.votes)
    .slice(0, CRITERIA.listSize);

  // 4. Print top 25 and 240–250 for sanity check
  console.log('--- Top 25 ---');
  scored.slice(0, 25).forEach((f, i) =>
    console.log(`  ${i + 1}. ${f.primaryTitle} (${f.year}) — score ${f.score.toFixed(4)}`),
  );
  console.log('--- Ranks 240–250 ---');
  scored.slice(239).forEach((f, i) =>
    console.log(`  ${239 + i + 1}. ${f.primaryTitle} (${f.year}) — score ${f.score.toFixed(4)}`),
  );
  console.log();

  // 5. Enrich from TMDB
  console.log('Enriching from TMDB…');
  const limit = pLimit(5);
  const enriched = await Promise.all(
    scored.map((candidate, idx) =>
      limit(async () => {
        const rank = idx + 1;
        if (rank % 50 === 0) console.log(`  ${rank}/250…`);
        const tmdb = await fetchTmdbData(candidate.imdbId);
        const movie: Movie = {
          imdbId: candidate.imdbId,
          tmdbId: tmdb?.tmdbId ?? null,
          rank,
          title: candidate.primaryTitle,
          originalTitle:
            candidate.originalTitle !== candidate.primaryTitle
              ? candidate.originalTitle
              : undefined,
          year: candidate.year,
          runtime: candidate.runtime,
          genres: candidate.genres,
          overview: tmdb?.overview ?? '',
          tagline: tmdb?.tagline ?? undefined,
          posterPath: tmdb?.posterPath ?? null,
          backdropPath: tmdb?.backdropPath ?? null,
          imdbRating: candidate.rating,
          imdbVotes: candidate.votes,
          score: candidate.score,
          directors: tmdb?.directors ?? [],
          cast: tmdb?.cast ?? [],
          originalLanguage: tmdb?.originalLanguage ?? { code: '??', name: 'Unknown' },
          spokenLanguages: tmdb?.spokenLanguages ?? [],
          originCountries: tmdb?.originCountries ?? [],
          trailerYouTubeKey: tmdb?.trailerYouTubeKey ?? undefined,
          watchProviders: tmdb?.watchProviders,
        };
        return movie;
      }),
    ),
  );

  // 6. Validation
  console.log('\nValidating…');
  const errors: string[] = [];

  const ids = new Set(enriched.map((m) => m.imdbId));
  if (ids.size !== 250) errors.push(`Expected 250 unique IDs, got ${ids.size}`);

  const ranks = enriched.map((m) => m.rank);
  if (!ranks.every((r, i) => r === i + 1)) errors.push('Ranks are not 1–250 with no gaps');

  for (const m of enriched) {
    if (m.imdbVotes < CRITERIA.minVotes)
      errors.push(`${m.imdbId} has ${m.imdbVotes} votes (below minimum)`);
    if (CRITERIA.excludeGenres.some((g) => m.genres.includes(g)))
      errors.push(`${m.imdbId} (${m.title}) has an excluded genre`);
    if (!m.title || !m.year) errors.push(`${m.imdbId} missing title or year`);
  }

  const tmdbCount = enriched.filter((m) => m.tmdbId !== null).length;
  if (tmdbCount < 240)
    errors.push(`Only ${tmdbCount}/250 films enriched from TMDB (need ≥ 240)`);

  // Sanity check against previous run
  let previousIds: Set<string> | null = null;
  if (existsSync(TOP250_PATH)) {
    try {
      const prev = JSON.parse(readFileSync(TOP250_PATH, 'utf8')) as Top250File;
      previousIds = new Set(prev.movies.map((m) => m.imdbId));
      const changed = enriched.filter((m) => !previousIds!.has(m.imdbId)).length;
      if (changed > 25) {
        errors.push(
          `${changed} films changed since last run (limit is 25). Likely a parsing bug. Run with --force to override.`,
        );
      }
    } catch {
      console.warn('Could not parse previous top250.json for sanity check.');
    }
  }

  if (errors.length > 0) {
    console.error('\nValidation FAILED:');
    for (const e of errors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }
  console.log(`  ✓ 250 unique films, ranks 1–250, ${tmdbCount} enriched from TMDB`);

  // 7. Build overrides exclusion list for the data file
  const excludedInData = overridesRaw.exclude.map((e) => {
    const r = ratings.get(e.imdbId);
    return {
      imdbId: e.imdbId,
      title: e.imdbId, // title not available here; a future pass could look it up
      year: 0,
      reason: e.reason,
    };
  });

  // 8. Write top250.json
  const top250: Top250File = {
    generatedAt: new Date().toISOString(),
    source: { imdbDatasetDate: datasetDate, tmdb: true },
    criteria: { ...CRITERIA, eligibleCount: candidates.length, meanRatingC: meanC },
    excluded: excludedInData,
    movies: enriched,
  };

  await mkdir(OUT_DIR, { recursive: true });
  writeFileSync(TOP250_PATH, JSON.stringify(top250));
  const kbSize = (Buffer.byteLength(JSON.stringify(top250)) / 1024).toFixed(1);
  console.log(`\nWrote ${TOP250_PATH} (${kbSize} KB uncompressed)`);

  // 9. Update history.json
  const today = new Date().toISOString().slice(0, 10);
  const newIds = new Set(enriched.map((m) => m.imdbId));

  let history: HistoryFile = { entries: [], formerMovies: {} };
  if (existsSync(HISTORY_PATH)) {
    try {
      history = JSON.parse(readFileSync(HISTORY_PATH, 'utf8')) as HistoryFile;
    } catch {
      console.warn('Could not parse existing history.json; starting fresh.');
    }
  }

  if (previousIds) {
    const added = [...newIds].filter((id) => !previousIds!.has(id));
    const removed = [...previousIds].filter((id) => !newIds.has(id));

    if (added.length > 0 || removed.length > 0) {
      history.entries.push({ date: today, added, removed });

      // Track former films
      for (const imdbId of removed) {
        const prev = JSON.parse(readFileSync(TOP250_PATH, 'utf8')) as Top250File;
        const film = prev.movies.find((m) => m.imdbId === imdbId);
        if (film) {
          history.formerMovies[imdbId] = {
            imdbId,
            title: film.title,
            year: film.year,
            posterPath: film.posterPath,
            lastRank: film.rank,
            removedDate: today,
          };
        }
      }
    }
  }

  writeFileSync(HISTORY_PATH, JSON.stringify(history));
  console.log(`Wrote ${HISTORY_PATH}`);

  console.log('\n=== Done ===');
}

main().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
