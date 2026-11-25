-- 001_rename_groups.down.sql
-- Reverses 001_rename_groups.sql exactly: groups back to house_churches,
-- group_id back to house_church_id, the stored values and every renamed
-- constraint and index. One transaction.

BEGIN;

-- Values first, while the CHECKs are swapped.
UPDATE pastoral_meetings SET topic_key = 'house_church' WHERE topic_key = 'group';

ALTER TABLE calendar_events DROP CONSTRAINT calendar_events_category_check;
UPDATE calendar_events SET category = 'house_church' WHERE category = 'group';
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_category_check
  CHECK (category IN (
    'worship_night','house_church','men_women_marriage','brunch',
    'english_gathering','special_event','advent','holiday','school','reminder'));

ALTER TABLE directory_visibility DROP CONSTRAINT directory_visibility_scope_check;
UPDATE directory_visibility SET scope = 'house_church' WHERE scope = 'group';
ALTER TABLE directory_visibility ADD CONSTRAINT directory_visibility_scope_check
  CHECK (scope IN ('church', 'house_church', 'member', 'member_self'));

ALTER TABLE attendance_sessions DROP CONSTRAINT attendance_sessions_attendance_type_check;
UPDATE attendance_sessions SET attendance_type = 'house_church' WHERE attendance_type = 'group';
ALTER TABLE attendance_sessions ADD CONSTRAINT attendance_sessions_attendance_type_check
  CHECK (attendance_type IN ('sunday_service', 'house_church'));

ALTER TABLE attendance DROP CONSTRAINT attendance_attendance_type_check;
UPDATE attendance SET attendance_type = 'house_church' WHERE attendance_type = 'group';
ALTER TABLE attendance ADD CONSTRAINT attendance_attendance_type_check
  CHECK (attendance_type IN ('sunday_service', 'house_church'));

ALTER TABLE prayer_requests DROP CONSTRAINT prayer_requests_visibility_check;
UPDATE prayer_requests SET visibility = 'house_church' WHERE visibility = 'group';
ALTER TABLE prayer_requests ADD CONSTRAINT prayer_requests_visibility_check
  CHECK (visibility IN ('public', 'house_church', 'private'));

ALTER TABLE users DROP CONSTRAINT users_role_check;
UPDATE users SET role = 'house_church_pastor' WHERE role = 'group_leader';
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('member', 'house_church_pastor', 'admin'));

-- Indexes.
ALTER INDEX idx_prayer_group RENAME TO idx_prayer_house_church;
ALTER INDEX idx_attendance_group RENAME TO idx_attendance_house_church;
ALTER INDEX idx_members_group RENAME TO idx_members_house_church;

-- group_id -> house_church_id, with its foreign key.
ALTER TABLE prayer_requests RENAME CONSTRAINT prayer_requests_group_id_fkey TO prayer_requests_house_church_id_fkey;
ALTER TABLE prayer_requests RENAME COLUMN group_id TO house_church_id;
ALTER TABLE attendance_sessions RENAME CONSTRAINT attendance_sessions_group_id_fkey TO attendance_sessions_house_church_id_fkey;
ALTER TABLE attendance_sessions RENAME COLUMN group_id TO house_church_id;
ALTER TABLE attendance RENAME CONSTRAINT attendance_group_id_fkey TO attendance_house_church_id_fkey;
ALTER TABLE attendance RENAME COLUMN group_id TO house_church_id;
ALTER TABLE members RENAME CONSTRAINT members_group_id_fkey TO members_house_church_id_fkey;
ALTER TABLE members RENAME COLUMN group_id TO house_church_id;

-- Table and its own constraints.
ALTER TABLE groups RENAME CONSTRAINT groups_trainee_id_fkey TO house_churches_trainee_id_fkey;
ALTER TABLE groups RENAME CONSTRAINT groups_host_id_fkey TO house_churches_host_id_fkey;
ALTER TABLE groups RENAME CONSTRAINT groups_pastor_id_fkey TO house_churches_pastor_id_fkey;
ALTER TABLE groups RENAME CONSTRAINT groups_pkey TO house_churches_pkey;
ALTER TABLE groups RENAME TO house_churches;

COMMIT;
