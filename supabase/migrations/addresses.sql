-- Create addresses table
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    formatted_address TEXT NOT NULL,
    street_address TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own addresses
CREATE POLICY "Users can view their own addresses"
ON public.addresses
FOR SELECT
USING (auth.uid() = profile_id);

-- Policy: Users can insert their own addresses
CREATE POLICY "Users can insert their own addresses"
ON public.addresses
FOR INSERT
WITH CHECK (auth.uid() = profile_id);

-- Policy: Users can update their own addresses
CREATE POLICY "Users can update their own addresses"
ON public.addresses
FOR UPDATE
USING (auth.uid() = profile_id);

-- Policy: Users can delete their own addresses
CREATE POLICY "Users can delete their own addresses"
ON public.addresses
FOR DELETE
USING (auth.uid() = profile_id);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS addresses_profile_id_idx ON public.addresses (profile_id);
CREATE INDEX IF NOT EXISTS addresses_is_primary_idx ON public.addresses (is_primary);

-- Set up triggers for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for addresses table
DROP TRIGGER IF EXISTS set_addresses_updated_at ON public.addresses;
CREATE TRIGGER set_addresses_updated_at
BEFORE UPDATE ON public.addresses
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at(); 