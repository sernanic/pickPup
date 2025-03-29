-- Remove the pets bucket and all its contents
-- Warning: This will permanently delete all stored pet images

-- Drop the policies first
DROP POLICY IF EXISTS "Users can view their own pet images and public images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own pet images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own pet images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own pet images" ON storage.objects;

-- Remove objects in the bucket
DELETE FROM storage.objects
WHERE bucket_id = 'pets';

-- Remove the bucket itself
DELETE FROM storage.buckets
WHERE id = 'pets';
