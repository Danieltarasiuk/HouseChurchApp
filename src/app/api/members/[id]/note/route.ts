import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';

const MAX_NOTE_LENGTH = 120;

/**
 * Sets a member's attendance note (e.g. "bass player"). The note is owned by
 * this app — the PCO sync never writes or clears it.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Same population that records attendance: any HC pastor may edit any note.
  const userRole = (session.user as { role?: string }).role;
  if (userRole !== 'admin' && userRole !== 'house_church_pastor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  let body: { attendance_note?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof body.attendance_note !== 'string') {
    return NextResponse.json({ error: 'attendance_note must be a string' }, { status: 400 });
  }

  const trimmed = body.attendance_note.trim();
  if (trimmed.length > MAX_NOTE_LENGTH) {
    return NextResponse.json(
      { error: `Note must be ${MAX_NOTE_LENGTH} characters or fewer` },
      { status: 400 }
    );
  }
  const note = trimmed === '' ? null : trimmed;

  try {
    const rows = await sql(
      'UPDATE members SET attendance_note = $1 WHERE id = $2 RETURNING attendance_note',
      [note, id]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    return NextResponse.json({ attendance_note: rows[0].attendance_note });
  } catch (error) {
    console.error('Attendance note update error:', error);
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
  }
}
