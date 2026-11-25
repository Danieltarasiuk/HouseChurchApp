# Database migrations

Numbered SQL files, applied by hand (Neon SQL editor) in order:

- `NNN_name.sql` is the change. Each one is a single transaction.
- `NNN_name.down.sql` reverses it exactly.
- `NNN_name.verify.sql` (optional) is a read-only check to run afterwards.

`src/lib/schema.sql` always describes the database **after** every migration
here, and is changed in the same PR. CI's drift check compares it with
production, so on a migration PR it fails until production is migrated.

Try every migration on the Neon dev branch first: up, down, then up again.

| # | What | Applied to production |
|---|------|-----------------------|
| 001 | house churches → groups (table, `group_id`, role `group_leader`, stored values, constraint and index names) | not yet |
