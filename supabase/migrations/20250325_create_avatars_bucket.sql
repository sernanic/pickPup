-- Create avatars storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Set up security policies for the avatars bucket

-- Policy for users to view their own avatar or public avatars
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can view their own avatars and public avatars'
  ) THEN
    CREATE POLICY "Users can view their own avatars and public avatars"
    ON storage.objects FOR SELECT
    USING (
      (bucket_id = 'avatars' AND auth.uid() = owner)
      OR
      (bucket_id = 'avatars' AND bucket_id IN (SELECT id FROM storage.buckets WHERE public = true))
    );
  END IF;
END
$$;

-- Policy for users to upload their own avatar
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload their own avatar'
  ) THEN
    CREATE POLICY "Users can upload their own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'avatars' 
      AND auth.uid() = owner
    );
  END IF;
END
$$;

-- Policy for users to update their own avatar
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update their own avatar'
  ) THEN
    CREATE POLICY "Users can update their own avatar"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'avatars' 
      AND auth.uid() = owner
    )
    WITH CHECK (
      bucket_id = 'avatars' 
      AND auth.uid() = owner
    );
  END IF;
END
$$;

-- Policy for users to delete their own avatar
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete their own avatar'
  ) THEN
    CREATE POLICY "Users can delete their own avatar"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'avatars' 
      AND auth.uid() = owner
    );
  END IF;
END
$$;
