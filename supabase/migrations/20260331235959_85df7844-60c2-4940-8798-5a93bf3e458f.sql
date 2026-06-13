
-- User tokens table
CREATE TABLE public.user_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  total_tokens integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tokens" ON public.user_tokens
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tokens" ON public.user_tokens
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tokens" ON public.user_tokens
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Used recipes table
CREATE TABLE public.used_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipe_title text NOT NULL,
  tokens_earned integer NOT NULL DEFAULT 0,
  used_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, recipe_title)
);

ALTER TABLE public.used_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own used recipes" ON public.used_recipes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own used recipes" ON public.used_recipes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Enable realtime for fridge_items
ALTER PUBLICATION supabase_realtime ADD TABLE public.fridge_items;
