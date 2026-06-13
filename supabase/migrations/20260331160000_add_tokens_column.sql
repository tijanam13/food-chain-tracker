-- Add tokens column to profiles table if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tokens INTEGER DEFAULT 0;

-- Create or replace index for faster queries
DROP INDEX IF EXISTS idx_profiles_tokens;
CREATE INDEX idx_profiles_tokens ON public.profiles(tokens);
