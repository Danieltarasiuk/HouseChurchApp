-- 003_churches_contract.verify.sql
-- Read-only check after 003. Every *_left / *_missing / *_null column must
-- be 0 and every boolean true. Run it as the owner role (BYPASSRLS), or it
-- will see no rows in the church tables.

WITH tables(t) AS (VALUES
  ('groups'), ('members'), ('attendance'), ('attendance_sessions'), ('calendar_events'),
  ('prayer_requests'), ('pastoral_meetings'), ('pastoral_notes'), ('member_flags'),
  ('directory_visibility'), ('sync_log'), ('pco_tokens'), ('discipleship_progress'),
  ('incubator_progress'), ('incubator_access')
)
SELECT
  (SELECT count(*) FROM tables t JOIN pg_class c ON c.relname = t.t AND c.relnamespace = 'public'::regnamespace
    WHERE NOT (c.relrowsecurity AND c.relforcerowsecurity))                  AS rls_missing,
  (SELECT count(*) FROM tables
    WHERE NOT EXISTS (SELECT 1 FROM pg_policies p
                       WHERE p.schemaname = 'public' AND p.tablename = tables.t
                         AND p.policyname = 'church_isolation'))            AS policy_missing,
  (SELECT count(*) FROM tables t JOIN information_schema.columns c
      ON c.table_schema = 'public' AND c.table_name = t.t AND c.column_name = 'church_id'
    WHERE c.is_nullable = 'YES' OR c.column_default IS NOT NULL)            AS church_id_nullable_or_defaulted,
  (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public'
     AND (table_name, column_name) IN (('users', 'role'), ('users', 'status'), ('users', 'language'),
                                       ('prayer_requests', 'is_private'), ('attendance', 'notes'))) AS dropped_columns_left,
  (SELECT count(*) FROM pg_constraint WHERE conname IN (
     'members_pco_id_key', 'calendar_events_google_event_id_key',
     'directory_visibility_scope_scope_id_field_key', 'discipleship_progress_user_id_week_day_key',
     'incubator_progress_user_id_week_day_module_index_key', 'incubator_access_user_id_key',
     'pco_tokens_user_id_key'))
  + (SELECT count(*) FROM pg_indexes WHERE indexname = 'idx_attendance_sessions_unique') AS global_uniques_left,
  (SELECT count(*) FROM users u
    WHERE NOT EXISTS (SELECT 1 FROM church_memberships m WHERE m.user_id = u.id)) AS users_without_membership,
  (SELECT count(*) FROM directory_visibility
    WHERE scope = 'church' AND scope_id IS DISTINCT FROM church_id)          AS church_layer_wrong_scope_id,
  NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'users_role_to_membership') AS users_trigger_gone,
  -- Per church, so they can be compared with the "before" numbers (all CityChurch).
  (SELECT json_object_agg(c.slug, json_build_object(
      'members', (SELECT count(*) FROM members m WHERE m.church_id = c.id),
      'groups', (SELECT count(*) FROM groups g WHERE g.church_id = c.id),
      'attendance', (SELECT count(*) FROM attendance a WHERE a.church_id = c.id),
      'calendar_events', (SELECT count(*) FROM calendar_events e WHERE e.church_id = c.id),
      'memberships', (SELECT count(*) FROM church_memberships cm WHERE cm.church_id = c.id)))
   FROM churches c)                                                          AS per_church_counts;
