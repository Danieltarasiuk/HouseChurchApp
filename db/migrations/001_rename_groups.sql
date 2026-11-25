-- 001_rename_groups.sql
-- Renames house churches to groups (pure rename; no data is added or lost).
-- Reverse with 001_rename_groups.down.sql.
--
--   table   house_churches            -> groups
--   column  house_church_id           -> group_id   (members, attendance,
--                                                     attendance_sessions,
--                                                     prayer_requests)
--   values  users.role                'house_church_pastor' -> 'group_leader'
--           prayer_requests.visibility           'house_church' -> 'group'
--           attendance.attendance_type           'house_church' -> 'group'
--           attendance_sessions.attendance_type  'house_church' -> 'group'
--           directory_visibility.scope           'house_church' -> 'group'
--           calendar_events.category             'house_church' -> 'group'
--           pastoral_meetings.topic_key          'house_church' -> 'group'
--   names   every constraint and index that said house_church(es)
--
-- pco_campus_id and campus_name are unchanged. Everything runs in one
-- transaction: it either all applies or nothing does.

BEGIN;

-- Table and its own constraints (renaming the primary key renames its index).
ALTER TABLE house_churches RENAME TO groups;
ALTER TABLE groups RENAME CONSTRAINT house_churches_pkey TO groups_pkey;
ALTER TABLE groups RENAME CONSTRAINT house_churches_pastor_id_fkey TO groups_pastor_id_fkey;
ALTER TABLE groups RENAME CONSTRAINT house_churches_host_id_fkey TO groups_host_id_fkey;
ALTER TABLE groups RENAME CONSTRAINT house_churches_trainee_id_fkey TO groups_trainee_id_fkey;

-- house_church_id -> group_id, with its foreign key.
ALTER TABLE members RENAME COLUMN house_church_id TO group_id;
ALTER TABLE members RENAME CONSTRAINT members_house_church_id_fkey TO members_group_id_fkey;
ALTER TABLE attendance RENAME COLUMN house_church_id TO group_id;
ALTER TABLE attendance RENAME CONSTRAINT attendance_house_church_id_fkey TO attendance_group_id_fkey;
ALTER TABLE attendance_sessions RENAME COLUMN house_church_id TO group_id;
ALTER TABLE attendance_sessions RENAME CONSTRAINT attendance_sessions_house_church_id_fkey TO attendance_sessions_group_id_fkey;
ALTER TABLE prayer_requests RENAME COLUMN house_church_id TO group_id;
ALTER TABLE prayer_requests RENAME CONSTRAINT prayer_requests_house_church_id_fkey TO prayer_requests_group_id_fkey;

-- Indexes (idx_attendance_sessions_unique follows the column rename by itself).
ALTER INDEX idx_members_house_church RENAME TO idx_members_group;
ALTER INDEX idx_attendance_house_church RENAME TO idx_attendance_group;
ALTER INDEX idx_prayer_house_church RENAME TO idx_prayer_group;

-- Values: drop the CHECK, update the rows, add the CHECK back (same name).
ALTER TABLE users DROP CONSTRAINT users_role_check;
UPDATE users SET role = 'group_leader' WHERE role = 'house_church_pastor';
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('member', 'group_leader', 'admin'));

ALTER TABLE prayer_requests DROP CONSTRAINT prayer_requests_visibility_check;
UPDATE prayer_requests SET visibility = 'group' WHERE visibility = 'house_church';
ALTER TABLE prayer_requests ADD CONSTRAINT prayer_requests_visibility_check
  CHECK (visibility IN ('public', 'group', 'private'));

ALTER TABLE attendance DROP CONSTRAINT attendance_attendance_type_check;
UPDATE attendance SET attendance_type = 'group' WHERE attendance_type = 'house_church';
ALTER TABLE attendance ADD CONSTRAINT attendance_attendance_type_check
  CHECK (attendance_type IN ('sunday_service', 'group'));

ALTER TABLE attendance_sessions DROP CONSTRAINT attendance_sessions_attendance_type_check;
UPDATE attendance_sessions SET attendance_type = 'group' WHERE attendance_type = 'house_church';
ALTER TABLE attendance_sessions ADD CONSTRAINT attendance_sessions_attendance_type_check
  CHECK (attendance_type IN ('sunday_service', 'group'));

ALTER TABLE directory_visibility DROP CONSTRAINT directory_visibility_scope_check;
UPDATE directory_visibility SET scope = 'group' WHERE scope = 'house_church';
ALTER TABLE directory_visibility ADD CONSTRAINT directory_visibility_scope_check
  CHECK (scope IN ('church', 'group', 'member', 'member_self'));

ALTER TABLE calendar_events DROP CONSTRAINT calendar_events_category_check;
UPDATE calendar_events SET category = 'group' WHERE category = 'house_church';
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_category_check
  CHECK (category IN (
    'worship_night','group','men_women_marriage','brunch',
    'english_gathering','special_event','advent','holiday','school','reminder'));

-- No CHECK on topic_key; the keys live in src/data/pastoral-topics.ts.
UPDATE pastoral_meetings SET topic_key = 'group' WHERE topic_key = 'house_church';

COMMIT;
