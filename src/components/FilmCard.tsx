import type { Movie } from '../types.ts';
import { userData, selectedImdbId } from '../state.ts';
import { toggleSeen } from '../storage.ts';

const TMDB_IMG = 'https://image.tmdb.org/t/p/w342';

type Props = { movie: Movie };

export function FilmCard({ movie }: Props) {
  const seen = !!userData.value.seen[movie.imdbId];

  function onSeenToggle(e: Event) {
    e.stopPropagation();
    const data = toggleSeen(movie.imdbId);
    userData.value = data;
  }

  function onCardClick() {
    selectedImdbId.value = movie.imdbId;
  }

  function onCardKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectedImdbId.value = movie.imdbId;
    }
  }

  return (
    <article
      id={`film-${movie.imdbId}`}
      class={`film-card${seen ? ' seen' : ''}`}
      onClick={onCardClick}
      onKeyDown={onCardKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${movie.title} (${movie.year}), rank ${movie.rank}${seen ? ', seen' : ''}`}
    >
      <div class="poster-wrap">
        {movie.posterPath ? (
          <img
            src={`${TMDB_IMG}${movie.posterPath}`}
            alt={`${movie.title} (${movie.year}) poster`}
            width={342}
            height={513}
            loading="lazy"
          />
        ) : (
          <div class="poster-placeholder">
            <span>{movie.title}</span>
          </div>
        )}
      </div>

      <div class="film-card-meta">
        <div class="film-card-rank">#{movie.rank}</div>
        <div class="film-card-title">{movie.title}</div>
        <div class="film-card-year">{movie.year}</div>
      </div>

      <button
        class={`film-card-seen-row${seen ? ' seen' : ''}`}
        onClick={onSeenToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSeenToggle(e); } }}
        aria-pressed={seen}
        aria-label={`${seen ? 'Unmark' : 'Mark'} ${movie.title} as seen`}
      >
        {seen ? '✓ Seen' : 'Mark as seen'}
      </button>
    </article>
  );
}
