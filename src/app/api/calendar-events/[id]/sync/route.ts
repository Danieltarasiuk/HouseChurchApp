import { NextRequest, NextResponse } from 'next/server';
import { getCalendarEvent, isUUID, requireCalendarRole, syncCalendarEvent } from '@/lib/calendarEvents';
import { inChurch } from '@/lib/churchRoute';

export const maxDuration = 30;

/** POST — admin retries the Google push for one event. */
async function handlePOST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireCalendarRole(['admin']);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!isUUID(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const row = await getCalendarEvent(id);
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const synced = await syncCalendarEvent(row);
    return NextResponse.json({ event: synced });
  } catch (error) {
    console.error('Calendar event sync error:', error);
    return NextResponse.json({ error: 'Failed to sync event' }, { status: 500 });
  }
}

export const POST = inChurch(handlePOST);
