CREATE TABLE public.username_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  username text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX username_history_username_key ON public.username_history (lower(username));
CREATE INDEX username_history_customer_idx ON public.username_history (customer_id);

GRANT SELECT ON public.username_history TO authenticated;
GRANT ALL ON public.username_history TO service_role;
ALTER TABLE public.username_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view own username history" ON public.username_history
  FOR SELECT TO authenticated USING (public.owns_customer(customer_id) OR public.is_admin());

-- Reserve old usernames: nobody else may claim them.
CREATE OR REPLACE FUNCTION public.guard_username_conflict()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND lower(NEW.username) = lower(OLD.username) THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.username_history h
    WHERE lower(h.username) = lower(NEW.username) AND h.customer_id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'USERNAME_RESERVED' USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER customers_guard_username
BEFORE INSERT OR UPDATE OF username ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.guard_username_conflict();

-- Record the previous username on every change.
CREATE OR REPLACE FUNCTION public.record_username_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF lower(NEW.username) IS DISTINCT FROM lower(OLD.username) THEN
    DELETE FROM public.username_history h
      WHERE lower(h.username) = lower(NEW.username) AND h.customer_id = NEW.id;
    INSERT INTO public.username_history (customer_id, username)
    VALUES (NEW.id, OLD.username)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER customers_record_username_change
AFTER UPDATE OF username ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.record_username_change();

-- Permanent card identity → current username.
CREATE OR REPLACE FUNCTION public.get_username_by_card(_customer_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.username FROM public.customers c
  WHERE c.id = _customer_id AND c.active = true
  LIMIT 1;
$$;

-- Old username → current username.
CREATE OR REPLACE FUNCTION public.resolve_username(_username text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.username
  FROM public.username_history h
  JOIN public.customers c ON c.id = h.customer_id
  WHERE lower(h.username) = lower(trim(coalesce(_username, '')))
    AND length(trim(coalesce(_username, ''))) BETWEEN 1 AND 100
    AND c.active = true
  ORDER BY h.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_username_by_card(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_username(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_username_by_card(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_username(text) TO anon, authenticated;