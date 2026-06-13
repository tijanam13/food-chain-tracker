
-- Family members can view each other's tokens
CREATE POLICY "Family members can view tokens"
ON public.user_tokens
FOR SELECT
TO authenticated
USING (user_id IN (SELECT get_family_member_ids(auth.uid())));

-- Family members can view each other's donations
CREATE POLICY "Family members can view donations"
ON public.donations
FOR SELECT
TO authenticated
USING (user_id IN (SELECT get_family_member_ids(auth.uid())));

-- Family members can view each other's used recipes
CREATE POLICY "Family members can view used recipes"
ON public.used_recipes
FOR SELECT
TO authenticated
USING (user_id IN (SELECT get_family_member_ids(auth.uid())));

-- Sync existing tokens to points where points are 0
UPDATE public.user_tokens SET total_points = total_tokens WHERE total_points = 0 AND total_tokens > 0;
