-- Add FCM Token support for push notifications
-- Created: 2025-11-20
-- Purpose: Store Firebase Cloud Messaging tokens for mobile push notifications

-- Add fcm_token column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS fcm_token TEXT,
ADD COLUMN IF NOT EXISTS fcm_token_updated_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster FCM token lookups
CREATE INDEX IF NOT EXISTS idx_users_fcm_token ON users(fcm_token) WHERE fcm_token IS NOT NULL;

-- Add comments
COMMENT ON COLUMN users.fcm_token IS 'Firebase Cloud Messaging token for push notifications';
COMMENT ON COLUMN users.fcm_token_updated_at IS 'Last time FCM token was updated';

-- Verify
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('fcm_token', 'fcm_token_updated_at');
