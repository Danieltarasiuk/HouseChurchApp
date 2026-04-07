-- HouseChurchApp Database Schema
-- Neon PostgreSQL

-- Users table (for NextAuth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('pastor', 'leader', 'member')),
  language VARCHAR(2) DEFAULT 'en' CHECK (language IN ('en', 'es')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- House Churches
CREATE TABLE IF NOT EXISTS house_churches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  pastor_id UUID REFERENCES users(id),
  location VARCHAR(500),
  meeting_day VARCHAR(20),
  meeting_time VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Members (linked to house churches)
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  house_church_id UUID REFERENCES house_churches(id),
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('pastor', 'leader', 'member')),
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
  house_church_id UUID REFERENCES house_churches(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_private BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'answered', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_members_house_church ON members(house_church_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_house_church ON attendance(house_church_id);
CREATE INDEX IF NOT EXISTS idx_discipleship_user ON discipleship_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_incubator_user ON incubator_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_prayer_house_church ON prayer_requests(house_church_id);
CREATE INDEX IF NOT EXISTS idx_prayer_status ON prayer_requests(status);
