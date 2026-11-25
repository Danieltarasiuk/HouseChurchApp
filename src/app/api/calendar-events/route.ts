import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { isISODate } from '@/lib/calendarDates';
import {
  CALENDAR_EVENT_COLUMNS,
  CalendarEventRow,
  forRole,
  requireCalendarRole,
  syncCalendarEvent,
  validateCalendarEvent,
} from '@/lib/calendarEvents';

export const maxDuration = 30;

/** GET ?from=YYYY-MM-DD&to=YYYY-MM-DD — events overlapping the inclusive range. */
export async function GET(req: NextRequest) {
  const guard = await requireCalendarRole(['admin', 'house_church_pastor']);
  if (!guard.ok) return guard.response;

  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');
  if (!isISODate(from) || !isISODate(to) || to < from) {
    return NextResponse.json({ error: 'from and to must be YYYY-MM-DD with to >= from' }, { status: 400 });
  }

  try {
    const rows = (await sql(
      `SELECT ${CALENDAR_EVENT_COLUMNS} FROM calendar_events
       WHERE start_date <= $2 AND end_date >= $1
       ORDER BY start_date, start_time NULLS FIRST, title_en`,
      [from, to]
    )) as CalendarEventRow[];
    return NextResponse.json({ events: rows.map((r) => forRole(r, guard.role)) });
  } catch (error) {
    console.error('Calendar events GET error:', error);
    return NextResponse.json({ error: 'Failed to load events' }, { status: 500 });
  }
}

/** POST — admin creates an event; saved first, then pushed to Google. */
export async function POST(req: NextRequest) {
  const guard = await requireCalendarRole(['admin']);
  if (!guard.ok) return guard.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const v = validateCalendarEvent(body);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  const e = v.value;

  let row: CalendarEventRow;
  try {
    const rows = await sql(
      `INSERT INTO calendar_events
         (title_en, title_es, category, start_date, end_date, start_time, end_time, notes, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING ${CALENDAR_EVENT_COLUMNS}`,
      [e.title_en, e.title_es, e.category, e.start_date, e.end_date, e.start_time, e.end_time, e.notes, e.status, guard.userId]
    );
    row = rows[0] as CalendarEventRow;
  } catch (error) {
    console.error('Calendar events POST error:', error);
    return NextResponse.json({ error: 'Failed to save event' }, { status: 500 });
  }

  const synced = await syncCalendarEvent(row);
  return NextResponse.json({ event: synced }, { status: 201 });
}
