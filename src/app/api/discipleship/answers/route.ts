import { NextRequest, NextResponse } from 'next/server';
import { requireViewer } from '@/lib/authz';
import { sql, currentChurchId } from '@/lib/db';
import { isDayComplete, requiredAnswerKeys } from '@/lib/discipleshipProgress';
import { inChurch } from '@/lib/churchRoute';

const MAX_ANSWER_LENGTH = 10_000;

function parseWeekDay(week: unknown, day: unknown): { week: number; day: number } | null {
  const w = Number(week);
  const d = Number(day);
  if (!Number.isInteger(w) || !Number.isInteger(d) || !requiredAnswerKeys(w, d)) return null;
  return { week: w, day: d };
}

async function handleGET(req: NextRequest) {
  const { viewer, error } = await requireViewer();
  if (error) return error;

  const wd = parseWeekDay(req.nextUrl.searchParams.get('week'), req.nextUrl.searchParams.get('day'));
  if (!wd) return NextResponse.json({ error: 'Invalid week or day' }, { status: 400 });

  try {
    const rows = await sql(
      'SELECT answers, completed, completed_at FROM discipleship_progress WHERE user_id = $1 AND week = $2 AND day = $3',
      [viewer.userId, wd.week, wd.day]
    );
    const row = rows[0];
    return NextResponse.json({
      answers: row?.answers ?? {},
      completed: row?.completed ?? false,
      completedAt: row?.completed_at ?? null,
    });
  } catch (err) {
    console.error('Discipleship answers GET error:', err);
    return NextResponse.json({ error: 'Failed to load answers' }, { status: 500 });
  }
}

/**
 * Saves a day's answers (the full set: an empty object clears the day) and
 * records whether the day is finished: every answer it asks for filled in.
 * completed_at is when it was first finished, and is cleared if an answer
 * is later emptied.
 */
async function handlePOST(req: NextRequest) {
  const { viewer, error } = await requireViewer();
  if (error) return error;

  let body: { week?: unknown; day?: unknown; answers?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const wd = parseWeekDay(body.week, body.day);
  if (!wd) return NextResponse.json({ error: 'Invalid week or day' }, { status: 400 });

  const raw = body.answers;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return NextResponse.json({ error: 'answers must be an object' }, { status: 400 });
  }
  // Keep non-empty strings only; anything else (or an emptied field) is dropped.
  const answers: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string' && v.trim() !== '') answers[k] = v.slice(0, MAX_ANSWER_LENGTH);
  }
  const completed = isDayComplete(wd.week, wd.day, answers);

  try {
    const rows = await sql(
      `INSERT INTO discipleship_progress (church_id, user_id, week, day, answers, completed, completed_at)
       VALUES ($6, $1, $2, $3, $4, $5, CASE WHEN $5 THEN now() ELSE NULL END)
       ON CONFLICT (church_id, user_id, week, day)
       DO UPDATE SET answers = EXCLUDED.answers,
                     completed = EXCLUDED.completed,
                     completed_at = CASE WHEN EXCLUDED.completed
                                         THEN COALESCE(discipleship_progress.completed_at, now())
                                         ELSE NULL END
       RETURNING completed, completed_at`,
      [viewer.userId, wd.week, wd.day, JSON.stringify(answers), completed, currentChurchId()]
    );
    return NextResponse.json({ success: true, completed: rows[0].completed, completedAt: rows[0].completed_at });
  } catch (err) {
    console.error('Discipleship answers POST error:', err);
    return NextResponse.json({ error: 'Failed to save answers' }, { status: 500 });
  }
}

export const GET = inChurch(handleGET);
export const POST = inChurch(handlePOST);
