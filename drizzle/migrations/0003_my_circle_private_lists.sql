CREATE TABLE public.circle_entries (
 user_id uuid NOT NULL,
 customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
 saved_at timestamptz,
 viewed_at timestamptz,
 PRIMARY KEY (user_id, customer_id)
);
GRANT SELECT, DELETE ON public.circle_entries TO authenticated;
GRANT ALL ON public.circle_entries TO service_role;
ALTER TABLE public.circle_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own circle" ON public.circle_entries FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Delete own circle" ON public.circle_entries FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX circle_recent_idx ON public.circle_entries(user_id, viewed_at DESC) WHERE viewed_at IS NOT NULL;
CREATE INDEX circle_saved_idx ON public.circle_entries(user_id, saved_at DESC) WHERE saved_at IS NOT NULL;
CREATE OR REPLACE FUNCTION public.update_circle(_customer_id uuid, _action text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
 IF _uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE='42501'; END IF;
 IF _action = 'clear_history' THEN
  UPDATE public.circle_entries SET viewed_at = NULL WHERE user_id = _uid;
 ELSIF _action IN ('unsave', 'remove_history') THEN
  UPDATE public.circle_entries SET saved_at = CASE WHEN _action='unsave' THEN NULL ELSE saved_at END,
   viewed_at = CASE WHEN _action='remove_history' THEN NULL ELSE viewed_at END
  WHERE user_id=_uid AND customer_id=_customer_id;
 ELSIF _action IN ('save','view') THEN
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id=_customer_id AND active=true) THEN
   RAISE EXCEPTION 'PROFILE_UNAVAILABLE' USING ERRCODE='22023';
  END IF;
  IF public.owns_customer(_customer_id) THEN RAISE EXCEPTION 'OWN_PROFILE' USING ERRCODE='42501'; END IF;
  INSERT INTO public.circle_entries(user_id, customer_id, saved_at, viewed_at)
   VALUES (_uid, _customer_id, CASE WHEN _action='save' THEN now() END, CASE WHEN _action='view' THEN now() END)
  ON CONFLICT (user_id, customer_id) DO UPDATE SET
   saved_at = CASE WHEN _action='save' THEN coalesce(circle_entries.saved_at,now()) ELSE circle_entries.saved_at END,
   viewed_at = CASE WHEN _action='view' AND (circle_entries.viewed_at IS NULL OR circle_entries.viewed_at < now()-interval '30 seconds') THEN now() ELSE circle_entries.viewed_at END;
 ELSE RAISE EXCEPTION 'INVALID_ACTION' USING ERRCODE='22023';
 END IF;
 DELETE FROM public.circle_entries WHERE user_id=_uid AND saved_at IS NULL AND viewed_at IS NULL;
END; $$;
REVOKE ALL ON FUNCTION public.update_circle(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_circle(uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.get_circle_entries()
RETURNS TABLE(customer_id uuid, username text, full_name text, avatar_url text, saved_at timestamptz, viewed_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT c.id,c.username,c.full_name,c.avatar_url,e.saved_at,e.viewed_at
 FROM public.circle_entries e JOIN public.customers c ON c.id=e.customer_id
 WHERE e.user_id=auth.uid() AND c.active=true AND NOT public.owns_customer(c.id)
 ORDER BY greatest(e.viewed_at,e.saved_at) DESC,c.id;
$$;
REVOKE ALL ON FUNCTION public.get_circle_entries() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_circle_entries() TO authenticated;