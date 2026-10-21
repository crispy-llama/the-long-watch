import { useSignal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { userData, seenCount, top250, showStats, showImport, viewMode, filters, selectedImdbId } from '../state.ts';
import { saveSettings } from '../storage.ts';
import { DEFAULT_FILTERS } from '../types.ts';
import { BarsMark } from './BarsMark.tsx';
import { BarsProgress } from './BarsProgress.tsx';

export function Header() {
  const total = top250.value?.movies.length ?? 250;
  const seen = seenCount.value;
  const menuOpen = useSignal(false);
  const menuRef = useRef<HTMLDivElement>(null);

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute(
      'data-theme',
      current === 'dark' ? 'light' : 'dark',
    );
    menuOpen.value = false;
  }

  function toggleView() {
    const next = viewMode.value === 'grid' ? 'list' : 'grid';
    viewMode.value = next;
    saveSettings({ view: next });
    menuOpen.value = false;
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
    menuOpen.value = false;
  }

  // Close menu when clicking outside
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (menuOpen.value && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        menuOpen.value = false;
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
    (!document.documentElement.getAttribute('data-theme') &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

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

        {/* Progress — bars hidden on mobile, count always shown */}
        <div class="header-progress">
          <span class="header-progress-bars">
            <BarsProgress seen={seen} total={total} />
          </span>
          <span>
            <strong>{seen}</strong> / {total}
          </span>
          {seen > 0 && (
            <span class="header-progress-pct">
              {Math.round((seen / total) * 100)}%
            </span>
          )}
        </div>

        {/* Desktop action buttons */}
        <div class="header-actions header-actions-desktop">
          <button class="icon-btn" onClick={pickRandom} title="Pick a random unseen film" aria-label="Pick random unseen film">🎲</button>
          <button class="icon-btn" onClick={() => (showStats.value = true)} title="Stats" aria-label="Show stats">📊</button>
          <button class="icon-btn" onClick={() => (showImport.value = true)} title="Import / Export" aria-label="Import or export progress">↕</button>
          <button class="icon-btn" onClick={toggleView} title={viewMode.value === 'grid' ? 'Switch to list view' : 'Switch to grid view'} aria-label="Toggle view">
            {viewMode.value === 'grid' ? '☰' : '⊞'}
          </button>
          <button class="icon-btn" onClick={toggleTheme} title="Toggle light/dark mode" aria-label="Toggle theme">◑</button>
        </div>

        {/* Mobile hamburger */}
        <div class="header-menu-wrap" ref={menuRef}>
          <button
            class="icon-btn header-hamburger"
            onClick={() => (menuOpen.value = !menuOpen.value)}
            aria-label="Menu"
            aria-expanded={menuOpen.value}
            aria-haspopup="menu"
          >
            {menuOpen.value ? '✕' : '☰'}
          </button>

          {menuOpen.value && (
            <div class="header-dropdown" role="menu">
              <button class="header-dropdown-item" role="menuitem" onClick={pickRandom}>
                <span class="header-dropdown-icon">🎲</span> Pick random unseen
              </button>
              <button class="header-dropdown-item" role="menuitem" onClick={() => { showStats.value = true; menuOpen.value = false; }}>
                <span class="header-dropdown-icon">📊</span> Stats
              </button>
              <button class="header-dropdown-item" role="menuitem" onClick={() => { showImport.value = true; menuOpen.value = false; }}>
                <span class="header-dropdown-icon">↕</span> Import / Export
              </button>
              <button class="header-dropdown-item" role="menuitem" onClick={toggleView}>
                <span class="header-dropdown-icon">{viewMode.value === 'grid' ? '☰' : '⊞'}</span>
                {viewMode.value === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
              </button>
              <button class="header-dropdown-item" role="menuitem" onClick={toggleTheme}>
                <span class="header-dropdown-icon">◑</span>
                {isDark ? 'Light mode' : 'Dark mode'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
