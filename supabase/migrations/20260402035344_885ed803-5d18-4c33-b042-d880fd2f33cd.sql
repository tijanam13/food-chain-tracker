
-- 1. Create a secure profile update function that excludes is_admin and is_premium
CREATE OR REPLACE FUNCTION public.update_own_profile(
  _display_name text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _wallet_address text DEFAULT NULL,
  _avatar_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    display_name = COALESCE(_display_name, display_name),
    phone = COALESCE(_phone, phone),
    wallet_address = COALESCE(_wallet_address, wallet_address),
    avatar_url = COALESCE(_avatar_url, avatar_url),
    updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;

-- 2. Drop the overly permissive UPDATE policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- 3. Create a restricted UPDATE policy that only allows safe columns
CREATE POLICY "Users can update their own profile safe"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Revoke direct UPDATE on sensitive columns from anon and authenticated roles
REVOKE UPDATE (is_admin, is_premium) ON public.profiles FROM anon, authenticated;

-- 5. Create a view for family member profiles (non-sensitive fields only)
CREATE OR REPLACE VIEW public.family_profiles AS
SELECT user_id, display_name, email
FROM public.profiles;

-- 6. Add explicit DELETE deny policy on user_tokens for defense-in-depth
CREATE POLICY "Nobody can delete tokens"
ON public.user_tokens
FOR DELETE
TO authenticated
USING (false);
