import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import type { Transaction } from '@/lib/dbDriver';

/**
 * In-process Postgres (PGlite) built from src/lib/schema.sql, so tests run
 * the app's real SQL without a database server or network. Each test file
 * gets fresh databases via newTestDb(); nothing is shared with Neon.
 *
 * The app's own code (src/lib/db.ts: withChurch, sql, row-level security)
 * runs unchanged on top of testDriver below, which stands in for the Neon
 * driver (src/lib/dbDriver.ts). Like production, app queries run as
 * kinly_app, a role without BYPASSRLS, with app.church_id set per
 * transaction; the tests' own queries (current.db.sql) run as the superuser
 * and see every church.
 */
const SCHEMA = readFileSync(path.resolve(__dirname, '../../src/lib/schema.sql'), 'utf8');

/** The app role and its privileges, as migration 002 grants them. */
export const APP_ROLE_SQL = `
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kinly_app') THEN
      CREATE ROLE kinly_app NOLOGIN NOSUPERUSER NOBYPASSRLS;
    END IF;
  END $$;
  GRANT USAGE ON SCHEMA public TO kinly_app;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kinly_app;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO kinly_app;
`;

export interface TestDb {
  pg: PGlite;
  /** Same call shape as the neon `sql` export: (text, params) => rows. */
  sql: (text: string, params?: unknown[]) => Promise<Record<string, any>[]>;
}

export async function newTestDb(): Promise<TestDb> {
  const pg = new PGlite();
  await pg.exec(SCHEMA);
  await pg.exec(APP_ROLE_SQL);
  return {
    pg,
    sql: async (text, params = []) => (await pg.query(text, params as any[])).rows as Record<string, any>[],
  };
}

/**
 * One database per test file, each test isolated in a transaction that is
 * rolled back afterwards (PGlite is a single connection, so the app's
 * transactions are savepoints inside it). Booting PGlite costs about a
 * second; this keeps the suite fast.
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
  hooks.beforeEach(async () => {
    frames.length = 0;
    cookieJar.clear();
    driverHooks.beforeOpen = null;
    await current.db!.pg.exec('BEGIN');
  });
  hooks.afterEach(async () => {
    frames.length = 0;
    await current.db!.pg.exec('ROLLBACK');
  });
}

/**
 * Holder the driver reads from, so each test can swap in a fresh database:
 * `current.db = await newTestDb()`.
 */
export const current: { db: TestDb | null } = { db: null };

const db = () => {
  if (!current.db) throw new Error('test forgot to set current.db');
  return current.db;
};

/**
 * Test hook: runs just before the app opens a transaction (e.g. to change a
 * row "from another server instance" right before a lock is taken).
 */
export const driverHooks: { beforeOpen: null | ((churchId: string) => Promise<void>) } = { beforeOpen: null };

/** Open app transactions, innermost last (their church ids). */
const frames: string[] = [];
let savepoints = 0;

async function applyTopFrame() {
  const top = frames[frames.length - 1];
  if (top) {
    await db().pg.exec('SET LOCAL ROLE kinly_app');
    await db().sql("SELECT set_config('app.church_id', $1, true)", [top]);
  } else {
    await db().pg.exec('RESET ROLE');
    await db().sql("SELECT set_config('app.church_id', '', true)");
  }
}

/**
 * Drop-in for src/lib/dbDriver.ts:
 *   vi.mock('@/lib/dbDriver', async () => (await import('./helpers/db')).testDriver);
 */
export const testDriver = {
  /** A system query: as the app role, outside any church (unless one is open). */
  systemQuery: async (text: string, params: unknown[] = []) => {
    if (frames.length > 0) return db().sql(text, params);
    await db().pg.exec('SET LOCAL ROLE kinly_app');
    try {
      return await db().sql(text, params);
    } finally {
      await db().pg.exec('RESET ROLE');
    }
  },

  /** A church transaction: a savepoint, the app role, app.church_id. */
  openTransaction: async (churchId: string): Promise<Transaction> => {
    if (driverHooks.beforeOpen) await driverHooks.beforeOpen(churchId);
    const name = `app_tx_${++savepoints}`;
    await db().pg.exec(`SAVEPOINT ${name}`);
    frames.push(churchId);
    await applyTopFrame();
    let done = false;
    const finish = async (commit: boolean) => {
      if (done) return;
      done = true;
      if (commit) {
        // Like COMMIT in Postgres: after a failed statement it rolls back.
        try {
          await db().pg.exec(`RELEASE SAVEPOINT ${name}`);
        } catch {
          await db().pg.exec(`ROLLBACK TO SAVEPOINT ${name}; RELEASE SAVEPOINT ${name}`);
        }
      } else {
        await db().pg.exec(`ROLLBACK TO SAVEPOINT ${name}; RELEASE SAVEPOINT ${name}`);
      }
      frames.splice(frames.lastIndexOf(churchId), 1);
      await applyTopFrame();
    };
    return {
      query: (text, params) => db().sql(text, params),
      commit: () => finish(true),
      rollback: () => finish(false),
    };
  },
};

/**
 * The browser's cookies as next/headers would see them (the church switcher's
 * kinly-church cookie, the PCO OAuth state). Cleared before every test.
 *   vi.mock('next/headers', async () => (await import('./helpers/db')).headersMock);
 */
export const cookieJar = new Map<string, string>();
export const headersMock = {
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined),
    set: (name: string, value: string) => { cookieJar.set(name, value); },
    delete: (opts: string | { name: string }) => { cookieJar.delete(typeof opts === 'string' ? opts : opts.name); },
  }),
  headers: async () => new Headers(),
};
