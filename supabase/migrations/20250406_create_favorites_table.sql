-- Create favorites table for storing user favorites
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  owner_id UUID NOT NULL,
  sitter_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Add foreign key constraints
  CONSTRAINT fk_owner_id FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_sitter_id FOREIGN KEY (sitter_id) REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Prevent duplicate favorites
  CONSTRAINT unique_owner_sitter UNIQUE (owner_id, sitter_id)
);

-- Create index for faster lookups by owner
CREATE INDEX idx_favorites_owner_id ON favorites (owner_id);

-- Create index for faster lookups by sitter
CREATE INDEX idx_favorites_sitter_id ON favorites (sitter_id);

-- Set up RLS (Row Level Security)
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Owner can view their own favorites
CREATE POLICY "Users can view their own favorites" 
ON favorites FOR SELECT 
USING (auth.uid() = owner_id);

-- Owner can insert their own favorites
CREATE POLICY "Users can add their own favorites" 
ON favorites FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

-- Owner can delete their own favorites
CREATE POLICY "Users can delete their own favorites" 
ON favorites FOR DELETE 
USING (auth.uid() = owner_id);

-- Sitters can see who favorited them
CREATE POLICY "Sitters can see who favorited them" 
ON favorites FOR SELECT 
USING (auth.uid() = sitter_id);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, DELETE ON favorites TO authenticated;

-- Add trigger for notification when a user favorites a sitter
CREATE OR REPLACE FUNCTION notify_on_favorite()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert a notification for newly added favorites
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO notifications (
      recipient_id,
      type,
      title,
      message,
      related_id,
      data
    )
    VALUES (
      NEW.sitter_id,
      'favorite',
      'New Favorite',
      (SELECT name FROM profiles WHERE id = NEW.owner_id) || ' favorited your profile',
      NEW.owner_id,
      jsonb_build_object(
        'owner_id', NEW.owner_id,
        'favorite_id', NEW.id
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_favorite_added
AFTER INSERT ON favorites
FOR EACH ROW
EXECUTE FUNCTION notify_on_favorite(); 