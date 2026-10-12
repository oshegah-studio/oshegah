ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';
ALTER TABLE public.customers ADD CONSTRAINT customers_visibility_check CHECK (visibility IN ('public','private'));
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS surface_color text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS surface_border_color text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS overlay_color text;

ALTER TYPE public.link_type ADD VALUE IF NOT EXISTS 'menu';
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS file_path text;
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS file_mime text;

CREATE OR REPLACE FUNCTION public.get_leaderboard(_limit integer DEFAULT 25, _since timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(rank bigint, username text, full_name text, avatar_url text, views bigint)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT ROW_NUMBER() OVER (ORDER BY COUNT(v.id) DESC, c.created_at ASC) AS rank,
         c.username, c.full_name, c.avatar_url, COUNT(v.id) AS views
  FROM public.customers c
  LEFT JOIN public.profile_views v
    ON v.customer_id = c.id AND (_since IS NULL OR v.created_at >= _since)
  WHERE c.active = true AND c.visibility = 'public'
  GROUP BY c.id, c.username, c.full_name, c.avatar_url, c.created_at
  ORDER BY views DESC, c.created_at ASC
  LIMIT LEAST(GREATEST(coalesce(_limit, 25), 1), 100);
$function$;

CREATE OR REPLACE FUNCTION public.get_leaderboard_period(_period text DEFAULT 'all_time'::text, _limit integer DEFAULT 25)
 RETURNS TABLE(rank bigint, username text, full_name text, avatar_url text, views bigint)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH bounds AS (
    SELECT CASE lower(coalesce(_period, 'all_time'))
             WHEN 'monthly' THEN date_trunc('month', now())
             WHEN 'weekly'  THEN date_trunc('week', now())
             ELSE NULL::timestamptz END AS since
  )
  SELECT ROW_NUMBER() OVER (ORDER BY COUNT(v.id) DESC, c.created_at ASC) AS rank,
         c.username, c.full_name, c.avatar_url, COUNT(v.id) AS views
  FROM public.customers c
  CROSS JOIN bounds b
  LEFT JOIN public.profile_views v
    ON v.customer_id = c.id AND (b.since IS NULL OR v.created_at >= b.since)
  WHERE c.active = true AND c.visibility = 'public'
  GROUP BY c.id, c.username, c.full_name, c.avatar_url, c.created_at
  ORDER BY views DESC, c.created_at ASC
  LIMIT LEAST(GREATEST(coalesce(_limit, 25), 1), 100);
$function$;

DROP FUNCTION IF EXISTS public.get_public_profile(text);
CREATE FUNCTION public.get_public_profile(_username text)
 RETURNS TABLE(id uuid, username text, full_name text, job_title text, bio text, avatar_url text, phone text, email text, location text, website text, verified boolean, theme profile_theme, primary_color text, text_color text, button_style text, active boolean, show_contact_button boolean, background_color text, muted_text_color text, button_shadow boolean, font_style text, show_save_contact boolean, background_image_url text, surface_color text, surface_border_color text, overlay_color text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT c.id, c.username, c.full_name, c.job_title, c.bio, c.avatar_url,
         c.phone, c.email, c.location, c.website, c.verified, c.theme,
         c.primary_color, c.text_color, c.button_style, c.active,
         c.show_contact_button, c.background_color, c.muted_text_color,
         c.button_shadow, c.font_style, c.show_save_contact, c.background_image_url,
         c.surface_color, c.surface_border_color, c.overlay_color
  FROM public.customers c
  WHERE c.active = true
    AND lower(c.username) = lower(trim(coalesce(_username, '')))
    AND length(trim(coalesce(_username, ''))) BETWEEN 1 AND 100
  LIMIT 1;
$function$;
GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated;

CREATE POLICY "Users upload own menus" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'profile-menus' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users read own menus" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'profile-menus' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own menus" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'profile-menus' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'profile-menus' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own menus" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'profile-menus' AND (storage.foldername(name))[1] = auth.uid()::text);