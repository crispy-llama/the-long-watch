import { useEffect } from 'preact/hooks';
import {
  top250,
  historyData,
  userData,
  selectedImdbId,
  showStats,
  showImport,
  viewMode,
  showNewFilmsNotice,
  newFilmIds,
  removedFilmIds,
} from './state.ts';
import { loadUserData, saveLastSeenDataVersion, getSettings } from './storage.ts';
import { Header } from './components/Header.tsx';
import { CriteriaBanner } from './components/CriteriaBanner.tsx';
import { Toolbar } from './components/Toolbar.tsx';
import { FilmGrid } from './components/FilmGrid.tsx';
import { DetailPanel } from './components/DetailPanel.tsx';
import { StatsPanel } from './components/StatsPanel.tsx';
import { ImportExport } from './components/ImportExport.tsx';
import { NewFilmsNotice } from './components/NewFilmsNotice.tsx';
import { FormerFilms } from './components/FormerFilms.tsx';
import { Footer } from './components/Footer.tsx';

export function App() {
  useEffect(() => {
    // Load user data and apply saved settings
    const ud = loadUserData();
    userData.value = ud;
    const settings = getSettings(ud);
    viewMode.value = settings.view;

    // Apply saved theme
    const savedTheme = localStorage.getItem('longwatch:theme');
    if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);

    // Fetch top250.json
    fetch('/data/top250.json')
      .then((r) => r.json())
      .then((data) => {
        top250.value = data;

        // Check for new/removed films
        const lastSeen = ud.lastSeenDataVersion;
        if (lastSeen && lastSeen !== data.generatedAt) {
          fetch('/data/history.json')
            .then((r) => r.json())
            .then((hist) => {
              historyData.value = hist;
              // Find entries since last visit
              const newEntries = hist.entries.filter(
                (e: { date: string; added: string[]; removed: string[] }) =>
                  e.date > lastSeen.slice(0, 10),
              );
              const added = newEntries.flatMap((e: { added: string[] }) => e.added);
              const removed = newEntries.flatMap((e: { removed: string[] }) => e.removed);
              if (added.length > 0 || removed.length > 0) {
                newFilmIds.value = added;
                removedFilmIds.value = removed;
                showNewFilmsNotice.value = true;
              }
            })
            .catch(() => {/* history is optional */});
        } else if (!lastSeen) {
          saveLastSeenDataVersion(data.generatedAt);
        }

        // Load history in background
        fetch('/data/history.json')
          .then((r) => r.json())
          .then((hist) => { historyData.value = hist; })
          .catch(() => {});
      })
      .catch((err) => console.error('Failed to load top250.json:', err));

    // Persist theme changes
    const observer = new MutationObserver(() => {
      const theme = document.documentElement.getAttribute('data-theme');
      if (theme) localStorage.setItem('longwatch:theme', theme);
      else localStorage.removeItem('longwatch:theme');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const data = top250.value;

  return (
    <div class="app">
      <Header />

      {data && (
        <>
          <CriteriaBanner />
          {showNewFilmsNotice.value && <NewFilmsNotice generatedAt={data.generatedAt} />}
          <Toolbar />
        </>
      )}

      <main class="main" id="main-content">
        <div class="main-inner">
          {!data ? (
            <p style="text-align:center;padding:4rem;color:var(--text-muted)">Loading…</p>
          ) : (
            <>
              <FilmGrid />
              <FormerFilms />
            </>
          )}
        </div>
      </main>

      <Footer />

      {selectedImdbId.value && <DetailPanel />}
      {showStats.value && <StatsPanel />}
      {showImport.value && <ImportExport />}
    </div>
  );
}
