import { neon, Pool } from '@neondatabase/serverless';
import { checkConnectionString, scrubError } from './connectionString';

/**
 * The Neon connection behind src/lib/db.ts, kept separate so tests can swap
 * in PGlite (tests/helpers/db.ts) while db.ts's church-context logic runs
 * unchanged. Nothing outside db.ts imports this file.
 */

export type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
export type Query = (text: string, params?: unknown[]) => Promise<Row[]>;

export interface Transaction {
  query: Query;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

let checkedUrl: string | null = null;

/**
 * DATABASE_URL, checked before either driver sees it: both put a malformed
 * string, password included, into their errors (src/lib/connectionString.ts).
 */
function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL environment variable is not set');
  if (url !== checkedUrl) {
    checkConnectionString(url);
    checkedUrl = url;
  }
  return url;
}

/** Runs a driver call; any error it throws loses the connection string and password first. */
async function guarded<T>(url: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw scrubError(error, url);
  }
}

let http: ReturnType<typeof neon> | null = null;

/** One-shot statement over HTTP, outside any church context (system.ts only). */
export const systemQuery: Query = async (text, params = []) => {
  const url = databaseUrl();
  return guarded(url, async () => {
    http ??= neon(url);
    return (await http(text, params)) as Row[];
  });
};

/**
 * A transaction on its own WebSocket connection with app.church_id set for
 * that transaction only (set_config(..., true)), so it can never leak to
 * another request through a pooled backend.
 */
export async function openTransaction(churchId: string): Promise<Transaction> {
  if (typeof WebSocket === 'undefined') {
    throw new Error('No WebSocket in this runtime: church-scoped queries need a transaction (Node 22+).');
  }
  const url = databaseUrl();
  const pool = new Pool({ connectionString: url });
  const client = await guarded(url, () => pool.connect()).catch(async (error) => {
    await pool.end().catch(() => {});
    throw error;
  });
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    client.release();
    await pool.end();
  };
  try {
    await guarded(url, async () => {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.church_id', $1, true)", [churchId]);
    });
  } catch (error) {
    await close();
    throw error;
  }
  return {
    query: (text, params = []) =>
      guarded(url, async () => (await client.query(text, params as unknown[])).rows as Row[]),
    commit: async () => {
      try { await guarded(url, () => client.query('COMMIT')); } finally { await close(); }
    },
    rollback: async () => {
      try { await client.query('ROLLBACK'); } catch { /* connection already gone */ } finally { await close(); }
    },
  };
}
