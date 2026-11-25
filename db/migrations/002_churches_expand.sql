-- 002_churches_expand.sql
-- Multi-church foundation, part 1 of 2 (additive). Reverse: 002_churches_expand.down.sql.
--
-- Safe to run while the CURRENT production code is live (it is applied
-- before PR 1.1 merges): it only adds tables, columns, indexes, a trigger
-- and grants, and relaxes one CHECK.
--   * churches (CityChurch seeded with a fixed id) and church_memberships
--     (backfilled from users.role / users.status)
--   * users.is_platform_admin
--   * church_id on every church-owned table, DEFAULT CityChurch: existing
--     rows read as CityChurch at once (constant default, no table rewrite),
--     and the old code's INSERTs land in CityChurch
--   * per-church unique indexes next to the old global ones (003 drops those)
--   * the missing foreign-key indexes (E5 from PR #7)
--   * a trigger copying users.role/status changes made by the old code into
--     the CityChurch membership until 003 drops those columns
--   * privileges for kinly_app, the role the app connects as (no BYPASSRLS)
--
-- Before running: the role kinly_app must exist (db/migrations/README.md).

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kinly_app') THEN
    RAISE EXCEPTION 'Role kinly_app does not exist. Create it first (db/migrations/README.md).';
  END IF;
  IF (SELECT rolbypassrls OR rolsuper FROM pg_roles WHERE rolname = 'kinly_app') THEN
    RAISE EXCEPTION 'Role kinly_app must not have BYPASSRLS or SUPERUSER.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Churches
-- ---------------------------------------------------------------------------
CREATE TABLE churches (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                     TEXT NOT NULL UNIQUE
                             CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name                     TEXT NOT NULL,
  timezone                 TEXT NOT NULL DEFAULT 'America/New_York',
  default_language         VARCHAR(2) NOT NULL DEFAULT 'en'
                             CHECK (default_language IN ('en', 'es')),
  logo_url                 TEXT,
  primary_color            TEXT,
  accent_color             TEXT,
  group_label_singular_en  TEXT NOT NULL DEFAULT 'Group',
  group_label_plural_en    TEXT NOT NULL DEFAULT 'Groups',
  group_label_singular_es  TEXT NOT NULL DEFAULT 'Grupo',
  group_label_plural_es    TEXT NOT NULL DEFAULT 'Grupos',
  checkins_event_name      TEXT,
  church_center_url        TEXT,
  google_calendar_id       TEXT,                 -- NULL: no Google Calendar push
  plan_tier                TEXT NOT NULL DEFAULT 'free',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Church #1. The fixed id is what every church_id column defaults to until 003.
INSERT INTO churches (
  id, slug, name, timezone, default_language,
  group_label_singular_en, group_label_plural_en,
  group_label_singular_es, group_label_plural_es,
  checkins_event_name, church_center_url, google_calendar_id, plan_tier
) VALUES (
  'c1c1c1c1-0000-4000-8000-000000000001', 'citychurch', 'CityChurch', 'America/New_York', 'en',
  'House Church', 'House Churches',
  'Iglesia en Casa', 'Iglesias en Casa',
  'Reunión Dominical Español',
  'https://citychurchmia.churchcenter.com',
  '4e0b3ce311410b9f6cd36f92579ea1e5e7eea1bfa80bd64f5de5de774484d3a3@group.calendar.google.com',
  'free'
);

-- ---------------------------------------------------------------------------
-- Users: platform admins, and per-church roles
-- ---------------------------------------------------------------------------
ALTER TABLE users ADD COLUMN is_platform_admin BOOLEAN NOT NULL DEFAULT false;
UPDATE users SET is_platform_admin = true WHERE email = 'danieltarasiuk@gmail.com';

CREATE TABLE church_memberships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  church_id   UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  role        VARCHAR(50) NOT NULL DEFAULT 'member'
                CHECK (role IN ('admin', 'group_leader', 'member')),
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'pending')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- An account waiting for approval is always a plain member (as users had).
  CONSTRAINT church_memberships_pending_is_member_check CHECK (status = 'active' OR role = 'member'),
  CONSTRAINT church_memberships_user_id_church_id_key UNIQUE (user_id, church_id)
);
CREATE INDEX idx_church_memberships_church ON church_memberships(church_id);

INSERT INTO church_memberships (user_id, church_id, role, status)
SELECT id, 'c1c1c1c1-0000-4000-8000-000000000001', COALESCE(role, 'member'), status
FROM users;

-- Until 003: role/status changes the old code makes on users reach the
-- CityChurch membership. (Sign-ups made by the old code are copied by 003.)
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

-- ---------------------------------------------------------------------------
-- church_id on every church-owned table (constant default = no rewrite)
-- ---------------------------------------------------------------------------
ALTER TABLE groups               ADD COLUMN church_id UUID DEFAULT 'c1c1c1c1-0000-4000-8000-000000000001' REFERENCES churches(id);
ALTER TABLE members              ADD COLUMN church_id UUID DEFAULT 'c1c1c1c1-0000-4000-8000-000000000001' REFERENCES churches(id);
ALTER TABLE attendance           ADD COLUMN church_id UUID DEFAULT 'c1c1c1c1-0000-4000-8000-000000000001' REFERENCES churches(id);
ALTER TABLE attendance_sessions  ADD COLUMN church_id UUID DEFAULT 'c1c1c1c1-0000-4000-8000-000000000001' REFERENCES churches(id);
ALTER TABLE calendar_events      ADD COLUMN church_id UUID DEFAULT 'c1c1c1c1-0000-4000-8000-000000000001' REFERENCES churches(id);
ALTER TABLE prayer_requests      ADD COLUMN church_id UUID DEFAULT 'c1c1c1c1-0000-4000-8000-000000000001' REFERENCES churches(id);
ALTER TABLE pastoral_meetings    ADD COLUMN church_id UUID DEFAULT 'c1c1c1c1-0000-4000-8000-000000000001' REFERENCES churches(id);
ALTER TABLE pastoral_notes       ADD COLUMN church_id UUID DEFAULT 'c1c1c1c1-0000-4000-8000-000000000001' REFERENCES churches(id);
ALTER TABLE member_flags         ADD COLUMN church_id UUID DEFAULT 'c1c1c1c1-0000-4000-8000-000000000001' REFERENCES churches(id);
ALTER TABLE directory_visibility ADD COLUMN church_id UUID DEFAULT 'c1c1c1c1-0000-4000-8000-000000000001' REFERENCES churches(id);
ALTER TABLE sync_log             ADD COLUMN church_id UUID DEFAULT 'c1c1c1c1-0000-4000-8000-000000000001' REFERENCES churches(id);
ALTER TABLE pco_tokens           ADD COLUMN church_id UUID DEFAULT 'c1c1c1c1-0000-4000-8000-000000000001' REFERENCES churches(id);
ALTER TABLE discipleship_progress ADD COLUMN church_id UUID DEFAULT 'c1c1c1c1-0000-4000-8000-000000000001' REFERENCES churches(id);
ALTER TABLE incubator_progress   ADD COLUMN church_id UUID DEFAULT 'c1c1c1c1-0000-4000-8000-000000000001' REFERENCES churches(id);
ALTER TABLE incubator_access     ADD COLUMN church_id UUID DEFAULT 'c1c1c1c1-0000-4000-8000-000000000001' REFERENCES churches(id);

CREATE INDEX idx_groups_church               ON groups(church_id);
CREATE INDEX idx_members_church              ON members(church_id);
CREATE INDEX idx_attendance_church           ON attendance(church_id);
CREATE INDEX idx_attendance_sessions_church  ON attendance_sessions(church_id);
CREATE INDEX idx_calendar_events_church      ON calendar_events(church_id);
CREATE INDEX idx_prayer_church               ON prayer_requests(church_id);
CREATE INDEX idx_pastoral_meetings_church    ON pastoral_meetings(church_id);
CREATE INDEX idx_pastoral_notes_church       ON pastoral_notes(church_id);
CREATE INDEX idx_member_flags_church         ON member_flags(church_id);
CREATE INDEX idx_directory_visibility_church ON directory_visibility(church_id);
CREATE INDEX idx_sync_log_church             ON sync_log(church_id);
CREATE INDEX idx_pco_tokens_church           ON pco_tokens(church_id);
CREATE INDEX idx_discipleship_church         ON discipleship_progress(church_id);
CREATE INDEX idx_incubator_progress_church   ON incubator_progress(church_id);
CREATE INDEX idx_incubator_access_church     ON incubator_access(church_id);

-- Per-church uniqueness. While every row is CityChurch these are equivalent
-- to the global ones, which 003 drops once the old code is gone.
CREATE UNIQUE INDEX members_church_pco_id_key ON members(church_id, pco_id);
CREATE UNIQUE INDEX calendar_events_church_google_event_id_key ON calendar_events(church_id, google_event_id);
CREATE UNIQUE INDEX idx_attendance_sessions_church_unique ON attendance_sessions (
  church_id, date, attendance_type,
  COALESCE(group_id, '00000000-0000-0000-0000-000000000000'::uuid)
);
CREATE UNIQUE INDEX directory_visibility_church_scope_field_key
  ON directory_visibility (church_id, scope, scope_id, field) NULLS NOT DISTINCT;
CREATE UNIQUE INDEX discipleship_progress_church_user_week_day_key ON discipleship_progress(church_id, user_id, week, day);
CREATE UNIQUE INDEX incubator_progress_church_user_week_day_module_key ON incubator_progress(church_id, user_id, week, day, module_index);
CREATE UNIQUE INDEX incubator_access_church_user_key ON incubator_access(church_id, user_id);
CREATE UNIQUE INDEX pco_tokens_church_user_key ON pco_tokens(church_id, user_id);

-- Church-wide directory settings move from scope_id NULL to scope_id = the
-- church's id. Allow both until 003 backfills and tightens it.
ALTER TABLE directory_visibility DROP CONSTRAINT directory_visibility_scope_id_check;
ALTER TABLE directory_visibility ADD CONSTRAINT directory_visibility_scope_id_check
  CHECK (scope = 'church' OR scope_id IS NOT NULL);

-- ---------------------------------------------------------------------------
-- Foreign keys that had no index (E5 from PR #7)
-- ---------------------------------------------------------------------------
CREATE INDEX idx_attendance_sessions_group           ON attendance_sessions(group_id);
CREATE INDEX idx_attendance_sessions_recorded_by     ON attendance_sessions(recorded_by);
CREATE INDEX idx_calendar_events_created_by          ON calendar_events(created_by);
CREATE INDEX idx_directory_visibility_updated_by     ON directory_visibility(updated_by);
CREATE INDEX idx_groups_host                         ON groups(host_id);
CREATE INDEX idx_groups_pastor                       ON groups(pastor_id);
CREATE INDEX idx_groups_trainee                      ON groups(trainee_id);
CREATE INDEX idx_incubator_access_granted_by         ON incubator_access(granted_by);
CREATE INDEX idx_pastoral_notes_member               ON pastoral_notes(member_id);
CREATE INDEX idx_prayer_member                       ON prayer_requests(member_id);

-- ---------------------------------------------------------------------------
-- Privileges for the app role (it owns nothing, so RLS will apply to it)
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO kinly_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kinly_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO kinly_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kinly_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO kinly_app;

COMMIT;
