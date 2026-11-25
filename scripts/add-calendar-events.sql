-- Leadership calendar: one row per event, pushed to the CityChurch Miami
-- Google Calendar (the app is the master; nothing is pulled back).
-- Run against Neon before deploying the /calendar feature.
--
-- Every date and time is America/New_York local time. DATE and TIME are
-- stored as-is, never as UTC timestamps, so all-day events cannot shift.
-- end_date is INCLUSIVE (Google and FullCalendar ends are exclusive; the
-- +1 day happens when the row is sent to them).

CREATE TABLE IF NOT EXISTS calendar_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en         TEXT NOT NULL,
  title_es         TEXT,
  category         TEXT NOT NULL CHECK (category IN (
                     'worship_night','house_church','men_women_marriage','brunch',
                     'english_gathering','special_event','advent','holiday','school','reminder')),
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,            -- INCLUSIVE last day
  start_time       TIME,                     -- NULL = all-day
  end_time         TIME,
  notes            TEXT,                     -- internal, admins only
  status           TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','cancelled')),
  visibility       TEXT NOT NULL DEFAULT 'leaders' CHECK (visibility IN ('leaders','members')),
  google_event_id  TEXT UNIQUE,
  sync_status      TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('synced','pending','error')),
  sync_error       TEXT,
  -- SET NULL so removing a user in Settings never fails on this table
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date),
  CHECK ((start_time IS NULL) = (end_time IS NULL))
);

CREATE INDEX IF NOT EXISTS calendar_events_start_idx ON calendar_events (start_date);
