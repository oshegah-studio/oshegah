CREATE OR REPLACE FUNCTION public.get_card_requests(_admin boolean DEFAULT false,_page integer DEFAULT 1,_search text DEFAULT '',_status text DEFAULT '',_from date DEFAULT NULL,_to date DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb; counts jsonb; n bigint; p integer:=greatest(coalesce(_page,1),1);
BEGIN
 IF auth.uid() IS NULL OR (_admin AND NOT public.is_admin()) THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
 IF length(coalesce(_search,''))>100 THEN RAISE EXCEPTION 'SEARCH_TOO_LONG'; END IF;
 SELECT count(*) INTO n FROM public.card_requests r WHERE (_admin OR r.user_id=auth.uid()) AND (coalesce(_status,'')='' OR r.status=_status) AND (_from IS NULL OR r.created_at>=_from::timestamptz) AND (_to IS NULL OR r.created_at<(_to+1)::timestamptz) AND (coalesce(_search,'')='' OR concat_ws(' ',r.request_number,r.contact->>'full_name',r.contact->>'phone',r.profile_snapshot->>'username') ILIKE '%'||_search||'%');
 SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') INTO result FROM (SELECT r.* FROM public.card_requests r WHERE (_admin OR r.user_id=auth.uid()) AND (coalesce(_status,'')='' OR r.status=_status) AND (_from IS NULL OR r.created_at>=_from::timestamptz) AND (_to IS NULL OR r.created_at<(_to+1)::timestamptz) AND (coalesce(_search,'')='' OR concat_ws(' ',r.request_number,r.contact->>'full_name',r.contact->>'phone',r.profile_snapshot->>'username') ILIKE '%'||_search||'%') ORDER BY r.created_at DESC,r.id DESC LIMIT 20 OFFSET (p-1)*20) x;
 IF _admin THEN SELECT jsonb_build_object('total',count(*),'submitted',count(*) FILTER(WHERE status='submitted'),'under_review',count(*) FILTER(WHERE status='under_review'),'in_preparation',count(*) FILTER(WHERE status='in_preparation'),'ready_for_delivery',count(*) FILTER(WHERE status='ready_for_delivery'),'shipped',count(*) FILTER(WHERE status='shipped'),'delivered',count(*) FILTER(WHERE status='delivered')) INTO counts FROM public.card_requests; END IF;
 RETURN jsonb_build_object('rows',result,'total',n,'counts',counts,'page',p,'page_size',20);
END; $$;
REVOKE ALL ON FUNCTION public.get_card_requests(boolean,integer,text,text,date,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_card_requests(boolean,integer,text,text,date,date) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.get_card_request(_id uuid,_admin boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.card_requests%ROWTYPE; h jsonb; email text;
BEGIN
 IF auth.uid() IS NULL OR (_admin AND NOT public.is_admin()) THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.card_requests WHERE id=_id AND (_admin OR user_id=auth.uid());
 IF NOT FOUND THEN RAISE EXCEPTION 'REQUEST_NOT_FOUND' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'previous_status',previous_status,'new_status',new_status,'created_at',created_at,'reason',reason)||CASE WHEN _admin THEN jsonb_build_object('internal_note',internal_note,'changed_by',changed_by,'actor_label',actor_label) ELSE '{}'::jsonb END ORDER BY created_at,id),'[]') INTO h FROM public.card_request_history WHERE request_id=_id;
 IF _admin THEN SELECT p.email INTO email FROM public.profiles p WHERE p.auth_user_id=r.user_id; END IF;
 RETURN jsonb_build_object('request',to_jsonb(r),'history',h,'account_email',email);
END; $$;
REVOKE ALL ON FUNCTION public.get_card_request(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_card_request(uuid,boolean) TO authenticated,service_role;