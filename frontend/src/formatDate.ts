/** Shared date formatting for history and admin views. */
export function formatSavedAt(savedAt: string): string {
  const d = new Date(savedAt);
  if (Number.isNaN(d.getTime())) return savedAt;
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
