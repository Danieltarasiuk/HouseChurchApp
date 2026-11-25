/**
 * Locale-aware display of dates and stored values. Client-safe.
 *
 * Calendar dates ('YYYY-MM-DD', e.g. attendance dates, birthdays) are parsed
 * as local dates: new Date('YYYY-MM-DD') would be UTC midnight, which is the
 * previous day in Miami. Timestamps (created_at) are parsed as instants.
 */

export const localeFor = (lang: string): string => (lang === 'es' ? 'es-US' : 'en-US');

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function toDate(value: string | Date): Date | null {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (DATE_ONLY.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** "Nov 30, 2026" / "30 nov 2026". */
export function formatDate(
  value: string | Date | null | undefined,
  lang: string,
  opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
): string {
  if (!value) return '';
  const d = toDate(value);
  return d ? d.toLocaleDateString(localeFor(lang), opts) : '';
}

/** "Nov 30" / "30 nov". */
export const formatMonthDay = (value: string | Date | null | undefined, lang: string) =>
  formatDate(value, lang, { month: 'short', day: 'numeric' });

/** "11/30" / "30/11" for compact column headers. */
export const formatNumericMonthDay = (value: string | Date | null | undefined, lang: string) =>
  formatDate(value, lang, { month: 'numeric', day: 'numeric' });

/** Date and time of a timestamp, in the viewer's locale. */
export function formatDateTime(value: string | Date | null | undefined, lang: string): string {
  if (!value) return '';
  const d = toDate(value);
  return d ? d.toLocaleString(localeFor(lang), { dateStyle: 'medium', timeStyle: 'short' }) : '';
}

type T = (key: string) => string;

/** Translated label for a stored value, or the value itself if it has no key. */
function label(t: T, prefix: string, value: string | null | undefined): string {
  if (!value) return '—';
  const key = `${prefix}.${value}`;
  const out = t(key);
  return out === key ? value : out;
}

/** members.gender is stored as 'Male' / 'Female' (from PCO). */
export const genderLabel = (t: T, value: string | null | undefined) => label(t, 'gender', value);

/** house_churches.meeting_day is stored as an English weekday ('Sunday'…). */
export const meetingDayLabel = (t: T, value: string | null | undefined) => label(t, 'day', value);

/** Stored meeting_day values, Sunday first (the stored value stays English). */
export const MEETING_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
