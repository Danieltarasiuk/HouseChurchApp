import { cookies } from 'next/headers';
import {
  isUuid, systemListChurches, systemListMemberships, systemUserAccess, type Membership,
} from '@/lib/system';

/**
 * Which church a request is in: the one function every entry point uses
 * (API routes through inChurch(), the session, the root layout).
 *
 * Today the choice comes from the kinly-church cookie (set by the church
 * switcher), honoured only if the user belongs to that church or is a
 * platform admin, and otherwise falls back to the user's first active
 * membership. PR 1.2 adds "from the subdomain" as the first rule inside
 * resolveChurchForUser(); callers do not change.
 */

export const CHURCH_COOKIE = 'kinly-church';
export const CHURCH_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** The church the switcher last chose in this browser, if it looks valid. */
export async function readChurchCookie(): Promise<string | null> {
  try {
    const value = (await cookies()).get(CHURCH_COOKIE)?.value;
    return isUuid(value) ? value : null;
  } catch {
    return null; // outside a request (scripts, tests without a cookie)
  }
}

export interface ResolvedChurch {
  churchId: string;
  /** The user's role and status there (a platform admin is always an active admin). */
  role: Membership['role'];
  status: Membership['status'];
  isPlatformAdmin: boolean;
}

/**
 * Pure choice, given what the user can open:
 *   1. the requested church (cookie), if they belong to it or are a platform admin
 *   2. their first active membership
 *   3. their first membership at all (pending: they see the waiting screen)
 *   4. a platform admin with no membership: the oldest church
 */
export function pickChurch(input: {
  memberships: Pick<Membership, 'churchId' | 'role' | 'status'>[];
  isPlatformAdmin: boolean;
  churchIds: string[];
  requested: string | null;
}): ResolvedChurch | null {
  const { memberships, isPlatformAdmin, churchIds, requested } = input;
  const as = (churchId: string): ResolvedChurch => {
    const m = memberships.find((x) => x.churchId === churchId);
    return isPlatformAdmin
      ? { churchId, role: 'admin', status: 'active', isPlatformAdmin }
      : { churchId, role: m!.role, status: m!.status, isPlatformAdmin };
  };
  if (requested && (memberships.some((m) => m.churchId === requested) || (isPlatformAdmin && churchIds.includes(requested)))) {
    return as(requested);
  }
  const active = memberships.find((m) => m.status === 'active');
  if (active) return as(active.churchId);
  if (memberships[0]) return as(memberships[0].churchId);
  if (isPlatformAdmin && churchIds[0]) return as(churchIds[0]);
  return null;
}

/** The church this user's request is in, or null if they belong to none. */
export async function resolveChurchForUser(userId: string, requested?: string | null): Promise<ResolvedChurch | null> {
  const access = await systemUserAccess(userId);
  if (!access) return null;
  const memberships = await systemListMemberships(userId);
  const churchIds = access.isPlatformAdmin ? (await systemListChurches()).map((c) => c.id) : [];
  return pickChurch({
    memberships,
    isPlatformAdmin: access.isPlatformAdmin,
    churchIds,
    requested: requested === undefined ? await readChurchCookie() : requested,
  });
}

/**
 * The church a signed-out visitor is signing up to or signing in to: the
 * cookie's church if it exists, else the first church. (PR 1.2: the
 * subdomain's church.)
 */
export async function resolveSignupChurch(): Promise<string | null> {
  const churches = await systemListChurches();
  const requested = await readChurchCookie();
  if (requested && churches.some((c) => c.id === requested)) return requested;
  return churches[0]?.id ?? null;
}
