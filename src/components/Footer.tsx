export function Footer() {
  return (
    <footer class="footer">
      <p>
        <a href="https://www.chromagraph.ca">chromagraph</a> ·{' '}
        <a href="#criteria-details">About this list</a>
      </p>
      <p style="margin-top:0.4rem">
        Information courtesy of{' '}
        <a href="https://www.imdb.com" target="_blank" rel="noopener noreferrer">
          IMDb
        </a>
        . Used with permission. Ranking computed by this site; not affiliated with IMDb.
      </p>
      <div class="tmdb-attr">
        <span>Movie data from</span>
        <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer">
          TMDB
        </a>
        <span>— This product uses the TMDB API but is not endorsed or certified by TMDB.</span>
      </div>
    </footer>
  );
}
