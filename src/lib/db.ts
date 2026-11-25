import { neon, Pool } from '@neondatabase/serverless';

function getDbUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return url;
}

/** One-shot queries over HTTP. Each call is its own session. */
export const sql = neon(getDbUrl());

export type TxQuery = (text: string, params?: unknown[]) => Promise<Record<string, any>[]>; // eslint-disable-line @typescript-eslint/no-explicit-any

let warnedNoWebSocket = false;

/**
 * Runs `fn` inside a real transaction (BEGIN … COMMIT, ROLLBACK on error),
 * for work that needs a row lock (SELECT … FOR UPDATE) held across other
 * awaits. The HTTP driver above cannot do that, so this opens a WebSocket
 * connection (global WebSocket, Node 22+) and closes it afterwards.
 *
 * Without a WebSocket implementation it runs `fn` on the HTTP driver with no
 * transaction and logs a warning once; callers must stay correct (if less
 * strict) in that case.
 */
export async function withTransaction<T>(fn: (q: TxQuery) => Promise<T>): Promise<T> {
  if (typeof WebSocket === 'undefined') {
    if (!warnedNoWebSocket) {
      console.warn('withTransaction: no WebSocket in this runtime; running without a transaction');
      warnedNoWebSocket = true;
    }
    return fn((text, params) => sql(text, params as unknown[]) as Promise<Record<string, any>[]>); // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  const pool = new Pool({ connectionString: getDbUrl() });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(async (text, params) => (await client.query(text, params as unknown[])).rows);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* connection already gone */ }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
