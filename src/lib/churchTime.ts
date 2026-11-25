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
