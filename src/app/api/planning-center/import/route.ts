import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';

interface PcoPerson {
  id: string;
  attributes: {
    first_name: string;
    last_name: string;
    name: string;
    status: string;
  };
  relationships?: {
    primary_campus?: { data: { id: string } | null };
  };
}

interface PcoIncluded {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships?: {
    person?: { data: { id: string } };
  };
}

interface SyncedPerson {
  pco_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  campus_pco_id: string | null;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
}

async function getValidToken(userId: string): Promise<string | null> {
  const rows = await sql(
    'SELECT access_token, refresh_token, expires_at FROM pco_tokens WHERE user_id = $1',
    [userId]
  );

  if (rows.length === 0) return null;

  const { access_token, refresh_token, expires_at } = rows[0];

  if (new Date(expires_at) > new Date()) {
    return access_token;
  }

  const res = await fetch('https://api.planningcenteronline.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token,
      client_id: process.env.PCO_APP_ID!,
      client_secret: process.env.PCO_SECRET!,
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();

  await sql(
    `UPDATE pco_tokens SET access_token = $1, refresh_token = $2, expires_at = NOW() + INTERVAL '7200 seconds' WHERE user_id = $3`,
    [data.access_token, data.refresh_token, userId]
  );

  return data.access_token;
}

async function fetchCampuses(token: string): Promise<Map<string, string>> {
  const campusMap = new Map<string, string>(); // pco_id -> name
  let nextUrl: string | null = 'https://api.planningcenteronline.com/people/v2/campuses?per_page=100';

  while (nextUrl) {
    const res: Response = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) break;
    const data = await res.json();

    for (const campus of data.data || []) {
      campusMap.set(campus.id, campus.attributes.name);
    }
    nextUrl = data.links?.next || null;
  }

  return campusMap;
}

async function fetchAllPeople(token: string): Promise<SyncedPerson[]> {
  const people: SyncedPerson[] = [];
  let nextUrl: string | null =
    'https://api.planningcenteronline.com/people/v2/people?per_page=100&include=emails,phone_numbers,addresses';

  while (nextUrl) {
    const res: Response = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`PCO API error: ${res.status}`);
    }

    const data = await res.json();

    // Build lookup maps from included resources
    const emailMap = new Map<string, string>();
    const phoneMap = new Map<string, string>();
    const addressMap = new Map<string, { street: string; city: string; state: string; zip: string }>();

    if (data.included) {
      for (const inc of data.included as PcoIncluded[]) {
        const personId = inc.relationships?.person?.data?.id;
        if (!personId) continue;

        if (inc.type === 'Email' && inc.attributes.primary) {
          emailMap.set(personId, inc.attributes.address as string);
        }
        if (inc.type === 'PhoneNumber' && inc.attributes.primary) {
          phoneMap.set(personId, inc.attributes.number as string);
        }
        if (inc.type === 'Address' && inc.attributes.primary) {
          addressMap.set(personId, {
            street: ((inc.attributes.street as string) || '').trim(),
            city: ((inc.attributes.city as string) || '').trim(),
            state: ((inc.attributes.state as string) || '').trim(),
            zip: ((inc.attributes.zip as string) || '').trim(),
          });
        }
      }
    }

    for (const person of data.data as PcoPerson[]) {
      const email = emailMap.get(person.id) || '';
      const phone = phoneMap.get(person.id) || '';
      const addr = addressMap.get(person.id);
      const campusId = person.relationships?.primary_campus?.data?.id || null;

      people.push({
        pco_id: person.id,
        first_name: person.attributes.first_name,
        last_name: person.attributes.last_name,
        email: email.toLowerCase().trim(),
        phone,
        campus_pco_id: campusId,
        address_street: addr?.street || '',
        address_city: addr?.city || '',
        address_state: addr?.state || '',
        address_zip: addr?.zip || '',
      });
    }

    nextUrl = data.links?.next || null;
  }

  return people;
}

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const token = await getValidToken(session.user.id!);
    if (!token) {
      return NextResponse.json({ error: 'Planning Center not connected. Please connect first.' }, { status: 400 });
    }

    // 1. Fetch campuses and people from PCO
    const [pcoCampuses, people] = await Promise.all([
      fetchCampuses(token),
      fetchAllPeople(token),
    ]);

    // 2. Sync campuses → house_churches
    const campusToHcId = new Map<string, number>();

    for (const [pcoId, campusName] of pcoCampuses) {
      const existing = await sql(
        'SELECT id FROM house_churches WHERE pco_campus_id = $1',
        [pcoId]
      );

      if (existing.length > 0) {
        campusToHcId.set(pcoId, existing[0].id);
        // Update name in case it changed
        await sql(
          'UPDATE house_churches SET name = $1, campus_name = $1, is_active = true WHERE pco_campus_id = $2',
          [campusName, pcoId]
        );
      } else {
        const result = await sql(
          'INSERT INTO house_churches (name, pco_campus_id, campus_name, is_active) VALUES ($1, $2, $1, true) RETURNING id',
          [campusName, pcoId]
        );
        campusToHcId.set(pcoId, result[0].id);
      }
    }

    // 3. Sync people → members
    let imported = 0;
    let skipped = 0;
    let archived = 0;
    const syncedPcoIds: string[] = [];

    for (const person of people) {
      syncedPcoIds.push(person.pco_id);
      const hcId = person.campus_pco_id ? (campusToHcId.get(person.campus_pco_id) || null) : null;

      const result = await sql(
        `INSERT INTO members (first_name, last_name, email, phone, house_church_id,
                              address_street, address_city, address_state, address_zip,
                              pco_id, campus_pco_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
         ON CONFLICT (pco_id) DO UPDATE SET
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           email = COALESCE(NULLIF(EXCLUDED.email, ''), members.email),
           phone = COALESCE(NULLIF(EXCLUDED.phone, ''), members.phone),
           house_church_id = COALESCE(EXCLUDED.house_church_id, members.house_church_id),
           address_street = COALESCE(NULLIF(EXCLUDED.address_street, ''), members.address_street),
           address_city = COALESCE(NULLIF(EXCLUDED.address_city, ''), members.address_city),
           address_state = COALESCE(NULLIF(EXCLUDED.address_state, ''), members.address_state),
           address_zip = COALESCE(NULLIF(EXCLUDED.address_zip, ''), members.address_zip),
           campus_pco_id = COALESCE(EXCLUDED.campus_pco_id, members.campus_pco_id),
           is_active = true
         RETURNING id`,
        [
          person.first_name, person.last_name, person.email || null,
          person.phone || null, hcId,
          person.address_street || null, person.address_city || null,
          person.address_state || null, person.address_zip || null,
          person.pco_id, person.campus_pco_id || null,
        ]
      );

      if (result.length > 0) imported++;
    }

    // 4. Archive members that are no longer in PCO (only those with a pco_id)
    if (syncedPcoIds.length > 0) {
      const placeholders = syncedPcoIds.map((_, i) => `$${i + 1}`).join(',');
      const archivedResult = await sql(
        `UPDATE members SET is_active = false
         WHERE pco_id IS NOT NULL AND pco_id NOT IN (${placeholders}) AND is_active = true
         RETURNING id`,
        syncedPcoIds
      );
      archived = archivedResult.length;
    }

    return NextResponse.json({
      imported,
      skipped,
      archived,
      total: people.length,
      campuses: pcoCampuses.size,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('PCO import error:', message, error);
    return NextResponse.json({ error: `Sync failed: ${message}` }, { status: 500 });
  }
}
