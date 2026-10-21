/**
 * Downloads and parses IMDb non-commercial datasets.
 * title.ratings.tsv.gz  → ratings map
 * title.basics.tsv.gz   → basics (streamed; never fully in memory)
 */

import { createReadStream, createWriteStream, existsSync, statSync } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { CRITERIA } from './criteria.ts';

const DATASET_BASE = 'https://datasets.imdbws.com';
const DOWNLOADS_DIR = path.join(import.meta.dirname, 'downloads');

export type RatingRow = { rating: number; votes: number };
export type BasicsRow = {
  tconst: string;
  primaryTitle: string;
  originalTitle: string;
  startYear: number;
  runtimeMinutes: number | null;
  genres: string[];
};

/** Download a file if newer than the cached copy (uses If-Modified-Since). */
async function downloadIfNewer(url: string, dest: string): Promise<string | null> {
  await mkdir(DOWNLOADS_DIR, { recursive: true });

  let ifModifiedSince: string | undefined;
  if (existsSync(dest)) {
    ifModifiedSince = new Date(statSync(dest).mtime).toUTCString();
  }

  const headers: Record<string, string> = {};
  if (ifModifiedSince) headers['If-Modified-Since'] = ifModifiedSince;

  console.log(`Fetching ${url}…`);
  const res = await fetch(url, { headers });

  if (res.status === 304) {
    console.log(`  → cached (not modified)`);
    return null; // signal: use existing file
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);

  const lastModified = res.headers.get('Last-Modified') ?? null;
  const writer = createWriteStream(dest);
  const reader = res.body!.getReader();

  await new Promise<void>((resolve, reject) => {
    function pump() {
      reader.read().then(({ done, value }) => {
        if (done) { writer.end(); return; }
        writer.write(value, (err) => { if (err) reject(err); else pump(); });
      }).catch(reject);
    }
    writer.on('finish', resolve);
    writer.on('error', reject);
    pump();
  });

  return lastModified;
}

/** Stream a .tsv.gz file and yield parsed rows as string[] arrays. */
async function* streamTsv(gzPath: string): AsyncGenerator<string[]> {
  const gz = createReadStream(gzPath).pipe(createGunzip());
  const rl = createInterface({ input: gz, crlfDelay: Infinity });
  let headerSkipped = false;
  for await (const line of rl) {
    if (!headerSkipped) { headerSkipped = true; continue; }
    yield line.split('\t');
  }
}

/** Build a Map<tconst, RatingRow> for films meeting the vote threshold. */
export async function loadRatings(): Promise<{ ratings: Map<string, RatingRow>; datasetDate: string }> {
  const dest = path.join(DOWNLOADS_DIR, 'title.ratings.tsv.gz');
  const lastModified = await downloadIfNewer(`${DATASET_BASE}/title.ratings.tsv.gz`, dest);

  const ratings = new Map<string, RatingRow>();
  for await (const cols of streamTsv(dest)) {
    const [tconst, avgStr, votesStr] = cols;
    const votes = parseInt(votesStr, 10);
    if (votes >= CRITERIA.minVotes) {
      ratings.set(tconst, { rating: parseFloat(avgStr), votes });
    }
  }
  console.log(`Loaded ${ratings.size} titles with >= ${CRITERIA.minVotes.toLocaleString()} votes`);

  const datasetDate =
    lastModified ??
    new Date(statSync(dest).mtime).toISOString().slice(0, 10);

  return { ratings, datasetDate };
}

/** Stream title.basics and yield rows that pass genre/type/adult filters for IDs in the ratings map. */
export async function* streamFilteredBasics(
  ratingsMap: Map<string, RatingRow>,
): AsyncGenerator<BasicsRow> {
  const dest = path.join(DOWNLOADS_DIR, 'title.basics.tsv.gz');
  await downloadIfNewer(`${DATASET_BASE}/title.basics.tsv.gz`, dest);

  // cols: tconst titleType primaryTitle originalTitle isAdult startYear endYear runtimeMinutes genres
  for await (const cols of streamTsv(dest)) {
    const [tconst, titleType, primaryTitle, originalTitle, isAdult, startYear, , runtimeStr, genresStr] = cols;

    if (!ratingsMap.has(tconst)) continue;
    if (!CRITERIA.titleTypes.includes(titleType)) continue;
    if (CRITERIA.excludeAdult && isAdult === '1') continue;

    const genres = genresStr === '\\N' ? [] : genresStr.split(',');
    if (CRITERIA.excludeGenres.some((g) => genres.includes(g))) continue;

    const year = parseInt(startYear, 10);
    if (isNaN(year)) continue;

    yield {
      tconst,
      primaryTitle,
      originalTitle,
      startYear: year,
      runtimeMinutes: runtimeStr === '\\N' ? null : parseInt(runtimeStr, 10),
      genres,
    };
  }
}

/** Clean up downloaded files (call after a successful run if disk space matters). */
export async function cleanDownloads(): Promise<void> {
  for (const name of ['title.ratings.tsv.gz', 'title.basics.tsv.gz']) {
    const p = path.join(DOWNLOADS_DIR, name);
    if (existsSync(p)) await unlink(p);
  }
}
