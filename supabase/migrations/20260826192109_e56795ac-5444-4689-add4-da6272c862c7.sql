-- Policies are evaluated as the calling role, so the roles referenced in RLS
-- policies need EXECUTE on the helper functions those policies call.

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_customer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_business(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_customer(uuid) TO anon, authenticated;

-- has_role stays internal (callable only by definer-owned functions / service_role)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
