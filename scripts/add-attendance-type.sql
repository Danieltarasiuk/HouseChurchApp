-- Add attendance_type column and unique constraint to attendance table
-- Run against Neon DB before deploying the attendance save feature.

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS attendance_type VARCHAR(20)
  CHECK (attendance_type IN ('sunday_service', 'house_church'));

-- Unique constraint: one record per member per date per type
-- Required for ON CONFLICT upsert in the POST handler
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_member_date_type
  ON attendance (member_id, date, attendance_type);

CREATE INDEX IF NOT EXISTS idx_attendance_member ON attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_type ON attendance(attendance_type);
