-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sitter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add RLS policies
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Policy for select - anyone can view reviews
CREATE POLICY "Anyone can view reviews" ON public.reviews
    FOR SELECT USING (true);

-- Policy for insert - authenticated users can insert their own reviews
CREATE POLICY "Users can insert their own reviews" ON public.reviews
    FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- Policy for update - users can update their own reviews
CREATE POLICY "Users can update their own reviews" ON public.reviews
    FOR UPDATE USING (auth.uid() = reviewer_id);

-- Policy for delete - users can delete their own reviews
CREATE POLICY "Users can delete their own reviews" ON public.reviews
    FOR DELETE USING (auth.uid() = reviewer_id);

-- Create trigger for updated_at
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Create index for faster queries
CREATE INDEX reviews_sitter_id_idx ON public.reviews(sitter_id);
CREATE INDEX reviews_reviewer_id_idx ON public.reviews(reviewer_id);
