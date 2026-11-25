import { NextResponse } from 'next/server';
import { sql, currentChurchId } from '@/lib/db';
import { requireViewer, forbidden } from '@/lib/authz';
import { hasIncubatorAccess } from '@/lib/incubatorAccess';
import { incubatorDay, isModuleComplete } from '@/lib/incubator';
import { inChurch } from '@/lib/churchRoute';

const MAX_ANSWER_LENGTH = 10_000;

/**
 * Saves the self-evaluation answers of one module (the full set; an empty
 * object clears it) to incubator_progress, and whether every question of
 * the module is answered.
 *
 *   POST { week, day, module, answers: { "<question index>": "text" } }
 */
async function handlePOST(request: Request) {
  const { viewer, error } = await requireViewer();
  if (error) return error;
  if (!(await hasIncubatorAccess(viewer))) return forbidden();

  let body: { week?: unknown; day?: unknown; module?: unknown; answers?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const week = Number(body.week);
  const day = Number(body.day);
  const moduleIdx = Number(body.module);
  const dayDef = Number.isInteger(week) && Number.isInteger(day) ? incubatorDay(week, day) : null;
  if (!dayDef || !Number.isInteger(moduleIdx) || !dayDef.modules[moduleIdx]) {
    return NextResponse.json({ error: 'Invalid week, day or module' }, { status: 400 });
  }
  if (!body.answers || typeof body.answers !== 'object' || Array.isArray(body.answers)) {
    return NextResponse.json({ error: 'answers must be an object' }, { status: 400 });
  }

  const questions = dayDef.modules[moduleIdx].selfEval.length;
  const answers: Record<string, string> = {};
  for (const [k, v] of Object.entries(body.answers)) {
    const qi = Number(k);
    if (Number.isInteger(qi) && qi >= 0 && qi < questions && typeof v === 'string' && v.trim() !== '') {
      answers[String(qi)] = v.slice(0, MAX_ANSWER_LENGTH);
    }
  }
  const completed = isModuleComplete(week, day, moduleIdx, answers);

  const rows = await sql(
    `INSERT INTO incubator_progress (church_id, user_id, week, day, module_index, answers, completed, completed_at)
     VALUES ($7, $1, $2, $3, $4, $5, $6, CASE WHEN $6 THEN now() ELSE NULL END)
     ON CONFLICT (church_id, user_id, week, day, module_index)
     DO UPDATE SET answers = EXCLUDED.answers,
                   completed = EXCLUDED.completed,
                   completed_at = CASE WHEN EXCLUDED.completed
                                       THEN COALESCE(incubator_progress.completed_at, now())
                                       ELSE NULL END
     RETURNING completed`,
    [viewer.userId, week, day, moduleIdx, JSON.stringify(answers), completed, currentChurchId()]
  );
  return NextResponse.json({ success: true, completed: rows[0].completed });
}

export const POST = inChurch(handlePOST);
