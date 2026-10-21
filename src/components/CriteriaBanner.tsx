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

  if (!showCriteriaBanner.value) {
    return (
      <div class="criteria-banner">
        <div class="criteria-banner-inner">
          <p>
            <strong>How this list is made</strong> — top {criteria.listSize} feature films on
            IMDb with ≥ {criteria.minVotes.toLocaleString()} votes, ranked by weighted rating.
            Updated {lastUpdated}.{' '}
          </p>
          <button
            class="criteria-toggle"
            onClick={() => (showCriteriaBanner.value = true)}
          >
            Show more
          </button>
        </div>
      </div>
    );
  }

  return (
    <div class="criteria-banner">
      <div class="criteria-banner-inner">
        <p>
          <strong>How this list is made.</strong> The {criteria.listSize} highest-rated feature
          films on IMDb with at least <strong>{criteria.minVotes.toLocaleString()}</strong> user
          votes. Documentaries, TV movies and shorts are excluded. Films in any language and from
          any country are included. Ranked by a weighted rating that balances score and number of
          votes. Updated monthly — last updated <strong>{lastUpdated}</strong>. Similar to, but
          not the same as, IMDb's official Top 250.{' '}
          <a href="#criteria-details">Full details</a>
        </p>
        <button
          class="criteria-toggle"
          onClick={() => (showCriteriaBanner.value = false)}
        >
          Collapse
        </button>
      </div>
    </div>
  );
}
