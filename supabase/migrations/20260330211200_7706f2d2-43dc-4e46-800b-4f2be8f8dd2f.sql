
-- Create a security definer function to check if two users share a family group
CREATE OR REPLACE FUNCTION public.is_family_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM family_members fm1
    JOIN family_members fm2 ON fm1.group_id = fm2.group_id
    WHERE fm1.user_id = auth.uid()
      AND fm2.user_id = _user_id
  )
$$;

-- Create a security definer function to check if user is member of a group
CREATE OR REPLACE FUNCTION public.is_member_of_group(_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM family_members
    WHERE group_id = _group_id
      AND user_id = auth.uid()
  )
$$;

-- Create a security definer function to check if user owns a group
CREATE OR REPLACE FUNCTION public.is_group_owner(_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM family_groups
    WHERE id = _group_id
      AND owner_id = auth.uid()
  )
$$;

-- Revoke public access, grant to authenticated only
REVOKE EXECUTE ON FUNCTION public.is_family_member FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_family_member TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_member_of_group FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_member_of_group TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_group_owner FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_group_owner TO authenticated;

-- Drop old recursive policies on family_members
DROP POLICY IF EXISTS "Members can view group members" ON public.family_members;
DROP POLICY IF EXISTS "Owner or self can remove members" ON public.family_members;

-- Recreate with security definer functions
CREATE POLICY "Members can view group members"
ON public.family_members FOR SELECT
TO authenticated
USING (
  public.is_member_of_group(group_id)
  OR public.is_group_owner(group_id)
);

CREATE POLICY "Owner or self can remove members"
ON public.family_members FOR DELETE
TO authenticated
USING (
  public.is_group_owner(group_id)
  OR user_id = auth.uid()
);

-- Drop old recursive policy on profiles
DROP POLICY IF EXISTS "Family members can view each other" ON public.profiles;

-- Recreate with security definer function
CREATE POLICY "Family members can view each other"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_family_member(user_id));
