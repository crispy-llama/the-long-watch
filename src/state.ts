/**
 * Global application state using Preact signals.
 */

import { signal, computed } from '@preact/signals';
import type { Top250File, HistoryFile, UserData, FiltersState } from './types.ts';
import { DEFAULT_FILTERS } from './types.ts';
import { loadUserData } from './storage.ts';

// ── Data ─────────────────────────────────────────────────────────────────────

export const top250 = signal<Top250File | null>(null);
export const historyData = signal<HistoryFile | null>(null);
export const userData = signal<UserData>(loadUserData());

// ── UI ───────────────────────────────────────────────────────────────────────

export const filters = signal<FiltersState>(DEFAULT_FILTERS);
export const viewMode = signal<'grid' | 'list'>('grid');
export const selectedImdbId = signal<string | null>(null);
export const showStats = signal<boolean>(false);
export const showImport = signal<boolean>(false);
export const showCriteriaBanner = signal<boolean>(false);
export const showNewFilmsNotice = signal<boolean>(false);
export const newFilmIds = signal<string[]>([]);
export const removedFilmIds = signal<string[]>([]);
export const importUndo = signal<UserData | null>(null);

// ── Derived ───────────────────────────────────────────────────────────────────

export const seenCount = computed(() => Object.keys(userData.value.seen).length);

export const filteredMovies = computed(() => {
  const data = top250.value;
  if (!data) return [];
  const f = filters.value;
  const ud = userData.value;

  return data.movies.filter((m) => {
    if (f.view === 'seen' && !ud.seen[m.imdbId]) return false;
    if (f.view === 'unseen' && ud.seen[m.imdbId]) return false;
    if (f.genres.length > 0 && !f.genres.some((g) => m.genres.includes(g))) return false;
    if (f.decade !== null && Math.floor(m.year / 10) * 10 !== f.decade) return false;
    if (f.languages.length > 0 && !f.languages.includes(m.originalLanguage.code)) return false;
    if (f.countries.length > 0 && !m.originCountries.some((c) => f.countries.includes(c.code))) return false;
    if (f.runtime !== 'all') {
      const rt = m.runtime ?? 0;
      if (f.runtime === 'under2h' && rt >= 120) return false;
      if (f.runtime === '2to3h' && (rt < 120 || rt >= 180)) return false;
      if (f.runtime === 'over3h' && rt < 180) return false;
    }
    if (f.search) {
      const q = f.search.toLowerCase();
      if (
        !m.title.toLowerCase().includes(q) &&
        !(m.originalTitle?.toLowerCase().includes(q)) &&
        !m.directors.some((d) => d.toLowerCase().includes(q))
      )
        return false;
    }
    return true;
  });
  // data.movies is already sorted by rank from the build script
});
