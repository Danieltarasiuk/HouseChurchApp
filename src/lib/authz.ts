import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';

/**
 * Server-side authorization context for API routes. Every route that checks
 * a role or a house-church scope goes through requireViewer() rather than
 * reading the session ad hoc, so the rules live in one place.
 */

export type Role = 'admin' | 'house_church_pastor' | 'member';

export interface Viewer {
  userId: string;
  role: Role;
  /** The viewer's own members row, if any. */
  memberId: string | null;
  /** The house church the viewer belongs to as a member. */
  houseChurchId: string | null;
  /**
   * House churches this viewer pastors (house_churches.pastor_id is their
   * member). Only for the house_church_pastor role; empty for everyone else.
   */
  pastoredHcIds: string[];
}

const ROLES: Role[] = ['admin', 'house_church_pastor', 'member'];

/** Builds the Viewer for a user id and session role (exported for tests). */
export async function loadViewer(userId: string, role: string | undefined): Promise<Viewer> {
  const safeRole: Role = ROLES.includes(role as Role) ? (role as Role) : 'member';

  const own = await sql(
    `SELECT id, house_church_id FROM members
     WHERE user_id = $1 AND is_active = true
     ORDER BY joined_at NULLS LAST
     LIMIT 1`,
    [userId]
  );

  const pastored = safeRole === 'house_church_pastor'
    ? await sql(
        `SELECT DISTINCT hc.id FROM house_churches hc
         JOIN members m ON hc.pastor_id = m.id
         WHERE m.user_id = $1`,
        [userId]
      )
    : [];

  return {
    userId,
    role: safeRole,
    memberId: own[0]?.id ?? null,
    houseChurchId: own[0]?.house_church_id ?? null,
    pastoredHcIds: pastored.map((r) => String(r.id)),
  };
}

export type ViewerResult =
  | { viewer: Viewer; error?: undefined }
  | { viewer?: undefined; error: NextResponse };

/**
 * The signed-in viewer, or a 401/403 response to return as-is.
 * `roles` limits which roles may proceed.
 */
export async function requireViewer(opts: { roles?: Role[] } = {}): Promise<ViewerResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const role = (session.user as { role?: string }).role;
  if (opts.roles && !opts.roles.includes(role as Role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { viewer: await loadViewer(userId, role) };
}

export const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export const LEADER_ROLES: Role[] = ['admin', 'house_church_pastor'];

export const isAdmin = (v: Viewer) => v.role === 'admin';

/** True when the viewer pastors this house church (admins are not included). */
export const pastorsHc = (v: Viewer, hcId: string | null | undefined) =>
  !!hcId && v.role === 'house_church_pastor' && v.pastoredHcIds.includes(hcId);

/** Admins, and the pastor of the member's house church. */
export const leadsMemberIn = (v: Viewer, memberHcId: string | null | undefined) =>
  isAdmin(v) || pastorsHc(v, memberHcId);

/**
 * House churches whose data a leader may touch: null means all (admin);
 * a pastor gets exactly their own, possibly none, never "everyone".
 */
export const leaderHcScope = (v: Viewer): string[] | null => (isAdmin(v) ? null : v.pastoredHcIds);

/** member id -> house_church_id for the given members (missing ids are absent). */
export async function memberHouseChurches(memberIds: string[]): Promise<Map<string, string | null>> {
  if (memberIds.length === 0) return new Map();
  const rows = await sql(
    'SELECT id::text, house_church_id::text FROM members WHERE id::text = ANY($1::text[])',
    [memberIds]
  );
  return new Map(rows.map((r) => [String(r.id), r.house_church_id ? String(r.house_church_id) : null]));
}

/** True when every member id exists and is in a house church the viewer leads. */
export async function leadsAllMembers(v: Viewer, memberIds: string[]): Promise<boolean> {
  if (isAdmin(v)) return true;
  const unique = [...new Set(memberIds)];
  const hcs = await memberHouseChurches(unique);
  return unique.every((id) => hcs.has(id) && pastorsHc(v, hcs.get(id)));
}
