CREATE UNIQUE INDEX IF NOT EXISTS profile_views_customer_visitor_uniq
  ON public.profile_views (customer_id, visitor_id)
  WHERE visitor_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_profile_view(_customer_id uuid, _visitor_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _customer_id IS NULL OR _visitor_id IS NULL THEN
    RETURN;
  END IF;
  IF NOT public.is_active_customer(_customer_id) THEN
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.profile_views
    WHERE customer_id = _customer_id AND visitor_id = _visitor_id
  ) THEN
    RETURN;
  END IF;
  INSERT INTO public.profile_views (customer_id, visitor_id)
  VALUES (_customer_id, _visitor_id)
  ON CONFLICT DO NOTHING;
END;
$$;