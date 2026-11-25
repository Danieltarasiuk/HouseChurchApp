import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  CALENDAR_EVENT_COLUMNS,
  CalendarEventRow,
  forRole,
  getCalendarEvent,
  isUUID,
  requireCalendarRole,
  syncCalendarEvent,
  validateCalendarEvent,
} from '@/lib/calendarEvents';
import { deleteGoogleEvent, googleErrorMessage } from '@/lib/googleCalendarSync';
import { inChurch } from '@/lib/churchRoute';

export const maxDuration = 30;

const EDITABLE = ['title_en', 'title_es', 'category', 'start_date', 'end_date', 'start_time', 'end_time', 'notes', 'status', 'visibility'] as const;

/**
 * GET — one event. A member asking for a leadership event gets the same 404
 * as for an id that does not exist, so its existence is not revealed.
 */
async function handleGET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireCalendarRole(['admin', 'group_leader', 'member']);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!isUUID(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const row = await getCalendarEvent(id, guard.role);
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ event: forRole(row, guard.role) });
  } catch (error) {
    console.error('Calendar event GET error:', error);
    return NextResponse.json({ error: 'Failed to load event' }, { status: 500 });
  }
}

/** PATCH — admin updates any subset of fields (cancel/restore = {status}); then pushes. */
async function handlePATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireCalendarRole(['admin']);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!isUUID(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  let row: CalendarEventRow;
  try {
    const existing = await getCalendarEvent(id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const merged: Record<string, unknown> = { ...existing };
    for (const key of EDITABLE) if (key in body) merged[key] = body[key];

    const v = validateCalendarEvent(merged);
    if (!v.ok) return NextResponse.json({ error: v.error, reason: v.reason }, { status: 400 });
    const e = v.value;

    const rows = await sql(
      `UPDATE calendar_events SET
         title_en = $2, title_es = $3, category = $4, start_date = $5, end_date = $6,
         start_time = $7, end_time = $8, notes = $9, status = $10, visibility = $11,
         sync_status = 'pending', updated_at = now()
       WHERE id = $1
       RETURNING ${CALENDAR_EVENT_COLUMNS}`,
      [id, e.title_en, e.title_es, e.category, e.start_date, e.end_date, e.start_time, e.end_time, e.notes, e.status, e.visibility]
    );
    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    row = rows[0] as CalendarEventRow;
  } catch (error) {
    console.error('Calendar event PATCH error:', error);
    return NextResponse.json({ error: 'Failed to save event' }, { status: 500 });
  }

  const synced = await syncCalendarEvent(row);
  return NextResponse.json({ event: synced });
}

/**
 * DELETE — hard delete. The Google event goes first (404/410 = already gone);
 * any other Google failure is logged and the row is deleted anyway.
 */
async function handleDELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireCalendarRole(['admin']);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!isUUID(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const existing = await getCalendarEvent(id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let googleError: string | null = null;
    if (existing.google_event_id) {
      try {
        await deleteGoogleEvent(existing.google_event_id);
      } catch (err) {
        googleError = googleErrorMessage(err);
        console.error(`Google delete failed for ${existing.google_event_id}:`, googleError);
      }
    }

    await sql('DELETE FROM calendar_events WHERE id = $1', [id]);
    return NextResponse.json({ success: true, googleError });
  } catch (error) {
    console.error('Calendar event DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}

export const GET = inChurch(handleGET);
export const PATCH = inChurch(handlePATCH);
export const DELETE = inChurch(handleDELETE);
