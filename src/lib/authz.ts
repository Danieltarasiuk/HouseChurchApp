import { NextResponse } from 'next/server';
import { sql, currentChurchId, currentUserId, hasChurchContext } from '@/lib/db';

/**
 * Server-side authorization context for API routes. Every route that checks
 * a role or a group scope goes through requireViewer() rather than
 * reading the session ad hoc, so the rules live in one place.
 *
 * Roles are per church (church_memberships) and are read from the database
 * on every request, for the church the request runs in (inChurch()). A
 * platform admin is an active admin in every church.
 */

export type Role = 'admin' | 'group_leader' | 'member';

export interface Viewer {
  userId: string;
  /** The church this request runs in. */
  churchId: string;
  role: Role;
  /** Opens any church with admin rights (users.is_platform_admin). */
  isPlatformAdmin: boolean;
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

/**
 * Builds the Viewer for a user in the current church, or null when they have
 * no access to it (no membership and not a platform admin). Exported for tests.
 */
export async function loadViewer(userId: string): Promise<Viewer | null> {
  const churchId = currentChurchId();
  // Role and status come from the database on every request, not from the
  // session token, so an approval or a role change applies at once.
  const [access] = await sql(
    `SELECT u.is_platform_admin, m.role, m.status
     FROM users u
     LEFT JOIN church_memberships m ON m.user_id = u.id AND m.church_id = $2
     WHERE u.id = $1`,
    [userId, churchId]
  );
  if (!access) return null;
  const isPlatformAdmin = access.is_platform_admin === true;
  if (!isPlatformAdmin && !access.role) return null;
  const safeRole: Role = isPlatformAdmin ? 'admin' : ROLES.includes(access.role) ? access.role : 'member';
  const status: Viewer['status'] = isPlatformAdmin || access.status === 'active' ? 'active' : 'pending';

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
    churchId,
    role: status === 'active' ? safeRole : 'member',
    isPlatformAdmin,
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
  if (!hasChurchContext()) throw new Error('requireViewer() must run inside inChurch()');
  const userId = currentUserId();
  if (!userId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const viewer = await loadViewer(userId);
  if (!viewer) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  if (opts.roles && !opts.roles.includes(viewer.role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
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

/**
 * True when every member id exists in this church (row-level security hides
 * the others) and, unless the viewer is an admin, is in a group they lead.
 */
export async function leadsAllMembers(v: Viewer, memberIds: string[]): Promise<boolean> {
  const unique = [...new Set(memberIds)];
  const hcs = await memberGroups(unique);
  if (!unique.every((id) => hcs.has(id))) return false;
  if (isAdmin(v)) return true;
  return unique.every((id) => leadsGroup(v, hcs.get(id)));
}
