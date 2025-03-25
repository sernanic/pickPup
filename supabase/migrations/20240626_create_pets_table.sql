-- Create pets table
CREATE TABLE IF NOT EXISTS public.pets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    breed TEXT,
    age INTEGER,
    gender TEXT CHECK (gender IN ('male', 'female', 'unknown')),
    is_neutered BOOLEAN DEFAULT false,
    weight DECIMAL(5,2),
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add RLS policies
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- Policy for select
CREATE POLICY "Users can view their own pets" ON public.pets
    FOR SELECT USING (auth.uid() = owner_id);

-- Policy for insert
CREATE POLICY "Users can insert their own pets" ON public.pets
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Policy for update
CREATE POLICY "Users can update their own pets" ON public.pets
    FOR UPDATE USING (auth.uid() = owner_id);

-- Policy for delete
CREATE POLICY "Users can delete their own pets" ON public.pets
    FOR DELETE USING (auth.uid() = owner_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.pets
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp(); 