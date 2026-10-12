CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1. Paginated leaderboard (same ranking criteria, public profiles only)
CREATE OR REPLACE FUNCTION public.get_leaderboard_page(_period text DEFAULT 'all_time', _page integer DEFAULT 1, _page_size integer DEFAULT 20)
RETURNS TABLE(rank bigint, username text, full_name text, avatar_url text, views bigint, total_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH bounds AS (
    SELECT CASE lower(coalesce(_period, 'all_time'))
             WHEN 'monthly' THEN date_trunc('month', now())
             WHEN 'weekly'  THEN date_trunc('week', now())
             ELSE NULL::timestamptz END AS since
  ), ranked AS (
    SELECT ROW_NUMBER() OVER (ORDER BY COUNT(v.id) DESC, c.created_at ASC, c.id ASC) AS rank,
           c.username, c.full_name, c.avatar_url, COUNT(v.id) AS views
    FROM public.customers c
    CROSS JOIN bounds b
    LEFT JOIN public.profile_views v
      ON v.customer_id = c.id AND (b.since IS NULL OR v.created_at >= b.since)
    WHERE c.active = true AND c.visibility = 'public'
    GROUP BY c.id, c.username, c.full_name, c.avatar_url, c.created_at
  )
  SELECT r.rank, r.username, r.full_name, r.avatar_url, r.views, COUNT(*) OVER () AS total_count
  FROM ranked r
  ORDER BY r.rank
  OFFSET (GREATEST(coalesce(_page, 1), 1) - 1) * LEAST(GREATEST(coalesce(_page_size, 20), 1), 50)
  LIMIT LEAST(GREATEST(coalesce(_page_size, 20), 1), 50);
$$;
REVOKE ALL ON FUNCTION public.get_leaderboard_page(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_page(text, integer, integer) TO anon, authenticated;

-- 2. Admin step-up credential storage (server-only)
CREATE TABLE public.admin_credentials (
  user_id uuid PRIMARY KEY,
  username text NOT NULL,
  password_hash text NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX admin_credentials_username_key ON public.admin_credentials (lower(username));
GRANT ALL ON public.admin_credentials TO service_role;
ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  auth_session_id text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_sessions_lookup ON public.admin_sessions (user_id, auth_session_id);
GRANT ALL ON public.admin_sessions TO service_role;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.admin_security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  actor_id uuid,
  event text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_security_events TO service_role;
ALTER TABLE public.admin_security_events ENABLE ROW LEVEL SECURITY;

-- Owner identity: verified auth email only (never profile/user-editable fields)
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL
      AND lower(u.email) = 'oshegahstudio@gmail.com'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_admin_stepup()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_sessions s
    WHERE s.user_id = auth.uid()
      AND s.auth_session_id = coalesce(auth.jwt()->>'session_id', '')
      AND s.expires_at > now()
  );
$$;

-- Privileged operations now require the admin role AND a live step-up session
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role) AND public.has_admin_stepup();
$$;

-- Auto-grant now covers only the owner; other admins are managed by the owner
CREATE OR REPLACE FUNCTION public.grant_admin_for_authorized_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND lower(NEW.email) = 'oshegahstudio@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Owner can read the security log
GRANT SELECT ON public.admin_security_events TO authenticated;
CREATE POLICY "Owner reads security events" ON public.admin_security_events
  FOR SELECT TO authenticated USING (public.is_owner() AND public.is_admin());

-- No direct writes to roles through the API: only owner RPCs below
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public._admin_log(_user uuid, _event text, _detail jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $$
  INSERT INTO public.admin_security_events (user_id, actor_id, event, detail)
  VALUES (_user, auth.uid(), _event, coalesce(_detail, '{}'::jsonb));
$$;

CREATE OR REPLACE FUNCTION public._admin_open_session()
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _sid text := auth.jwt()->>'session_id'; _exp timestamptz := now() + interval '2 hours';
BEGIN
  IF _sid IS NULL OR _sid = '' THEN
    RAISE EXCEPTION 'NO_AUTH_SESSION' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.admin_sessions WHERE user_id = auth.uid();
  INSERT INTO public.admin_sessions (user_id, auth_session_id, expires_at) VALUES (auth.uid(), _sid, _exp);
  RETURN _exp;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_auth_status()
RETURNS TABLE(eligible boolean, configured boolean, verified boolean, owner boolean, username text, locked_until timestamptz, expires_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _elig boolean := public.has_role(auth.uid(), 'admin'::public.app_role);
BEGIN
  IF NOT _elig THEN
    RETURN QUERY SELECT false, false, false, false, NULL::text, NULL::timestamptz, NULL::timestamptz;
    RETURN;
  END IF;
  RETURN QUERY
  SELECT true,
         c.user_id IS NOT NULL,
         public.has_admin_stepup(),
         public.is_owner(),
         c.username,
         CASE WHEN c.locked_until > now() THEN c.locked_until END,
         (SELECT max(s.expires_at) FROM public.admin_sessions s
           WHERE s.user_id = auth.uid() AND s.auth_session_id = coalesce(auth.jwt()->>'session_id','') AND s.expires_at > now())
  FROM (SELECT 1) one
  LEFT JOIN public.admin_credentials c ON c.user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_setup_credentials(_username text, _password text)
RETURNS TABLE(ok boolean, error text, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
DECLARE _u text := lower(trim(coalesce(_username, ''))); _exp timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'NOT_ADMIN' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.admin_credentials WHERE user_id = auth.uid()) THEN
    RETURN QUERY SELECT false, 'ALREADY_CONFIGURED'::text, NULL::timestamptz; RETURN;
  END IF;
  IF _u !~ '^[a-z0-9._-]{3,32}$' THEN
    RETURN QUERY SELECT false, 'INVALID_USERNAME'::text, NULL::timestamptz; RETURN;
  END IF;
  IF length(coalesce(_password,'')) < 12 OR length(_password) > 128
     OR _password !~ '[a-z]' OR _password !~ '[A-Z]' OR _password !~ '[0-9]' OR _password !~ '[^A-Za-z0-9]' THEN
    RETURN QUERY SELECT false, 'WEAK_PASSWORD'::text, NULL::timestamptz; RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.admin_credentials WHERE lower(username) = _u) THEN
    RETURN QUERY SELECT false, 'USERNAME_TAKEN'::text, NULL::timestamptz; RETURN;
  END IF;
  INSERT INTO public.admin_credentials (user_id, username, password_hash)
  VALUES (auth.uid(), _u, extensions.crypt(_password, extensions.gen_salt('bf', 10)));
  PERFORM public._admin_log(auth.uid(), 'credentials_created', jsonb_build_object('username', _u));
  _exp := public._admin_open_session();
  RETURN QUERY SELECT true, NULL::text, _exp;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_login(_username text, _password text)
RETURNS TABLE(ok boolean, error text, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
DECLARE _c public.admin_credentials%ROWTYPE; _exp timestamptz; _fails int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'NOT_ADMIN' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO _c FROM public.admin_credentials WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'NOT_CONFIGURED'::text, NULL::timestamptz; RETURN;
  END IF;
  IF _c.locked_until IS NOT NULL AND _c.locked_until > now() THEN
    PERFORM public._admin_log(auth.uid(), 'login_blocked_locked');
    RETURN QUERY SELECT false, 'LOCKED'::text, _c.locked_until; RETURN;
  END IF;
  IF lower(trim(coalesce(_username,''))) = lower(_c.username)
     AND _c.password_hash = extensions.crypt(coalesce(_password,''), _c.password_hash) THEN
    UPDATE public.admin_credentials SET failed_attempts = 0, locked_until = NULL, updated_at = now() WHERE user_id = auth.uid();
    PERFORM public._admin_log(auth.uid(), 'login_success');
    _exp := public._admin_open_session();
    RETURN QUERY SELECT true, NULL::text, _exp; RETURN;
  END IF;
  _fails := _c.failed_attempts + 1;
  IF _fails >= 5 THEN
    UPDATE public.admin_credentials SET failed_attempts = 0, locked_until = now() + interval '15 minutes', updated_at = now() WHERE user_id = auth.uid();
    PERFORM public._admin_log(auth.uid(), 'login_failed_locked', jsonb_build_object('attempts', _fails));
    RETURN QUERY SELECT false, 'LOCKED'::text, now() + interval '15 minutes'; RETURN;
  END IF;
  UPDATE public.admin_credentials SET failed_attempts = _fails, updated_at = now() WHERE user_id = auth.uid();
  PERFORM public._admin_log(auth.uid(), 'login_failed', jsonb_build_object('attempts', _fails));
  RETURN QUERY SELECT false, 'INVALID_CREDENTIALS'::text, NULL::timestamptz;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_logout()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.admin_sessions WHERE user_id = auth.uid();
  PERFORM public._admin_log(auth.uid(), 'logout');
END;
$$;

-- Self reset: requires a fresh primary sign-in (within 10 minutes)
CREATE OR REPLACE FUNCTION public.admin_reset_own_credentials()
RETURNS TABLE(ok boolean, error text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _last bigint;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'NOT_ADMIN' USING ERRCODE = '42501';
  END IF;
  SELECT max((a->>'timestamp')::bigint) INTO _last
  FROM jsonb_array_elements(coalesce(auth.jwt()->'amr', '[]'::jsonb)) a;
  IF _last IS NULL OR _last < extract(epoch FROM now())::bigint - 600 THEN
    RETURN QUERY SELECT false, 'REAUTH_REQUIRED'::text; RETURN;
  END IF;
  DELETE FROM public.admin_sessions WHERE user_id = auth.uid();
  DELETE FROM public.admin_credentials WHERE user_id = auth.uid();
  PERFORM public._admin_log(auth.uid(), 'credentials_reset_self');
  RETURN QUERY SELECT true, NULL::text;
END;
$$;

-- 3. Owner-only admin management
CREATE OR REPLACE FUNCTION public.owner_list_admins()
RETURNS TABLE(user_id uuid, email text, full_name text, is_owner boolean, configured boolean, granted_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.is_owner() AND public.is_admin()) THEN
    RAISE EXCEPTION 'OWNER_ONLY' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT r.user_id, u.email::text, p.full_name,
         lower(u.email) = 'oshegahstudio@gmail.com',
         EXISTS (SELECT 1 FROM public.admin_credentials c WHERE c.user_id = r.user_id),
         r.created_at
  FROM public.user_roles r
  JOIN auth.users u ON u.id = r.user_id
  LEFT JOIN public.profiles p ON p.auth_user_id = r.user_id
  WHERE r.role = 'admin'::public.app_role
  ORDER BY r.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_grant_admin(_email text)
RETURNS TABLE(ok boolean, error text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _target uuid;
BEGIN
  IF NOT (public.is_owner() AND public.is_admin()) THEN
    RAISE EXCEPTION 'OWNER_ONLY' USING ERRCODE = '42501';
  END IF;
  SELECT u.id INTO _target FROM auth.users u
  WHERE lower(u.email) = lower(trim(coalesce(_email,''))) AND u.email_confirmed_at IS NOT NULL
  LIMIT 1;
  IF _target IS NULL THEN
    RETURN QUERY SELECT false, 'USER_NOT_FOUND'::text; RETURN;
  END IF;
  IF public.has_role(_target, 'admin'::public.app_role) THEN
    RETURN QUERY SELECT false, 'ALREADY_ADMIN'::text; RETURN;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_target, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  PERFORM public._admin_log(_target, 'admin_granted');
  RETURN QUERY SELECT true, NULL::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_revoke_admin(_user_id uuid)
RETURNS TABLE(ok boolean, error text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.is_owner() AND public.is_admin()) THEN
    RAISE EXCEPTION 'OWNER_ONLY' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users u WHERE u.id = _user_id AND lower(u.email) = 'oshegahstudio@gmail.com') THEN
    RETURN QUERY SELECT false, 'CANNOT_REMOVE_OWNER'::text; RETURN;
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'::public.app_role;
  DELETE FROM public.admin_sessions WHERE user_id = _user_id;
  DELETE FROM public.admin_credentials WHERE user_id = _user_id;
  PERFORM public._admin_log(_user_id, 'admin_revoked');
  RETURN QUERY SELECT true, NULL::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_reset_admin_credentials(_user_id uuid)
RETURNS TABLE(ok boolean, error text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.is_owner() AND public.is_admin()) THEN
    RAISE EXCEPTION 'OWNER_ONLY' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.admin_sessions WHERE user_id = _user_id;
  DELETE FROM public.admin_credentials WHERE user_id = _user_id;
  PERFORM public._admin_log(_user_id, 'credentials_reset_by_owner');
  RETURN QUERY SELECT true, NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION public._admin_log(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._admin_open_session() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_admin_stepup() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_admin_stepup() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_owner() TO authenticated;
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'admin_auth_status()', 'admin_setup_credentials(text, text)', 'admin_login(text, text)',
    'admin_logout()', 'admin_reset_own_credentials()', 'owner_list_admins()',
    'owner_grant_admin(text)', 'owner_revoke_admin(uuid)', 'owner_reset_admin_credentials(uuid)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', f);
  END LOOP;
END $$;