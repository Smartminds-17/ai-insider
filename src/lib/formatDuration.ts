// Formats a duration in seconds as h:mm:ss (omitting the hour segment under an hour).
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Short, human runtime for cards and metadata rows: "3h 20m", "42m", "<1m".
export function formatRuntime(totalSeconds: number): string {
  const totalMinutes = Math.round(Math.max(0, totalSeconds || 0) / 60);
  if (totalMinutes < 1) return "<1m";

  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}
