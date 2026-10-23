REVOKE ALL ON public.card_requests FROM anon,authenticated;
GRANT SELECT ON public.card_requests TO authenticated;
GRANT ALL ON public.card_requests TO service_role;
REVOKE ALL ON public.card_request_history FROM anon,authenticated;
GRANT SELECT ON public.card_request_history TO authenticated;
GRANT ALL ON public.card_request_history TO service_role;
REVOKE ALL ON SEQUENCE public.card_requests_request_number_seq FROM anon,authenticated;
GRANT USAGE,SELECT ON SEQUENCE public.card_requests_request_number_seq TO service_role;