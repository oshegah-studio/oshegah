CREATE OR REPLACE FUNCTION public.change_card_request(_id uuid,_action text,_status text DEFAULT NULL,_reason text DEFAULT '',_note text DEFAULT '',_tracking text DEFAULT '',_delivery numeric DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.card_requests%ROWTYPE; next_status text; actor text; admin_ok boolean:=public.is_admin();
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.card_requests WHERE id=_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'REQUEST_NOT_FOUND'; END IF;
 IF length(coalesce(_reason,''))>1000 OR length(coalesce(_note,''))>2000 OR length(coalesce(_tracking,''))>100 THEN RAISE EXCEPTION 'NOTES_TOO_LONG'; END IF;
 next_status:=r.status;
 IF _action='customer_cancel' THEN
  IF r.user_id<>auth.uid() OR r.status NOT IN ('submitted','under_review') THEN RAISE EXCEPTION 'CANCELLATION_NOT_ALLOWED' USING ERRCODE='42501'; END IF;
  next_status:='cancelled'; actor:='Customer'; _note:='';
 ELSE
  IF NOT admin_ok THEN RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
  SELECT coalesce(username,'Administrator') INTO actor FROM public.admin_credentials WHERE user_id=auth.uid();
  IF _action='status' THEN
   IF NOT ((r.status='submitted' AND _status IN ('under_review','rejected','cancelled')) OR (r.status='under_review' AND _status IN ('approved','rejected','cancelled')) OR (r.status='approved' AND _status IN ('in_preparation','cancelled')) OR (r.status='in_preparation' AND _status IN ('ready_for_delivery','cancelled')) OR (r.status='ready_for_delivery' AND _status IN ('shipped','cancelled')) OR (r.status='shipped' AND _status='delivered')) THEN RAISE EXCEPTION 'INVALID_TRANSITION'; END IF;
   IF _status IN ('rejected','cancelled') AND length(trim(coalesce(_reason,'')))<3 THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;
   next_status:=_status;
  ELSIF _action='note' THEN
   IF length(trim(coalesce(_note,'')))<1 THEN RAISE EXCEPTION 'NOTE_REQUIRED'; END IF;
  ELSIF _action='delivery' THEN
   IF _delivery IS NULL OR _delivery<0 OR _delivery>10000 OR _delivery<>round(_delivery,2) OR r.status IN ('rejected','cancelled','delivered') THEN RAISE EXCEPTION 'DELIVERY_INVALID'; END IF;
   UPDATE public.card_requests SET delivery_charge=_delivery,total=subtotal+_delivery-discount WHERE id=_id;
   _note:=concat('Delivery charge confirmed: ',_delivery,' EGP. ',coalesce(_note,''));
  ELSE RAISE EXCEPTION 'INVALID_ACTION'; END IF;
 END IF;
 UPDATE public.card_requests SET status=next_status,updated_at=now(),reviewed_at=CASE WHEN admin_ok THEN coalesce(reviewed_at,now()) ELSE reviewed_at END,tracking_reference=CASE WHEN admin_ok AND next_status='shipped' THEN nullif(trim(_tracking),'') ELSE tracking_reference END WHERE id=_id;
 INSERT INTO public.card_request_history(request_id,previous_status,new_status,changed_by,actor_label,reason,internal_note) VALUES(_id,r.status,next_status,auth.uid(),coalesce(actor,'Administrator'),trim(coalesce(_reason,'')),trim(coalesce(_note,'')));
END; $$;
REVOKE ALL ON FUNCTION public.change_card_request(uuid,text,text,text,text,text,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.change_card_request(uuid,text,text,text,text,text,numeric) TO authenticated,service_role;