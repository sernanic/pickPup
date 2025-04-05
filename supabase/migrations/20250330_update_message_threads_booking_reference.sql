-- This migration updates the message_threads table to support both walking and boarding bookings

-- First, add a booking_type column to indicate which type of booking this thread is for
ALTER TABLE public.message_threads
ADD COLUMN IF NOT EXISTS booking_type VARCHAR(20) DEFAULT 'walking';

-- Add a new column for boarding_booking_id
ALTER TABLE public.message_threads
ADD COLUMN IF NOT EXISTS boarding_booking_id UUID REFERENCES public.boarding_bookings(id) ON DELETE CASCADE;

-- For consistency, rename the existing booking_id column to walking_booking_id
-- This requires dropping the constraint first
ALTER TABLE public.message_threads
DROP CONSTRAINT IF EXISTS message_threads_booking_id_fkey;

ALTER TABLE public.message_threads
RENAME COLUMN booking_id TO walking_booking_id;

-- Re-add the foreign key constraint for walking bookings
ALTER TABLE public.message_threads
ADD CONSTRAINT message_threads_walking_booking_id_fkey
FOREIGN KEY (walking_booking_id) REFERENCES public.walking_bookings(id) ON DELETE CASCADE;

-- Create a check constraint to ensure one and only one booking ID is set based on booking_type
ALTER TABLE public.message_threads
DROP CONSTRAINT IF EXISTS message_threads_booking_type_check;

ALTER TABLE public.message_threads
ADD CONSTRAINT message_threads_booking_type_check
CHECK (
  (booking_type = 'walking' AND walking_booking_id IS NOT NULL AND boarding_booking_id IS NULL) OR
  (booking_type = 'boarding' AND boarding_booking_id IS NOT NULL AND walking_booking_id IS NULL)
);

-- Add indices for the new columns
CREATE INDEX IF NOT EXISTS idx_message_threads_booking_type ON public.message_threads(booking_type);
CREATE INDEX IF NOT EXISTS idx_message_threads_boarding_booking_id ON public.message_threads(boarding_booking_id);

-- Update the function that creates messaging threads to handle both booking types
CREATE OR REPLACE FUNCTION get_booking_details(
  p_walking_booking_id UUID,
  p_boarding_booking_id UUID
) RETURNS TABLE (
  owner_id UUID,
  sitter_id UUID
) AS $$
BEGIN
  IF p_walking_booking_id IS NOT NULL THEN
    RETURN QUERY
    SELECT wb.owner_id, wb.sitter_id
    FROM public.walking_bookings wb
    WHERE wb.id = p_walking_booking_id;
  ELSIF p_boarding_booking_id IS NOT NULL THEN
    RETURN QUERY
    SELECT bb.owner_id, bb.sitter_id
    FROM public.boarding_bookings bb
    WHERE bb.id = p_boarding_booking_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE public.message_threads IS 'Tracks conversations between pet owners and sitters about bookings';
COMMENT ON COLUMN public.message_threads.booking_type IS 'Type of booking - either walking or boarding';
COMMENT ON COLUMN public.message_threads.walking_booking_id IS 'Reference to walking booking if booking_type is walking';
COMMENT ON COLUMN public.message_threads.boarding_booking_id IS 'Reference to boarding booking if booking_type is boarding';
