import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

/**
 * In-process Postgres (PGlite) built from src/lib/schema.sql, so tests run
 * the app's real SQL without a database server or network. Each test file
 * gets fresh databases via newTestDb(); nothing is shared with Neon.
 */
const SCHEMA = readFileSync(path.resolve(__dirname, '../../src/lib/schema.sql'), 'utf8');

export interface TestDb {
  pg: PGlite;
  /** Same call shape as the neon `sql` export: (text, params) => rows. */
  sql: (text: string, params?: unknown[]) => Promise<Record<string, any>[]>;
}

export async function newTestDb(): Promise<TestDb> {
  const pg = new PGlite();
  await pg.exec(SCHEMA);
  return {
    pg,
    sql: async (text, params = []) => (await pg.query(text, params as any[])).rows as Record<string, any>[],
  };
}

/**
 * One database per test file, each test isolated in a transaction that is
 * rolled back afterwards (PGlite is a single connection, so the app's
 * queries run inside it). Booting PGlite costs about a second; this keeps
 * the suite fast. App code issues no BEGIN/COMMIT of its own.
 */
export function setupTestDb(hooks: {
  beforeAll: (fn: () => Promise<void>, timeout?: number) => void;
  beforeEach: (fn: () => Promise<void>) => void;
  afterEach: (fn: () => Promise<void>) => void;
}, seed?: (db: TestDb) => Promise<void>) {
  hooks.beforeAll(async () => {
    current.db = await newTestDb();
    if (seed) await seed(current.db);
  }, 30_000);
  hooks.beforeEach(async () => { await current.db!.pg.exec('BEGIN'); });
  hooks.afterEach(async () => { await current.db!.pg.exec('ROLLBACK'); });
}

/**
 * Holder the vi.mock('@/lib/db') factory reads from, so each test can swap in
 * a fresh database: `current.db = await newTestDb()`.
 */
export const current: { db: TestDb | null } = { db: null };

export const mockedSql = (text: string, params?: unknown[]) => {
  if (!current.db) throw new Error('test forgot to set current.db');
  return current.db.sql(text, params);
};
