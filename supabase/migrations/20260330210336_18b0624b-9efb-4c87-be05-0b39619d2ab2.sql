ALTER TABLE public.fridge_items ADD COLUMN unit text NOT NULL DEFAULT 'pcs';
ALTER TABLE public.fridge_items ALTER COLUMN quantity TYPE double precision USING quantity::double precision;