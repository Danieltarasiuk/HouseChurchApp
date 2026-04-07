import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== 'admin' && userRole !== 'house_church_pastor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const memberId = req.nextUrl.searchParams.get('member_id');
  if (!memberId) {
    return NextResponse.json({ error: 'member_id is required' }, { status: 400 });
  }

  try {
    // Get house churches where current user is pastor (via members table link)
    const myHcIds = await sql(
      `SELECT hc.id FROM house_churches hc
       JOIN members m ON hc.pastor_id = m.id
       WHERE m.user_id = $1`,
      [session.user.id]
    );
    const hcIdSet = new Set(myHcIds.map((r: Record<string, string>) => r.id));

    // Get member's house church
    const memberRow = await sql(
      'SELECT house_church_id FROM members WHERE id = $1',
      [memberId]
    );
    const memberHcId = memberRow[0]?.house_church_id;
    const isMyHcMember = memberHcId && hcIdSet.has(memberHcId);

    const flags = await sql(
      `SELECT mf.id, mf.member_id, mf.flag_color, mf.description, mf.created_at,
              mf.created_by, u.name AS created_by_name
       FROM member_flags mf
       LEFT JOIN users u ON mf.created_by = u.id
       WHERE mf.member_id = $1 AND mf.is_resolved = false
       ORDER BY CASE WHEN mf.flag_color = 'red' THEN 0 ELSE 1 END, mf.created_at DESC`,
      [memberId]
    );

    // Filter by visibility rules
    const visible = flags.filter((f: Record<string, string>) => {
      if (f.created_by === session.user!.id) return true;
      if (f.flag_color === 'red' && (userRole === 'admin' || isMyHcMember)) return true;
      return false;
    });

    return NextResponse.json({ flags: visible });
  } catch (error) {
    console.error('Flags GET error:', error);
    return NextResponse.json({ error: 'Failed to load flags' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== 'admin' && userRole !== 'house_church_pastor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { member_id, flag_color, description } = await req.json();

    if (!member_id || !flag_color || !description?.trim()) {
      return NextResponse.json({ error: 'member_id, flag_color, and description are required' }, { status: 400 });
    }

    if (!['yellow', 'red'].includes(flag_color)) {
      return NextResponse.json({ error: 'Invalid flag_color' }, { status: 400 });
    }

    const result = await sql(
      `INSERT INTO member_flags (member_id, created_by, flag_color, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id, member_id, flag_color, description, created_at, created_by`,
      [member_id, session.user.id, flag_color, description.trim()]
    );

    return NextResponse.json({ success: true, flag: { ...result[0], created_by_name: session.user.name } });
  } catch (error) {
    console.error('Flags POST error:', error);
    return NextResponse.json({ error: 'Failed to create flag' }, { status: 500 });
  }
}
