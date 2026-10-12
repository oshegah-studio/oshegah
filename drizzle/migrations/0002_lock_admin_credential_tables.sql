REVOKE ALL ON public.admin_credentials, public.admin_sessions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.admin_security_events FROM anon, authenticated;