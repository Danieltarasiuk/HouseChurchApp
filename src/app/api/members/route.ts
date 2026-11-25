import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireViewer } from '@/lib/authz';
import { loadVisibilitySettings, redactMember } from '@/lib/directory';
import { todayInChurchTz } from '@/lib/churchTime';

/**
 * The member directory. Every signed-in member gets every active member's
 * name and house church; contact fields are filtered per viewer and member
 * by the directory visibility rules (src/lib/directory.ts). Fields the viewer
 * may not see are absent from the response.
 */
export async function GET() {
  const { viewer, error } = await requireViewer();
  if (error) return error;

  try {
    const [rows, settings] = await Promise.all([
      sql(
        `SELECT m.id,
                COALESCE(m.first_name, split_part(u.name, ' ', 1)) AS first_name,
                COALESCE(m.last_name, nullif(substring(u.name from position(' ' in u.name) + 1), u.name)) AS last_name,
                COALESCE(m.email, u.email) AS email,
                m.phone,
                m.house_church_id, hc.name AS house_church_name,
                m.gender,
                m.date_of_birth,
                m.address_street, m.address_city, m.address_state, m.address_zip,
                m.latitude, m.longitude,
                m.pco_household_id, m.household_name, m.attendance_note,
                COALESCE(u.role, m.role, 'member') AS role
         FROM members m
         LEFT JOIN house_churches hc ON m.house_church_id = hc.id
         LEFT JOIN users u ON m.user_id = u.id
         WHERE m.is_active = true
         ORDER BY COALESCE(m.first_name, u.name), m.last_name`
      ),
      loadVisibilitySettings(),
    ]);

    const today = todayInChurchTz();
    const members = rows.map((m) =>
      redactMember(viewer, m as Record<string, unknown> & { id: string; house_church_id: string | null }, settings, today)
    );

    return NextResponse.json({ members });
  } catch (err) {
    console.error('Members error:', err);
    return NextResponse.json({ error: 'Failed to load members' }, { status: 500 });
  }
}
