import type { Viewer } from '@/lib/authz';

export interface PrayerScope {
  user_id: string | null;
  visibility: string;
  house_church_id: string | null;
}

/**
 * Who may see a prayer request. Shared by /api/prayer and the dashboard so
 * the two can never disagree.
 *   - its creator, and admins: always
 *   - public: every signed-in member
 *   - house_church: members of that house church, and its pastor
 *   - private: its pastor only
 */
export function canSeePrayer(v: Viewer, p: PrayerScope): boolean {
  if (p.user_id && p.user_id === v.userId) return true;
  if (v.role === 'admin') return true;
  if (p.visibility === 'public') return true;

  const pastorsIt = !!p.house_church_id && v.role === 'house_church_pastor' && v.pastoredHcIds.includes(p.house_church_id);
  if (p.visibility === 'house_church') {
    return pastorsIt || (!!v.houseChurchId && v.houseChurchId === p.house_church_id);
  }
  if (p.visibility === 'private') return pastorsIt;
  return false;
}
