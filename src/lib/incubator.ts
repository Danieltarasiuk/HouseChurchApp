import { INCUBATOR_CURRICULUM } from '@/data/incubator-curriculum';

/**
 * Pastor Incubator structure helpers. Lesson bodies (incubator-bodies.ts)
 * are stored one per module, in curriculum order (35 modules), so a body is
 * found by week + day + module, not by week + day: weeks 4 and 5 have two or
 * three modules on most days.
 */

/** Index into INCUBATOR_BODIES for a module (all 0-based), or null if it doesn't exist. */
export function incubatorBodyIndex(weekIdx: number, dayIdx: number, moduleIdx: number): number | null {
  const weeks = INCUBATOR_CURRICULUM.weeks;
  const day = weeks[weekIdx]?.days[dayIdx];
  if (!day || moduleIdx < 0 || moduleIdx >= day.modules.length) return null;
  let index = 0;
  for (let w = 0; w < weekIdx; w++) for (const d of weeks[w].days) index += d.modules.length;
  for (let d = 0; d < dayIdx; d++) index += weeks[weekIdx].days[d].modules.length;
  return index + moduleIdx;
}

/** The modules of a day (1-based week and day, as stored), or null. */
export function incubatorDay(week: number, day: number) {
  return INCUBATOR_CURRICULUM.weeks[week - 1]?.days[day - 1] ?? null;
}

/** A module's answers are complete when every self-evaluation question has one. */
export function isModuleComplete(week: number, day: number, moduleIdx: number, answers: Record<string, string>): boolean {
  const mod = incubatorDay(week, day)?.modules[moduleIdx];
  return !!mod && mod.selfEval.every((_, qi) => (answers[String(qi)] ?? '').trim() !== '');
}
