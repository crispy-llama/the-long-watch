import { useEffect } from 'preact/hooks';
import { top250, selectedImdbId, userData } from '../state.ts';
import { toggleSeen } from '../storage.ts';
import type { Movie } from '../types.ts';

const TMDB_IMG_W500 = 'https://image.tmdb.org/t/p/w500';
const TMDB_IMG_W185 = 'https://image.tmdb.org/t/p/w185';
const TMDB_IMG_W1280 = 'https://image.tmdb.org/t/p/w1280';

function flagEmoji(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}

function formatRuntime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function close() {
  selectedImdbId.value = null;
}

export function DetailPanel() {
  const imdbId = selectedImdbId.value;
  const data = top250.value;
  if (!imdbId || !data) return null;

  const movie: Movie | undefined = data.movies.find((m) => m.imdbId === imdbId);
  if (!movie) return null;

  const seen = !!userData.value.seen[imdbId];

  // Trap focus and close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  function toggleSeenHandler() {
    if (!imdbId) return;
    const updated = toggleSeen(imdbId);
    userData.value = updated;
  }

  const userCountry = userData.value.settings?.country ?? 'CA';
  const providers = movie.watchProviders?.[userCountry];

  return (
    <div class="overlay" role="dialog" aria-modal="true" aria-label={`${movie.title} details`}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div class="detail-panel">
        <button class="detail-close" onClick={close} aria-label="Close details">✕</button>

        {/* Backdrop */}
        {movie.backdropPath ? (
          <img
            class="detail-backdrop"
            src={`${TMDB_IMG_W1280}${movie.backdropPath}`}
            alt=""
            loading="lazy"
          />
        ) : (
          <div class="detail-backdrop" style="background:var(--bg-raised)" />
        )}

        <div class="detail-body">
          <div class="detail-header">
            <div class="detail-poster">
              {movie.posterPath ? (
                <img
                  src={`${TMDB_IMG_W500}${movie.posterPath}`}
                  alt={`${movie.title} (${movie.year}) poster`}
                  width={200}
                  height={300}
                  loading="lazy"
                />
              ) : (
                <div style="width:100%;height:100%;background:var(--bg-raised);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:0.75rem;padding:0.5rem;text-align:center">
                  No poster
                </div>
              )}
            </div>

            <div class="detail-info">
              <div class="detail-rank">#{movie.rank}</div>
              <h2 class="detail-title">{movie.title}</h2>
              {movie.originalTitle && movie.originalTitle !== movie.title && (
                <div class="detail-original-title">{movie.originalTitle}</div>
              )}

              <div class="detail-meta">
                <span class="detail-meta-item">{movie.year}</span>
                {movie.runtime && (
                  <span class="detail-meta-item">· {formatRuntime(movie.runtime)}</span>
                )}
                {movie.originCountries[0] && (
                  <span class="detail-meta-item">
                    · {flagEmoji(movie.originCountries[0].code)} {movie.originCountries[0].name}
                  </span>
                )}
                <span class="detail-meta-item">· {movie.originalLanguage.name}</span>
              </div>

              <div class="detail-rating">
                ⭐ {movie.imdbRating.toFixed(1)}
                <span style="font-weight:400;color:var(--text-muted);font-size:0.75rem">
                  ({movie.imdbVotes.toLocaleString()} votes)
                </span>
              </div>

              {movie.genres.length > 0 && (
                <div class="detail-genres">
                  {movie.genres.map((g) => (
                    <span key={g} class="genre-tag">{g}</span>
                  ))}
                </div>
              )}

              <button
                class={`detail-seen-btn${seen ? ' seen' : ''}`}
                onClick={toggleSeenHandler}
                aria-pressed={seen}
              >
                {seen ? '✓ Seen' : 'Mark as seen'}
              </button>
            </div>
          </div>

          {/* Directors */}
          {movie.directors.length > 0 && (
            <div class="detail-section">
              <div class="detail-section-title">Director{movie.directors.length > 1 ? 's' : ''}</div>
              <p style="font-size:0.9rem">{movie.directors.join(', ')}</p>
            </div>
          )}

          {/* Overview */}
          {movie.overview && (
            <div class="detail-section">
              <div class="detail-section-title">Overview</div>
              <p class="detail-overview">{movie.overview}</p>
            </div>
          )}

          {/* Cast */}
          {movie.cast.length > 0 && (
            <div class="detail-section">
              <div class="detail-section-title">Cast</div>
              <div class="cast-grid">
                {movie.cast.map((c) => (
                  <div key={c.name} class="cast-item">
                    {c.profilePath ? (
                      <img
                        class="cast-photo"
                        src={`${TMDB_IMG_W185}${c.profilePath}`}
                        alt={c.name}
                        width={92}
                        height={138}
                        loading="lazy"
                      />
                    ) : (
                      <div class="cast-photo-placeholder">👤</div>
                    )}
                    <div class="cast-name">{c.name}</div>
                    <div class="cast-character">{c.character}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Streaming */}
          {providers?.flatrate && providers.flatrate.length > 0 && (
            <div class="detail-section">
              <div class="detail-section-title">Stream in {userCountry}</div>
              <p style="font-size:0.875rem">{providers.flatrate.join(', ')}</p>
            </div>
          )}

          {/* Links */}
          <div class="detail-links">
            <a
              class="external-link"
              href={`https://www.imdb.com/title/${movie.imdbId}/`}
              target="_blank"
              rel="noopener noreferrer"
            >
              IMDb ↗
            </a>
            {movie.tmdbId && (
              <a
                class="external-link"
                href={`https://www.themoviedb.org/movie/${movie.tmdbId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                TMDB ↗
              </a>
            )}
            {movie.trailerYouTubeKey && (
              <a
                class="external-link"
                href={`https://www.youtube.com/watch?v=${movie.trailerYouTubeKey}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                ▶ Trailer
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
