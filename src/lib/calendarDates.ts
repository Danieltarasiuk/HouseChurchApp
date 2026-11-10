/**
 * Date helpers for the leadership calendar. Client-safe.
 *
 * Every calendar date is a plain 'YYYY-MM-DD' string in America/New_York
 * local time. Never pass one to `new Date('YYYY-MM-DD')` — that parses as
 * UTC midnight and lands on the previous day in Miami. Arithmetic here is
 * done on the parts via Date.UTC, so it is timezone-independent.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isISODate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** 'HH:MM' (24h). */
export function isHHMM(value: unknown): value is string {
  return typeof value === 'string' && TIME_RE.test(value);
}

/** Add whole days to a 'YYYY-MM-DD' string. */
export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Local calendar date of a Date object as 'YYYY-MM-DD' (browser timezone). */
export function toLocalISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Postgres TIME comes back as 'HH:MM:SS'; normalise anything to 'HH:MM'. */
export function toHHMM(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.slice(0, 5);
}
