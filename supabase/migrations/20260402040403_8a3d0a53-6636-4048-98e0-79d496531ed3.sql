
-- Drop the direct UPDATE policy
DROP POLICY IF EXISTS "Users can update own tokens" ON public.user_tokens;

-- Create secure RPC for token/point adjustments
CREATE OR REPLACE FUNCTION public.adjust_user_tokens(
  _user_id uuid,
  _token_delta integer DEFAULT 0,
  _point_delta integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow the user themselves or ensure caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Upsert: insert if not exists, update if exists
  INSERT INTO public.user_tokens (user_id, total_tokens, total_points)
  VALUES (_user_id, GREATEST(0, _token_delta), GREATEST(0, _point_delta))
  ON CONFLICT (user_id) DO UPDATE SET
    total_tokens = GREATEST(0, public.user_tokens.total_tokens + _token_delta),
    total_points = GREATEST(0, public.user_tokens.total_points + _point_delta),
    updated_at = now();
END;
$$;
