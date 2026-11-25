/**
 * A church's local "today", in its own timezone (churches.timezone). Client-safe.
 *
 * Server code passes currentChurch().timezone; pages pass useChurch().church
 * .timezone. Dates are plain 'YYYY-MM-DD' strings (see calendarDates.ts);
 * never derive "today" from toISOString(), which is the UTC date and is
 * already tomorrow in Miami after about 7–8 pm.
 */

/** churches.timezone's default; used only until the church is known in the browser. */
export const DEFAULT_TIME_ZONE = 'America/New_York';

/** Calendar date of `at` in a timezone, as 'YYYY-MM-DD'. */
export function isoDateInChurchTz(at: Date, timeZone: string): string {
  // en-CA formats as YYYY-MM-DD.
  return at.toLocaleDateString('en-CA', { timeZone });
}

export const todayInChurchTz = (timeZone: string): string => isoDateInChurchTz(new Date(), timeZone);

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
export const monthsAgoInChurchTz = (months: number, timeZone: string): string =>
  subtractMonthsISO(todayInChurchTz(timeZone), months);

/** True when the timezone is one the runtime knows (settings validation). */
export function isValidTimeZone(timeZone: unknown): timeZone is string {
  if (typeof timeZone !== 'string' || !timeZone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}
