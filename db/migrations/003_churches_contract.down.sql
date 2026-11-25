-- 003_churches_contract.down.sql
-- Reverses 003_churches_contract.sql back to the state after 002, so the
-- pre-PR-1.1 code can run again (roll the Vercel deployment back right
-- after). One transaction.
--
-- users.role/status are rebuilt from each user's CityChurch membership. A
-- user with no CityChurch membership (a member of another church only)
-- comes back 'pending', so the old single-church code never treats them as
-- an active CityChurch member. users.language, prayer_requests.is_private
-- and attendance.notes come back with their defaults (nothing read them).

BEGIN;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'groups', 'members', 'attendance', 'attendance_sessions', 'calendar_events',
    'prayer_requests', 'pastoral_meetings', 'pastoral_notes', 'member_flags',
    'directory_visibility', 'sync_log', 'pco_tokens', 'discipleship_progress',
    'incubator_progress', 'incubator_access'
  ] LOOP
    EXECUTE format('DROP POLICY church_isolation ON %I', t);
    EXECUTE format('ALTER TABLE %I NO FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

ALTER TABLE attendance ADD COLUMN notes TEXT;
ALTER TABLE prayer_requests ADD COLUMN is_private BOOLEAN DEFAULT false;
ALTER TABLE users
  ADD COLUMN role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('member', 'group_leader', 'admin')),
  ADD COLUMN language VARCHAR(2) DEFAULT 'en' CHECK (language IN ('en', 'es')),
  ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
UPDATE users u SET role = 'member', status = 'pending'
 WHERE NOT EXISTS (SELECT 1 FROM church_memberships m
                    WHERE m.user_id = u.id AND m.church_id = 'c1c1c1c1-0000-4000-8000-000000000001');
UPDATE users u SET role = m.role, status = m.status
  FROM church_memberships m
 WHERE m.user_id = u.id AND m.church_id = 'c1c1c1c1-0000-4000-8000-000000000001';
ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'pending'));
ALTER TABLE users ADD CONSTRAINT users_pending_is_member_check CHECK (status = 'active' OR role = 'member');

ALTER TABLE directory_visibility DROP CONSTRAINT directory_visibility_scope_id_check;
ALTER TABLE directory_visibility ALTER COLUMN scope_id DROP NOT NULL;
ALTER TABLE directory_visibility ADD CONSTRAINT directory_visibility_scope_id_check
  CHECK (scope = 'church' OR scope_id IS NOT NULL);

ALTER TABLE pco_tokens ADD CONSTRAINT pco_tokens_user_id_key UNIQUE (user_id);
ALTER TABLE incubator_access ADD CONSTRAINT incubator_access_user_id_key UNIQUE (user_id);
ALTER TABLE incubator_progress ADD CONSTRAINT incubator_progress_user_id_week_day_module_index_key UNIQUE (user_id, week, day, module_index);
ALTER TABLE discipleship_progress ADD CONSTRAINT discipleship_progress_user_id_week_day_key UNIQUE (user_id, week, day);
ALTER TABLE directory_visibility ADD CONSTRAINT directory_visibility_scope_scope_id_field_key UNIQUE NULLS NOT DISTINCT (scope, scope_id, field);
CREATE UNIQUE INDEX idx_attendance_sessions_unique ON attendance_sessions (
  date, attendance_type, COALESCE(group_id, '00000000-0000-0000-0000-000000000000'::uuid)
);
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_google_event_id_key UNIQUE (google_event_id);
ALTER TABLE members ADD CONSTRAINT members_pco_id_key UNIQUE (pco_id);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'groups', 'members', 'attendance', 'attendance_sessions', 'calendar_events',
    'prayer_requests', 'pastoral_meetings', 'pastoral_notes', 'member_flags',
    'directory_visibility', 'sync_log', 'pco_tokens', 'discipleship_progress',
    'incubator_progress', 'incubator_access'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ALTER COLUMN church_id DROP NOT NULL, ALTER COLUMN church_id SET DEFAULT %L', t, 'c1c1c1c1-0000-4000-8000-000000000001');
  END LOOP;
END $$;

CREATE FUNCTION kinly_sync_users_role_to_membership() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE church_memberships
     SET role = COALESCE(NEW.role, 'member'), status = NEW.status
   WHERE user_id = NEW.id AND church_id = 'c1c1c1c1-0000-4000-8000-000000000001';
  RETURN NEW;
END $$;
CREATE TRIGGER users_role_to_membership
  AFTER UPDATE OF role, status ON users
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role OR OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION kinly_sync_users_role_to_membership();

COMMIT;
