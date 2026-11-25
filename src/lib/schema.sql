-- HouseChurchApp Database Schema
-- Neon PostgreSQL
--
-- This file mirrors the live database after migration 003 (PR 1.1). It is verified by
-- applying it to an empty schema inside a rolled-back transaction and
-- diffing the result against production, so it can be trusted as the
-- source of truth for a fresh setup.
--
-- Two notes on faithfulness:
--   * Column ORDER here is grouped for readability and does not always match
--     the physical ordinal position in the live database. Nothing reads
--     columns positionally, so this has no effect.
--
-- Changes to the live database are numbered files in db/migrations/ (each
-- with a .down.sql); this file is updated in the same commit to match.
--
-- Table order matters: each table is defined after everything it references.
--
-- Multi-church (Kinly): every church-owned table has church_id and row-level
-- security (see the end of this file). users, churches and church_memberships
-- are global; the app reaches them only through src/lib/system.ts. Data such
-- as the first church's row is not here: see db/migrations/002.

-- Churches (tenants)
CREATE TABLE IF NOT EXISTS churches (
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

-- Users: one Kinly account across churches. Roles are per church
-- (church_memberships); is_platform_admin opens any church as an admin.
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),  -- NULL for Google-only users
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_platform_admin BOOLEAN NOT NULL DEFAULT false
);

-- A user's role in one church. 'pending': an email/password sign-up waiting
-- for an admin of that church to approve it and link it to a member (nothing
-- proves they own the email). Pending accounts are always plain members.
CREATE TABLE IF NOT EXISTS church_memberships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  church_id   UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  role        VARCHAR(50) NOT NULL DEFAULT 'member'
                CHECK (role IN ('admin', 'group_leader', 'member')),
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'pending')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT church_memberships_pending_is_member_check CHECK (status = 'active' OR role = 'member'),
  CONSTRAINT church_memberships_user_id_church_id_key UNIQUE (user_id, church_id)
);

-- Groups (called "house churches" in the CityChurch UI)
-- pastor_id / host_id / trainee_id reference members(id). The constraints are
-- added by ALTER TABLE further down rather than inline, because members is
-- defined after this table and itself references groups — declaring
-- them here would fail with 'relation "members" does not exist'.
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  pastor_id UUID,
  host_id UUID,
  trainee_id UUID,
  location VARCHAR(500),
  address_street VARCHAR,
  address_city VARCHAR,
  address_state VARCHAR,
  address_zip VARCHAR,
  meeting_day VARCHAR(20),
  meeting_time VARCHAR(20),
  pco_campus_id TEXT,
  campus_name VARCHAR,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Members (linked to groups)
-- NOTE: members.role is a different vocabulary from church_memberships.role.
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id),
  user_id UUID REFERENCES users(id),
  group_id UUID REFERENCES groups(id),
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('pastor', 'leader', 'member')),
  pco_id TEXT,                     -- unique per church (index below)
  campus_pco_id VARCHAR,
  gender VARCHAR(10),
  date_of_birth DATE,
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  pco_household_id TEXT,           -- synced from PCO households
  household_name TEXT,             -- synced from PCO households
  attendance_note TEXT             -- app-owned; the PCO sync never touches it
);

-- Group leadership references, added now that members exists.
-- DO $$ guards keep this file re-runnable: ADD CONSTRAINT has no IF NOT EXISTS.
DO $$ BEGIN
  ALTER TABLE groups ADD CONSTRAINT groups_pastor_id_fkey
    FOREIGN KEY (pastor_id) REFERENCES members(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE groups ADD CONSTRAINT groups_host_id_fkey
    FOREIGN KEY (host_id) REFERENCES members(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE groups ADD CONSTRAINT groups_trainee_id_fkey
    FOREIGN KEY (trainee_id) REFERENCES members(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Attendance tracking (only rows for members who were present are kept)
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id),
  group_id UUID REFERENCES groups(id),
  member_id UUID REFERENCES members(id),
  date DATE NOT NULL,
  attendance_type VARCHAR(20) CHECK (attendance_type IN ('sunday_service', 'group')),
  present BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance sessions: records that attendance WAS TAKEN for a date/type/group,
-- independently of who was present. Without this, "never recorded" and
-- "recorded but nobody came" are indistinguishable, since the attendance
-- table only stores present rows.
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id),
  date DATE NOT NULL,
  attendance_type VARCHAR(20) NOT NULL
    CHECK (attendance_type IN ('sunday_service', 'group')),
  group_id UUID REFERENCES groups(id),
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7&7 Discipleship progress
CREATE TABLE IF NOT EXISTS discipleship_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id),
  user_id UUID REFERENCES users(id),
  week INTEGER NOT NULL CHECK (week >= 1 AND week <= 7),
  day INTEGER NOT NULL CHECK (day >= 1 AND day <= 7),
  completed BOOLEAN DEFAULT false,
  answers JSONB DEFAULT '{}',
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pastor Incubator progress
-- `day` intentionally has no CHECK constraint in the live database.
CREATE TABLE IF NOT EXISTS incubator_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id),
  user_id UUID REFERENCES users(id),
  week INTEGER NOT NULL CHECK (week >= 1 AND week <= 5),
  day INTEGER NOT NULL,
  module_index INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  answers JSONB DEFAULT '{}',
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pastor Incubator access (invitation-based)
CREATE TABLE IF NOT EXISTS incubator_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id),
  user_id UUID REFERENCES users(id),
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Prayer Requests
CREATE TABLE IF NOT EXISTS prayer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id),
  user_id UUID REFERENCES users(id),
  member_id UUID REFERENCES members(id),
  group_id UUID REFERENCES groups(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  visibility VARCHAR(20) NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'group', 'private')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'answered')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pastoral Meetings (1:1 discipleship tracking)
CREATE TABLE IF NOT EXISTS pastoral_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id),
  pastor_id UUID NOT NULL REFERENCES users(id),
  member_id UUID NOT NULL REFERENCES members(id),
  topic_key VARCHAR(50) NOT NULL,
  meeting_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Member Flags (yellow = monitor, red = urgent)
CREATE TABLE IF NOT EXISTS member_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id),
  member_id UUID NOT NULL REFERENCES members(id),
  created_by UUID NOT NULL REFERENCES users(id),
  flag_color VARCHAR(10) NOT NULL CHECK (flag_color IN ('yellow', 'red')),
  description TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pastoral Notes (private per-pastor scratch pad per member)
CREATE TABLE IF NOT EXISTS pastoral_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id),
  pastor_id UUID NOT NULL REFERENCES users(id),
  member_id UUID NOT NULL REFERENCES members(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Planning Center OAuth tokens (one row per connected admin, per church)
CREATE TABLE IF NOT EXISTS pco_tokens (
  id SERIAL PRIMARY KEY,
  church_id UUID NOT NULL REFERENCES churches(id),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sync history for the Planning Center import (weekly cron + manual runs)
CREATE TABLE IF NOT EXISTS sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id),
  source VARCHAR(20) NOT NULL,         -- 'cron' or 'manual'
  success BOOLEAN NOT NULL,
  detail TEXT,
  synced_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leadership calendar (pushed to the church's Google Calendar when
-- churches.google_calendar_id is set). Dates/times are in the church's
-- timezone; end_date is INCLUSIVE.
CREATE TABLE IF NOT EXISTS calendar_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id        UUID NOT NULL REFERENCES churches(id),
  title_en         TEXT NOT NULL,
  title_es         TEXT,
  category         TEXT NOT NULL CHECK (category IN (
                     'worship_night','group','men_women_marriage','brunch',
                     'english_gathering','special_event','advent','holiday','school','reminder')),
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,            -- INCLUSIVE last day
  start_time       TIME,                     -- NULL = all-day
  end_time         TIME,
  notes            TEXT,                     -- internal, admins only
  status           TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','cancelled')),
  visibility       TEXT NOT NULL DEFAULT 'leaders' CHECK (visibility IN ('leaders','members')),
  google_event_id  TEXT,                     -- unique per church (index below)
  sync_status      TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('synced','pending','error')),
  sync_error       TEXT,
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date),
  CHECK ((start_time IS NULL) = (end_time IS NULL))
);

-- Member directory visibility (see src/lib/directory.ts). One row per layer
-- setting; a missing row means "no restriction from this layer". scope_id is
-- the church's own id for the church default ('church'), else a groups.id
-- ('group') or members.id ('member', 'member_self'); it is polymorphic, so
-- no foreign key.
CREATE TABLE IF NOT EXISTS directory_visibility (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id   UUID NOT NULL REFERENCES churches(id),
  scope       TEXT NOT NULL,
  scope_id    UUID NOT NULL,
  field       TEXT NOT NULL,
  level       TEXT NOT NULL,
  updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT directory_visibility_scope_check
    CHECK (scope IN ('church', 'group', 'member', 'member_self')),
  CONSTRAINT directory_visibility_field_check
    CHECK (field IN ('phone', 'email', 'address', 'birthday', 'household')),
  CONSTRAINT directory_visibility_level_check
    CHECK (level IN ('leaders', 'group', 'church')),
  CONSTRAINT directory_visibility_scope_id_check
    CHECK (scope <> 'church' OR scope_id = church_id)
);

-- Indexes present in the live database
CREATE INDEX IF NOT EXISTS calendar_events_start_idx ON calendar_events (start_date);
CREATE INDEX IF NOT EXISTS idx_members_group ON members(group_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_group ON attendance(group_id);
CREATE INDEX IF NOT EXISTS idx_attendance_member ON attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_type ON attendance(attendance_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_member_date_type ON attendance(member_id, date, attendance_type);
-- COALESCE is required: a NULL group_id (sunday_service) would never
-- conflict with another NULL, so plain column uniqueness would not dedupe.
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_sessions_church_unique
  ON attendance_sessions (
    church_id,
    date,
    attendance_type,
    COALESCE(group_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
CREATE INDEX IF NOT EXISTS idx_discipleship_user ON discipleship_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_incubator_user ON incubator_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_prayer_group ON prayer_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_prayer_status ON prayer_requests(status);
CREATE INDEX IF NOT EXISTS idx_prayer_user ON prayer_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_pastoral_meetings_member ON pastoral_meetings(member_id);
CREATE INDEX IF NOT EXISTS idx_pastoral_meetings_pastor ON pastoral_meetings(pastor_id);
CREATE INDEX IF NOT EXISTS idx_pastoral_meetings_date ON pastoral_meetings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_member_flags_member ON member_flags(member_id);
CREATE INDEX IF NOT EXISTS idx_member_flags_created_by ON member_flags(created_by);
CREATE INDEX IF NOT EXISTS idx_member_flags_unresolved ON member_flags(member_id) WHERE is_resolved = false;
CREATE INDEX IF NOT EXISTS idx_pastoral_notes_pastor_member ON pastoral_notes(pastor_id, member_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_created_at ON sync_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_church_memberships_church ON church_memberships(church_id);

-- Foreign keys added with E5 (PR 1.1)
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_group ON attendance_sessions(group_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_recorded_by ON attendance_sessions(recorded_by);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_directory_visibility_updated_by ON directory_visibility(updated_by);
CREATE INDEX IF NOT EXISTS idx_groups_host ON groups(host_id);
CREATE INDEX IF NOT EXISTS idx_groups_pastor ON groups(pastor_id);
CREATE INDEX IF NOT EXISTS idx_groups_trainee ON groups(trainee_id);
CREATE INDEX IF NOT EXISTS idx_incubator_access_granted_by ON incubator_access(granted_by);
CREATE INDEX IF NOT EXISTS idx_pastoral_notes_member ON pastoral_notes(member_id);
CREATE INDEX IF NOT EXISTS idx_prayer_member ON prayer_requests(member_id);

-- church_id on every church-owned table
CREATE INDEX IF NOT EXISTS idx_groups_church ON groups(church_id);
CREATE INDEX IF NOT EXISTS idx_members_church ON members(church_id);
CREATE INDEX IF NOT EXISTS idx_attendance_church ON attendance(church_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_church ON attendance_sessions(church_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_church ON calendar_events(church_id);
CREATE INDEX IF NOT EXISTS idx_prayer_church ON prayer_requests(church_id);
CREATE INDEX IF NOT EXISTS idx_pastoral_meetings_church ON pastoral_meetings(church_id);
CREATE INDEX IF NOT EXISTS idx_pastoral_notes_church ON pastoral_notes(church_id);
CREATE INDEX IF NOT EXISTS idx_member_flags_church ON member_flags(church_id);
CREATE INDEX IF NOT EXISTS idx_directory_visibility_church ON directory_visibility(church_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_church ON sync_log(church_id);
CREATE INDEX IF NOT EXISTS idx_pco_tokens_church ON pco_tokens(church_id);
CREATE INDEX IF NOT EXISTS idx_discipleship_church ON discipleship_progress(church_id);
CREATE INDEX IF NOT EXISTS idx_incubator_progress_church ON incubator_progress(church_id);
CREATE INDEX IF NOT EXISTS idx_incubator_access_church ON incubator_access(church_id);

-- Uniqueness is per church
CREATE UNIQUE INDEX IF NOT EXISTS members_church_pco_id_key ON members(church_id, pco_id);
CREATE UNIQUE INDEX IF NOT EXISTS calendar_events_church_google_event_id_key ON calendar_events(church_id, google_event_id);
CREATE UNIQUE INDEX IF NOT EXISTS directory_visibility_church_scope_field_key
  ON directory_visibility (church_id, scope, scope_id, field) NULLS NOT DISTINCT;
CREATE UNIQUE INDEX IF NOT EXISTS discipleship_progress_church_user_week_day_key ON discipleship_progress(church_id, user_id, week, day);
CREATE UNIQUE INDEX IF NOT EXISTS incubator_progress_church_user_week_day_module_key ON incubator_progress(church_id, user_id, week, day, module_index);
CREATE UNIQUE INDEX IF NOT EXISTS incubator_access_church_user_key ON incubator_access(church_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS pco_tokens_church_user_key ON pco_tokens(church_id, user_id);

-- ---------------------------------------------------------------------------
-- Row-level security: a church-owned row is visible and writable only when
-- its church_id equals the transaction's app.church_id (set by withChurch()
-- in src/lib/db.ts). With none set, reads return no rows and writes fail.
-- FORCE applies it to the table owner too; the owner role still bypasses it
-- through BYPASSRLS (migrations), the app role kinly_app does not.
-- ---------------------------------------------------------------------------
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
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = 'church_isolation'
                     AND schemaname = current_schema()) THEN
      EXECUTE format(
        'CREATE POLICY church_isolation ON %I
           USING (church_id = NULLIF(current_setting(''app.church_id'', true), '''')::uuid)
           WITH CHECK (church_id = NULLIF(current_setting(''app.church_id'', true), '''')::uuid)', t);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Notes on what is deliberately NOT here
--
-- members.pco_id has no separate index: the unique index
-- members_church_pco_id_key (church_id, pco_id) covers lookups by church.
--
-- playing_with_neon exists in the live database but is omitted: it is a Neon
-- starter-template demo table, unrelated to the application.
-- ---------------------------------------------------------------------------
