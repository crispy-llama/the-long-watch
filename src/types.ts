export type Movie = {
  imdbId: string;
  tmdbId: number | null;
  rank: number;
  title: string;
  originalTitle?: string;
  year: number;
  runtime: number | null;
  genres: string[];
  overview: string;
  tagline?: string;
  posterPath: string | null;
  backdropPath: string | null;
  imdbRating: number;
  imdbVotes: number;
  score: number;
  directors: string[];
  cast: { name: string; character: string; profilePath: string | null }[];
  originalLanguage: { code: string; name: string };
  spokenLanguages: string[];
  originCountries: { code: string; name: string }[];
  trailerYouTubeKey?: string;
  watchProviders?: Record<string, { flatrate?: string[]; rent?: string[]; buy?: string[]; link?: string }>;
};

export type Top250File = {
  generatedAt: string;
  source: { imdbDatasetDate: string; tmdb: true };
  criteria: {
    listSize: number;
    minVotes: number;
    titleTypes: string[];
    excludeGenres: string[];
    excludeAdult: boolean;
    anyLanguage: boolean;
    ranking: 'weighted' | 'average';
    weightedPriorVotes: number;
    eligibleCount: number;
    meanRatingC: number;
  };
  excluded: { imdbId: string; title: string; year: number; reason: string }[];
  movies: Movie[];
};

export type HistoryEntry = { date: string; added: string[]; removed: string[] };
export type FormerMovie = {
  imdbId: string;
  title: string;
  year: number;
  posterPath: string | null;
  lastRank: number;
  removedDate: string;
};
export type HistoryFile = {
  entries: HistoryEntry[];
  formerMovies: Record<string, FormerMovie>;
};

// ── User data ────────────────────────────────────────────────────────────────

export type SeenEntry = {
  seenAt?: string;
  rating?: number;
  note?: string;
};

export type UserData = {
  version: 1;
  updatedAt: string;
  seen: Record<string, SeenEntry>;
  watchlist?: string[];
  lastSeenDataVersion?: string;
  settings?: { view: 'grid' | 'list'; country: string };
};

// ── Filters ───────────────────────────────────────────────────────────────────

export type ViewFilter = 'all' | 'seen' | 'unseen';
export type RuntimeFilter = 'all' | 'under2h' | '2to3h' | 'over3h';

export type FiltersState = {
  view: ViewFilter;
  genres: string[];
  decade: number | null;
  runtime: RuntimeFilter;
  languages: string[];
  countries: string[];
  search: string;
};

export const DEFAULT_FILTERS: FiltersState = {
  view: 'all',
  genres: [],
  decade: null,
  runtime: 'all',
  languages: [],
  countries: [],
  search: '',
};
