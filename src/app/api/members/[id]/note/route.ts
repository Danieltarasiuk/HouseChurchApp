import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireViewer, forbidden, leadsMemberIn, memberHouseChurches, LEADER_ROLES } from '@/lib/authz';

const MAX_NOTE_LENGTH = 120;

/**
 * Sets a member's attendance note (e.g. "bass player"). The note is owned by
 * this app — the PCO sync never writes or clears it.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { viewer, error } = await requireViewer({ roles: LEADER_ROLES });
  if (error) return error;

  const { id } = await params;

  // Admins, and the pastor of this member's house church.
  const hcs = await memberHouseChurches([id]);
  if (!hcs.has(id)) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  if (!leadsMemberIn(viewer, hcs.get(id))) return forbidden();

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
      { error: `Note must be ${MAX_NOTE_LENGTH} characters or fewer`, reason: 'too_long', max: MAX_NOTE_LENGTH },
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
