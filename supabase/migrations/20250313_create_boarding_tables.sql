-- Create boarding_availability table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS public.boarding_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sitter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    available_date DATE NOT NULL,
    price_per_night DECIMAL(10, 2) NOT NULL,
    max_pets INTEGER NOT NULL DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (sitter_id, available_date)
);

-- Create the boarding_bookings table
CREATE TABLE IF NOT EXISTS public.boarding_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sitter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    total_price DECIMAL(10, 2) NOT NULL,
    special_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT start_before_end CHECK (start_date <= end_date)
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_boarding_bookings_owner_id ON public.boarding_bookings(owner_id);
CREATE INDEX IF NOT EXISTS idx_boarding_bookings_sitter_id ON public.boarding_bookings(sitter_id);
CREATE INDEX IF NOT EXISTS idx_boarding_bookings_pet_id ON public.boarding_bookings(pet_id);
CREATE INDEX IF NOT EXISTS idx_boarding_bookings_status ON public.boarding_bookings(status);
CREATE INDEX IF NOT EXISTS idx_boarding_bookings_dates ON public.boarding_bookings(start_date, end_date);

-- Create RLS policies for boarding_bookings
ALTER TABLE public.boarding_bookings ENABLE ROW LEVEL SECURITY;

-- Owners can see their own bookings
CREATE POLICY "Owners can see their own bookings" 
ON public.boarding_bookings 
FOR SELECT 
USING (owner_id = auth.uid());

-- Sitters can see bookings where they are the sitter
CREATE POLICY "Sitters can see bookings for their services" 
ON public.boarding_bookings 
FOR SELECT 
USING (sitter_id = auth.uid());

-- Owners can create bookings
CREATE POLICY "Owners can create bookings" 
ON public.boarding_bookings 
FOR INSERT 
WITH CHECK (owner_id = auth.uid());

-- Owners can update their own bookings if not confirmed
CREATE POLICY "Owners can update their pending bookings" 
ON public.boarding_bookings 
FOR UPDATE 
USING (owner_id = auth.uid() AND status = 'pending')
WITH CHECK (owner_id = auth.uid() AND status = 'pending');

-- Sitters can update the status of bookings assigned to them
CREATE POLICY "Sitters can update booking status" 
ON public.boarding_bookings 
FOR UPDATE 
USING (sitter_id = auth.uid())
WITH CHECK (sitter_id = auth.uid());

-- Create update triggers to maintain updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to boarding_bookings
DROP TRIGGER IF EXISTS set_boarding_bookings_updated_at ON public.boarding_bookings;
CREATE TRIGGER set_boarding_bookings_updated_at
BEFORE UPDATE ON public.boarding_bookings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Apply the trigger to boarding_availability if it doesn't exist yet
DROP TRIGGER IF EXISTS set_boarding_availability_updated_at ON public.boarding_availability;
CREATE TRIGGER set_boarding_availability_updated_at
BEFORE UPDATE ON public.boarding_availability
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
