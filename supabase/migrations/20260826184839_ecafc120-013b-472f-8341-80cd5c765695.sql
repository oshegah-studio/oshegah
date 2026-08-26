
-- Lock down SECURITY DEFINER helper functions
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_active_customer(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.owns_business(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.owns_customer(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- Intentionally public API surface
REVOKE ALL ON FUNCTION public.get_public_profile(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_leaderboard(integer, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_profile_view(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_profile_view(uuid, uuid) TO anon, authenticated;

-- Storage: no blanket read of profile images
DROP POLICY IF EXISTS "Profile images are readable" ON storage.objects;
CREATE POLICY "Users read own profile images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'profile-images' AND (storage.foldername(name))[1] = (auth.uid())::text);
