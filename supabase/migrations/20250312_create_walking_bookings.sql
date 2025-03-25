-- Create the walkingBooking table
CREATE TABLE IF NOT EXISTS "walking_bookings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_id" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "sitter_id" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "availability_slot_id" UUID NOT NULL REFERENCES "sitter_weekly_availability"("id") ON DELETE CASCADE,
  "booking_date" DATE NOT NULL,
  "start_time" TIME NOT NULL,
  "end_time" TIME NOT NULL,
  "selected_pets" JSONB NOT NULL, -- Storing as JSONB for flexibility
  "status" TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, completed, cancelled
  "total_price" DECIMAL(10, 2) NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS "walking_bookings_owner_id_idx" ON "walking_bookings"("owner_id");
CREATE INDEX IF NOT EXISTS "walking_bookings_sitter_id_idx" ON "walking_bookings"("sitter_id");
CREATE INDEX IF NOT EXISTS "walking_bookings_status_idx" ON "walking_bookings"("status");
CREATE INDEX IF NOT EXISTS "walking_bookings_booking_date_idx" ON "walking_bookings"("booking_date");

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_walking_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
DROP TRIGGER IF EXISTS update_walking_bookings_updated_at ON "walking_bookings";
CREATE TRIGGER update_walking_bookings_updated_at
BEFORE UPDATE ON "walking_bookings"
FOR EACH ROW
EXECUTE FUNCTION update_walking_bookings_updated_at();

-- Add row level security policies
ALTER TABLE "walking_bookings" ENABLE ROW LEVEL SECURITY;

-- Policy for viewing bookings (owners can see their own bookings, sitters can see bookings for them)
CREATE POLICY "Users can view their own bookings" 
ON "walking_bookings" 
FOR SELECT 
USING (
  auth.uid() = owner_id OR 
  auth.uid() = sitter_id
);

-- Policy for inserting bookings (authenticated users can create bookings)
CREATE POLICY "Users can create bookings" 
ON "walking_bookings" 
FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

-- Policy for updating bookings (owner can update their own bookings)
CREATE POLICY "Users can update their own bookings" 
ON "walking_bookings" 
FOR UPDATE 
USING (auth.uid() = owner_id);

-- Policy for deleting bookings (owners can delete their own bookings)
CREATE POLICY "Users can delete their own bookings" 
ON "walking_bookings" 
FOR DELETE 
USING (auth.uid() = owner_id);
