
DROP VIEW IF EXISTS public.family_profiles;
CREATE VIEW public.family_profiles WITH (security_invoker = true) AS
SELECT user_id, display_name, email
FROM public.profiles;
