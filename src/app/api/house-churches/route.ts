import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const churches = await sql(
      `SELECT hc.id, hc.name, hc.description, hc.meeting_day, hc.meeting_time,
              hc.location, hc.pco_campus_id, hc.campus_name,
              hc.address_street, hc.address_city, hc.address_state, hc.address_zip,
              hc.pastor_id, hc.host_id, hc.trainee_id,
              p_user.name AS pastor_name,
              h_member.first_name || ' ' || h_member.last_name AS host_name,
              t_member.first_name || ' ' || t_member.last_name AS trainee_name,
              (SELECT COUNT(*) FROM members m WHERE m.house_church_id = hc.id AND m.is_active = true)::int AS member_count
       FROM house_churches hc
       LEFT JOIN users p_user ON hc.pastor_id = p_user.id
       LEFT JOIN members h_member ON hc.host_id = h_member.id
       LEFT JOIN members t_member ON hc.trainee_id = t_member.id
       WHERE hc.is_active = true
       ORDER BY hc.campus_name NULLS LAST, hc.name`
    );

    // Get distinct campuses for grouping
    const campuses = await sql(
      `SELECT DISTINCT pco_campus_id, campus_name
       FROM house_churches
       WHERE is_active = true AND pco_campus_id IS NOT NULL
       ORDER BY campus_name`
    );

    return NextResponse.json({ churches, campuses });
  } catch (error) {
    console.error('House churches error:', error);
    return NextResponse.json({ error: 'Failed to load house churches' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      name, description, meeting_day, meeting_time, location,
      address_street, address_city, address_state, address_zip,
      pastor_id, host_id, trainee_id, campus_name, pco_campus_id,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const result = await sql(
      `INSERT INTO house_churches (name, description, meeting_day, meeting_time, location,
                                    address_street, address_city, address_state, address_zip,
                                    pastor_id, host_id, trainee_id, campus_name, pco_campus_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true)
       RETURNING id`,
      [
        name.trim(), description || null, meeting_day || null, meeting_time || null, location || null,
        address_street || null, address_city || null, address_state || null, address_zip || null,
        pastor_id || null, host_id || null, trainee_id || null, campus_name || null, pco_campus_id || null,
      ]
    );

    return NextResponse.json({ id: result[0].id });
  } catch (error) {
    console.error('Create house church error:', error);
    return NextResponse.json({ error: 'Failed to create house church' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      id, name, description, meeting_day, meeting_time, location,
      address_street, address_city, address_state, address_zip,
      pastor_id, host_id, trainee_id, campus_name, pco_campus_id,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await sql(
      `UPDATE house_churches SET
        name = $1, description = $2, meeting_day = $3, meeting_time = $4, location = $5,
        address_street = $6, address_city = $7, address_state = $8, address_zip = $9,
        pastor_id = $10, host_id = $11, trainee_id = $12, campus_name = $13, pco_campus_id = $14
       WHERE id = $15`,
      [
        name?.trim() || null, description || null, meeting_day || null, meeting_time || null, location || null,
        address_street || null, address_city || null, address_state || null, address_zip || null,
        pastor_id || null, host_id || null, trainee_id || null, campus_name || null, pco_campus_id || null,
        id,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update house church error:', error);
    return NextResponse.json({ error: 'Failed to update house church' }, { status: 500 });
  }
}
