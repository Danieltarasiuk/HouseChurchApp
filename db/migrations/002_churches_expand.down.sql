-- 002_churches_expand.down.sql
-- Reverses 002_churches_expand.sql. Run only with 003 already reversed (or
-- never applied) and the pre-PR-1.1 code live. One transaction.
-- Does not drop the kinly_app role itself (it was created outside migrations).

BEGIN;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE USAGE, SELECT ON SEQUENCES FROM kinly_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM kinly_app;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM kinly_app;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM kinly_app;
REVOKE USAGE ON SCHEMA public FROM kinly_app;

DROP INDEX idx_prayer_member;
DROP INDEX idx_pastoral_notes_member;
DROP INDEX idx_incubator_access_granted_by;
DROP INDEX idx_groups_trainee;
DROP INDEX idx_groups_pastor;
DROP INDEX idx_groups_host;
DROP INDEX idx_directory_visibility_updated_by;
DROP INDEX idx_calendar_events_created_by;
DROP INDEX idx_attendance_sessions_recorded_by;
DROP INDEX idx_attendance_sessions_group;

-- Church-wide directory settings back to scope_id NULL (one row per field).
DELETE FROM directory_visibility d
 WHERE d.scope = 'church' AND d.scope_id IS NULL
   AND EXISTS (SELECT 1 FROM directory_visibility n
                WHERE n.scope = 'church' AND n.scope_id IS NOT NULL AND n.field = d.field);
UPDATE directory_visibility SET scope_id = NULL WHERE scope = 'church';
ALTER TABLE directory_visibility DROP CONSTRAINT directory_visibility_scope_id_check;
ALTER TABLE directory_visibility ADD CONSTRAINT directory_visibility_scope_id_check
  CHECK ((scope = 'church') = (scope_id IS NULL));

-- Dropping church_id drops its indexes (per-church uniques included) and FK.
ALTER TABLE incubator_access      DROP COLUMN church_id;
ALTER TABLE incubator_progress    DROP COLUMN church_id;
ALTER TABLE discipleship_progress DROP COLUMN church_id;
ALTER TABLE pco_tokens            DROP COLUMN church_id;
ALTER TABLE sync_log              DROP COLUMN church_id;
ALTER TABLE directory_visibility  DROP COLUMN church_id;
ALTER TABLE member_flags          DROP COLUMN church_id;
ALTER TABLE pastoral_notes        DROP COLUMN church_id;
ALTER TABLE pastoral_meetings     DROP COLUMN church_id;
ALTER TABLE prayer_requests       DROP COLUMN church_id;
ALTER TABLE calendar_events       DROP COLUMN church_id;
ALTER TABLE attendance_sessions   DROP COLUMN church_id;
ALTER TABLE attendance            DROP COLUMN church_id;
ALTER TABLE members               DROP COLUMN church_id;
ALTER TABLE groups                DROP COLUMN church_id;

DROP TRIGGER users_role_to_membership ON users;
DROP FUNCTION kinly_sync_users_role_to_membership();
DROP TABLE church_memberships;
ALTER TABLE users DROP COLUMN is_platform_admin;
DROP TABLE churches;

COMMIT;
