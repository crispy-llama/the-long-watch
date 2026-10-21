import { top250, filters, sort, sortDesc } from '../state.ts';
import type { FiltersState, SortKey } from '../types.ts';
import { DEFAULT_FILTERS } from '../types.ts';
import { useRef } from 'preact/hooks';

export function Toolbar() {
  const data = top250.value;
  const f = filters.value;
  const searchRef = useRef<HTMLInputElement>(null);

  if (!data) return null;

  // Build decade options from the data
  const decades = [...new Set(data.movies.map((m) => Math.floor(m.year / 10) * 10))].sort(
    (a, b) => b - a,
  );

  // Build genre options
  const genres = [...new Set(data.movies.flatMap((m) => m.genres))].sort();

  function setFilter<K extends keyof FiltersState>(key: K, value: FiltersState[K]) {
    filters.value = { ...f, [key]: value };
  }

  function clearFilters() {
    filters.value = { ...DEFAULT_FILTERS };
  }

  const hasActiveFilters =
    f.view !== 'all' ||
    f.genres.length > 0 ||
    f.decade !== null ||
    f.runtime !== 'all' ||
    f.languages.length > 0 ||
    f.countries.length > 0 ||
    f.search !== '';

  // Keyboard shortcut: / focuses search
  if (typeof document !== 'undefined') {
    document.addEventListener(
      'keydown',
      (e) => {
        if (
          e.key === '/' &&
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA'
        ) {
          e.preventDefault();
          searchRef.current?.focus();
        }
      },
      { once: false },
    );
  }

  const sortOptions: { value: SortKey; label: string }[] = [
    { value: 'rank', label: 'Rank' },
    { value: 'year', label: 'Year' },
    { value: 'title', label: 'Title' },
    { value: 'rating', label: 'IMDb Rating' },
    { value: 'votes', label: 'Votes' },
    { value: 'runtime', label: 'Runtime' },
    { value: 'seenAt', label: 'Date Seen' },
  ];

  return (
    <div class="toolbar">
      <div class="toolbar-inner">
        {/* Search */}
        <div class="search-box">
          <span class="search-icon" aria-hidden="true">🔍</span>
          <input
            ref={searchRef}
            type="search"
            placeholder="Search… (/)"
            value={f.search}
            onInput={(e) => setFilter('search', (e.target as HTMLInputElement).value)}
            aria-label="Search films"
          />
        </div>

        {/* View filter chips */}
        <div class="filter-chips">
          {(['all', 'seen', 'unseen'] as const).map((v) => (
            <button
              key={v}
              class={`chip${f.view === v ? ' active' : ''}`}
              onClick={() => setFilter('view', v)}
              aria-pressed={f.view === v}
            >
              {v === 'all' ? 'All' : v === 'seen' ? '✓ Seen' : '○ Unseen'}
            </button>
          ))}
        </div>

        {/* Genre filter */}
        <select
          class="select-filter"
          value={f.genres[0] ?? ''}
          onChange={(e) => {
            const val = (e.target as HTMLSelectElement).value;
            setFilter('genres', val ? [val] : []);
          }}
          aria-label="Filter by genre"
        >
          <option value="">All genres</option>
          {genres.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        {/* Decade filter */}
        <select
          class="select-filter"
          value={f.decade ?? ''}
          onChange={(e) => {
            const val = (e.target as HTMLSelectElement).value;
            setFilter('decade', val ? parseInt(val, 10) : null);
          }}
          aria-label="Filter by decade"
        >
          <option value="">All decades</option>
          {decades.map((d) => (
            <option key={d} value={d}>
              {d}s
            </option>
          ))}
        </select>

        {/* Runtime filter */}
        <select
          class="select-filter"
          value={f.runtime}
          onChange={(e) =>
            setFilter('runtime', (e.target as HTMLSelectElement).value as FiltersState['runtime'])
          }
          aria-label="Filter by runtime"
        >
          <option value="all">Any length</option>
          <option value="under2h">Under 2h</option>
          <option value="2to3h">2–3 hours</option>
          <option value="over3h">Over 3h</option>
        </select>

        {hasActiveFilters && (
          <button class="chip" onClick={clearFilters}>
            ✕ Clear filters
          </button>
        )}

        <div class="toolbar-right">
          {/* Sort */}
          <select
            class="select-filter"
            value={sort.value}
            onChange={(e) => {
              sort.value = (e.target as HTMLSelectElement).value as SortKey;
            }}
            aria-label="Sort by"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            class="icon-btn"
            onClick={() => (sortDesc.value = !sortDesc.value)}
            title={sortDesc.value ? 'Sort descending' : 'Sort ascending'}
            aria-label="Toggle sort direction"
            style="font-size:1rem"
          >
            {sortDesc.value ? '↓' : '↑'}
          </button>
        </div>
      </div>
    </div>
  );
}
