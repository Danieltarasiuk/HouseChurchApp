/**
 * The church's local timezone and "today" in it. Client-safe.
 *
 * One constant on purpose: it becomes a per-church setting when the app goes
 * multi-church. Dates are plain 'YYYY-MM-DD' strings (see calendarDates.ts);
 * never derive "today" from toISOString(), which is the UTC date and is
 * already tomorrow in Miami after about 7–8 pm.
 */
export const CHURCH_TIME_ZONE = 'America/New_York';

/** Calendar date of `at` in the church's timezone, as 'YYYY-MM-DD'. */
export function isoDateInChurchTz(at: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return at.toLocaleDateString('en-CA', { timeZone: CHURCH_TIME_ZONE });
}

export const todayInChurchTz = (): string => isoDateInChurchTz();

/**
 * The church-local date `months` calendar months before `iso` (YYYY-MM-DD),
 * clamped to the end of a shorter month (May 31 − 3 months = Feb 28/29).
 */
export function subtractMonthsISO(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const firstOfTarget = new Date(Date.UTC(y, m - 1 - months, 1));
  const lastDay = new Date(Date.UTC(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth() + 1, 0)).getUTCDate();
  firstOfTarget.setUTCDate(Math.min(d, lastDay));
  return firstOfTarget.toISOString().slice(0, 10);
}

/** Start of a "last N months" window, in the church's calendar. */
export const monthsAgoInChurchTz = (months: number): string => subtractMonthsISO(todayInChurchTz(), months);
