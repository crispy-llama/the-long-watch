import { filteredMovies, viewMode, userData, selectedImdbId } from '../state.ts';
import { toggleSeen } from '../storage.ts';
import { FilmCard } from './FilmCard.tsx';

const TMDB_IMG_SM = 'https://image.tmdb.org/t/p/w185';

export function FilmGrid() {
  const movies = filteredMovies.value;
  const mode = viewMode.value;
  const ud = userData.value;

  if (movies.length === 0) {
    return (
      <p style="text-align:center;padding:3rem;color:var(--text-muted)">
        No films match the current filters.
      </p>
    );
  }

  if (mode === 'list') {
    return (
      <table class="film-list" aria-label="Top 250 films list">
        <thead>
          <tr>
            <th>#</th>
            <th>Title</th>
            <th>Year</th>
            <th>Rating</th>
            <th aria-label="Seen"></th>
          </tr>
        </thead>
        <tbody>
          {movies.map((m) => {
            const seen = !!ud.seen[m.imdbId];
            return (
              <tr
                key={m.imdbId}
                class={seen ? 'seen' : ''}
                onClick={() => (selectedImdbId.value = m.imdbId)}
              >
                <td>{m.rank}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:0.5rem">
                    {m.posterPath ? (
                      <img
                        class="list-poster-thumb"
                        src={`${TMDB_IMG_SM}${m.posterPath}`}
                        alt=""
                        width={32}
                        height={48}
                        loading="lazy"
                      />
                    ) : (
                      <div class="list-poster-thumb" />
                    )}
                    <div>
                      <div style="font-weight:600">{m.title}</div>
                      {m.originalTitle && m.originalTitle !== m.title && (
                        <div style="font-size:0.75rem;color:var(--text-muted)">{m.originalTitle}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td>{m.year}</td>
                <td>⭐ {m.imdbRating.toFixed(1)}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    class="seen-checkbox"
                    checked={seen}
                    onChange={() => {
                      const data = toggleSeen(m.imdbId);
                      userData.value = data;
                    }}
                    aria-label={`Mark ${m.title} as ${seen ? 'unseen' : 'seen'}`}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  return (
    <div class="film-grid" aria-label="Top 250 films grid">
      {movies.map((m) => (
        <FilmCard key={m.imdbId} movie={m} />
      ))}
    </div>
  );
}
