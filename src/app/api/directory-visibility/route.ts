import { NextRequest, NextResponse } from 'next/server';
import { sql, currentChurchId } from '@/lib/db';
import { requireViewer, forbidden, isAdmin, leadsGroup, type Viewer } from '@/lib/authz';
import {
  DIRECTORY_FIELDS, isField, isLevel, isScope, layerView, loadVisibilitySettings,
  type VisibilityScope,
} from '@/lib/directory';
import { inChurch } from '@/lib/churchRoute';

/**
 * One layer of the member directory visibility settings.
 *
 *   GET ?scope=church
 *   GET ?scope=group&id=<group id>
 *   GET ?scope=member&id=<member id>
 *   GET ?scope=member_self            (the viewer's own member)
 *     -> { scope, id, fields: { <field>: { value, effective, ceiling } } }
 *
 *   PUT { scope, id?, field, level }  level null clears this layer's setting
 *
 * Who may read and change each layer:
 *   church        admins
 *   group  admins, and that group's pastor
 *   member        admins, and the pastor of that member's group
 *   member_self   only the member themselves
 */

type Target = { scopeId: string | null; groupId: string | null; memberId: string | null };

async function resolveTarget(
  viewer: Viewer,
  scope: VisibilityScope,
  id: string | null
): Promise<{ target: Target } | { error: NextResponse }> {
  if (scope === 'church') {
    // The church-wide layer's scope_id is the church's own id.
    return isAdmin(viewer) ? { target: { scopeId: currentChurchId(), groupId: null, memberId: null } } : { error: forbidden() };
  }
  if (scope === 'member_self') {
    if (!viewer.memberId) {
      return { error: NextResponse.json({ error: 'No member record for this account' }, { status: 404 }) };
    }
    return { target: { scopeId: viewer.memberId, groupId: viewer.groupId, memberId: viewer.memberId } };
  }
  if (!id) return { error: NextResponse.json({ error: 'id required' }, { status: 400 }) };

  if (scope === 'group') {
    const rows = await sql('SELECT id::text FROM groups WHERE id::text = $1', [id]);
    if (rows.length === 0) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
    if (!isAdmin(viewer) && !leadsGroup(viewer, id)) return { error: forbidden() };
    return { target: { scopeId: id, groupId: id, memberId: null } };
  }

  // scope === 'member'
  const rows = await sql('SELECT id::text, group_id::text FROM members WHERE id::text = $1', [id]);
  if (rows.length === 0) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  const groupId: string | null = rows[0].group_id ?? null;
  if (!isAdmin(viewer) && !leadsGroup(viewer, groupId)) return { error: forbidden() };
  return { target: { scopeId: id, groupId, memberId: id } };
}

async function describe(scope: VisibilityScope, target: Target) {
  const settings = await loadVisibilitySettings();
  const fields = Object.fromEntries(
    DIRECTORY_FIELDS.map((f) => [f, layerView(settings, scope, f, target)])
  );
  return { scope, id: target.scopeId, fields };
}

async function handleGET(req: NextRequest) {
  const { viewer, error } = await requireViewer();
  if (error) return error;

  const scope = req.nextUrl.searchParams.get('scope');
  if (!isScope(scope)) return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });

  const r = await resolveTarget(viewer, scope, req.nextUrl.searchParams.get('id'));
  if ('error' in r) return r.error;
  return NextResponse.json(await describe(scope, r.target));
}

async function handlePUT(req: NextRequest) {
  const { viewer, error } = await requireViewer();
  if (error) return error;

  let body: { scope?: unknown; id?: unknown; field?: unknown; level?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { scope, field, level } = body;
  if (!isScope(scope)) return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
  if (!isField(field)) return NextResponse.json({ error: 'Invalid field' }, { status: 400 });
  if (level !== null && !isLevel(level)) return NextResponse.json({ error: 'Invalid level' }, { status: 400 });

  const r = await resolveTarget(viewer, scope, typeof body.id === 'string' ? body.id : null);
  if ('error' in r) return r.error;
  const { scopeId } = r.target;

  if (level === null) {
    // The church layer is one row per field in this church (row-level
    // security); before migration 003 an older row may still have scope_id NULL.
    await sql(
      scope === 'church'
        ? "DELETE FROM directory_visibility WHERE scope = 'church' AND field = $3 AND ($2::uuid IS NOT NULL OR $1 = 'church')"
        : 'DELETE FROM directory_visibility WHERE scope = $1 AND scope_id = $2::uuid AND field = $3',
      [scope, scopeId, field]
    );
  } else {
    await sql(
      `INSERT INTO directory_visibility (church_id, scope, scope_id, field, level, updated_by, updated_at)
       VALUES ($6, $1, $2::uuid, $3, $4, $5, now())
       ON CONFLICT (church_id, scope, scope_id, field)
       DO UPDATE SET level = EXCLUDED.level, updated_by = EXCLUDED.updated_by, updated_at = now()`,
      [scope, scopeId, field, level, viewer.userId, currentChurchId()]
    );
  }
  return NextResponse.json(await describe(scope, r.target));
}

export const GET = inChurch(handleGET);
export const PUT = inChurch(handlePUT);
