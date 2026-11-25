import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  CALENDAR_EVENT_COLUMNS,
  CalendarEventRow,
  requireCalendarRole,
  syncCalendarEvent,
} from '@/lib/calendarEvents';

export const maxDuration = 60;

/** POST — admin pushes every row whose sync_status is 'pending' or 'error'. */
export async function POST() {
  const guard = await requireCalendarRole(['admin']);
  if (!guard.ok) return guard.response;

  try {
    const rows = (await sql(
      `SELECT ${CALENDAR_EVENT_COLUMNS} FROM calendar_events
       WHERE sync_status IN ('pending', 'error')
       ORDER BY start_date`
    )) as CalendarEventRow[];

    let synced = 0;
    let failed = 0;
    for (const row of rows) {
      const result = await syncCalendarEvent(row);
      if (result.sync_status === 'synced') synced++;
      else failed++;
    }

    return NextResponse.json({ attempted: rows.length, synced, failed });
  } catch (error) {
    console.error('Calendar sync-pending error:', error);
    return NextResponse.json({ error: 'Failed to sync events' }, { status: 500 });
  }
}
