import type { TestDb } from './db';

/**
 * A small church for permission tests:
 *
 *   group A  pastor: pastorA   members: mA1 (user memberA1), mA2 (no account)
 *   group B  pastor: pastorB   members: mB1 (user memberB1), mB2 (no account)
 *   no group: mN (user memberNoGroup); pastorNone (pastor role, pastors nothing)
 *   admin (no group)
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
  memberNoGroup: '00000000-0000-0000-0000-0000000000a7',
} as const;

export const GROUP = {
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
  pastorA: 'group_leader',
  pastorB: 'group_leader',
  pastorNone: 'group_leader',
  memberA1: 'member',
  memberB1: 'member',
  memberNoGroup: 'member',
};

export async function seedChurch(db: TestDb) {
  for (const [key, id] of Object.entries(U)) {
    await db.sql('INSERT INTO users (id, name, email, role) VALUES ($1, $2, $3, $4)', [id, key, `${key}@example.test`, ROLE_OF[key as keyof typeof U]]);
  }
  await db.sql(`INSERT INTO groups (id, name) VALUES ($1, 'Group A'), ($2, 'Group B')`, [GROUP.A, GROUP.B]);

  const member = (id: string, userId: string | null, groupId: string | null, name: string, dob = '1990-03-04') =>
    db.sql(
      `INSERT INTO members (id, user_id, group_id, first_name, last_name, email, phone,
         address_street, address_city, address_state, address_zip, latitude, longitude,
         date_of_birth, pco_household_id, household_name, attendance_note, is_active)
       VALUES ($1, $2, $3, $4, 'Test', $5, '555-0100', '1 Main St', 'Miami', 'FL', '33101', 25.7, -80.2,
         $6, 'hh-' || $4, $4 || ' household', 'note about ' || $4, true)`,
      [id, userId, groupId, name, `${name.toLowerCase()}@example.test`, dob]
    );
  await member(M.admin, U.admin, null, 'Admin');
  await member(M.pastorA, U.pastorA, GROUP.A, 'PastorA');
  await member(M.pastorB, U.pastorB, GROUP.B, 'PastorB');
  await member(M.pastorNone, U.pastorNone, null, 'PastorNone');
  await member(M.A1, U.memberA1, GROUP.A, 'A1');
  await member(M.A2, null, GROUP.A, 'A2', '2012-06-15'); // a minor
  await member(M.B1, U.memberB1, GROUP.B, 'B1');
  await member(M.B2, null, GROUP.B, 'B2');
  await member(M.N, U.memberNoGroup, null, 'N');

  await db.sql('UPDATE groups SET pastor_id = $1 WHERE id = $2', [M.pastorA, GROUP.A]);
  await db.sql('UPDATE groups SET pastor_id = $1 WHERE id = $2', [M.pastorB, GROUP.B]);
}
