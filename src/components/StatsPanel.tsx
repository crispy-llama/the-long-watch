import { top250, userData, showStats, historyData } from '../state.ts';

const BAR_COLORS = ['#B90000', '#FA5A00', '#FFB400', '#0778B5', '#6AA637', '#951E86'];

type BreakdownItem = { label: string; seen: number; total: number };

function breakdownRows(items: BreakdownItem[]) {
  return items
    .filter((i) => i.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);
}

export function StatsPanel() {
  const data = top250.value;
  const ud = userData.value;
  const history = historyData.value;

  function close() {
    showStats.value = false;
  }

  if (!data) return null;

  const movies = data.movies;
  const seenIds = new Set(Object.keys(ud.seen));
  const seenCount = seenIds.size;
  const total = movies.length;
  const pct = total > 0 ? Math.round((seenCount / total) * 100) : 0;

  // Hours
  const seenMovies = movies.filter((m) => seenIds.has(m.imdbId));
  const hoursWatched = Math.round(
    seenMovies.reduce((s, m) => s + (m.runtime ?? 0), 0) / 60,
  );
  const unseenMovies = movies.filter((m) => !seenIds.has(m.imdbId));
  const hoursLeft = Math.round(
    unseenMovies.reduce((s, m) => s + (m.runtime ?? 0), 0) / 60,
  );

  // Decade breakdown
  const decadeMap = new Map<number, { seen: number; total: number }>();
  for (const m of movies) {
    const d = Math.floor(m.year / 10) * 10;
    const entry = decadeMap.get(d) ?? { seen: 0, total: 0 };
    entry.total++;
    if (seenIds.has(m.imdbId)) entry.seen++;
    decadeMap.set(d, entry);
  }
  const decadeRows: BreakdownItem[] = [...decadeMap.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([d, v]) => ({ label: `${d}s`, ...v }));

  // Genre breakdown
  const genreMap = new Map<string, { seen: number; total: number }>();
  for (const m of movies) {
    for (const g of m.genres) {
      const entry = genreMap.get(g) ?? { seen: 0, total: 0 };
      entry.total++;
      if (seenIds.has(m.imdbId)) entry.seen++;
      genreMap.set(g, entry);
    }
  }
  const genreRows: BreakdownItem[] = breakdownRows(
    [...genreMap.entries()].map(([label, v]) => ({ label, ...v })),
  );

  // Language breakdown
  const langMap = new Map<string, { seen: number; total: number; name: string }>();
  for (const m of movies) {
    const key = m.originalLanguage.code;
    const entry = langMap.get(key) ?? { seen: 0, total: 0, name: m.originalLanguage.name };
    entry.total++;
    if (seenIds.has(m.imdbId)) entry.seen++;
    langMap.set(key, entry);
  }
  const langRows: BreakdownItem[] = breakdownRows(
    [...langMap.values()].map((v) => ({ label: v.name, seen: v.seen, total: v.total })),
  );

  // Country breakdown
  const countryMap = new Map<string, { seen: number; total: number; name: string }>();
  for (const m of movies) {
    for (const c of m.originCountries) {
      const entry = countryMap.get(c.code) ?? { seen: 0, total: 0, name: c.name };
      entry.total++;
      if (seenIds.has(m.imdbId)) entry.seen++;
      countryMap.set(c.code, entry);
    }
  }
  const countryRows: BreakdownItem[] = breakdownRows(
    [...countryMap.values()].map((v) => ({ label: v.name, seen: v.seen, total: v.total })),
  );

  // Highest/lowest unseen
  const highestUnseen = unseenMovies[0];
  const lowestUnseen = unseenMovies[unseenMovies.length - 1];

  // Former films the user has seen
  const formerSeen = history
    ? Object.values(history.formerMovies).filter((f) => seenIds.has(f.imdbId))
    : [];

  function BreakdownSection({ title, rows }: { title: string; rows: BreakdownItem[] }) {
    if (rows.length === 0) return null;
    const maxTotal = Math.max(...rows.map((r) => r.total));
    return (
      <div class="stat-block">
        <div class="stat-label">{title}</div>
        {rows.map((row, i) => (
          <div key={row.label} class="breakdown-row">
            <span class="breakdown-label" title={row.label}>{row.label}</span>
            <div class="breakdown-bar-wrap">
              <div
                class="breakdown-bar"
                style={{
                  width: `${(row.total / maxTotal) * 100}%`,
                  background: BAR_COLORS[i % BAR_COLORS.length],
                  opacity: 0.4,
                }}
              />
              <div
                class="breakdown-bar"
                style={{
                  width: `${row.total > 0 ? (row.seen / row.total) * 100 : 0}%`,
                  background: BAR_COLORS[i % BAR_COLORS.length],
                  marginTop: '-6px',
                  position: 'relative',
                }}
              />
            </div>
            <span class="breakdown-count">{row.seen}/{row.total}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div class="stats-overlay" role="dialog" aria-modal="true" aria-label="Stats"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div class="stats-panel">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
          <h2 class="stats-title" style="margin:0">Your Stats</h2>
          <button class="icon-btn" onClick={close} aria-label="Close stats">✕</button>
        </div>

        <div class="stat-block">
          <div class="stat-label">Seen</div>
          <div class="stat-value">{seenCount} / {total}</div>
          <div class="stat-sub">{pct}% of the Top 250</div>
        </div>

        <div class="stat-block">
          <div class="stat-label">Hours watched</div>
          <div class="stat-value">{hoursWatched.toLocaleString()}h</div>
          <div class="stat-sub">{hoursLeft.toLocaleString()}h remaining</div>
        </div>

        {highestUnseen && (
          <div class="stat-block">
            <div class="stat-label">Highest unseen</div>
            <div style="font-weight:600">#{highestUnseen.rank} — {highestUnseen.title} ({highestUnseen.year})</div>
          </div>
        )}

        {lowestUnseen && (
          <div class="stat-block">
            <div class="stat-label">Lowest unseen</div>
            <div style="font-weight:600">#{lowestUnseen.rank} — {lowestUnseen.title} ({lowestUnseen.year})</div>
          </div>
        )}

        <BreakdownSection title="By decade" rows={decadeRows} />
        <BreakdownSection title="By genre" rows={genreRows} />
        <BreakdownSection title="By language" rows={langRows} />
        <BreakdownSection title="By country" rows={countryRows} />

        {formerSeen.length > 0 && (
          <div class="stat-block">
            <div class="stat-label">Former Top 250 films you've seen</div>
            {formerSeen.map((f) => (
              <div key={f.imdbId} style="font-size:0.8rem;color:var(--text-muted)">
                {f.title} ({f.year}) — was #{f.lastRank}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
