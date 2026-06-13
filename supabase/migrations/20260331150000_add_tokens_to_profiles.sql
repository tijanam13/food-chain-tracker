-- Add tokens column to profiles table
ALTER TABLE public.profiles ADD COLUMN tokens INTEGER DEFAULT 0;

-- Create index for faster queries
CREATE INDEX idx_profiles_tokens ON public.profiles(tokens);
