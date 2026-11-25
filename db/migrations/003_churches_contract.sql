-- 003_churches_contract.sql
-- Multi-church foundation, part 2 of 2. Reverse: 003_churches_contract.down.sql.
--
-- Breaks the pre-PR-1.1 code, so it runs right after the PR 1.1 deploy is
-- live (that code never reads users.role/status and always sets church_id).
--   * memberships for users the old code created after 002
--   * church_id NOT NULL with no default, on every church-owned table
--   * the global unique constraints replaced by 002's per-church ones
--   * directory_visibility: the church-wide layer's scope_id is the church
--   * users.role, users.status, users.language, prayer_requests.is_private
--     and attendance.notes dropped (E5 from PR #7)
--   * row-level security, enabled and forced, on every church-owned table:
--     a row is visible and writable only when its church_id equals the
--     transaction's app.church_id. With none set, reads return no rows and
--     writes fail.

BEGIN;

-- Sign-ups the old code made between 002 and the deploy.
INSERT INTO church_memberships (user_id, church_id, role, status)
SELECT u.id, 'c1c1c1c1-0000-4000-8000-000000000001', COALESCE(u.role, 'member'), u.status
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM church_memberships m WHERE m.user_id = u.id);

DROP TRIGGER users_role_to_membership ON users;
DROP FUNCTION kinly_sync_users_role_to_membership();

-- church_id required everywhere; new rows must say which church they belong to.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'groups', 'members', 'attendance', 'attendance_sessions', 'calendar_events',
    'prayer_requests', 'pastoral_meetings', 'pastoral_notes', 'member_flags',
    'directory_visibility', 'sync_log', 'pco_tokens', 'discipleship_progress',
    'incubator_progress', 'incubator_access'
  ] LOOP
    EXECUTE format('UPDATE %I SET church_id = %L WHERE church_id IS NULL', t, 'c1c1c1c1-0000-4000-8000-000000000001');
    EXECUTE format('ALTER TABLE %I ALTER COLUMN church_id SET NOT NULL, ALTER COLUMN church_id DROP DEFAULT', t);
  END LOOP;
END $$;

-- Global uniqueness gives way to the per-church indexes 002 added.
ALTER TABLE members DROP CONSTRAINT members_pco_id_key;
ALTER TABLE calendar_events DROP CONSTRAINT calendar_events_google_event_id_key;
DROP INDEX idx_attendance_sessions_unique;
ALTER TABLE directory_visibility DROP CONSTRAINT directory_visibility_scope_scope_id_field_key;
ALTER TABLE discipleship_progress DROP CONSTRAINT discipleship_progress_user_id_week_day_key;
ALTER TABLE incubator_progress DROP CONSTRAINT incubator_progress_user_id_week_day_module_index_key;
ALTER TABLE incubator_access DROP CONSTRAINT incubator_access_user_id_key;
ALTER TABLE pco_tokens DROP CONSTRAINT pco_tokens_user_id_key;

-- Church-wide directory settings: scope_id is the church's own id.
-- (A field written both by the old code, scope_id NULL, and the new code
-- keeps the new code's row.)
DELETE FROM directory_visibility d
 WHERE d.scope = 'church' AND d.scope_id IS NULL
   AND EXISTS (SELECT 1 FROM directory_visibility n
                WHERE n.church_id = d.church_id AND n.scope = 'church'
                  AND n.scope_id = d.church_id AND n.field = d.field);
UPDATE directory_visibility SET scope_id = church_id WHERE scope = 'church' AND scope_id IS NULL;
ALTER TABLE directory_visibility DROP CONSTRAINT directory_visibility_scope_id_check;
ALTER TABLE directory_visibility ALTER COLUMN scope_id SET NOT NULL;
ALTER TABLE directory_visibility ADD CONSTRAINT directory_visibility_scope_id_check
  CHECK (scope <> 'church' OR scope_id = church_id);

-- Columns nothing reads any more (roles live in church_memberships).
ALTER TABLE users DROP COLUMN role, DROP COLUMN status, DROP COLUMN language;
ALTER TABLE prayer_requests DROP COLUMN is_private;
ALTER TABLE attendance DROP COLUMN notes;

-- Row-level security. The owner role has BYPASSRLS (migrations keep
-- working); the app connects as kinly_app, which has neither ownership nor
-- BYPASSRLS, so FORCE plus this policy applies to every app query.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'groups', 'members', 'attendance', 'attendance_sessions', 'calendar_events',
    'prayer_requests', 'pastoral_meetings', 'pastoral_notes', 'member_flags',
    'directory_visibility', 'sync_log', 'pco_tokens', 'discipleship_progress',
    'incubator_progress', 'incubator_access'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY church_isolation ON %I
         USING (church_id = NULLIF(current_setting(''app.church_id'', true), '''')::uuid)
         WITH CHECK (church_id = NULLIF(current_setting(''app.church_id'', true), '''')::uuid)', t);
  END LOOP;
END $$;

COMMIT;
