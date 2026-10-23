REVOKE ALL ON public.card_delivery_settings FROM anon,authenticated;
GRANT SELECT ON public.card_delivery_settings TO authenticated;
GRANT ALL ON public.card_delivery_settings TO service_role;
REVOKE ALL ON public.card_settings_history FROM anon,authenticated;
GRANT SELECT ON public.card_settings_history TO authenticated;
GRANT ALL ON public.card_settings_history TO service_role;