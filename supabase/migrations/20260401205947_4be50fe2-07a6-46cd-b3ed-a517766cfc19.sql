
CREATE TABLE public.purchased_coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  coupon_id TEXT NOT NULL,
  coupon_name TEXT NOT NULL,
  coupon_description TEXT NOT NULL,
  coupon_icon TEXT NOT NULL DEFAULT '🎫',
  coupon_cost INTEGER NOT NULL,
  coupon_category TEXT NOT NULL DEFAULT 'Groceries',
  qr_code TEXT NOT NULL DEFAULT substr(md5(random()::text || now()::text), 1, 16),
  status TEXT NOT NULL DEFAULT 'active',
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.purchased_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coupons" ON public.purchased_coupons FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Family can view coupons" ON public.purchased_coupons FOR SELECT TO authenticated USING (user_id IN (SELECT get_family_member_ids(auth.uid())));
CREATE POLICY "Users can insert own coupons" ON public.purchased_coupons FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own coupons" ON public.purchased_coupons FOR UPDATE TO authenticated USING (auth.uid() = user_id);
