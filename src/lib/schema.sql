-- HouseChurchApp Database Schema
-- Neon PostgreSQL

-- Users table (for NextAuth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),  -- NULL for Google-only users
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('admin', 'house_church_pastor', 'member')),
  language VARCHAR(2) DEFAULT 'en' CHECK (language IN ('en', 'es')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- House Churches
CREATE TABLE IF NOT EXISTS house_churches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  pastor_id UUID REFERENCES members(id),
  host_id UUID REFERENCES members(id),
  trainee_id UUID REFERENCES members(id),
  location VARCHAR(500),
  street VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  meeting_day VARCHAR(20),
  meeting_time VARCHAR(20),
  pco_campus_id VARCHAR(100),
  campus_name VARCHAR(255),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Members (linked to house churches)
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  house_church_id UUID REFERENCES house_churches(id),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  role VARCHAR(50) DEFAULT 'member',
  pco_id VARCHAR(100) UNIQUE,
  campus_pco_id VARCHAR(100),
  gender VARCHAR(10),
  date_of_birth DATE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Attendance tracking
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_church_id UUID REFERENCES house_churches(id),
  member_id UUID REFERENCES members(id),
  date DATE NOT NULL,
  present BOOLEAN DEFAULT true,
  notes TEXT,
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
CREATE TABLE IF NOT EXISTS prayer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  member_id UUID REFERENCES members(id),
  house_church_id UUID REFERENCES house_churches(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'house_church', 'private')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'praying', 'answered')),
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

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_members_house_church ON members(house_church_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_pco_id ON members(pco_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_house_church ON attendance(house_church_id);
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
