import { filteredMovies, viewMode, userData, sort, sortDesc, selectedImdbId } from '../state.ts';
import { toggleSeen } from '../storage.ts';
import { FilmCard } from './FilmCard.tsx';
import type { SortKey } from '../types.ts';

const TMDB_IMG_SM = 'https://image.tmdb.org/t/p/w185';

function flagEmoji(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}

const SORT_COLS: { key: SortKey; label: string }[] = [
  { key: 'rank', label: '#' },
  { key: 'title', label: 'Title' },
  { key: 'year', label: 'Year' },
  { key: 'runtime', label: 'Runtime' },
  { key: 'rating', label: 'Rating' },
  { key: 'votes', label: 'Votes' },
];

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
      <div style="overflow-x:auto">
        <table class="film-list" aria-label="Top 250 films list">
          <thead>
            <tr>
              {SORT_COLS.map(({ key, label }) => (
                <th
                  key={key}
                  class={sort.value === key ? 'sorted' : ''}
                  onClick={() => {
                    if (sort.value === key) sortDesc.value = !sortDesc.value;
                    else { sort.value = key; sortDesc.value = key === 'rank' ? false : true; }
                  }}
                  aria-sort={
                    sort.value === key
                      ? sortDesc.value
                        ? 'descending'
                        : 'ascending'
                      : undefined
                  }
                >
                  {label}{sort.value === key ? (sortDesc.value ? ' ↓' : ' ↑') : ''}
                </th>
              ))}
              <th>Language</th>
              <th>Country</th>
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
                      <span style="font-weight:600">{m.title}</span>
                      {m.originalTitle && (
                        <span style="font-size:0.75rem;color:var(--text-muted)">
                          {m.originalTitle}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{m.year}</td>
                  <td>{m.runtime ? `${m.runtime} min` : '—'}</td>
                  <td>⭐ {m.imdbRating.toFixed(1)}</td>
                  <td>{m.imdbVotes.toLocaleString()}</td>
                  <td>{m.originalLanguage.name}</td>
                  <td>
                    {m.originCountries[0]
                      ? `${flagEmoji(m.originCountries[0].code)} ${m.originCountries[0].name}`
                      : '—'}
                  </td>
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
      </div>
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
