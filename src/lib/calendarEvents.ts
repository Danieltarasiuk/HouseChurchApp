/**
 * Server-side helpers for the calendar API routes: role checks, row
 * selection, validation, field-stripping and the save-then-push sync step.
 *
 * Two kinds of event, in calendar_events.visibility:
 *   'leaders'  leadership events: admins and group leaders only, pushed to
 *              the church's Google Calendar
 *   'members'  church events: every active member of the church; kept in the
 *              app only (not pushed to Google)
 */
import { NextResponse } from 'next/server';
import { requireViewer } from './authz';
import { sql } from './db';
import { isCalendarCategory } from './calendarCategories';
import { isHHMM, isISODate, toHHMM } from './calendarDates';
import { deleteGoogleEvent, getCalendarId, googleErrorMessage, pushEvent } from './googleCalendarSync';

export type CalendarRole = 'admin' | 'group_leader' | 'member';
export type EventVisibility = 'leaders' | 'members';

export function isEventVisibility(v: unknown): v is EventVisibility {
  return v === 'leaders' || v === 'members';
}

/** Admins and group leaders see both kinds; members only church events. */
export function canSeeEvent(role: CalendarRole, visibility: EventVisibility): boolean {
  return role === 'admin' || role === 'group_leader' || visibility === 'members';
}

/**
 * SQL condition limiting calendar_events to what `role` may see. Used by
 * every read, so a member never gets a leadership event by range or by id.
 */
export function visibilityCondition(role: CalendarRole): string {
  return role === 'admin' || role === 'group_leader' ? 'TRUE' : "visibility = 'members'";
}

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
  visibility: EventVisibility;
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
  | { ok: true; role: CalendarRole; userId: string }
  | { ok: false; response: NextResponse };

/** 401 when signed out, 403 when the role (in the current church) is not in `allowed`. */
export async function requireCalendarRole(allowed: CalendarRole[]): Promise<Guard> {
  const { viewer, error } = await requireViewer({ roles: allowed });
  if (error) return { ok: false, response: error };
  return { ok: true, role: viewer.role as CalendarRole, userId: viewer.userId };
}

/** Only admins see internal notes and sync state. */
export function forRole(row: CalendarEventRow, role: CalendarRole) {
  if (role === 'admin') return row;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { notes, sync_status, sync_error, google_event_id, created_by, ...rest } = row;
  return rest;
}

/** One event, or null when it does not exist or `role` may not see it. */
export async function getCalendarEvent(id: string, role: CalendarRole = 'admin'): Promise<CalendarEventRow | null> {
  const rows = await sql(
    `SELECT ${CALENDAR_EVENT_COLUMNS} FROM calendar_events WHERE id = $1 AND ${visibilityCondition(role)}`,
    [id]
  );
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
  visibility: EventVisibility;
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
): { ok: true; value: CalendarEventInput } | { ok: false; error: string; reason: string } {
  const title_en = cleanText(raw.title_en);
  if (!title_en) return { ok: false, error: 'English title is required', reason: 'title_required' };
  if (!isCalendarCategory(raw.category)) return { ok: false, error: 'Invalid category', reason: 'invalid_category' };
  if (!isISODate(raw.start_date)) return { ok: false, error: 'Invalid start date', reason: 'invalid_start_date' };
  if (!isISODate(raw.end_date)) return { ok: false, error: 'Invalid end date', reason: 'invalid_end_date' };
  if (raw.end_date < raw.start_date) return { ok: false, error: 'End date must be on or after the start date', reason: 'end_before_start' };

  const start_time = toHHMM(cleanText(raw.start_time));
  const end_time = toHHMM(cleanText(raw.end_time));
  if ((start_time === null) !== (end_time === null)) {
    return { ok: false, error: 'Start and end time must both be set or both be empty', reason: 'time_pair' };
  }
  if (start_time !== null && (!isHHMM(start_time) || !isHHMM(end_time))) {
    return { ok: false, error: 'Invalid time', reason: 'invalid_time' };
  }
  if (start_time !== null && raw.start_date === raw.end_date && end_time! <= start_time) {
    return { ok: false, error: 'End time must be after the start time', reason: 'end_time_before_start' };
  }

  const status = raw.status ?? 'scheduled';
  if (status !== 'scheduled' && status !== 'cancelled') return { ok: false, error: 'Invalid status', reason: 'invalid_status' };

  // New events, and rows from before there were two kinds, are leadership.
  const visibility = raw.visibility ?? 'leaders';
  if (!isEventVisibility(visibility)) return { ok: false, error: 'Invalid visibility', reason: 'invalid_visibility' };

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
      visibility,
    },
  };
}

/**
 * Bring Google in line with one row and record the outcome. Leadership events
 * are pushed; church events are not, and one that was pushed while it was a
 * leadership event is removed from Google. Never throws: a Google failure is
 * stored as sync_status='error' and the database save stands.
 */
export async function syncCalendarEvent(row: CalendarEventRow): Promise<CalendarEventRow> {
  // A church with no Google Calendar keeps its events in the app only.
  if (!getCalendarId()) return row;
  try {
    if (row.visibility !== 'leaders') {
      if (row.google_event_id) await deleteGoogleEvent(row.google_event_id);
      const rows = await sql(
        `UPDATE calendar_events
           SET google_event_id = NULL, sync_status = 'synced', sync_error = NULL
         WHERE id = $1
         RETURNING ${CALENDAR_EVENT_COLUMNS}`,
        [row.id]
      );
      return (rows[0] as CalendarEventRow) ?? row;
    }
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
