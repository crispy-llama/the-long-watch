/**
 * TMDB API client with per-IMDb-ID disk cache (30-day TTL, 6-month hard limit).
 */

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const CACHE_DIR = path.join(import.meta.dirname, '.cache', 'tmdb');
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;        // 30 days
const CACHE_MAX_AGE_MS = 6 * 30 * 24 * 60 * 60 * 1000; // ~6 months

function getToken(): string {
  const token = process.env.TMDB_READ_TOKEN;
  if (!token) throw new Error('TMDB_READ_TOKEN is not set. Add it to .env or the environment.');
  return token;
}

async function tmdbFetch(path_: string): Promise<unknown> {
  const url = `${TMDB_BASE}${path_}`;
  let retries = 3;
  while (retries-- > 0) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('Retry-After') ?? '5', 10);
      console.warn(`  TMDB rate limit, waiting ${retryAfter}s…`);
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`TMDB HTTP ${res.status} for ${url}`);
    return res.json();
  }
  throw new Error(`TMDB: exhausted retries for ${path_}`);
}

function cachePath(imdbId: string): string {
  return path.join(CACHE_DIR, `${imdbId}.json`);
}

function readCache(imdbId: string): TmdbMovieData | null {
  const p = cachePath(imdbId);
  if (!existsSync(p)) return null;
  try {
    const { cachedAt, data } = JSON.parse(readFileSync(p, 'utf8')) as {
      cachedAt: number;
      data: TmdbMovieData;
    };
    const age = Date.now() - cachedAt;
    if (age > CACHE_MAX_AGE_MS) return null; // expired beyond 6-month limit
    if (age > CACHE_TTL_MS) return null;      // stale (30 days)
    return data;
  } catch {
    return null;
  }
}

async function writeCache(imdbId: string, data: TmdbMovieData): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(cachePath(imdbId), JSON.stringify({ cachedAt: Date.now(), data }));
}

export type TmdbMovieData = {
  tmdbId: number;
  overview: string;
  tagline: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  directors: string[];
  cast: { name: string; character: string; profilePath: string | null }[];
  originalLanguage: { code: string; name: string };
  spokenLanguages: string[];
  originCountries: { code: string; name: string }[];
  trailerYouTubeKey: string | null;
  watchProviders: Record<string, { flatrate?: string[]; rent?: string[]; buy?: string[]; link?: string }>;
};

const langNames = new Intl.DisplayNames(['en'], { type: 'language' });
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

function safeLanguageName(code: string): string {
  try { return langNames.of(code) ?? code; } catch { return code; }
}

function safeRegionName(code: string): string {
  try { return regionNames.of(code) ?? code; } catch { return code; }
}

export async function fetchTmdbData(imdbId: string): Promise<TmdbMovieData | null> {
  const cached = readCache(imdbId);
  if (cached) return cached;

  // Step 1: resolve IMDb ID → TMDB ID
  let findRes: { movie_results: { id: number }[] };
  try {
    findRes = (await tmdbFetch(`/find/${imdbId}?external_source=imdb_id`)) as typeof findRes;
  } catch (err) {
    console.warn(`  TMDB find failed for ${imdbId}: ${err}`);
    return null;
  }

  const movie = findRes.movie_results[0];
  if (!movie) {
    console.warn(`  No TMDB match for ${imdbId}`);
    return null;
  }

  // Step 2: full movie details in one call
  type FullMovie = {
    id: number;
    overview: string;
    tagline: string;
    poster_path: string | null;
    backdrop_path: string | null;
    original_language: string;
    spoken_languages: { iso_639_1: string; name: string }[];
    origin_country: string[];
    production_countries: { iso_3166_1: string; name: string }[];
    credits: {
      crew: { job: string; name: string }[];
      cast: { name: string; character: string; profile_path: string | null; order: number }[];
    };
    videos: { results: { site: string; type: string; key: string; official: boolean }[] };
    'watch/providers': {
      results: Record<string, {
        flatrate?: { provider_name: string }[];
        rent?: { provider_name: string }[];
        buy?: { provider_name: string }[];
        link?: string;
      }>;
    };
  };

  let full: FullMovie;
  try {
    full = (await tmdbFetch(
      `/movie/${movie.id}?append_to_response=credits,watch%2Fproviders,videos`,
    )) as FullMovie;
  } catch (err) {
    console.warn(`  TMDB movie details failed for ${imdbId}: ${err}`);
    return null;
  }

  const directors = full.credits.crew
    .filter((c) => c.job === 'Director')
    .map((c) => c.name);

  const cast = full.credits.cast
    .sort((a, b) => a.order - b.order)
    .slice(0, 5)
    .map((c) => ({ name: c.name, character: c.character, profilePath: c.profile_path }));

  const trailer = full.videos.results.find(
    (v) => v.site === 'YouTube' && v.type === 'Trailer' && v.official,
  ) ?? full.videos.results.find((v) => v.site === 'YouTube' && v.type === 'Trailer');

  const originCodes =
    full.origin_country.length > 0
      ? full.origin_country
      : full.production_countries.map((c) => c.iso_3166_1);

  // Keep US and CA at minimum; keep all that appear
  const wpResults = full['watch/providers'].results ?? {};
  const watchProviders: TmdbMovieData['watchProviders'] = {};
  for (const [country, data] of Object.entries(wpResults)) {
    watchProviders[country] = {
      flatrate: data.flatrate?.map((p) => p.provider_name),
      rent: data.rent?.map((p) => p.provider_name),
      buy: data.buy?.map((p) => p.provider_name),
      link: data.link,
    };
  }

  const data: TmdbMovieData = {
    tmdbId: full.id,
    overview: full.overview,
    tagline: full.tagline || null,
    posterPath: full.poster_path,
    backdropPath: full.backdrop_path,
    directors,
    cast,
    originalLanguage: {
      code: full.original_language,
      name: safeLanguageName(full.original_language),
    },
    spokenLanguages: full.spoken_languages.map((l) =>
      safeLanguageName(l.iso_639_1),
    ),
    originCountries: originCodes.map((code) => ({
      code,
      name: safeRegionName(code),
    })),
    trailerYouTubeKey: trailer?.key ?? null,
    watchProviders,
  };

  await writeCache(imdbId, data);
  return data;
}
