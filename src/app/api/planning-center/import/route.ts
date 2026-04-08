import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';
import { geocodeMembersWithoutCoords } from '@/lib/geocode';

interface PcoPerson {
  id: string;
  attributes: {
    first_name: string;
    last_name: string;
    name: string;
    status: string;
    gender: string | null;   // "M" or "F" or null
    birthdate: string | null; // "YYYY-MM-DD" or null
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
  gender: string | null;
  date_of_birth: string | null;
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

async function fetchAllPeople(token: string): Promise<{ active: SyncedPerson[]; skippedInactive: number }> {
  const active: SyncedPerson[] = [];
  let skippedInactive = 0;
  // Filter to active profiles only via PCO API
  let nextUrl: string | null =
    'https://api.planningcenteronline.com/people/v2/people?per_page=100&include=emails,phone_numbers,addresses&where[status]=active';

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
          const line1 = ((inc.attributes.street_line_1 as string) || '').trim();
          const line2 = ((inc.attributes.street_line_2 as string) || '').trim();
          const street = line2 ? `${line1}, ${line2}` : line1;
          addressMap.set(personId, {
            street,
            city: ((inc.attributes.city as string) || '').trim(),
            state: ((inc.attributes.state as string) || '').trim(),
            zip: ((inc.attributes.zip as string) || '').trim(),
          });
        }
      }
    }

    for (const person of data.data as PcoPerson[]) {
      // Secondary check: skip any non-active person that slipped through
      if (person.attributes.status && person.attributes.status !== 'active') {
        skippedInactive++;
        continue;
      }

      const email = emailMap.get(person.id) || '';
      const phone = phoneMap.get(person.id) || '';
      const addr = addressMap.get(person.id);
      const campusId = person.relationships?.primary_campus?.data?.id || null;

      // Map PCO gender "M"/"F" to "Male"/"Female"
      const rawGender = person.attributes.gender;
      const gender = rawGender === 'M' ? 'Male' : rawGender === 'F' ? 'Female' : null;

      active.push({
        pco_id: person.id,
        first_name: person.attributes.first_name,
        last_name: person.attributes.last_name,
        email: email.toLowerCase().trim(),
        phone,
        campus_pco_id: campusId,
        gender,
        date_of_birth: person.attributes.birthdate || null,
        address_street: addr?.street || '',
        address_city: addr?.city || '',
        address_state: addr?.state || '',
        address_zip: addr?.zip || '',
      });
    }

    nextUrl = data.links?.next || null;
  }

  return { active, skippedInactive };
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

    // 1. Fetch campuses and active people from PCO
    const [pcoCampuses, peopleResult] = await Promise.all([
      fetchCampuses(token),
      fetchAllPeople(token),
    ]);
    const { active: people, skippedInactive } = peopleResult;

    // 2. Sync campuses → house_churches
    const campusToHcId = new Map<string, string>();

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
    const skipped = skippedInactive;
    let archived = 0;
    const syncedPcoIds: string[] = [];

    for (const person of people) {
      syncedPcoIds.push(person.pco_id);
      // Resolve house church from PCO campus — null if person has no campus
      const hcId = person.campus_pco_id ? (campusToHcId.get(person.campus_pco_id) || null) : null;

      const result = await sql(
        `INSERT INTO members (first_name, last_name, email, phone, house_church_id,
                              gender, date_of_birth,
                              address_street, address_city, address_state, address_zip,
                              pco_id, campus_pco_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
         ON CONFLICT (pco_id) DO UPDATE SET
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           email = COALESCE(NULLIF(EXCLUDED.email, ''), members.email),
           phone = COALESCE(NULLIF(EXCLUDED.phone, ''), members.phone),
           house_church_id = EXCLUDED.house_church_id,
           gender = COALESCE(EXCLUDED.gender, members.gender),
           date_of_birth = COALESCE(EXCLUDED.date_of_birth, members.date_of_birth),
           address_street = COALESCE(NULLIF(EXCLUDED.address_street, ''), members.address_street),
           address_city = COALESCE(NULLIF(EXCLUDED.address_city, ''), members.address_city),
           address_state = COALESCE(NULLIF(EXCLUDED.address_state, ''), members.address_state),
           address_zip = COALESCE(NULLIF(EXCLUDED.address_zip, ''), members.address_zip),
           campus_pco_id = EXCLUDED.campus_pco_id,
           is_active = true
         RETURNING id`,
        [
          person.first_name, person.last_name, person.email || null,
          person.phone || null, hcId,
          person.gender || null, person.date_of_birth || null,
          person.address_street || null, person.address_city || null,
          person.address_state || null, person.address_zip || null,
          person.pco_id, person.campus_pco_id || null,
        ]
      );

      if (result.length > 0) imported++;
    }

    // 4. Deactivate members whose PCO ID is no longer in the active results
    //    (they were removed or marked inactive in PCO)
    //    Only affects PCO-synced members — manually added members (pco_id IS NULL) are untouched
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

    // 5. Batch geocode members who have address but no lat/lng
    //    This runs synchronously with rate limiting (1 req/sec) so may take a while
    //    but we do it during sync since that's admin-triggered
    let geocoded = 0;
    try {
      geocoded = await geocodeMembersWithoutCoords();
    } catch (e) {
      console.error('Geocoding batch error (non-fatal):', e);
    }

    return NextResponse.json({
      imported,
      skipped,
      archived,
      geocoded,
      total: people.length,
      campuses: pcoCampuses.size,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('PCO import error:', message, error);
    return NextResponse.json({ error: `Sync failed: ${message}` }, { status: 500 });
  }
}
