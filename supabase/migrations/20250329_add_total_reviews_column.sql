-- Add total_reviews column to sitter_stats table
ALTER TABLE public.sitter_stats 
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Update the trigger function to also update the total_reviews column
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
    total_reviews,
    last_updated_at
  ) 
  VALUES (
    NEW.sitter_id,
    avg_rating,
    review_count,
    NOW()
  )
  ON CONFLICT (sitter_id) 
  DO UPDATE SET
    average_rating = EXCLUDED.average_rating,
    total_reviews = EXCLUDED.total_reviews,
    last_updated_at = EXCLUDED.last_updated_at;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
