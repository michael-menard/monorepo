-- Migration: 1010_create_notifications_tables (down)
-- Description: Drop notifications and notification_preferences tables

BEGIN;

-- Drop RLS policies
DROP POLICY IF EXISTS notifications_user_policy ON notifications;
DROP POLICY IF EXISTS notification_preferences_user_policy ON notification_preferences;

-- Drop indexes
DROP INDEX IF EXISTS idx_notifications_user_id_created_at;
DROP INDEX IF EXISTS idx_notification_preferences_user_id;

-- Drop tables
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS notification_preferences;

COMMIT;
