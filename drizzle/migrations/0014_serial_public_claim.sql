CREATE OR REPLACE FUNCTION public.resolve_serial(_serial text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
 SELECT CASE
  WHEN s.id IS NULL THEN jsonb_build_object('state','unknown')
  WHEN s.activation_status='revoked' THEN jsonb_build_object('state','revoked','serial',s.serial)
  WHEN s.assignment_status='unassigned' THEN jsonb_build_object('state','unassigned','serial',s.serial,'self_activation',coalesce((SELECT self_activation FROM public.serial_settings WHERE id),false))
  WHEN s.activation_status='active' AND c.id IS NOT NULL AND c.active AND public._serial_profile_ok(s.owner_user_id,c.id) THEN jsonb_build_object('state','active','serial',s.serial,'username',c.username)
  WHEN s.owner_user_id=auth.uid() AND s.activation_status='inactive' THEN jsonb_build_object('state','pending','serial',s.serial,'mine',true)
  WHEN s.activation_status='active' THEN jsonb_build_object('state','unlinked','serial',s.serial,'mine',s.owner_user_id=auth.uid())
  ELSE jsonb_build_object('state','inactive','serial',s.serial) END
 FROM (SELECT 1) one
 LEFT JOIN public.serial_cards s ON s.serial=upper(trim(coalesce(_serial,''))) AND length(trim(coalesce(_serial,'')))<=20
 LEFT JOIN public.customers c ON c.id=s.customer_id;
$$;

CREATE OR REPLACE FUNCTION public.claim_serial(_serial text, _customer uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r public.serial_cards%ROWTYPE; self_ok boolean; nxt text; uname text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.serial_cards WHERE serial=upper(trim(coalesce(_serial,''))) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'SERIAL_NOT_FOUND'; END IF;
 IF r.activation_status='revoked' THEN RAISE EXCEPTION 'SERIAL_REVOKED'; END IF;
 IF r.assignment_status<>'unassigned' OR r.owner_user_id IS NOT NULL THEN RAISE EXCEPTION 'SERIAL_ALREADY_ASSIGNED'; END IF;
 IF _customer IS NULL OR NOT public._serial_profile_ok(auth.uid(),_customer) THEN RAISE EXCEPTION 'PROFILE_NOT_OWNED' USING ERRCODE='42501'; END IF;
 SELECT username INTO uname FROM public.customers WHERE id=_customer AND active;
 IF uname IS NULL THEN RAISE EXCEPTION 'PROFILE_NOT_OWNED' USING ERRCODE='42501'; END IF;
 self_ok:=coalesce((SELECT self_activation FROM public.serial_settings WHERE id),false);
 nxt:=CASE WHEN self_ok THEN 'active' ELSE 'inactive' END;
 UPDATE public.serial_cards SET owner_user_id=auth.uid(),customer_id=_customer,assignment_status='assigned',assigned_at=now(),
  activation_status=nxt,activated_at=CASE WHEN self_ok THEN now() ELSE activated_at END,updated_at=now(),last_actor=auth.uid() WHERE id=r.id;
 PERFORM public._serial_log(r.id,'assigned',NULL,auth.uid(),public._serial_state(r),(SELECT public._serial_state(x) FROM public.serial_cards x WHERE x.id=r.id),'Claimed by customer from card link');
 IF self_ok THEN
  PERFORM public._serial_log(r.id,'activated',auth.uid(),auth.uid(),(SELECT public._serial_state(x) FROM public.serial_cards x WHERE x.id=r.id),(SELECT public._serial_state(x) FROM public.serial_cards x WHERE x.id=r.id),'Activated by card owner');
 END IF;
 RETURN jsonb_build_object('state',CASE WHEN self_ok THEN 'active' ELSE 'pending' END,'username',uname);
END; $$;

REVOKE EXECUTE ON FUNCTION public.claim_serial(text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_serial(text,uuid) TO authenticated;