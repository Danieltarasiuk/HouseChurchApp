import type { TestDb } from './db';

/**
 * A small church for permission tests:
 *
 *   HC A  pastor: pastorA   members: mA1 (user memberA1), mA2 (no account)
 *   HC B  pastor: pastorB   members: mB1 (user memberB1), mB2 (no account)
 *   no HC: mN (user memberNoHc); pastorNone (pastor role, pastors nothing)
 *   admin (no house church)
 *
 * Every member has a phone, email, address, birthday (1990-03-04 unless
 * noted), household and attendance note, so any leak is visible.
 */
export const U = {
  admin: '00000000-0000-0000-0000-0000000000a1',
  pastorA: '00000000-0000-0000-0000-0000000000a2',
  pastorB: '00000000-0000-0000-0000-0000000000a3',
  pastorNone: '00000000-0000-0000-0000-0000000000a4',
  memberA1: '00000000-0000-0000-0000-0000000000a5',
  memberB1: '00000000-0000-0000-0000-0000000000a6',
  memberNoHc: '00000000-0000-0000-0000-0000000000a7',
} as const;

export const HC = {
  A: '00000000-0000-0000-0000-00000000000a',
  B: '00000000-0000-0000-0000-00000000000b',
} as const;

export const M = {
  admin: '00000000-0000-0000-0000-000000000101',
  pastorA: '00000000-0000-0000-0000-000000000102',
  pastorB: '00000000-0000-0000-0000-000000000103',
  pastorNone: '00000000-0000-0000-0000-000000000104',
  A1: '00000000-0000-0000-0000-000000000105',
  A2: '00000000-0000-0000-0000-000000000106',
  B1: '00000000-0000-0000-0000-000000000107',
  B2: '00000000-0000-0000-0000-000000000108',
  N: '00000000-0000-0000-0000-000000000109',
} as const;

export const ROLE_OF: Record<keyof typeof U, string> = {
  admin: 'admin',
  pastorA: 'house_church_pastor',
  pastorB: 'house_church_pastor',
  pastorNone: 'house_church_pastor',
  memberA1: 'member',
  memberB1: 'member',
  memberNoHc: 'member',
};

export async function seedChurch(db: TestDb) {
  for (const [key, id] of Object.entries(U)) {
    await db.sql('INSERT INTO users (id, name, email, role) VALUES ($1, $2, $3, $4)', [id, key, `${key}@example.test`, ROLE_OF[key as keyof typeof U]]);
  }
  await db.sql(`INSERT INTO house_churches (id, name) VALUES ($1, 'HC A'), ($2, 'HC B')`, [HC.A, HC.B]);

  const member = (id: string, userId: string | null, hc: string | null, name: string, dob = '1990-03-04') =>
    db.sql(
      `INSERT INTO members (id, user_id, house_church_id, first_name, last_name, email, phone,
         address_street, address_city, address_state, address_zip, latitude, longitude,
         date_of_birth, pco_household_id, household_name, attendance_note, is_active)
       VALUES ($1, $2, $3, $4, 'Test', $5, '555-0100', '1 Main St', 'Miami', 'FL', '33101', 25.7, -80.2,
         $6, 'hh-' || $4, $4 || ' household', 'note about ' || $4, true)`,
      [id, userId, hc, name, `${name.toLowerCase()}@example.test`, dob]
    );
  await member(M.admin, U.admin, null, 'Admin');
  await member(M.pastorA, U.pastorA, HC.A, 'PastorA');
  await member(M.pastorB, U.pastorB, HC.B, 'PastorB');
  await member(M.pastorNone, U.pastorNone, null, 'PastorNone');
  await member(M.A1, U.memberA1, HC.A, 'A1');
  await member(M.A2, null, HC.A, 'A2', '2012-06-15'); // a minor
  await member(M.B1, U.memberB1, HC.B, 'B1');
  await member(M.B2, null, HC.B, 'B2');
  await member(M.N, U.memberNoHc, null, 'N');

  await db.sql('UPDATE house_churches SET pastor_id = $1 WHERE id = $2', [M.pastorA, HC.A]);
  await db.sql('UPDATE house_churches SET pastor_id = $1 WHERE id = $2', [M.pastorB, HC.B]);
}
