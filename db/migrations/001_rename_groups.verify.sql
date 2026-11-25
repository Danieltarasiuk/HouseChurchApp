-- 001_rename_groups.verify.sql
-- Read-only check after 001_rename_groups.sql. Every *_left column must be 0
-- and the two booleans true; the counts must match the "before" query below.

SELECT
  to_regclass('public.groups') IS NOT NULL                                    AS groups_table_exists,
  to_regclass('public.house_churches') IS NULL                                AS old_table_gone,
  (SELECT count(*) FROM information_schema.columns
     WHERE table_schema = 'public' AND column_name = 'group_id')              AS group_id_columns,      -- expect 4
  (SELECT count(*) FROM information_schema.columns
     WHERE table_schema = 'public' AND column_name LIKE '%house_church%')     AS old_columns_left,
  (SELECT count(*) FROM pg_constraint
     WHERE connamespace = 'public'::regnamespace
       AND (conname LIKE '%house_church%' OR pg_get_constraintdef(oid) LIKE '%house_church%')) AS old_constraints_left,
  (SELECT count(*) FROM pg_indexes
     WHERE schemaname = 'public'
       AND (indexname LIKE '%house_church%' OR indexdef LIKE '%house_church%')) AS old_indexes_left,
  (SELECT count(*) FROM users WHERE role = 'house_church_pastor')
  + (SELECT count(*) FROM prayer_requests WHERE visibility = 'house_church')
  + (SELECT count(*) FROM attendance WHERE attendance_type = 'house_church')
  + (SELECT count(*) FROM attendance_sessions WHERE attendance_type = 'house_church')
  + (SELECT count(*) FROM directory_visibility WHERE scope = 'house_church')
  + (SELECT count(*) FROM calendar_events WHERE category = 'house_church')
  + (SELECT count(*) FROM pastoral_meetings WHERE topic_key = 'house_church') AS old_values_left,
  (SELECT count(*) FROM groups)                                                AS groups,
  (SELECT count(*) FROM members WHERE group_id IS NOT NULL)                    AS members_in_a_group,
  (SELECT count(*) FROM users WHERE role = 'group_leader')                     AS group_leaders,
  (SELECT count(*) FROM attendance WHERE attendance_type = 'group')            AS group_attendance_rows,
  (SELECT count(*) FROM attendance_sessions WHERE attendance_type = 'group')   AS group_sessions,
  (SELECT count(*) FROM prayer_requests WHERE visibility = 'group')            AS group_prayers,
  (SELECT count(*) FROM directory_visibility WHERE scope = 'group')            AS group_privacy_rows,
  (SELECT count(*) FROM calendar_events WHERE category = 'group')              AS group_events,
  (SELECT count(*) FROM pastoral_meetings WHERE topic_key = 'group')           AS group_topic_meetings;

-- "Before" query: run this BEFORE the migration and keep the result. Each
-- number must equal the matching column above afterwards.
--
-- SELECT
--   (SELECT count(*) FROM house_churches)                                        AS groups,
--   (SELECT count(*) FROM members WHERE house_church_id IS NOT NULL)             AS members_in_a_group,
--   (SELECT count(*) FROM users WHERE role = 'house_church_pastor')              AS group_leaders,
--   (SELECT count(*) FROM attendance WHERE attendance_type = 'house_church')     AS group_attendance_rows,
--   (SELECT count(*) FROM attendance_sessions WHERE attendance_type = 'house_church') AS group_sessions,
--   (SELECT count(*) FROM prayer_requests WHERE visibility = 'house_church')     AS group_prayers,
--   (SELECT count(*) FROM directory_visibility WHERE scope = 'house_church')     AS group_privacy_rows,
--   (SELECT count(*) FROM calendar_events WHERE category = 'house_church')       AS group_events,
--   (SELECT count(*) FROM pastoral_meetings WHERE topic_key = 'house_church')    AS group_topic_meetings;
