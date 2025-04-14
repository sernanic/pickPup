-- Add expo_push_token column to profiles table
ALTER TABLE profiles
ADD COLUMN expo_push_token TEXT DEFAULT NULL;

-- Create an index for faster push token queries
CREATE INDEX idx_profiles_expo_push_token ON profiles(expo_push_token)
WHERE expo_push_token IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.expo_push_token IS 'Expo Push Notification token for the user''s device';
