/**
 * One-way push from calendar_events to the CityChurch Miami Google Calendar.
 *
 * The app is the master: nothing is read back from Google, so edits made
 * directly in Google are overwritten the next time the app pushes that event.
 *
 * Auth is a service account that has "Make changes to events" on the
 * calendar (shared from Google Calendar settings) — no domain-wide delegation.
 *
 * Env:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY  (literal "\n" sequences are converted)
 *   GOOGLE_CALENDAR_ID
 */
import { google, calendar_v3 } from 'googleapis';
import { CALENDAR_CATEGORIES, isCalendarCategory } from './calendarCategories';
import { addDaysISO, toHHMM } from './calendarDates';

export const CALENDAR_TIME_ZONE = 'America/New_York';

/** The fields of a calendar_events row that matter to Google. */
export interface PushableRow {
  title_en: string;
  title_es: string | null;
  category: string;
  start_date: string; // 'YYYY-MM-DD'
  end_date: string;   // 'YYYY-MM-DD', inclusive
  start_time: string | null; // 'HH:MM' or 'HH:MM:SS'
  end_time: string | null;
  status: string;
  google_event_id: string | null;
}

let cachedClient: calendar_v3.Calendar | null = null;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export function getCalendarId(): string {
  return requireEnv('GOOGLE_CALENDAR_ID');
}

export function getCalendarClient(): calendar_v3.Calendar {
  if (cachedClient) return cachedClient;
  const email = requireEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const key = requireEnv('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY').replace(/\\n/g, '\n');
  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  });
  cachedClient = google.calendar({ version: 'v3', auth });
  return cachedClient;
}

/** HTTP status of a googleapis (gaxios) error, if any. */
export function googleErrorStatus(err: unknown): number | undefined {
  const e = err as { code?: unknown; status?: unknown; response?: { status?: unknown } };
  const candidates = [e?.response?.status, e?.status, e?.code];
  for (const c of candidates) {
    const n = typeof c === 'string' ? Number(c) : c;
    if (typeof n === 'number' && Number.isFinite(n)) return n;
  }
  return undefined;
}

export function googleErrorMessage(err: unknown): string {
  const e = err as { message?: string; response?: { data?: { error?: { message?: string } } } };
  return e?.response?.data?.error?.message || e?.message || String(err);
}

function isGone(err: unknown): boolean {
  const s = googleErrorStatus(err);
  return s === 404 || s === 410;
}

/** Build the Google event body for a row. Never includes `notes`. */
export function toGoogleEvent(row: PushableRow): calendar_v3.Schema$Event {
  const category = isCalendarCategory(row.category) ? CALENDAR_CATEGORIES[row.category] : null;
  const cancelled = row.status === 'cancelled';
  const startTime = toHHMM(row.start_time);
  const endTime = toHHMM(row.end_time);

  // Explicit nulls clear the other shape when patching an event that switched
  // between all-day and timed.
  const timing: Pick<calendar_v3.Schema$Event, 'start' | 'end'> =
    startTime && endTime
      ? {
          start: { dateTime: `${row.start_date}T${startTime}:00`, timeZone: CALENDAR_TIME_ZONE, date: null },
          end: { dateTime: `${row.end_date}T${endTime}:00`, timeZone: CALENDAR_TIME_ZONE, date: null },
        }
      : {
          // Google's all-day end date is exclusive; ours is inclusive.
          start: { date: row.start_date, dateTime: null, timeZone: null },
          end: { date: addDaysISO(row.end_date, 1), dateTime: null, timeZone: null },
        };

  return {
    summary: cancelled ? `Cancelled – ${row.title_en}` : row.title_en,
    description: row.title_es || '',
    colorId: category?.googleColorId ?? null,
    // Informational categories and cancelled events show as "free".
    transparency: category?.informational || cancelled ? 'transparent' : 'opaque',
    // Google soft-deletes events (status 'cancelled'); a patch on one can
    // succeed without a 404. Forcing 'confirmed' brings it back.
    status: 'confirmed',
    ...timing,
  };
}

/**
 * Create or update the Google event for a row. Returns the Google event id
 * (which may be new if the old event had been deleted in Google). Throws on
 * any other failure — the caller records the error, never rolls back.
 */
export async function pushEvent(row: PushableRow): Promise<string> {
  const calendar = getCalendarClient();
  const calendarId = getCalendarId();
  const body = toGoogleEvent(row);

  if (row.google_event_id) {
    try {
      const res = await calendar.events.patch({ calendarId, eventId: row.google_event_id, requestBody: body });
      return res.data.id || row.google_event_id;
    } catch (err) {
      if (!isGone(err)) throw err;
      // Deleted in Google — fall through and insert a fresh one.
    }
  }

  const res = await calendar.events.insert({ calendarId, requestBody: body });
  if (!res.data.id) throw new Error('Google did not return an event id');
  return res.data.id;
}

/** Delete a Google event. 404/410 (already gone) count as success. */
export async function deleteGoogleEvent(googleEventId: string): Promise<void> {
  const calendar = getCalendarClient();
  try {
    await calendar.events.delete({ calendarId: getCalendarId(), eventId: googleEventId });
  } catch (err) {
    if (isGone(err)) return;
    throw err;
  }
}
