-- Ownership decided from the row's own columns, so it works for rows that are
-- being inserted in the current statement (RETURNING re-applies SELECT policies,
-- and a definer function cannot see the not-yet-committed row).
CREATE OR REPLACE FUNCTION public.owns_customer_row(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id AND p.auth_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.businesses b
    JOIN public.profiles bp ON bp.id = b.owner_id
    WHERE b.id = _business_id AND bp.auth_user_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.owns_customer_row(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_customer_row(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Owners view own profiles" ON public.customers;
DROP POLICY IF EXISTS "Owners update own profiles" ON public.customers;
DROP POLICY IF EXISTS "Owners delete own profiles" ON public.customers;
DROP POLICY IF EXISTS "Owners create profiles" ON public.customers;

CREATE POLICY "Owners view own profiles" ON public.customers
FOR SELECT TO authenticated
USING (public.owns_customer_row(user_id, business_id) OR public.is_admin());

CREATE POLICY "Owners create profiles" ON public.customers
FOR INSERT TO authenticated
WITH CHECK (public.owns_customer_row(user_id, business_id) OR public.is_admin());

CREATE POLICY "Owners update own profiles" ON public.customers
FOR UPDATE TO authenticated
USING (public.owns_customer_row(user_id, business_id) OR public.is_admin())
WITH CHECK (public.owns_customer_row(user_id, business_id) OR public.is_admin());

CREATE POLICY "Owners delete own profiles" ON public.customers
FOR DELETE TO authenticated
USING (public.owns_customer_row(user_id, business_id) OR public.is_admin());
