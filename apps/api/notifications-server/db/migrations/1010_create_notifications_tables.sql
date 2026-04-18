-- Migration: 1010_create_notifications_tables
-- Description: Create notifications and notification_preferences tables

BEGIN;

-- Create notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    channel TEXT NOT NULL,
    type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create notification_preferences table
CREATE TABLE notification_preferences (
    user_id UUID NOT NULL,
    channel TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    min_severity TEXT NOT NULL CHECK (min_severity IN ('info', 'warning', 'error', 'critical')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, channel)
);

-- Create indexes
CREATE INDEX idx_notifications_user_id_created_at ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Notifications: users can only access their own notifications
CREATE POLICY notifications_user_policy ON notifications
    FOR ALL
    USING (user_id = current_user_id());

-- Notification preferences: users can only access their own preferences
CREATE POLICY notification_preferences_user_policy ON notification_preferences
    FOR ALL
    USING (user_id = current_user_id());

COMMIT;
