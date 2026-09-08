-- HouseChurchApp Database Schema
-- Neon PostgreSQL
--
-- This file mirrors the live database as of 2026-09-08. It is verified by
-- applying it to an empty schema inside a rolled-back transaction and
-- diffing the result against production, so it can be trusted as the
-- source of truth for a fresh setup.
--
-- Two notes on faithfulness:
--   * Column ORDER here is grouped for readability and does not always match
--     the physical ordinal position in the live database. Nothing reads
--     columns positionally, so this has no effect.
--   * Several foreign keys and indexes that would be good practice are NOT
--     present in the live database. Rather than silently claim otherwise,
--     they are listed as commented-out DDL at the bottom of this file.
--
-- Table order matters: each table is defined after everything it references.

-- Users table (for NextAuth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),  -- NULL for Google-only users
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('member', 'house_church_pastor', 'admin')),
  language VARCHAR(2) DEFAULT 'en' CHECK (language IN ('en', 'es')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- House Churches
-- pastor_id / host_id / trainee_id reference members(id). The constraints are
-- added by ALTER TABLE further down rather than inline, because members is
-- defined after this table and itself references house_churches — declaring
-- them here would fail with 'relation "members" does not exist'.
CREATE TABLE IF NOT EXISTS house_churches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Members (linked to house churches)
-- NOTE: members.role is a different vocabulary from users.role.
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  house_church_id UUID REFERENCES house_churches(id),
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('pastor', 'leader', 'member')),
  pco_id TEXT UNIQUE,
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
  is_active BOOLEAN DEFAULT true
);

-- House church leadership references, added now that members exists.
-- DO $$ guards keep this file re-runnable: ADD CONSTRAINT has no IF NOT EXISTS.
DO $$ BEGIN
  ALTER TABLE house_churches ADD CONSTRAINT house_churches_pastor_id_fkey
    FOREIGN KEY (pastor_id) REFERENCES members(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE house_churches ADD CONSTRAINT house_churches_host_id_fkey
    FOREIGN KEY (host_id) REFERENCES members(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE house_churches ADD CONSTRAINT house_churches_trainee_id_fkey
    FOREIGN KEY (trainee_id) REFERENCES members(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Attendance tracking (only rows for members who were present are kept)
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_church_id UUID REFERENCES house_churches(id),
  member_id UUID REFERENCES members(id),
  date DATE NOT NULL,
  attendance_type VARCHAR(20) CHECK (attendance_type IN ('sunday_service', 'house_church')),
  present BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance sessions: records that attendance WAS TAKEN for a date/type/HC,
-- independently of who was present. Without this, "never recorded" and
-- "recorded but nobody came" are indistinguishable, since the attendance
-- table only stores present rows.
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  attendance_type VARCHAR(20) NOT NULL
    CHECK (attendance_type IN ('sunday_service', 'house_church')),
  house_church_id UUID REFERENCES house_churches(id),
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7&7 Discipleship progress
CREATE TABLE IF NOT EXISTS discipleship_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  week INTEGER NOT NULL CHECK (week >= 1 AND week <= 7),
  day INTEGER NOT NULL CHECK (day >= 1 AND day <= 7),
  completed BOOLEAN DEFAULT false,
  answers JSONB DEFAULT '{}',
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week, day)
);

-- Pastor Incubator progress
-- `day` intentionally has no CHECK constraint in the live database.
CREATE TABLE IF NOT EXISTS incubator_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  week INTEGER NOT NULL CHECK (week >= 1 AND week <= 5),
  day INTEGER NOT NULL,
  module_index INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  answers JSONB DEFAULT '{}',
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week, day, module_index)
);

-- Pastor Incubator access (invitation-based)
CREATE TABLE IF NOT EXISTS incubator_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id)
);

-- Prayer Requests
-- is_private is a legacy column superseded by `visibility`; it still exists
-- in the live database and is no longer read by the application.
CREATE TABLE IF NOT EXISTS prayer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  member_id UUID REFERENCES members(id),
  house_church_id UUID REFERENCES house_churches(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_private BOOLEAN DEFAULT false,
  visibility VARCHAR(20) NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'house_church', 'private')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'answered')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pastoral Meetings (1:1 discipleship tracking)
CREATE TABLE IF NOT EXISTS pastoral_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  pastor_id UUID NOT NULL REFERENCES users(id),
  member_id UUID NOT NULL REFERENCES members(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Planning Center OAuth tokens (one row per connected admin)
CREATE TABLE IF NOT EXISTS pco_tokens (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sync history for the Planning Center import (weekly cron + manual runs)
CREATE TABLE IF NOT EXISTS sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(20) NOT NULL,         -- 'cron' or 'manual'
  success BOOLEAN NOT NULL,
  detail TEXT,
  synced_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes present in the live database
CREATE INDEX IF NOT EXISTS idx_members_house_church ON members(house_church_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_house_church ON attendance(house_church_id);
CREATE INDEX IF NOT EXISTS idx_attendance_member ON attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_type ON attendance(attendance_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_member_date_type ON attendance(member_id, date, attendance_type);
-- COALESCE is required: a NULL house_church_id (sunday_service) would never
-- conflict with another NULL, so plain column uniqueness would not dedupe.
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_sessions_unique
  ON attendance_sessions (
    date,
    attendance_type,
    COALESCE(house_church_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
CREATE INDEX IF NOT EXISTS idx_discipleship_user ON discipleship_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_incubator_user ON incubator_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_prayer_house_church ON prayer_requests(house_church_id);
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

-- ---------------------------------------------------------------------------
-- Notes on what is deliberately NOT here
--
-- members.pco_id has no separate index: the UNIQUE constraint
-- members_pco_id_key already creates a btree on that column, so an additional
-- index would be a redundant duplicate.
--
-- playing_with_neon exists in the live database but is omitted: it is a Neon
-- starter-template demo table, unrelated to the application.
-- ---------------------------------------------------------------------------
