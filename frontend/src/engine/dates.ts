// All daily-puzzle dates are calendar days in UTC, written as "YYYY-MM-DD".
// Using UTC means every player in the world sees the same puzzle at the same
// moment, and the puzzle rolls over at 00:00 UTC.

const DAY_MS = 86_400_000;
const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toUtcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseDateKey(key: string): Date {
  const m = DATE_KEY.exec(key);
  if (!m) throw new Error(`Invalid date key: ${key}`);
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (toUtcDateKey(d) !== key) throw new Error(`Invalid date key: ${key}`);
  return d;
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseDateKey(to).getTime() - parseDateKey(from).getTime()) / DAY_MS);
}

export function addDays(key: string, days: number): string {
  return toUtcDateKey(new Date(parseDateKey(key).getTime() + days * DAY_MS));
}

/** 0 = Sunday … 6 = Saturday, in UTC. */
export function utcWeekday(key: string): number {
  return parseDateKey(key).getUTCDay();
}

export function msUntilNextUtcMidnight(now: Date): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return next - now.getTime();
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}
