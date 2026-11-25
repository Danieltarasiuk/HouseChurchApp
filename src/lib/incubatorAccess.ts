import { sql } from '@/lib/db';
import type { Viewer } from '@/lib/authz';

/**
 * Who may open the Pastor Incubator: admins always; everyone else only with
 * an active grant in incubator_access (granted or revoked by an admin in
 * Settings).
 */
export async function hasIncubatorAccess(viewer: Viewer): Promise<boolean> {
  if (viewer.role === 'admin') return true;
  const rows = await sql('SELECT 1 FROM incubator_access WHERE user_id = $1 AND is_active = true', [viewer.userId]);
  return rows.length > 0;
}
