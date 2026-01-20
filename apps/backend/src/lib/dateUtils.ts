/**
 * Start of the current ISO week (Monday 00:00 UTC).
 * Used to determine if free_analyses_used should be reset (new week).
 */
export function getStartOfISOWeek(d: Date = new Date()): Date {
  const d2 = new Date(d);
  const day = d2.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = (day === 0 ? -6 : 1) - day; // Monday = 1 in ISO
  d2.setUTCDate(d2.getUTCDate() + diff);
  d2.setUTCHours(0, 0, 0, 0);
  return d2;
}
