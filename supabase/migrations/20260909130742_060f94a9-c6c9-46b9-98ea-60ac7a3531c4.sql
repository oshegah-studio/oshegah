-- 1. Remove the 14-day cooldown from profile type switching
CREATE OR REPLACE FUNCTION public.switch_profile_type(_next public.account_type)
RETURNS TABLE(account_type public.account_type, last_profile_type_change_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.profiles%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _row FROM public.profiles p WHERE p.auth_user_id = _uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
  END IF;

  IF _row.account_type = _next THEN
    RETURN QUERY SELECT _row.account_type, _row.last_profile_type_change_at;
    RETURN;
  END IF;

  PERFORM set_config('app.allow_profile_type_switch', 'on', true);
  UPDATE public.profiles p
     SET account_type = _next,
         last_profile_type_change_at = now()
   WHERE p.id = _row.id
   RETURNING p.account_type, p.last_profile_type_change_at
   INTO account_type, last_profile_type_change_at;
  PERFORM set_config('app.allow_profile_type_switch', 'off', true);

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.switch_profile_type(public.account_type) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.switch_profile_type(public.account_type) TO authenticated;

-- 2. Custom background photo for the public profile
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS background_image_url text;

-- 3. Publish it on the public profile RPC
DROP FUNCTION IF EXISTS public.get_public_profile(text);
CREATE FUNCTION public.get_public_profile(_username text)
RETURNS TABLE(
  id uuid, username text, full_name text, job_title text, bio text, avatar_url text,
  phone text, email text, location text, website text, verified boolean,
  theme public.profile_theme, primary_color text, text_color text, button_style text,
  active boolean, show_contact_button boolean, background_color text, muted_text_color text,
  button_shadow boolean, font_style text, show_save_contact boolean, background_image_url text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.username, c.full_name, c.job_title, c.bio, c.avatar_url,
         c.phone, c.email, c.location, c.website, c.verified, c.theme,
         c.primary_color, c.text_color, c.button_style, c.active,
         c.show_contact_button, c.background_color, c.muted_text_color,
         c.button_shadow, c.font_style, c.show_save_contact, c.background_image_url
  FROM public.customers c
  WHERE c.active = true
    AND lower(c.username) = lower(trim(coalesce(_username, '')))
    AND length(trim(coalesce(_username, ''))) BETWEEN 1 AND 100
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated;