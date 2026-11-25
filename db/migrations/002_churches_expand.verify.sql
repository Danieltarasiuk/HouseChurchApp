-- 002_churches_expand.verify.sql
-- Read-only check after 002. Every *_missing / *_mismatch / *_null column
-- must be 0 and every boolean true.

WITH tables(t) AS (VALUES
  ('groups'), ('members'), ('attendance'), ('attendance_sessions'), ('calendar_events'),
  ('prayer_requests'), ('pastoral_meetings'), ('pastoral_notes'), ('member_flags'),
  ('directory_visibility'), ('sync_log'), ('pco_tokens'), ('discipleship_progress'),
  ('incubator_progress'), ('incubator_access')
)
SELECT
  (SELECT count(*) FROM churches WHERE slug = 'citychurch'
     AND id = 'c1c1c1c1-0000-4000-8000-000000000001')                       AS citychurch_rows,          -- 1
  (SELECT count(*) FROM tables
     WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns c
                        WHERE c.table_schema = 'public' AND c.table_name = tables.t
                          AND c.column_name = 'church_id'))                 AS church_id_missing,
  (SELECT count(*) FROM users)                                               AS users,
  (SELECT count(*) FROM church_memberships)                                  AS memberships,              -- = users
  (SELECT count(*) FROM users u JOIN church_memberships m
      ON m.user_id = u.id AND m.church_id = 'c1c1c1c1-0000-4000-8000-000000000001'
    WHERE m.role <> COALESCE(u.role, 'member') OR m.status <> u.status)      AS membership_mismatch,
  (SELECT count(*) FROM users WHERE is_platform_admin)                       AS platform_admins,          -- 1
  (SELECT count(*) FROM members WHERE church_id IS NULL)
  + (SELECT count(*) FROM groups WHERE church_id IS NULL)
  + (SELECT count(*) FROM attendance WHERE church_id IS NULL)
  + (SELECT count(*) FROM calendar_events WHERE church_id IS NULL)           AS church_id_null,
  EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'users_role_to_membership') AS users_trigger_present,
  has_table_privilege('kinly_app', 'members', 'SELECT, INSERT, UPDATE, DELETE')
  AND has_table_privilege('kinly_app', 'church_memberships', 'SELECT, INSERT, UPDATE, DELETE')
  AND has_sequence_privilege('kinly_app', 'pco_tokens_id_seq', 'USAGE')     AS kinly_app_granted,
  NOT (SELECT rolbypassrls OR rolsuper FROM pg_roles WHERE rolname = 'kinly_app') AS kinly_app_obeys_rls,
  (SELECT count(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname IN (
     'members_church_pco_id_key', 'calendar_events_church_google_event_id_key',
     'idx_attendance_sessions_church_unique', 'directory_visibility_church_scope_field_key',
     'discipleship_progress_church_user_week_day_key', 'incubator_progress_church_user_week_day_module_key',
     'incubator_access_church_user_key', 'pco_tokens_church_user_key'))      AS per_church_uniques;       -- 8
