-- Fix sitter_stats table permissions to allow review submissions

-- Add RLS policy to allow all authenticated users to view sitter stats
-- This is needed so the UI can show sitter ratings, etc.
CREATE POLICY "Anyone can view sitter stats" 
ON public.sitter_stats 
FOR SELECT 
USING (true);

-- Add policy to allow service role to update sitter stats
-- This is needed when reviews are submitted and stats need updating
CREATE POLICY "Service can update sitter stats" 
ON public.sitter_stats 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Add policy to allow service role to insert sitter stats
-- This is needed for first-time reviews when a sitter has no stats entry yet
CREATE POLICY "Service can insert sitter stats" 
ON public.sitter_stats 
FOR INSERT 
WITH CHECK (true);

-- Create or replace function to automatically update sitter stats when a review is added
CREATE OR REPLACE FUNCTION public.update_sitter_stats_on_review()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating NUMERIC;
  review_count INTEGER;
BEGIN
  -- Calculate new average rating and count of reviews
  SELECT 
    AVG(rating)::NUMERIC(3,2),
    COUNT(*)
  INTO
    avg_rating,
    review_count
  FROM public.reviews
  WHERE sitter_id = NEW.sitter_id;
  
  -- Update or insert into sitter_stats
  -- This uses an UPSERT pattern (insert with ON CONFLICT DO UPDATE)
  INSERT INTO public.sitter_stats (
    sitter_id,
    average_rating,
    last_updated_at
  ) 
  VALUES (
    NEW.sitter_id,
    avg_rating,
    NOW()
  )
  ON CONFLICT (sitter_id) 
  DO UPDATE SET
    average_rating = EXCLUDED.average_rating,
    last_updated_at = EXCLUDED.last_updated_at;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update stats when a review is added
DROP TRIGGER IF EXISTS update_sitter_stats_on_review_trigger ON public.reviews;
CREATE TRIGGER update_sitter_stats_on_review_trigger
AFTER INSERT OR UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_sitter_stats_on_review();
