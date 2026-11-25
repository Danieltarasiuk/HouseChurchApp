# Database migrations

Numbered SQL files, applied by hand (Neon SQL editor) in order:

- `NNN_name.sql` is the change. Each one is a single transaction.
- `NNN_name.down.sql` reverses it exactly.
- `NNN_name.verify.sql` (optional) is a read-only check to run afterwards.

`src/lib/schema.sql` always describes the database **after** every migration
here, and is changed in the same PR. CI's drift check compares it with
production, so on a migration PR it fails until production is migrated.

Try every migration on the Neon dev branch first: up, down, then up again.
`tests/migrations.test.ts` runs the whole chain down and back up in CI.

Some changes come in two parts: an **expand** migration that the code already
live can run against (applied before the merge), and a **contract** migration
that only the new code can (applied once the new deploy is live).

## Database roles

- The **owner** role (`neondb_owner`) owns the tables and applies migrations.
  It has BYPASSRLS, so row-level security never applies to it.
- The app connects as **`kinly_app`** (Vercel's `DATABASE_URL`): it owns
  nothing and has no BYPASSRLS, so every query it runs is limited to the
  church in `app.church_id`. Migration 002 grants it table access and checks
  that it exists.

Create `kinly_app` once per Neon branch, with SQL (the console's "New role"
creates roles with BYPASSRLS), as the owner:

```sql
CREATE ROLE kinly_app LOGIN PASSWORD '<a new random password, 32+ characters>'
  NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname = 'kinly_app';  -- false, false
```

Its connection string is the owner's with `kinly_app:<password>` in place of
the owner's name and password (same host, pooled endpoint, database and
`sslmode=require`).

## Applied

| # | What | Applied to production |
|---|------|-----------------------|
| 001 | house churches → groups (table, `group_id`, role `group_leader`, stored values, constraint and index names) | 2026-11-25 |
| 002 | churches (expand): `churches`, `church_memberships`, `users.is_platform_admin`, `church_id` (default CityChurch) and per-church unique indexes, E5 foreign-key indexes, `kinly_app` grants | not yet |
| 003 | churches (contract): `church_id` required, global uniques dropped, `users.role/status/language`, `prayer_requests.is_private`, `attendance.notes` dropped, row-level security on 15 tables | not yet |
