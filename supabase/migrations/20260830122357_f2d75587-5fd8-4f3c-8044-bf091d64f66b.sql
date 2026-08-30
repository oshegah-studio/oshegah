CREATE OR REPLACE FUNCTION public.guard_username_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF lower(NEW.username) IS DISTINCT FROM lower(OLD.username) OR NEW.username IS DISTINCT FROM OLD.username THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'USERNAME_IMMUTABLE' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customers_username_immutable ON public.customers;
CREATE TRIGGER customers_username_immutable
BEFORE UPDATE OF username ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.guard_username_immutable();

REVOKE ALL ON FUNCTION public.guard_username_immutable() FROM PUBLIC, anon, authenticated;