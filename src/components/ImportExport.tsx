import { useSignal } from '@preact/signals';
import { top250, userData, showImport, importUndo } from '../state.ts';
import {
  loadUserData,
  mergeUserData,
  replaceUserData,
} from '../storage.ts';
import type { UserData } from '../types.ts';

// ── Export helpers ────────────────────────────────────────────────────────────

function exportJSON() {
  const data = loadUserData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const date = new Date().toISOString().slice(0, 10);
  download(blob, `the-long-watch-${date}.json`);
}

function exportCSV() {
  const data = loadUserData();
  const movies = top250.value?.movies ?? [];
  const rows = [
    'imdb_id,title,year,rank,seen,seen_at,rating,note',
    ...movies.map((m) => {
      const s = data.seen[m.imdbId];
      return [
        m.imdbId,
        csvEsc(m.title),
        m.year,
        m.rank,
        s ? 'true' : 'false',
        s?.seenAt ?? '',
        s?.rating ?? '',
        csvEsc(s?.note ?? ''),
      ].join(',');
    }),
  ];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const date = new Date().toISOString().slice(0, 10);
  download(blob, `the-long-watch-${date}.csv`);
}

function csvEsc(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Parsers ──────────────────────────────────────────────────────────────────

type ParseResult = {
  seen: Record<string, { seenAt?: string; rating?: number }>;
  source: string;
  matchCount: number;
  totalCount: number;
};

function parseOwnJSON(text: string): ParseResult {
  const data = JSON.parse(text) as UserData;
  if (data.version !== 1 || typeof data.seen !== 'object') {
    throw new Error('Not a valid The Long Watch export file.');
  }
  return {
    seen: data.seen,
    source: 'Long Watch JSON',
    matchCount: Object.keys(data.seen).length,
    totalCount: Object.keys(data.seen).length,
  };
}

function parseImdbRatingsCSV(text: string): ParseResult {
  const lines = text.trim().split('\n');
  const header = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const constIdx = header.indexOf('Const');
  const ratingIdx = header.indexOf('Your Rating');
  const dateIdx = header.indexOf('Date Rated');
  if (constIdx === -1) throw new Error('Could not find "Const" column — is this an IMDb ratings export?');

  const movies = top250.value?.movies ?? [];
  const imdbIds = new Set(movies.map((m) => m.imdbId));
  const seen: ParseResult['seen'] = {};
  let total = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const id = cols[constIdx]?.replace(/^"|"$/g, '');
    if (!id?.startsWith('tt')) continue;
    total++;
    if (imdbIds.has(id)) {
      seen[id] = {
        seenAt: cols[dateIdx]?.replace(/^"|"$/g, '') || undefined,
        rating: ratingIdx !== -1 ? parseInt(cols[ratingIdx], 10) || undefined : undefined,
      };
    }
  }

  return { seen, source: 'IMDb ratings CSV', matchCount: Object.keys(seen).length, totalCount: total };
}

function parseImdbListCSV(text: string): ParseResult {
  const lines = text.trim().split('\n');
  const header = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const constIdx = header.indexOf('Const');
  if (constIdx === -1) throw new Error('Could not find "Const" column — is this an IMDb list export?');

  const movies = top250.value?.movies ?? [];
  const imdbIds = new Set(movies.map((m) => m.imdbId));
  const seen: ParseResult['seen'] = {};
  let total = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const id = cols[constIdx]?.replace(/^"|"$/g, '');
    if (!id?.startsWith('tt')) continue;
    total++;
    if (imdbIds.has(id)) seen[id] = {};
  }

  return { seen, source: 'IMDb list CSV', matchCount: Object.keys(seen).length, totalCount: total };
}

function parseLetterboxdCSV(text: string): ParseResult {
  const lines = text.trim().split('\n');
  const header = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const nameIdx = header.indexOf('Name');
  const yearIdx = header.indexOf('Year');
  const dateIdx = header.indexOf('Watched Date');
  const ratingIdx = header.indexOf('Rating');
  if (nameIdx === -1) throw new Error('Could not find "Name" column — is this a Letterboxd watched.csv?');

  const movies = top250.value?.movies ?? [];
  const seen: ParseResult['seen'] = {};
  let total = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const name = cols[nameIdx]?.replace(/^"|"$/g, '');
    const year = parseInt(cols[yearIdx] ?? '', 10);
    if (!name) continue;
    total++;

    const match = movies.find(
      (m) =>
        m.title.toLowerCase() === name.toLowerCase() &&
        (!year || m.year === year),
    );
    if (match) {
      seen[match.imdbId] = {
        seenAt: cols[dateIdx]?.replace(/^"|"$/g, '') || undefined,
        rating: ratingIdx !== -1 ? Math.round(parseFloat(cols[ratingIdx] ?? '0') * 2) || undefined : undefined,
      };
    }
  }

  return { seen, source: 'Letterboxd CSV', matchCount: Object.keys(seen).length, totalCount: total };
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      result.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

function detectFormat(text: string, filename: string): ParseResult {
  if (filename.endsWith('.json') || text.trim().startsWith('{')) {
    return parseOwnJSON(text);
  }
  if (filename.toLowerCase().includes('watched') || filename.toLowerCase().includes('letterboxd')) {
    return parseLetterboxdCSV(text);
  }
  // Detect IMDb CSV by header
  const firstLine = text.split('\n')[0];
  if (firstLine.includes('Your Rating') || firstLine.includes('Date Rated')) {
    return parseImdbRatingsCSV(text);
  }
  if (firstLine.includes('Const')) {
    return parseImdbListCSV(text);
  }
  throw new Error('Unrecognised file format. Accepted: Long Watch JSON, IMDb ratings/list CSV, Letterboxd watched.csv.');
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ImportExport() {
  const parsed = useSignal<ParseResult | null>(null);
  const error = useSignal<string | null>(null);
  const dragOver = useSignal(false);

  function close() {
    showImport.value = false;
    parsed.value = null;
    error.value = null;
  }

  async function processFile(file: File) {
    const text = await file.text();
    try {
      parsed.value = detectFormat(text, file.name);
      error.value = null;
    } catch (e) {
      error.value = (e as Error).message;
      parsed.value = null;
    }
  }

  function onFileInput(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) processFile(file);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragOver.value = false;
    const file = e.dataTransfer?.files[0];
    if (file) processFile(file);
  }

  function applyImport(mode: 'merge' | 'replace') {
    if (!parsed.value) return;
    importUndo.value = loadUserData();
    if (mode === 'replace') {
      replaceUserData({ version: 1, updatedAt: new Date().toISOString(), seen: parsed.value.seen });
    } else {
      mergeUserData({ version: 1, updatedAt: new Date().toISOString(), seen: parsed.value.seen });
    }
    userData.value = loadUserData();
    close();
  }

  const currentSeen = Object.keys(userData.value.seen).length;

  return (
    <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Import / Export"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div class="modal">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
          <h2 class="modal-title" style="margin:0">Import / Export</h2>
          <button class="icon-btn" onClick={close} aria-label="Close">✕</button>
        </div>

        {/* Export */}
        <div class="modal-section">
          <div class="modal-section-title">Export your progress</div>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
            <button class="btn btn-primary" onClick={exportJSON}>
              ↓ Export JSON
            </button>
            <button class="btn btn-secondary" onClick={exportCSV}>
              ↓ Export CSV
            </button>
          </div>
          <p style="font-size:0.8rem;color:var(--text-muted);margin-top:0.5rem">
            Your progress is saved in this browser only. Export a backup or use it to move to another device.
          </p>
        </div>

        {/* Import */}
        <div class="modal-section">
          <div class="modal-section-title">Import progress</div>
          <div
            class={`file-drop${dragOver.value ? ' drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); dragOver.value = true; }}
            onDragLeave={() => (dragOver.value = false)}
            onDrop={onDrop}
            onClick={() => document.getElementById('file-input')?.click()}
            role="button"
            tabIndex={0}
            aria-label="Drop a file here or click to browse"
          >
            Drop a file here or click to browse
            <br />
            <span style="font-size:0.75rem">
              Accepts: Long Watch JSON · IMDb ratings CSV · IMDb list CSV · Letterboxd watched.csv
            </span>
          </div>
          <input id="file-input" type="file" accept=".json,.csv" style="display:none" onChange={onFileInput} />

          {error.value && (
            <p style="color:#c00;font-size:0.875rem;margin-top:0.5rem">{error.value}</p>
          )}

          {parsed.value && (
            <div class="import-summary">
              <p style="font-weight:600">{parsed.value.source}</p>
              <p style="margin-top:0.25rem;color:var(--text-muted);font-size:0.875rem">
                {parsed.value.matchCount} of {parsed.value.totalCount} films matched the Top 250.
                You currently have {currentSeen} films marked seen.
              </p>
              <div style="display:flex;gap:0.5rem;margin-top:0.75rem;flex-wrap:wrap">
                <button class="btn btn-primary" onClick={() => applyImport('merge')}>
                  Merge (keep both)
                </button>
                <button class="btn btn-secondary" onClick={() => applyImport('replace')}>
                  Replace
                </button>
              </div>
            </div>
          )}
        </div>

        {importUndo.value && (
          <div class="modal-section">
            <button
              class="btn btn-secondary"
              onClick={() => {
                replaceUserData(importUndo.value!);
                userData.value = loadUserData();
                importUndo.value = null;
              }}
            >
              ↩ Undo last import
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
