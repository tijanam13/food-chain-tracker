
CREATE TABLE public.fridge_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  expiry_date date,
  gtin_code text,
  quantity numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'pcs',
  status text NOT NULL DEFAULT 'in_fridge',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.fridge_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own fridge items"
  ON public.fridge_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fridge items"
  ON public.fridge_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fridge items"
  ON public.fridge_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fridge items"
  ON public.fridge_items FOR DELETE
  USING (auth.uid() = user_id);
