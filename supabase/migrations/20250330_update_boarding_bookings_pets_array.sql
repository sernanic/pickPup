-- Migration to update the boarding_bookings table to use a selected_pets array
-- rather than individual entries for each pet

-- First, add the selected_pets column as UUID array
ALTER TABLE public.boarding_bookings 
ADD COLUMN IF NOT EXISTS selected_pets UUID[] DEFAULT '{}';

-- Create a migration function to move existing pet_id data to the array
-- This will help with existing data, if any
DO $$
BEGIN
  -- Update selected_pets array for existing records
  UPDATE public.boarding_bookings
  SET selected_pets = ARRAY[pet_id]
  WHERE pet_id IS NOT NULL AND (selected_pets IS NULL OR selected_pets = '{}');
END
$$;

-- Instead of a check constraint with a subquery (which PostgreSQL doesn't allow),
-- we'll use a trigger-based approach to validate the pets

-- Create a function to validate pet IDs in the array
CREATE OR REPLACE FUNCTION public.validate_pet_ids()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if any pet ID in the array is not in the pets table
  IF EXISTS (
    SELECT 1
    FROM unnest(NEW.selected_pets) AS pet_id
    LEFT JOIN public.pets ON pets.id = pet_id
    WHERE pets.id IS NULL
  ) THEN
    RAISE EXCEPTION 'One or more pet IDs do not exist in the pets table';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to run the validation function before insert or update
DROP TRIGGER IF EXISTS validate_pet_ids_trigger ON public.boarding_bookings;
CREATE TRIGGER validate_pet_ids_trigger
BEFORE INSERT OR UPDATE ON public.boarding_bookings
FOR EACH ROW
EXECUTE FUNCTION public.validate_pet_ids();

-- Make selected_pets required (not null)
ALTER TABLE public.boarding_bookings
ALTER COLUMN selected_pets SET NOT NULL;

-- Drop the pet_id column and its constraint (if it's safe to do so)
-- First drop the index that references the column
DROP INDEX IF EXISTS idx_boarding_bookings_pet_id;

-- Then drop the foreign key constraint
ALTER TABLE public.boarding_bookings 
DROP CONSTRAINT IF EXISTS boarding_bookings_pet_id_fkey;

-- Finally drop the column itself
ALTER TABLE public.boarding_bookings 
DROP COLUMN IF EXISTS pet_id;

-- Remove payment_intent_id if needed (similar to walking bookings schema)
ALTER TABLE public.boarding_bookings
ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR(255);

-- Add indexes for the new structure
CREATE INDEX IF NOT EXISTS idx_boarding_bookings_selected_pets ON public.boarding_bookings USING GIN (selected_pets);

COMMENT ON TABLE public.boarding_bookings IS 'Table for tracking boarding bookings with multiple pets support';
COMMENT ON COLUMN public.boarding_bookings.selected_pets IS 'Array of pet IDs included in this boarding booking';
