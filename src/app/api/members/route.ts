import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rows = await sql(
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
              COALESCE(u.role, m.role, 'member') AS role
       FROM members m
       LEFT JOIN house_churches hc ON m.house_church_id = hc.id
       LEFT JOIN users u ON m.user_id = u.id
       WHERE m.is_active = true
       ORDER BY COALESCE(m.first_name, u.name), m.last_name`
    );

    // Normalize date_of_birth to YYYY-MM-DD string
    const members = rows.map((m) => ({
      ...m,
      date_of_birth: m.date_of_birth
        ? m.date_of_birth instanceof Date
          ? m.date_of_birth.toISOString().split('T')[0]
          : String(m.date_of_birth).split('T')[0]
        : null,
    }));

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Members error:', error);
    return NextResponse.json({ error: 'Failed to load members' }, { status: 500 });
  }
}
