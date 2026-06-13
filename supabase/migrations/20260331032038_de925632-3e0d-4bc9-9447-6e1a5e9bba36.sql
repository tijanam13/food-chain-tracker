
-- Fix infinite recursion in family_members SELECT policy
DROP POLICY IF EXISTS "Members can view group members" ON public.family_members;

CREATE POLICY "Members can view group members"
ON public.family_members
FOR SELECT
TO public
USING (
  user_id = auth.uid()
  OR group_id IN (
    SELECT fm.group_id FROM public.family_members fm WHERE fm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.family_groups fg WHERE fg.id = group_id AND fg.owner_id = auth.uid()
  )
);
