
CREATE POLICY "Family members can view each others fridge items"
ON public.fridge_items
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM family_members fm1
    JOIN family_members fm2 ON fm1.group_id = fm2.group_id
    WHERE fm1.user_id = auth.uid()
      AND fm2.user_id = fridge_items.user_id
  )
);

DROP POLICY IF EXISTS "Users can view their own fridge items" ON public.fridge_items;
