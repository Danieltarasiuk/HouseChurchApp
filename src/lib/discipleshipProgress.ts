import { DISCIPLESHIP_CURRICULUM } from '@/data/discipleship-curriculum';

/**
 * Answer keys a 7&7 day has, matching the page: for each passage
 * "<index>-reflect" and "<index>-apply", plus "action-<section>" for the
 * day's action step. null when the week or day does not exist.
 */
export function requiredAnswerKeys(week: number, day: number): string[] | null {
  const w = DISCIPLESHIP_CURRICULUM.weeks[week - 1];
  const d = w?.days[day - 1];
  if (!d) return null;
  return [
    ...d.passages.flatMap((_, i) => [`${i}-reflect`, `${i}-apply`]),
    `action-${d.section}`,
  ];
}

/** A day is finished when every answer it asks for is filled in. */
export function isDayComplete(week: number, day: number, answers: Record<string, unknown>): boolean {
  const keys = requiredAnswerKeys(week, day);
  return !!keys && keys.every((k) => typeof answers[k] === 'string' && (answers[k] as string).trim() !== '');
}
