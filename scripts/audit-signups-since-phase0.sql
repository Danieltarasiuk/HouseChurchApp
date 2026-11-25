-- READ ONLY. Accounts created since the Phase 0 deploy (2026-11-25 03:48 UTC),
-- when email/password registration started linking members by email, how
-- each signed up, and which member it is linked to.
--
-- Possible takeover = signed up with email/password AND linked to a member
-- that existed before the account did (member_created_before_account).
-- Google sign-ups are fine: Google verifies the email.
--
-- Safe to run before or after the hotfix migration (does not use users.status).

BEGIN TRANSACTION READ ONLY;

SELECT
  u.created_at                                              AS account_created_utc,
  u.email,
  u.name,
  CASE WHEN u.password_hash IS NULL THEN 'google' ELSE 'email/password' END AS signup_method,
  m.id                                                      AS member_id,
  m.first_name || ' ' || m.last_name                        AS member_name,
  m.email                                                   AS member_email,
  m.pco_id IS NOT NULL                                      AS member_from_pco,
  m.joined_at                                               AS member_created_utc,
  (m.joined_at < u.created_at)                              AS member_created_before_account,
  (u.password_hash IS NOT NULL AND m.joined_at < u.created_at) AS possible_takeover
FROM users u
LEFT JOIN members m ON m.user_id = u.id
WHERE u.created_at >= TIMESTAMPTZ '2026-11-25 03:48:00+00'
ORDER BY possible_takeover DESC NULLS LAST, u.created_at;

ROLLBACK;
