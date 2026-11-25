/**
 * Server-side helpers for the leadership calendar API routes: role checks,
 * row selection, validation, pastor field-stripping and the save-then-push
 * sync step.
 */
import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { auth } from './auth';
import { sql } from './db';
import { isCalendarCategory } from './calendarCategories';
import { isHHMM, isISODate, toHHMM } from './calendarDates';
import { googleErrorMessage, pushEvent } from './googleCalendarSync';

export type CalendarRole = 'admin' | 'house_church_pastor';

export interface CalendarEventRow {
  id: string;
  title_en: string;
  title_es: string | null;
  category: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  status: 'scheduled' | 'cancelled';
  visibility: 'leaders' | 'members';
  google_event_id: string | null;
  sync_status: 'synced' | 'pending' | 'error';
  sync_error: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Dates and times cast to text in SQL: the Neon driver otherwise turns DATE
 * into a JS Date at local midnight, which is exactly the off-by-one we avoid.
 */
export const CALENDAR_EVENT_COLUMNS = `
  id, title_en, title_es, category,
  start_date::text AS start_date, end_date::text AS end_date,
  to_char(start_time, 'HH24:MI') AS start_time, to_char(end_time, 'HH24:MI') AS end_time,
  notes, status, visibility, google_event_id, sync_status, sync_error, created_by,
  created_at, updated_at`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUUID(value: string): boolean {
  return UUID_RE.test(value);
}

type Guard =
  | { ok: true; session: Session; role: CalendarRole; userId: string }
  | { ok: false; response: NextResponse };

/** 401 when signed out, 403 when the role is not in `allowed`. */
export async function requireCalendarRole(allowed: CalendarRole[]): Promise<Guard> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const role = (session.user as { role?: string }).role;
  if (!role || !(allowed as string[]).includes(role)) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { ok: true, session, role: role as CalendarRole, userId: session.user.id };
}

/** Pastors never see internal notes or sync state. */
export function forRole(row: CalendarEventRow, role: CalendarRole) {
  if (role === 'admin') return row;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { notes, sync_status, sync_error, google_event_id, created_by, ...rest } = row;
  return rest;
}

export async function getCalendarEvent(id: string): Promise<CalendarEventRow | null> {
  const rows = await sql(`SELECT ${CALENDAR_EVENT_COLUMNS} FROM calendar_events WHERE id = $1`, [id]);
  return (rows[0] as CalendarEventRow) ?? null;
}

export interface CalendarEventInput {
  title_en: string;
  title_es: string | null;
  category: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  status: 'scheduled' | 'cancelled';
}

function cleanText(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t === '' ? null : t;
}

/**
 * Validate a full event (create, or existing row merged with a PATCH body).
 * Returns the cleaned input, or an error message.
 */
export function validateCalendarEvent(
  raw: Record<string, unknown>
): { ok: true; value: CalendarEventInput } | { ok: false; error: string } {
  const title_en = cleanText(raw.title_en);
  if (!title_en) return { ok: false, error: 'English title is required' };
  if (!isCalendarCategory(raw.category)) return { ok: false, error: 'Invalid category' };
  if (!isISODate(raw.start_date)) return { ok: false, error: 'Invalid start date' };
  if (!isISODate(raw.end_date)) return { ok: false, error: 'Invalid end date' };
  if (raw.end_date < raw.start_date) return { ok: false, error: 'End date must be on or after the start date' };

  const start_time = toHHMM(cleanText(raw.start_time));
  const end_time = toHHMM(cleanText(raw.end_time));
  if ((start_time === null) !== (end_time === null)) {
    return { ok: false, error: 'Start and end time must both be set or both be empty' };
  }
  if (start_time !== null && (!isHHMM(start_time) || !isHHMM(end_time))) {
    return { ok: false, error: 'Invalid time' };
  }
  if (start_time !== null && raw.start_date === raw.end_date && end_time! <= start_time) {
    return { ok: false, error: 'End time must be after the start time' };
  }

  const status = raw.status ?? 'scheduled';
  if (status !== 'scheduled' && status !== 'cancelled') return { ok: false, error: 'Invalid status' };

  return {
    ok: true,
    value: {
      title_en,
      title_es: cleanText(raw.title_es),
      category: raw.category,
      start_date: raw.start_date,
      end_date: raw.end_date as string,
      start_time,
      end_time,
      notes: cleanText(raw.notes),
      status,
    },
  };
}

/**
 * Push one row to Google and record the outcome. Never throws: a Google
 * failure is stored as sync_status='error' and the database save stands.
 */
export async function syncCalendarEvent(row: CalendarEventRow): Promise<CalendarEventRow> {
  try {
    const googleId = await pushEvent(row);
    const rows = await sql(
      `UPDATE calendar_events
         SET google_event_id = $2, sync_status = 'synced', sync_error = NULL
       WHERE id = $1
       RETURNING ${CALENDAR_EVENT_COLUMNS}`,
      [row.id, googleId]
    );
    return (rows[0] as CalendarEventRow) ?? row;
  } catch (err) {
    const message = googleErrorMessage(err).slice(0, 1000);
    console.error(`Calendar sync failed for ${row.id}:`, message);
    try {
      const rows = await sql(
        `UPDATE calendar_events SET sync_status = 'error', sync_error = $2
         WHERE id = $1 RETURNING ${CALENDAR_EVENT_COLUMNS}`,
        [row.id, message]
      );
      return (rows[0] as CalendarEventRow) ?? { ...row, sync_status: 'error', sync_error: message };
    } catch (dbErr) {
      console.error('Failed to record calendar sync error:', dbErr);
      return { ...row, sync_status: 'error', sync_error: message };
    }
  }
}
