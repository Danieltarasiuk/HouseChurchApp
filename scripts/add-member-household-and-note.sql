-- PCO households and the app-owned attendance note on members.
-- Run against Neon DB before deploying the attendance upgrade.
--
-- attendance_note is owned by this app: the PCO sync never writes or clears it.

ALTER TABLE members ADD COLUMN IF NOT EXISTS pco_household_id TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS household_name TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS attendance_note TEXT;
