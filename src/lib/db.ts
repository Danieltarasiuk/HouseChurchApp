import { AsyncLocalStorage } from 'node:async_hooks';
import { openTransaction, systemQuery, type Query, type Row } from '@/lib/dbDriver';

/**
 * Database access, always inside one church.
 *
 * Every church-owned table has row-level security keyed on the transaction's
 * app.church_id (see the end of schema.sql). withChurch(churchId, fn) opens a
 * transaction, sets app.church_id for it, and runs fn; every sql() call made
 * while fn runs (however deep, across awaits) goes through that transaction.
 * Outside withChurch, sql() throws, and the database itself would return no
 * rows and refuse writes.
 *
 * API routes get their context from inChurch() (src/lib/churchRoute.ts); the
 * cron and sign-in flows call withChurch() themselves. The only queries that
 * run outside a church are in src/lib/system.ts, through systemSql.
 */

export type TxQuery = Query;
export type { Row };

/** The church row every request in that church can read (settings). */
export interface ChurchSettings {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  default_language: 'en' | 'es';
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  group_label_singular_en: string;
  group_label_plural_en: string;
  group_label_singular_es: string;
  group_label_plural_es: string;
  checkins_event_name: string | null;
  church_center_url: string | null;
  google_calendar_id: string | null;
  plan_tier: string;
}

export const CHURCH_COLUMNS = `id, slug, name, timezone, default_language, logo_url, primary_color, accent_color,
  group_label_singular_en, group_label_plural_en, group_label_singular_es, group_label_plural_es,
  checkins_event_name, church_center_url, google_calendar_id, plan_tier`;

interface ChurchContext {
  churchId: string;
  church: ChurchSettings;
  /** The signed-in user for this request, when there is one. */
  userId: string | null;
  query: Query;
}

const context = new AsyncLocalStorage<ChurchContext>();

/**
 * Runs fn inside one church: a transaction with app.church_id set, committed
 * when fn resolves and rolled back when it throws.
 *
 * Nested calls for the same church reuse the open transaction, unless
 * `separate` asks for a transaction of its own (a row lock that must not be
 * held for the rest of the request, or work that must commit even if the
 * surrounding request fails, like the sync log). A nested call for a
 * different church is a bug and throws.
 */
export async function withChurch<T>(
  churchId: string,
  fn: () => Promise<T>,
  opts: { separate?: boolean; userId?: string | null } = {}
): Promise<T> {
  const outer = context.getStore();
  if (outer) {
    if (outer.churchId !== churchId) throw new Error('withChurch: already inside a different church');
    if (!opts.separate) return fn();
  }

  const tx = await openTransaction(churchId);
  try {
    const [church] = await tx.query(`SELECT ${CHURCH_COLUMNS} FROM churches WHERE id = $1`, [churchId]);
    if (!church) throw new Error(`withChurch: no church ${churchId}`);
    const store: ChurchContext = {
      churchId,
      church: church as ChurchSettings,
      userId: opts.userId !== undefined ? opts.userId : outer?.userId ?? null,
      query: tx.query,
    };
    const result = await context.run(store, fn);
    await tx.commit();
    return result;
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

function store(): ChurchContext {
  const s = context.getStore();
  if (!s) throw new Error('No church context: wrap this in withChurch() (or inChurch() for an API route).');
  return s;
}

/** A query in the current church's transaction. Throws outside withChurch. */
export const sql: Query = (text, params) => store().query(text, params);

/** The current church's id (set as app.church_id for this transaction). */
export const currentChurchId = (): string => store().churchId;

/** The current church's settings row. */
export const currentChurch = (): ChurchSettings => store().church;

/** The signed-in user the current context was opened for, if any. */
export const currentUserId = (): string | null => store().userId;

/** True inside withChurch (for code shared with places that have no church). */
export const hasChurchContext = (): boolean => context.getStore() !== undefined;

/**
 * Runs fn in a transaction of its own in the current church, e.g. to hold a
 * row lock (SELECT … FOR UPDATE) only as long as fn runs.
 */
export function withTransaction<T>(fn: (q: TxQuery) => Promise<T>): Promise<T> {
  return withChurch(currentChurchId(), () => fn(sql), { separate: true });
}

/**
 * Statements with no church at all. For src/lib/system.ts only (lint
 * enforces it): they may touch users, churches and church_memberships, which
 * have no row-level security, and nothing else.
 */
export const systemSql: Query = (text, params) => systemQuery(text, params);
