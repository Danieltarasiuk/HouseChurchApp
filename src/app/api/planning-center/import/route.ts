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
}

interface PcoEmail {
  id: string;
  attributes: {
    address: string;
    primary: boolean;
  };
}

interface PcoPhone {
  id: string;
  attributes: {
    number: string;
    primary: boolean;
  };
}

async function getValidToken(userId: string): Promise<string | null> {
  const rows = await sql(
    'SELECT access_token, refresh_token, expires_at FROM pco_tokens WHERE user_id = $1',
    [userId]
  );

  if (rows.length === 0) return null;

  const { access_token, refresh_token, expires_at } = rows[0];

  // If token hasn't expired, use it
  if (new Date(expires_at) > new Date()) {
    return access_token;
  }

  // Refresh the token
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

async function fetchAllPeople(token: string) {
  const people: { name: string; first_name: string; last_name: string; email: string; phone: string }[] = [];
  let nextUrl: string | null = 'https://api.planningcenteronline.com/people/v2/people?per_page=100&include=emails,phone_numbers';

  while (nextUrl) {
    const res: Response = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`PCO API error: ${res.status}`);
    }

    const data = await res.json();

    // Build lookup maps for included emails and phones
    const emailMap = new Map<string, string>();
    const phoneMap = new Map<string, string>();

    if (data.included) {
      for (const inc of data.included) {
        if (inc.type === 'Email' && inc.attributes.primary) {
          // Emails are linked to people via relationships, but PCO includes
          // have a relationships.person field - use the person's id
          const personId = inc.relationships?.person?.data?.id;
          if (personId) emailMap.set(personId, inc.attributes.address);
        }
        if (inc.type === 'PhoneNumber' && inc.attributes.primary) {
          const personId = inc.relationships?.person?.data?.id;
          if (personId) phoneMap.set(personId, inc.attributes.number);
        }
      }
    }

    for (const person of data.data as PcoPerson[]) {
      const email = emailMap.get(person.id) || '';
      const phone = phoneMap.get(person.id) || '';

      people.push({
        name: person.attributes.name,
        first_name: person.attributes.first_name,
        last_name: person.attributes.last_name,
        email: email.toLowerCase().trim(),
        phone,
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

    const people = await fetchAllPeople(token);

    let imported = 0;
    let skipped = 0;

    for (const person of people) {
      if (!person.email) {
        skipped++;
        continue;
      }

      const result = await sql(
        `INSERT INTO members (first_name, last_name, email, phone, is_active)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (email) DO UPDATE SET
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           phone = COALESCE(NULLIF(EXCLUDED.phone, ''), members.phone)
         RETURNING id`,
        [person.first_name, person.last_name, person.email, person.phone || null]
      );

      if (result.length > 0) imported++;
    }

    return NextResponse.json({
      imported,
      skipped,
      total: people.length,
    });
  } catch (error) {
    console.error('PCO import error:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
