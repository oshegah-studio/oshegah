-- 1. Customer settings
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS show_contact_button boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS background_color text,
  ADD COLUMN IF NOT EXISTS muted_text_color text,
  ADD COLUMN IF NOT EXISTS button_shadow boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS font_style text NOT NULL DEFAULT 'default';

-- 2. Unique visitor tracking
ALTER TABLE public.profile_views
  ADD COLUMN IF NOT EXISTS visitor_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS profile_views_customer_visitor_uidx
  ON public.profile_views (customer_id, visitor_id)
  WHERE visitor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS profile_views_customer_created_idx
  ON public.profile_views (customer_id, created_at DESC);

-- Clients may no longer insert views directly
DROP POLICY IF EXISTS "Anyone can record a view" ON public.profile_views;
REVOKE INSERT ON public.profile_views FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_profile_view(_customer_id uuid, _visitor_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _customer_id IS NULL OR _visitor_id IS NULL THEN
    RETURN;
  END IF;
  IF NOT public.is_active_customer(_customer_id) THEN
    RETURN;
  END IF;
  INSERT INTO public.profile_views (customer_id, visitor_id)
  VALUES (_customer_id, _visitor_id)
  ON CONFLICT (customer_id, visitor_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.record_profile_view(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_profile_view(uuid, uuid) TO anon, authenticated, service_role;

-- 3. Public profile RPC now exposes the new appearance/contact settings
DROP FUNCTION IF EXISTS public.get_public_profile(text);
CREATE FUNCTION public.get_public_profile(_username text)
RETURNS TABLE(
  id uuid, username text, full_name text, job_title text, bio text, avatar_url text,
  phone text, email text, location text, website text, verified boolean,
  theme profile_theme, primary_color text, text_color text, button_style text, active boolean,
  show_contact_button boolean, background_color text, muted_text_color text,
  button_shadow boolean, font_style text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.id, c.username, c.full_name, c.job_title, c.bio, c.avatar_url,
         c.phone, c.email, c.location, c.website, c.verified, c.theme,
         c.primary_color, c.text_color, c.button_style, c.active,
         c.show_contact_button, c.background_color, c.muted_text_color,
         c.button_shadow, c.font_style
  FROM public.customers c
  WHERE c.active = true
    AND lower(c.username) = lower(trim(coalesce(_username, '')))
    AND length(trim(coalesce(_username, ''))) BETWEEN 1 AND 100
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated, service_role;

-- 4. Public leaderboard (all-time; period arg reserved for future ranges)
CREATE OR REPLACE FUNCTION public.get_leaderboard(_limit integer DEFAULT 25, _since timestamptz DEFAULT NULL)
RETURNS TABLE(
  rank bigint, username text, full_name text, avatar_url text, views bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ROW_NUMBER() OVER (ORDER BY COUNT(v.id) DESC, c.created_at ASC) AS rank,
         c.username, c.full_name, c.avatar_url, COUNT(v.id) AS views
  FROM public.customers c
  LEFT JOIN public.profile_views v
    ON v.customer_id = c.id
   AND (_since IS NULL OR v.created_at >= _since)
  WHERE c.active = true
  GROUP BY c.id, c.username, c.full_name, c.avatar_url, c.created_at
  ORDER BY views DESC, c.created_at ASC
  LIMIT LEAST(GREATEST(coalesce(_limit, 25), 1), 100);
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard(integer, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer, timestamptz) TO anon, authenticated, service_role;