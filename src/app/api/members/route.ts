import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const members = await sql(
      `SELECT m.id, m.first_name, m.last_name, m.email, m.phone,
              m.house_church_id, hc.name AS house_church_name,
              m.address_street, m.address_city, m.address_state, m.address_zip,
              m.latitude, m.longitude,
              COALESCE(u.role, 'member') AS role
       FROM members m
       LEFT JOIN house_churches hc ON m.house_church_id = hc.id
       LEFT JOIN users u ON LOWER(m.email) = LOWER(u.email)
       WHERE m.is_active = true
       ORDER BY m.first_name, m.last_name`
    );
    return NextResponse.json({ members });
  } catch (error) {
    console.error('Members error:', error);
    return NextResponse.json({ error: 'Failed to load members' }, { status: 500 });
  }
}
