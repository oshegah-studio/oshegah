CREATE OR REPLACE FUNCTION public.submit_card_request(_customer_id uuid,_key uuid,_payload jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.customers%ROWTYPE; r uuid; cfg jsonb; q integer; phone text; k text; val text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE='42501'; END IF;
 IF _key IS NULL OR _payload IS NULL OR jsonb_typeof(_payload)<>'object' THEN RAISE EXCEPTION 'INVALID_REQUEST'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text||_key::text,0));
 SELECT id INTO r FROM public.card_requests WHERE user_id=auth.uid() AND idempotency_key=_key;
 IF r IS NOT NULL THEN RETURN r; END IF;
 SELECT * INTO c FROM public.customers WHERE id=_customer_id;
 IF NOT FOUND OR NOT public.owns_customer(_customer_id) THEN RAISE EXCEPTION 'PROFILE_REQUIRED' USING ERRCODE='42501'; END IF;
 IF NOT c.active OR length(trim(c.full_name)) NOT BETWEEN 1 AND 100 OR c.username !~ '^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$' THEN RAISE EXCEPTION 'PROFILE_INCOMPLETE'; END IF;
 cfg:=public.card_request_config();
 IF coalesce(_payload->>'quantity','') !~ '^[1-5]$' THEN RAISE EXCEPTION 'QUANTITY_INVALID'; END IF;
 q:=(_payload->>'quantity')::integer;
 IF q<1 OR q>(cfg->>'max_quantity')::integer THEN RAISE EXCEPTION 'QUANTITY_INVALID'; END IF;
 IF (_payload->>'consent') IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'CONSENT_REQUIRED'; END IF;
 FOR k IN SELECT unnest(ARRAY['full_name','phone','contact_method','governorate','city','address']) LOOP
  val:=trim(coalesce(_payload->>k,''));
  IF length(val)<1 OR length(val)>(CASE WHEN k='address' THEN 500 ELSE 100 END) OR val ~ '[[:cntrl:]]' THEN RAISE EXCEPTION 'INVALID_FIELD: %',k; END IF;
 END LOOP;
 IF _payload->>'contact_method' NOT IN ('phone','whatsapp','email') THEN RAISE EXCEPTION 'CONTACT_METHOD_INVALID'; END IF;
 phone:=regexp_replace(trim(_payload->>'phone'),'[ ()-]','','g');
 IF phone ~ '^01[0125][0-9]{8}$' THEN phone:='+20'||substring(phone FROM 2); ELSIF phone ~ '^201[0125][0-9]{8}$' THEN phone:='+'||phone; ELSIF phone ~ '^00201[0125][0-9]{8}$' THEN phone:='+'||substring(phone FROM 3); END IF;
 IF phone !~ '^\+201[0125][0-9]{8}$' THEN RAISE EXCEPTION 'PHONE_INVALID'; END IF;
 IF length(coalesce(_payload->>'email',''))>254 OR (coalesce(_payload->>'email','')<>'' AND _payload->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') THEN RAISE EXCEPTION 'EMAIL_INVALID'; END IF;
 IF _payload->>'contact_method'='email' AND coalesce(_payload->>'email','')='' THEN RAISE EXCEPTION 'EMAIL_REQUIRED'; END IF;
 IF length(coalesce(_payload->>'instructions',''))>500 OR length(coalesce(_payload->>'notes',''))>1000 THEN RAISE EXCEPTION 'NOTES_TOO_LONG'; END IF;
 IF coalesce(_payload->>'country','EG')<>'EG' THEN RAISE EXCEPTION 'EGYPT_ONLY'; END IF;
 INSERT INTO public.card_requests(user_id,customer_id,idempotency_key,profile_snapshot,contact,delivery,quantity,unit_price,subtotal,customer_notes)
 VALUES(auth.uid(),c.id,_key,jsonb_build_object('id',c.id,'username',c.username,'full_name',c.full_name,'avatar_url',c.avatar_url),jsonb_build_object('full_name',trim(_payload->>'full_name'),'phone',phone,'contact_method',_payload->>'contact_method','email',trim(coalesce(_payload->>'email',''))),jsonb_build_object('country','EG','governorate',trim(_payload->>'governorate'),'city',trim(_payload->>'city'),'address',trim(_payload->>'address'),'instructions',trim(coalesce(_payload->>'instructions',''))),q,(cfg->>'unit_price')::numeric,q*(cfg->>'unit_price')::numeric,trim(coalesce(_payload->>'notes',''))) RETURNING id INTO r;
 INSERT INTO public.card_request_history(request_id,new_status,changed_by,actor_label) VALUES(r,'submitted',auth.uid(),'Customer');
 RETURN r;
END; $$;
REVOKE ALL ON FUNCTION public.submit_card_request(uuid,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_card_request(uuid,uuid,jsonb) TO authenticated,service_role;