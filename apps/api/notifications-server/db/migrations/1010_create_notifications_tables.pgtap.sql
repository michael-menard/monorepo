-- PGTAP tests for migration 1010_create_notifications_tables

BEGIN;

SELECT plan(15);

-- 1. notifications table exists
SELECT has_table('notifications');

-- 2. notifications table has expected columns
SELECT has_column('notifications', 'id');
SELECT has_column('notifications', 'user_id');
SELECT has_column('notifications', 'channel');
SELECT has_column('notifications', 'type');
SELECT has_column('notifications', 'severity');
SELECT has_column('notifications', 'title');
SELECT has_column('notifications', 'message');
SELECT has_column('notifications', 'data');
SELECT has_column('notifications', 'read_at');
SELECT has_column('notifications', 'created_at');

-- 3. notifications.id is primary key
SELECT col_is_pk('notifications', 'id', 'id is primary key');

-- 4. notifications.severity has check constraint
SELECT col_has_check('notifications', 'severity', 'severity has check constraint');

-- 5. notification_preferences table exists
SELECT has_table('notification_preferences');

-- 6. notification_preferences table has expected columns
SELECT has_column('notification_preferences', 'user_id');
SELECT has_column('notification_preferences', 'channel');
SELECT has_column('notification_preferences', 'enabled');
SELECT has_column('notification_preferences', 'min_severity');
SELECT has_column('notification_preferences', 'updated_at');

-- 7. notification_preferences has composite primary key (user_id, channel)
SELECT col_is_pk('notification_preferences', ARRAY['user_id', 'channel'], 'composite primary key');

-- 8. notification_preferences.min_severity has check constraint
SELECT col_has_check('notification_preferences', 'min_severity', 'min_severity has check constraint');

-- 9. Indexes exist
SELECT has_index('notifications', 'idx_notifications_user_id_created_at', ARRAY['user_id', 'created_at'], 'index on user_id and created_at');
SELECT has_index('notification_preferences', 'idx_notification_preferences_user_id', 'user_id', 'index on user_id');

-- 10. RLS is enabled
SELECT row_level_security_enabled('notifications');
SELECT row_level_security_enabled('notification_preferences');

-- 11. RLS policies exist (note: we cannot test the policy expression without knowing the function, but we can check that a policy exists)
SELECT has_policy('notifications', 'notifications_user_policy');
SELECT has_policy('notification_preferences', 'notification_preferences_user_policy');

SELECT * FROM finish();

ROLLBACK;
