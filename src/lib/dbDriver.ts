import { neon, Pool } from '@neondatabase/serverless';

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

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL environment variable is not set');
  return url;
}

let http: ReturnType<typeof neon> | null = null;

/** One-shot statement over HTTP, outside any church context (system.ts only). */
export const systemQuery: Query = async (text, params = []) => {
  http ??= neon(databaseUrl());
  return (await http(text, params)) as Row[];
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
  const pool = new Pool({ connectionString: databaseUrl() });
  const client = await pool.connect();
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    client.release();
    await pool.end();
  };
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.church_id', $1, true)", [churchId]);
  } catch (error) {
    await close();
    throw error;
  }
  return {
    query: async (text, params = []) => (await client.query(text, params as unknown[])).rows as Row[],
    commit: async () => {
      try { await client.query('COMMIT'); } finally { await close(); }
    },
    rollback: async () => {
      try { await client.query('ROLLBACK'); } catch { /* connection already gone */ } finally { await close(); }
    },
  };
}
