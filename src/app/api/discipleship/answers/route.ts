import { NextRequest, NextResponse } from 'next/server';
import { requireViewer } from '@/lib/authz';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { viewer, error } = await requireViewer();
  if (error) return error;

  const week = req.nextUrl.searchParams.get('week');
  const day = req.nextUrl.searchParams.get('day');

  if (!week || !day) {
    return NextResponse.json({ error: 'Missing week or day' }, { status: 400 });
  }

  try {
    const rows = await sql(
      'SELECT answers FROM discipleship_progress WHERE user_id = $1 AND week = $2 AND day = $3',
      [viewer.userId, parseInt(week), parseInt(day)]
    );

    return NextResponse.json({ answers: rows.length > 0 ? rows[0].answers : {} });
  } catch (error) {
    console.error('Discipleship answers GET error:', error);
    return NextResponse.json({ error: 'Failed to load answers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { viewer, error } = await requireViewer();
  if (error) return error;

  try {
    const { week, day, answers } = await req.json();

    if (!week || !day || !answers) {
      return NextResponse.json({ error: 'Missing week, day, or answers' }, { status: 400 });
    }

    await sql(
      `INSERT INTO discipleship_progress (user_id, week, day, answers)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, week, day)
       DO UPDATE SET answers = EXCLUDED.answers`,
      [viewer.userId, week, day, JSON.stringify(answers)]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Discipleship answers POST error:', error);
    return NextResponse.json({ error: 'Failed to save answers' }, { status: 500 });
  }
}
