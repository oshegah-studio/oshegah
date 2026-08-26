
-- 1) helper: is a customer card published (definer so anon policies don't need direct read on customers)
CREATE OR REPLACE FUNCTION public.is_active_customer(_customer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.customers c WHERE c.id = _customer_id AND c.active = true);
$$;

REVOKE ALL ON FUNCTION public.is_active_customer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_customer(uuid) TO anon, authenticated, service_role;

-- 2) remove blanket public read of customers (all columns incl. email/phone)
DROP POLICY IF EXISTS "Anyone can view active profiles" ON public.customers;
REVOKE SELECT ON public.customers FROM anon;

-- 3) rewrite public policies that depended on reading customers
DROP POLICY IF EXISTS "Anyone can view enabled links of active profiles" ON public.links;
CREATE POLICY "Anyone can view enabled links of active profiles"
ON public.links FOR SELECT TO anon, authenticated
USING (enabled = true AND public.is_active_customer(customer_id));

DROP POLICY IF EXISTS "Anyone can record a view" ON public.profile_views;
CREATE POLICY "Anyone can record a view"
ON public.profile_views FOR INSERT TO anon, authenticated
WITH CHECK (public.is_active_customer(customer_id));

DROP POLICY IF EXISTS "Anyone can record a click" ON public.link_clicks;
CREATE POLICY "Anyone can record a click"
ON public.link_clicks FOR INSERT TO anon, authenticated
WITH CHECK (public.is_active_customer(customer_id));

-- 4) single-card public lookup by username (no bulk enumeration)
CREATE OR REPLACE FUNCTION public.get_public_profile(_username text)
RETURNS TABLE (
  id uuid,
  username text,
  full_name text,
  job_title text,
  bio text,
  avatar_url text,
  phone text,
  email text,
  location text,
  website text,
  verified boolean,
  theme profile_theme,
  primary_color text,
  text_color text,
  button_style text,
  active boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.id, c.username, c.full_name, c.job_title, c.bio, c.avatar_url,
         c.phone, c.email, c.location, c.website, c.verified, c.theme,
         c.primary_color, c.text_color, c.button_style, c.active
  FROM public.customers c
  WHERE c.active = true
    AND lower(c.username) = lower(trim(coalesce(_username, '')))
    AND length(trim(coalesce(_username, ''))) BETWEEN 1 AND 100
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated, service_role;

-- 5) internal role helper must not be directly callable by signed-in users
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
