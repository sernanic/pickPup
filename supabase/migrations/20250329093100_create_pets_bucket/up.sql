-- Create the pets bucket for storing pet images
-- This migration creates a storage bucket for pet images if it doesn't exist

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('pets', 'pets', true, 5242880)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 5242880;

-- Policy for users to view their own pet images or public images
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can view their own pet images and public images'
  ) THEN
    CREATE POLICY "Users can view their own pet images and public images"
    ON storage.objects FOR SELECT
    USING (
      (bucket_id = 'pets' AND auth.uid() = owner)
      OR
      (bucket_id = 'pets' AND bucket_id IN (SELECT id FROM storage.buckets WHERE public = true))
    );
  END IF;
END
$$;

-- Policy for users to upload their own pet images
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload their own pet images'
  ) THEN
    CREATE POLICY "Users can upload their own pet images"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'pets' 
      AND auth.uid() = owner
    );
  END IF;
END
$$;

-- Policy for users to update their own pet images
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update their own pet images'
  ) THEN
    CREATE POLICY "Users can update their own pet images"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'pets' 
      AND auth.uid() = owner
    )
    WITH CHECK (
      bucket_id = 'pets' 
      AND auth.uid() = owner
    );
  END IF;
END
$$;

-- Policy for users to delete their own pet images
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete their own pet images'
  ) THEN
    CREATE POLICY "Users can delete their own pet images"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'pets' 
      AND auth.uid() = owner
    );
  END IF;
END
$$;
