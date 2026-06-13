
-- 1. Restrict family_groups SELECT to owners and members only
DROP POLICY IF EXISTS "Authenticated can view groups" ON public.family_groups;

CREATE POLICY "Members and owners can view their groups"
ON public.family_groups
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR id IN (SELECT get_user_group_ids(auth.uid()))
);

-- 2. Create a secure function to join a group by invite code
CREATE OR REPLACE FUNCTION public.join_family_by_code(_invite_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _group_id uuid;
  _group_name text;
  _group_row jsonb;
BEGIN
  -- Look up the group by invite code
  SELECT id, name INTO _group_id, _group_name
  FROM public.family_groups
  WHERE invite_code = lower(trim(_invite_code));

  IF _group_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid invite code.');
  END IF;

  -- Check if already a member
  IF EXISTS (SELECT 1 FROM public.family_members WHERE group_id = _group_id AND user_id = auth.uid()) THEN
    RETURN jsonb_build_object('error', 'You are already a member of this group.');
  END IF;

  -- Insert membership
  INSERT INTO public.family_members (group_id, user_id) VALUES (_group_id, auth.uid());

  -- Return the group data
  SELECT jsonb_build_object(
    'id', fg.id,
    'name', fg.name,
    'owner_id', fg.owner_id,
    'invite_code', fg.invite_code
  ) INTO _group_row
  FROM public.family_groups fg
  WHERE fg.id = _group_id;

  RETURN _group_row;
END;
$$;

-- 3. Drop the UPDATE policy on profiles entirely - force RPC usage
DROP POLICY IF EXISTS "Users can update their own profile safe" ON public.profiles;
