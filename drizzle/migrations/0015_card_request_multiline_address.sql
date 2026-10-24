DO $migration$
DECLARE definition text; original text := 'OR val ~ ''[[:cntrl:]]'''; replacement text := 'OR (CASE WHEN k=''address'' THEN translate(val,E''\n\r\t'','''') ELSE val END) ~ ''[[:cntrl:]]''';
BEGIN
 SELECT pg_get_functiondef('public.submit_card_request(uuid,uuid,jsonb)'::regprocedure) INTO definition;
 IF position(original IN definition)=0 THEN RAISE EXCEPTION 'Expected card request field validation was not found'; END IF;
 EXECUTE replace(definition,original,replacement);
END;
$migration$;
COMMENT ON FUNCTION public.submit_card_request(uuid,uuid,jsonb) IS 'Authenticated, owned-profile card submission with server-priced snapshots and idempotency; delivery addresses allow line breaks and tabs while unsafe control characters remain rejected.';