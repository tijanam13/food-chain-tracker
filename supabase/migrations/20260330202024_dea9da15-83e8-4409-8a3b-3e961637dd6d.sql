
-- Create fridge_items table
CREATE TABLE public.fridge_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  expiry_date DATE,
  gtin_code TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'in_fridge',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fridge_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for fridge_items
CREATE POLICY "Users can view own fridge items" ON public.fridge_items
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fridge items" ON public.fridge_items
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fridge items" ON public.fridge_items
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own fridge items" ON public.fridge_items
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create shopping_list table
CREATE TABLE public.shopping_list (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  is_bought BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shopping_list ENABLE ROW LEVEL SECURITY;

-- RLS policies for shopping_list
CREATE POLICY "Users can view own shopping list" ON public.shopping_list
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shopping items" ON public.shopping_list
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shopping items" ON public.shopping_list
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shopping items" ON public.shopping_list
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
