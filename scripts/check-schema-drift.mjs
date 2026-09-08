#!/usr/bin/env node
/**
 * Schema drift check.
 *
 * Builds src/lib/schema.sql into a throwaway schema inside a transaction that
 * is ALWAYS rolled back, then compares the result against the live `public`
 * schema. Exits 0 when they match, 1 with a readable diff when they do not.
 *
 * This exists because schema.sql silently drifted from production once before
 * and took down Google sign-in: the file declared users.password_hash as
 * nullable while the live column was NOT NULL, so every new user's INSERT
 * threw and NextAuth reported AccessDenied.
 *
 * READ-ONLY GUARANTEE
 *   - every statement runs inside BEGIN ... ROLLBACK; nothing is ever committed
 *   - DDL is applied to a randomly named temporary schema, never to `public`
 *   - the file is refused if it contains transaction control, an explicit
 *     `public.` reference, or a search_path change, any of which could let a
 *     statement escape the sandbox
 *   - statement/lock timeouts keep a stuck run from holding locks
 *
 * Usage:
 *   DATABASE_URL=postgres://... node scripts/check-schema-drift.mjs
 *   node scripts/check-schema-drift.mjs        # falls back to .env.local
 */

import { readFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@neondatabase/serverless';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA_FILE = path.join(ROOT, 'src', 'lib', 'schema.sql');

/**
 * Tables that exist in the live database but are deliberately absent from
 * schema.sql. Keep this list short and justified.
 */
const IGNORED_TABLES = new Set([
  'playing_with_neon', // Neon starter-template demo table, unrelated to the app
]);

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envFile = path.join(ROOT, '.env.local');
  if (existsSync(envFile)) {
    const m = readFileSync(envFile, 'utf8').match(/^DATABASE_URL=["']?([^"'\r\n]+)/m);
    if (m) return m[1];
  }
  console.error('DATABASE_URL is not set (and no .env.local fallback found).');
  process.exit(2);
}

/** Refuse to run anything that could write outside the sandboxed schema. */
function assertSandboxable(ddl) {
  // Dollar-quoted bodies legitimately contain BEGIN/END as PL/pgSQL keywords,
  // so strip them before looking for transaction control.
  const stripped = ddl.replace(/\$\$[\s\S]*?\$\$/g, '');
  const problems = [];
  if (/^\s*(commit|rollback|start\s+transaction)\b/im.test(stripped)) {
    problems.push('transaction control (COMMIT / ROLLBACK / START TRANSACTION)');
  }
  if (/^\s*begin\s*;/im.test(stripped)) problems.push('a bare BEGIN;');
  if (/\bset\s+(local\s+)?search_path\b/i.test(stripped)) problems.push('a search_path change');
  if (/\bpublic\./i.test(stripped)) problems.push('an explicit public. reference');
  if (/\bdrop\s+(database|schema)\b/i.test(stripped)) problems.push('DROP DATABASE / DROP SCHEMA');

  if (problems.length) {
    console.error('Refusing to run: schema.sql contains ' + problems.join(', ') + '.');
    console.error('These could let a statement escape the temporary schema and touch production.');
    process.exit(2);
  }
}

const COLS = `
  SELECT c.relname AS tbl, a.attname AS col,
         format_type(a.atttypid, a.atttypmod) AS typ,
         a.attnotnull AS nn,
         pg_get_expr(d.adbin, d.adrelid) AS def
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
  LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
  WHERE n.nspname = $1 AND c.relkind = 'r'`;

const CONS = `
  SELECT rel.relname AS tbl, con.conname AS name, pg_get_constraintdef(con.oid) AS def
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = rel.relnamespace
  WHERE n.nspname = $1`;

const IDX = `
  SELECT tablename AS tbl, indexname AS name, indexdef AS def
  FROM pg_indexes WHERE schemaname = $1`;

const normalize = (s, tmp) =>
  (s || '').split(`${tmp}.`).join('').split('public.').join('').replace(/\s+/g, ' ').trim();

const describeColumn = (c) =>
  [c.typ, c.nn ? 'NOT NULL' : 'NULL', c.def ? `DEFAULT ${c.def}` : null]
    .filter(Boolean)
    .join(' ');

function index(rows, keyFn, valFn) {
  const map = new Map();
  for (const r of rows) map.set(keyFn(r), valFn(r));
  return map;
}

/** Compare two maps, returning entries only-in-live, only-in-file, and differing. */
function diffMaps(live, file) {
  const onlyLive = [];
  const onlyFile = [];
  const changed = [];
  for (const [k, v] of live) {
    if (!file.has(k)) onlyLive.push([k, v]);
    else if (file.get(k) !== v) changed.push([k, v, file.get(k)]);
  }
  for (const [k, v] of file) if (!live.has(k)) onlyFile.push([k, v]);
  return { onlyLive, onlyFile, changed };
}

const url = resolveDatabaseUrl();
const ddl = readFileSync(SCHEMA_FILE, 'utf8');
assertSandboxable(ddl);

const tmpSchema = `drift_check_${randomBytes(6).toString('hex')}`;

let client;
try {
  client = new Client(url);
  await client.connect();
} catch (e) {
  // A malformed or unreachable DATABASE_URL is a configuration problem, not
  // drift. Say so plainly instead of dumping a driver stack trace into CI.
  console.error('Could not connect to the database.');
  console.error(`  ${e.message}`);
  console.error('\nCheck that DATABASE_URL is a complete, valid Postgres connection string.');
  console.error('In CI this is the DATABASE_URL repository secret.');
  process.exit(2);
}

let live;
let fresh;
try {
  // Never let this hold locks or hang a CI job.
  await client.query("SET statement_timeout = '60s'");
  await client.query("SET lock_timeout = '10s'");

  live = {
    cols: (await client.query(COLS, ['public'])).rows.filter((r) => !IGNORED_TABLES.has(r.tbl)),
    cons: (await client.query(CONS, ['public'])).rows.filter((r) => !IGNORED_TABLES.has(r.tbl)),
    idx: (await client.query(IDX, ['public'])).rows.filter((r) => !IGNORED_TABLES.has(r.tbl)),
  };

  await client.query('BEGIN');
  await client.query(`CREATE SCHEMA ${tmpSchema}`);
  await client.query(`SET LOCAL search_path TO ${tmpSchema}`);
  try {
    await client.query(ddl);
  } catch (e) {
    console.error('schema.sql failed to apply to an empty schema.\n');
    console.error(`  ${e.message}`);
    if (e.detail) console.error(`  detail: ${e.detail}`);
    console.error('\nThe file must be able to build a database from scratch.');
    await client.query('ROLLBACK');
    await client.end();
    process.exit(1);
  }
  fresh = {
    cols: (await client.query(COLS, [tmpSchema])).rows,
    cons: (await client.query(CONS, [tmpSchema])).rows,
    idx: (await client.query(IDX, [tmpSchema])).rows,
  };
} finally {
  // Unconditional: the sandbox is discarded whether or not anything failed.
  try { await client.query('ROLLBACK'); } catch { /* connection already gone */ }
  await client.end();
}

const liveCols = index(live.cols, (r) => `${r.tbl}.${r.col}`, describeColumn);
const fileCols = index(fresh.cols, (r) => `${r.tbl}.${r.col}`, describeColumn);
const liveCons = index(live.cons, (r) => `${r.tbl}::${r.name}`, (r) => normalize(r.def, tmpSchema));
const fileCons = index(fresh.cons, (r) => `${r.tbl}::${r.name}`, (r) => normalize(r.def, tmpSchema));
const liveIdx = index(live.idx, (r) => `${r.tbl}::${r.name}`, (r) => normalize(r.def, tmpSchema));
const fileIdx = index(fresh.idx, (r) => `${r.tbl}::${r.name}`, (r) => normalize(r.def, tmpSchema));

const sections = [
  ['column', diffMaps(liveCols, fileCols)],
  ['constraint', diffMaps(liveCons, fileCons)],
  ['index', diffMaps(liveIdx, fileIdx)],
];

// Group every finding by table so the report reads table-first.
const byTable = new Map();
const add = (table, line) => {
  if (!byTable.has(table)) byTable.set(table, []);
  byTable.get(table).push(line);
};
const splitKey = (k) => {
  const i = k.includes('::') ? k.indexOf('::') : k.indexOf('.');
  return [k.slice(0, i), k.slice(k.includes('::') ? i + 2 : i + 1)];
};

let total = 0;
for (const [kind, d] of sections) {
  for (const [k, v] of d.onlyLive) {
    const [t, name] = splitKey(k);
    add(t, `  ${kind} "${name}" is MISSING FROM schema.sql\n      live: ${v}\n      file: (absent)`);
    total++;
  }
  for (const [k, v] of d.onlyFile) {
    const [t, name] = splitKey(k);
    add(t, `  ${kind} "${name}" is in schema.sql but NOT IN THE LIVE DATABASE\n      live: (absent)\n      file: ${v}`);
    total++;
  }
  for (const [k, liveVal, fileVal] of d.changed) {
    const [t, name] = splitKey(k);
    add(t, `  ${kind} "${name}" DIFFERS\n      live: ${liveVal}\n      file: ${fileVal}`);
    total++;
  }
}

const counts = `${liveCols.size} columns, ${liveCons.size} constraints, ${liveIdx.size} indexes`;

if (total === 0) {
  console.log(`schema.sql matches the live database (${counts}).`);
  if (IGNORED_TABLES.size) {
    console.log(`Ignored tables: ${[...IGNORED_TABLES].join(', ')}`);
  }
  process.exit(0);
}

console.error(`SCHEMA DRIFT: ${total} difference${total === 1 ? '' : 's'} between src/lib/schema.sql and the live database.\n`);
for (const table of [...byTable.keys()].sort()) {
  console.error(`${table}`);
  for (const line of byTable.get(table)) console.error(line);
  console.error('');
}
console.error('Update src/lib/schema.sql so it describes the live database, or apply the');
console.error('missing migration to the database. The file must match production exactly.');
process.exit(1);
