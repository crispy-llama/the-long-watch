import { showNewFilmsNotice, newFilmIds, removedFilmIds, filters } from '../state.ts';
import { saveLastSeenDataVersion } from '../storage.ts';
import { DEFAULT_FILTERS } from '../types.ts';

type Props = { generatedAt: string };

export function NewFilmsNotice({ generatedAt }: Props) {
  if (!showNewFilmsNotice.value) return null;

  const added = newFilmIds.value.length;
  const removed = removedFilmIds.value.length;

  function dismiss() {
    saveLastSeenDataVersion(generatedAt);
    showNewFilmsNotice.value = false;
  }

  function showNew() {
    filters.value = { ...DEFAULT_FILTERS };
    // A real "new films" filter would need a signal — for now just dismiss
    dismiss();
  }

  let msg = '';
  if (added > 0 && removed > 0) {
    msg = `${added} new film${added > 1 ? 's' : ''} joined the Top 250 and ${removed} left since your last visit.`;
  } else if (added > 0) {
    msg = `${added} new film${added > 1 ? 's' : ''} joined the Top 250 since your last visit.`;
  } else if (removed > 0) {
    msg = `${removed} film${removed > 1 ? 's' : ''} left the Top 250 since your last visit.`;
  }

  if (!msg) return null;

  return (
    <div class="notice" role="status">
      <span>🎬 {msg}</span>
      {added > 0 && (
        <button class="chip" onClick={showNew} style="margin-left:0.5rem">
          Show new films
        </button>
      )}
      <button class="notice-close" onClick={dismiss} aria-label="Dismiss">✕</button>
    </div>
  );
}
