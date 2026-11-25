import type { Viewer } from '@/lib/authz';

export interface PrayerScope {
  user_id: string | null;
  visibility: string;
  group_id: string | null;
}

/**
 * Who may see a prayer request. Shared by /api/prayer and the dashboard so
 * the two can never disagree.
 *   - its creator, and admins: always
 *   - public: every signed-in member
 *   - group: members of that group, and its pastor
 *   - private: its pastor only
 */
export function canSeePrayer(v: Viewer, p: PrayerScope): boolean {
  if (p.user_id && p.user_id === v.userId) return true;
  if (v.role === 'admin') return true;
  if (p.visibility === 'public') return true;

  const pastorsIt = !!p.group_id && v.role === 'group_leader' && v.ledGroupIds.includes(p.group_id);
  if (p.visibility === 'group') {
    return pastorsIt || (!!v.groupId && v.groupId === p.group_id);
  }
  if (p.visibility === 'private') return pastorsIt;
  return false;
}
