/**
 * Client helpers for member rows from /api/members, which omits fields the
 * viewer may not see (src/lib/directory.ts). In particular `date_of_birth`
 * (with the year) reaches only the member themselves, admins and their
 * pastor; others may get just `birthday` ('MM-DD'), plus `is_minor`.
 */

export interface BirthdayFields {
  date_of_birth?: string | null;
  birthday?: string | null;
  is_minor?: boolean;
}

/** 'MM-DD', from whichever birthday field the viewer received. */
export function birthdayMD(m: BirthdayFields): string | null {
  if (m.birthday) return m.birthday;
  return m.date_of_birth ? m.date_of_birth.slice(5, 10) : null;
}

/** "Mar 4" / "4 mar". */
export function formatBirthdayMD(md: string | null, lang: string): string {
  if (!md) return '—';
  const [month, day] = md.split('-').map(Number);
  if (!month || !day) return '—';
  // Any leap year, so Feb 29 formats.
  return new Date(2000, month - 1, day).toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { month: 'short', day: 'numeric' });
}

/** Sort key for birthdays by calendar position (month * 100 + day). */
export function birthdayKeyMD(md: string | null): number | null {
  if (!md) return null;
  const [month, day] = md.split('-').map(Number);
  return month && day ? month * 100 + day : null;
}

/** Server-computed when present, so minors stay hidden without exposing ages. */
export function isMinorRow(m: BirthdayFields, ageOf: (dob: string) => number | null): boolean {
  if (typeof m.is_minor === 'boolean') return m.is_minor;
  if (!m.date_of_birth) return false;
  const age = ageOf(m.date_of_birth);
  return age !== null && age < 18;
}
