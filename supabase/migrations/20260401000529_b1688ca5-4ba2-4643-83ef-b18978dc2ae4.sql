
-- Create security definer function to get group IDs for a user
CREATE OR REPLACE FUNCTION public.get_user_group_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT group_id FROM public.family_members WHERE user_id = _user_id
$$;

-- Create security definer function to get all member user_ids in user's groups
CREATE OR REPLACE FUNCTION public.get_family_member_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT fm2.user_id
  FROM public.family_members fm1
  JOIN public.family_members fm2 ON fm1.group_id = fm2.group_id
  WHERE fm1.user_id = _user_id
$$;

-- Fix family_members policies
DROP POLICY IF EXISTS "Members can view group members" ON public.family_members;
CREATE POLICY "Members can view group members" ON public.family_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR group_id IN (SELECT public.get_user_group_ids(auth.uid()))
    OR EXISTS (SELECT 1 FROM public.family_groups fg WHERE fg.id = family_members.group_id AND fg.owner_id = auth.uid())
  );

-- Fix fridge_items policy
DROP POLICY IF EXISTS "Family members can view each others fridge items" ON public.fridge_items;
CREATE POLICY "Family members can view each others fridge items" ON public.fridge_items
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR user_id IN (SELECT public.get_family_member_ids(auth.uid()))
  );

-- Fix profiles policy
DROP POLICY IF EXISTS "Family members can view each other" ON public.profiles;
CREATE POLICY "Family members can view each other" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    user_id IN (SELECT public.get_family_member_ids(auth.uid()))
  );
