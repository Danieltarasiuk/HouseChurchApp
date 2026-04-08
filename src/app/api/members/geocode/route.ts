import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';
import { buildAddress } from '@/lib/geocode';

function stripUnit(street: string): string {
  return street.replace(/,?\s*(apt|apartment|unit|suite|ste|bldg|building|fl|floor|rm|room|#)\s*.*/i, '').trim();
}

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== 'admin' && userRole !== 'house_church_pastor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Get members with addresses but no coordinates
    const members = await sql(
      `SELECT id, address_street, address_city, address_state, address_zip
       FROM members
       WHERE is_active = true
         AND address_street IS NOT NULL AND address_street != ''
         AND (latitude IS NULL OR longitude IS NULL)
       LIMIT 50`
    );

    let geocoded = 0;

    for (const member of members) {
      const address = buildAddress(
        stripUnit(member.address_street || ''),
        member.address_city || '',
        member.address_state || '',
        member.address_zip || '',
      );

      if (!address) continue;

      // Use Nominatim (free, rate-limited to 1 req/sec)
      await new Promise((r) => setTimeout(r, 1100));

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        { headers: { 'User-Agent': 'HouseChurchApp/1.0' } }
      );

      if (!res.ok) continue;

      const results = await res.json();
      if (results.length === 0) continue;

      const { lat, lon } = results[0];

      await sql(
        'UPDATE members SET latitude = $1, longitude = $2 WHERE id = $3',
        [parseFloat(lat), parseFloat(lon), member.id]
      );

      geocoded++;
    }

    return NextResponse.json({ geocoded, total: members.length });
  } catch (error) {
    console.error('Geocode error:', error);
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 });
  }
}
