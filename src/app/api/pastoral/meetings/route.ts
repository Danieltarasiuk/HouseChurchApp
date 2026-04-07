import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';

/** Normalize a Postgres DATE value (Date object or ISO string) to 'YYYY-MM-DD' */
function toDateStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString().split('T')[0];
  return String(v).split('T')[0];
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== 'admin' && userRole !== 'house_church_pastor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const memberId = req.nextUrl.searchParams.get('member_id');

  try {
    let meetings;

    if (memberId) {
      // Fetch all meetings for a specific member (used by detail panel).
      // Notes are included only for meetings logged by the current pastor;
      // other pastors' notes are nulled out (privacy enforced server-side).
      const rows = await sql(
        `SELECT pm.id, pm.member_id, pm.topic_key, pm.meeting_date, pm.notes, pm.created_at,
                pm.pastor_id, u.name AS pastor_name,
                m.first_name || ' ' || m.last_name AS member_name
         FROM pastoral_meetings pm
         JOIN members m ON pm.member_id = m.id
         LEFT JOIN users u ON pm.pastor_id = u.id
         WHERE pm.member_id = $1
         ORDER BY pm.meeting_date DESC`,
        [memberId]
      );
      // Redact notes from other pastors, normalize dates
      meetings = rows.map((r: Record<string, string>) => ({
        ...r,
        meeting_date: toDateStr(r.meeting_date),
        notes: r.pastor_id === session.user!.id ? r.notes : null,
      }));
    } else {
      // Default: return only the current pastor's meetings
      const rows = await sql(
        `SELECT pm.id, pm.member_id, pm.topic_key, pm.meeting_date, pm.notes, pm.created_at,
                pm.pastor_id, u.name AS pastor_name,
                m.first_name || ' ' || m.last_name AS member_name
         FROM pastoral_meetings pm
         JOIN members m ON pm.member_id = m.id
         LEFT JOIN users u ON pm.pastor_id = u.id
         WHERE pm.pastor_id = $1
         ORDER BY pm.meeting_date DESC`,
        [session.user.id]
      );
      meetings = rows.map((r: Record<string, string>) => ({
        ...r,
        meeting_date: toDateStr(r.meeting_date),
      }));
    }

    return NextResponse.json({ meetings });
  } catch (error) {
    console.error('Pastoral meetings GET error:', error);
    return NextResponse.json({ error: 'Failed to load meetings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== 'admin' && userRole !== 'house_church_pastor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { member_id, topic_key, meeting_date, notes } = await req.json();

    if (!member_id || !topic_key || !meeting_date) {
      return NextResponse.json({ error: 'member_id, topic_key, and meeting_date are required' }, { status: 400 });
    }

    const result = await sql(
      `INSERT INTO pastoral_meetings (pastor_id, member_id, topic_key, meeting_date, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, pastor_id, member_id, topic_key, meeting_date, notes, created_at`,
      [session.user.id, member_id, topic_key, meeting_date, notes || null]
    );

    const meeting = { ...result[0], meeting_date: toDateStr(result[0].meeting_date) };
    return NextResponse.json({ success: true, meeting });
  } catch (error) {
    console.error('Pastoral meetings POST error:', error);
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 });
  }
}
