-- 1. Save Contact toggle
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS show_save_contact boolean NOT NULL DEFAULT true;

-- 2. Profile type change tracking
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_profile_type_change_at timestamptz;

-- 3. Guard: account_type may only change through the switch function (or an admin)
CREATE OR REPLACE FUNCTION public.guard_profile_type_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.account_type IS DISTINCT FROM OLD.account_type THEN
    IF coalesce(current_setting('app.allow_profile_type_switch', true), '') <> 'on'
       AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Profile type can only be changed through switch_profile_type()'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_type ON public.profiles;
CREATE TRIGGER profiles_guard_type
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_type_change();

-- 4. Server-enforced 14-day cooldown switch
CREATE OR REPLACE FUNCTION public.switch_profile_type(_next public.account_type)
RETURNS TABLE(account_type public.account_type, last_profile_type_change_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.profiles%ROWTYPE;
  _next_allowed timestamptz;
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

  _next_allowed := _row.last_profile_type_change_at + interval '14 days';
  IF _row.last_profile_type_change_at IS NOT NULL AND now() < _next_allowed THEN
    RAISE EXCEPTION 'PROFILE_TYPE_LOCKED_UNTIL %', to_char(_next_allowed AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      USING ERRCODE = '42501';
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

-- 5. Publish the Save Contact flag on public profiles
DROP FUNCTION IF EXISTS public.get_public_profile(text);
CREATE FUNCTION public.get_public_profile(_username text)
RETURNS TABLE(
  id uuid, username text, full_name text, job_title text, bio text, avatar_url text,
  phone text, email text, location text, website text, verified boolean,
  theme public.profile_theme, primary_color text, text_color text, button_style text,
  active boolean, show_contact_button boolean, background_color text, muted_text_color text,
  button_shadow boolean, font_style text, show_save_contact boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.username, c.full_name, c.job_title, c.bio, c.avatar_url,
         c.phone, c.email, c.location, c.website, c.verified, c.theme,
         c.primary_color, c.text_color, c.button_style, c.active,
         c.show_contact_button, c.background_color, c.muted_text_color,
         c.button_shadow, c.font_style, c.show_save_contact
  FROM public.customers c
  WHERE c.active = true
    AND lower(c.username) = lower(trim(coalesce(_username, '')))
    AND length(trim(coalesce(_username, ''))) BETWEEN 1 AND 100
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated;

-- 6. Period leaderboard (all_time / monthly / weekly), unique views only
CREATE OR REPLACE FUNCTION public.get_leaderboard_period(_period text DEFAULT 'all_time', _limit integer DEFAULT 25)
RETURNS TABLE(rank bigint, username text, full_name text, avatar_url text, views bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT CASE lower(coalesce(_period, 'all_time'))
             WHEN 'monthly' THEN date_trunc('month', now())
             WHEN 'weekly'  THEN date_trunc('week', now())
             ELSE NULL::timestamptz
           END AS since
  )
  SELECT ROW_NUMBER() OVER (ORDER BY COUNT(v.id) DESC, c.created_at ASC) AS rank,
         c.username, c.full_name, c.avatar_url, COUNT(v.id) AS views
  FROM public.customers c
  CROSS JOIN bounds b
  LEFT JOIN public.profile_views v
    ON v.customer_id = c.id
   AND (b.since IS NULL OR v.created_at >= b.since)
  WHERE c.active = true
  GROUP BY c.id, c.username, c.full_name, c.avatar_url, c.created_at
  ORDER BY views DESC, c.created_at ASC
  LIMIT LEAST(GREATEST(coalesce(_limit, 25), 1), 100);
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard_period(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_period(text, integer) TO anon, authenticated;

-- internal helper: not directly callable by clients
REVOKE ALL ON FUNCTION public.guard_profile_type_change() FROM PUBLIC, anon, authenticated;