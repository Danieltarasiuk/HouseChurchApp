import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';

/**
 * Server-side authorization context for API routes. Every route that checks
 * a role or a group scope goes through requireViewer() rather than
 * reading the session ad hoc, so the rules live in one place.
 */

export type Role = 'admin' | 'group_leader' | 'member';

export interface Viewer {
  userId: string;
  role: Role;
  /** The viewer's own members row, if any. */
  memberId: string | null;
  /** The group the viewer belongs to as a member. */
  groupId: string | null;
  /**
   * Groups this viewer pastors (groups.pastor_id is their
   * member). Only for the group_leader role; empty for everyone else.
   */
  ledGroupIds: string[];
  /** 'pending' = an email sign-up an admin has not approved yet. */
  status: 'active' | 'pending';
}

const ROLES: Role[] = ['admin', 'group_leader', 'member'];

/** Builds the Viewer for a user id and session role (exported for tests). */
export async function loadViewer(userId: string, role: string | undefined): Promise<Viewer> {
  const safeRole: Role = ROLES.includes(role as Role) ? (role as Role) : 'member';

  // Status is read from the database on every request, not trusted from the
  // session token, so an approval or a new pending sign-up applies at once.
  const account = await sql('SELECT status FROM users WHERE id = $1', [userId]);
  const status: Viewer['status'] = account[0]?.status === 'active' ? 'active' : 'pending';

  const own = await sql(
    `SELECT id, group_id FROM members
     WHERE user_id = $1 AND is_active = true
     ORDER BY joined_at NULLS LAST
     LIMIT 1`,
    [userId]
  );

  const pastored = safeRole === 'group_leader'
    ? await sql(
        `SELECT DISTINCT hc.id FROM groups hc
         JOIN members m ON hc.pastor_id = m.id
         WHERE m.user_id = $1`,
        [userId]
      )
    : [];

  return {
    userId,
    role: status === 'active' ? safeRole : 'member',
    status,
    memberId: own[0]?.id ?? null,
    groupId: own[0]?.group_id ?? null,
    ledGroupIds: pastored.map((r) => String(r.id)),
  };
}

export type ViewerResult =
  | { viewer: Viewer; error?: undefined }
  | { viewer?: undefined; error: NextResponse };

/**
 * The signed-in viewer, or a 401/403 response to return as-is.
 * `roles` limits which roles may proceed.
 */
export async function requireViewer(opts: { roles?: Role[]; allowPending?: boolean } = {}): Promise<ViewerResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const role = (session.user as { role?: string }).role;
  if (opts.roles && !opts.roles.includes(role as Role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  const viewer = await loadViewer(userId, role);
  // A pending account gets no member data, directory or prayer requests:
  // every route behind requireViewer refuses it (a missing users row too).
  if (viewer.status !== 'active' && !opts.allowPending) {
    return { error: NextResponse.json({ error: 'Account pending approval', reason: 'account_pending' }, { status: 403 }) };
  }
  return { viewer };
}

export const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export const LEADER_ROLES: Role[] = ['admin', 'group_leader'];

export const isAdmin = (v: Viewer) => v.role === 'admin';

/** True when the viewer pastors this group (admins are not included). */
export const leadsGroup = (v: Viewer, groupId: string | null | undefined) =>
  !!groupId && v.role === 'group_leader' && v.ledGroupIds.includes(groupId);

/** Admins, and the pastor of the member's group. */
export const leadsMemberIn = (v: Viewer, memberGroupId: string | null | undefined) =>
  isAdmin(v) || leadsGroup(v, memberGroupId);

/**
 * Groups whose data a leader may touch: null means all (admin);
 * a pastor gets exactly their own, possibly none, never "everyone".
 */
export const leaderGroupScope = (v: Viewer): string[] | null => (isAdmin(v) ? null : v.ledGroupIds);

/** member id -> group_id for the given members (missing ids are absent). */
export async function memberGroups(memberIds: string[]): Promise<Map<string, string | null>> {
  if (memberIds.length === 0) return new Map();
  const rows = await sql(
    'SELECT id::text, group_id::text FROM members WHERE id::text = ANY($1::text[])',
    [memberIds]
  );
  return new Map(rows.map((r) => [String(r.id), r.group_id ? String(r.group_id) : null]));
}

/** True when every member id exists and is in a group the viewer leads. */
export async function leadsAllMembers(v: Viewer, memberIds: string[]): Promise<boolean> {
  if (isAdmin(v)) return true;
  const unique = [...new Set(memberIds)];
  const hcs = await memberGroups(unique);
  return unique.every((id) => hcs.has(id) && leadsGroup(v, hcs.get(id)));
}
