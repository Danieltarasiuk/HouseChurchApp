import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const week = req.nextUrl.searchParams.get('week');
  const day = req.nextUrl.searchParams.get('day');

  if (!week || !day) {
    return NextResponse.json({ error: 'Missing week or day' }, { status: 400 });
  }

  try {
    const rows = await sql(
      'SELECT answers FROM discipleship_progress WHERE user_id = $1 AND week = $2 AND day = $3',
      [session.user.id, parseInt(week), parseInt(day)]
    );

    return NextResponse.json({ answers: rows.length > 0 ? rows[0].answers : {} });
  } catch (error) {
    console.error('Discipleship answers GET error:', error);
    return NextResponse.json({ error: 'Failed to load answers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
      [session.user.id, week, day, JSON.stringify(answers)]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Discipleship answers POST error:', error);
    return NextResponse.json({ error: 'Failed to save answers' }, { status: 500 });
  }
}
