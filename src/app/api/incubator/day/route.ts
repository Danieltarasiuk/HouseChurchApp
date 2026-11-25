import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireViewer, forbidden } from '@/lib/authz';
import { hasIncubatorAccess } from '@/lib/incubatorAccess';
import { incubatorBodyIndex, incubatorDay } from '@/lib/incubator';
import { INCUBATOR_BODIES } from '@/data/incubator-bodies';
import { inChurch } from '@/lib/churchRoute';

/**
 * One day of the Pastor Incubator for the signed-in user: each module's
 * lesson text (en + es) and their saved answers. Lesson text is served here,
 * behind the access check, rather than bundled into the page.
 *
 *   GET ?week=<1-5>&day=<1-n>
 */
async function handleGET(req: NextRequest) {
  const { viewer, error } = await requireViewer();
  if (error) return error;
  if (!(await hasIncubatorAccess(viewer))) return forbidden();

  const week = Number(req.nextUrl.searchParams.get('week'));
  const day = Number(req.nextUrl.searchParams.get('day'));
  const dayDef = Number.isInteger(week) && Number.isInteger(day) ? incubatorDay(week, day) : null;
  if (!dayDef) return NextResponse.json({ error: 'Invalid week or day' }, { status: 400 });

  const rows = await sql(
    'SELECT module_index, answers, completed FROM incubator_progress WHERE user_id = $1 AND week = $2 AND day = $3',
    [viewer.userId, week, day]
  );
  const saved = new Map(rows.map((r) => [Number(r.module_index), r]));

  return NextResponse.json({
    modules: dayDef.modules.map((_, mi) => {
      const body = INCUBATOR_BODIES[incubatorBodyIndex(week - 1, day - 1, mi)!] ?? null;
      const row = saved.get(mi);
      return { body, answers: row?.answers ?? {}, completed: row?.completed ?? false };
    }),
  });
}

export const GET = inChurch(handleGET);
