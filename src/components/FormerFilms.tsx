import { historyData, userData } from '../state.ts';

const TMDB_IMG = 'https://image.tmdb.org/t/p/w185';

export function FormerFilms() {
  const history = historyData.value;
  const ud = userData.value;

  if (!history) return null;

  // Only show former films the user has marked seen
  const former = Object.values(history.formerMovies).filter((f) => ud.seen[f.imdbId]);
  if (former.length === 0) return null;

  return (
    <section style="margin-top:3rem;padding-top:1.5rem;border-top:1px solid var(--border)">
      <h2 style="font-size:1rem;font-weight:800;letter-spacing:0.04em;margin-bottom:0.75rem;color:var(--text-muted)">
        Former Top 250
      </h2>
      <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:1rem">
        Films you've seen that have since left the list. They don't count toward your 250.
      </p>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:0.75rem">
        {former.map((f) => (
          <div key={f.imdbId} style="opacity:0.6">
            <div style="aspect-ratio:2/3;background:var(--bg-raised);border-radius:4px;overflow:hidden">
              {f.posterPath ? (
                <img
                  src={`${TMDB_IMG}${f.posterPath}`}
                  alt={`${f.title} poster`}
                  width={92}
                  height={138}
                  loading="lazy"
                  style="width:100%;height:100%;object-fit:cover"
                />
              ) : null}
            </div>
            <div style="font-size:0.75rem;font-weight:600;margin-top:0.25rem">{f.title}</div>
            <div style="font-size:0.7rem;color:var(--text-muted)">
              {f.year} · was #{f.lastRank}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
