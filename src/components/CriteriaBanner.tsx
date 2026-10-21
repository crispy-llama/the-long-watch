import { top250, showCriteriaBanner } from '../state.ts';

export function CriteriaBanner() {
  const data = top250.value;
  if (!data) return null;

  const { criteria, generatedAt } = data;
  const lastUpdated = new Date(generatedAt).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div class="criteria-section">
      {showCriteriaBanner.value ? (
        <p class="criteria-text">
          The {criteria.listSize} highest-rated feature films on IMDb with at least{' '}
          {criteria.minVotes.toLocaleString()} user votes. Documentaries, TV movies and shorts
          are excluded. Films in any language and from any country are included. Ranked by a
          weighted rating that balances score and vote count. Updated monthly — last updated{' '}
          {lastUpdated}. Similar to, but not the same as, IMDb's official Top 250.{' '}
          <button class="criteria-link" onClick={() => (showCriteriaBanner.value = false)}>
            Collapse ▲
          </button>
        </p>
      ) : (
        <p class="criteria-text criteria-text--collapsed">
          <button class="criteria-link" onClick={() => (showCriteriaBanner.value = true)}>
            How is this list made? ▾
          </button>
        </p>
      )}
    </div>
  );
}
