import { userData, seenCount, top250, showStats, showImport, viewMode, filters, selectedImdbId } from '../state.ts';
import { saveSettings } from '../storage.ts';
import { DEFAULT_FILTERS } from '../types.ts';
import { BarsMark } from './BarsMark.tsx';
import { BarsProgress } from './BarsProgress.tsx';

export function Header() {
  const total = top250.value?.movies.length ?? 250;
  const seen = seenCount.value;

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute(
      'data-theme',
      current === 'dark' ? 'light' : 'dark',
    );
  }

  function toggleView() {
    const next = viewMode.value === 'grid' ? 'list' : 'grid';
    viewMode.value = next;
    saveSettings({ view: next });
  }

  function pickRandom() {
    const data = top250.value;
    if (!data) return;
    const ud = userData.value;
    const unseen = data.movies.filter((m) => !ud.seen[m.imdbId]);
    if (unseen.length === 0) return;
    const pick = unseen[Math.floor(Math.random() * unseen.length)];
    filters.value = { ...DEFAULT_FILTERS };
    selectedImdbId.value = pick.imdbId;
  }

  return (
    <header class="header">
      <div class="header-inner">
        <a class="wordmark" href="/" aria-label="The Long Watch — home">
          <BarsMark size={24} />
          <div>
            <div class="wordmark-text">The Long Watch</div>
            <div class="wordmark-by">
              by{' '}
              <a href="https://www.chromagraph.ca" style="color:inherit">
                chromagraph
              </a>
            </div>
          </div>
        </a>

        <div class="header-progress">
          <BarsProgress seen={seen} total={total} />
          <span>
            <strong>{seen}</strong> / {total}
          </span>
          {seen > 0 && (
            <span class="header-progress-pct">
              {Math.round((seen / total) * 100)}%
            </span>
          )}
        </div>

        <div class="header-actions">
          <button
            class="icon-btn"
            onClick={pickRandom}
            title="Pick a random unseen film"
            aria-label="Pick random unseen film"
          >
            🎲
          </button>
          <button
            class="icon-btn"
            onClick={() => (showStats.value = true)}
            title="Stats"
            aria-label="Show stats"
          >
            📊
          </button>
          <button
            class="icon-btn"
            onClick={() => (showImport.value = true)}
            title="Import / Export"
            aria-label="Import or export progress"
          >
            ↕
          </button>
          <button
            class="icon-btn"
            onClick={toggleView}
            title={viewMode.value === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
            aria-label="Toggle grid/list view"
          >
            {viewMode.value === 'grid' ? '☰' : '⊞'}
          </button>
          <button
            class="icon-btn"
            onClick={toggleTheme}
            title="Toggle light/dark mode"
            aria-label="Toggle theme"
          >
            ◑
          </button>
        </div>
      </div>
    </header>
  );
}
