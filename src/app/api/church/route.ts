import { NextResponse } from 'next/server';
import { sql, currentChurchId } from '@/lib/db';
import { requireViewer } from '@/lib/authz';
import { inChurch } from '@/lib/churchRoute';
import { isValidTimeZone } from '@/lib/churchTime';
import { churchCenterOrigin } from '@/lib/giving';

/**
 * The current church's settings (Settings → Church).
 *
 *   GET  -> { church }                      admins
 *   PUT  { name, timezone, default_language,
 *          group_label_singular_en, group_label_plural_en,
 *          group_label_singular_es, group_label_plural_es,
 *          checkins_event_name, church_center_url } -> { church }   admins
 *
 * Logo and colours are PR 1.2. churches has no row-level security, so the
 * statements name the current church explicitly.
 */

const EDITABLE_COLUMNS = `id, slug, name, timezone, default_language,
  group_label_singular_en, group_label_plural_en, group_label_singular_es, group_label_plural_es,
  checkins_event_name, church_center_url, google_calendar_id`;

async function handleGET() {
  const { error } = await requireViewer({ roles: ['admin'] });
  if (error) return error;
  const [church] = await sql(`SELECT ${EDITABLE_COLUMNS} FROM churches WHERE id = $1`, [currentChurchId()]);
  return NextResponse.json({ church });
}

type Fail = { field: string; reason: string };

const text = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() !== '' && v.trim().length <= max ? v.trim() : null;

async function handlePUT(request: Request) {
  const { error } = await requireViewer({ roles: ['admin'] });
  if (error) return error;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const fails: Fail[] = [];
  const need = (field: string, value: string | null, reason = 'required') => {
    if (value === null) fails.push({ field, reason });
    return value;
  };

  const name = need('name', text(body.name, 100));
  const timezone = isValidTimeZone(body.timezone) ? body.timezone : need('timezone', null, 'invalid_timezone');
  const language = body.default_language === 'en' || body.default_language === 'es'
    ? body.default_language : need('default_language', null, 'invalid_language');
  const labels = (['group_label_singular_en', 'group_label_plural_en', 'group_label_singular_es', 'group_label_plural_es'] as const)
    .map((f) => need(f, text(body[f], 40)));

  const checkins = body.checkins_event_name == null || body.checkins_event_name === ''
    ? null : need('checkins_event_name', text(body.checkins_event_name, 100), 'too_long');

  let churchCenter: string | null = null;
  if (body.church_center_url != null && String(body.church_center_url).trim() !== '') {
    churchCenter = need('church_center_url', churchCenterOrigin(String(body.church_center_url)), 'invalid_url');
  }

  if (fails.length > 0) {
    return NextResponse.json({ error: 'Invalid settings', reason: 'invalid', fields: fails }, { status: 400 });
  }

  const [church] = await sql(
    `UPDATE churches SET
       name = $2, timezone = $3, default_language = $4,
       group_label_singular_en = $5, group_label_plural_en = $6,
       group_label_singular_es = $7, group_label_plural_es = $8,
       checkins_event_name = $9, church_center_url = $10, updated_at = now()
     WHERE id = $1
     RETURNING ${EDITABLE_COLUMNS}`,
    [currentChurchId(), name, timezone, language, ...labels, checkins, churchCenter]
  );
  return NextResponse.json({ church });
}

export const GET = inChurch(handleGET);
export const PUT = inChurch(handlePUT);
