-- Add attendance_type column to attendance table
-- Run against Neon DB before deploying the attendance save feature.

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS attendance_type VARCHAR(20)
  CHECK (attendance_type IN ('sunday_service', 'house_church'));

CREATE INDEX IF NOT EXISTS idx_attendance_member ON attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_type ON attendance(attendance_type);
