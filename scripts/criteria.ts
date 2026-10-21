export const CRITERIA = {
  listSize: 250,
  minVotes: 50_000,
  titleTypes: ['movie'] as string[],
  excludeGenres: ['Documentary'] as string[],
  excludeAdult: true,
  anyLanguage: true,
  ranking: 'weighted' as 'weighted' | 'average',
  weightedPriorVotes: 50_000,
} as const;

export type Criteria = typeof CRITERIA;
