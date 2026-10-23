CREATE TABLE public.serial_cards(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 serial text NOT NULL UNIQUE,
 owner_user_id uuid,
 customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
 card_request_id uuid REFERENCES public.card_requests(id) ON DELETE SET NULL,
 assignment_status text NOT NULL DEFAULT 'unassigned',
 activation_status text NOT NULL DEFAULT 'inactive',
 created_at timestamptz NOT NULL DEFAULT now(),
 assigned_at timestamptz,
 activated_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 last_actor uuid,
 admin_notes text NOT NULL DEFAULT '',
 CONSTRAINT serial_cards_format CHECK (serial ~ '^OSH-[A-Z0-9]{8}$'),
 CONSTRAINT serial_cards_assignment CHECK (assignment_status IN ('unassigned','assigned') AND ((assignment_status='assigned')=(owner_user_id IS NOT NULL))),
 CONSTRAINT serial_cards_activation CHECK (activation_status IN ('inactive','active','revoked') AND (activation_status<>'active' OR owner_user_id IS NOT NULL)),
 CONSTRAINT serial_cards_profile CHECK (customer_id IS NULL OR owner_user_id IS NOT NULL),
 CONSTRAINT serial_cards_notes CHECK (length(admin_notes)<=2000)
);
CREATE INDEX serial_cards_owner_idx ON public.serial_cards(owner_user_id);
CREATE INDEX serial_cards_customer_idx ON public.serial_cards(customer_id);
CREATE INDEX serial_cards_request_idx ON public.serial_cards(card_request_id);
CREATE INDEX serial_cards_created_idx ON public.serial_cards(created_at DESC,id);
CREATE INDEX serial_cards_assigned_idx ON public.serial_cards(assigned_at DESC NULLS LAST,id);

CREATE TABLE public.serial_card_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 serial_id uuid NOT NULL REFERENCES public.serial_cards(id) ON DELETE CASCADE,
 event_type text NOT NULL CHECK (event_type IN ('registered','assigned','reassigned','activated','deactivated','revoked','restored','profile_changed')),
 previous_owner uuid,
 new_owner uuid,
 previous_state jsonb,
 new_state jsonb,
 actor uuid,
 actor_label text NOT NULL,
 reason text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX serial_card_events_serial_idx ON public.serial_card_events(serial_id,created_at);

CREATE TABLE public.serial_settings(
 id boolean PRIMARY KEY DEFAULT true CHECK (id),
 self_activation boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid
);

REVOKE ALL ON public.serial_cards, public.serial_card_events, public.serial_settings FROM anon, authenticated;
GRANT SELECT ON public.serial_cards, public.serial_card_events, public.serial_settings TO authenticated;
GRANT ALL ON public.serial_cards, public.serial_card_events, public.serial_settings TO service_role;
ALTER TABLE public.serial_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serial_card_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serial_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY serial_cards_admin_read ON public.serial_cards FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY serial_events_admin_read ON public.serial_card_events FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY serial_settings_admin_read ON public.serial_settings FOR SELECT TO authenticated USING (public.is_admin());

CREATE FUNCTION public._serial_state(r public.serial_cards) RETURNS jsonb LANGUAGE sql STABLE SET search_path TO 'public' AS $$
 SELECT jsonb_build_object('assignment',r.assignment_status,'activation',r.activation_status,'customer_id',r.customer_id);
$$;
CREATE FUNCTION public._serial_actor() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
 SELECT CASE WHEN public.is_admin() THEN coalesce((SELECT username FROM public.admin_credentials WHERE user_id=auth.uid()),'Administrator') ELSE 'Customer' END;
$$;
CREATE FUNCTION public._serial_log(_serial uuid,_type text,_prev_owner uuid,_new_owner uuid,_prev jsonb,_next jsonb,_reason text) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
 INSERT INTO public.serial_card_events(serial_id,event_type,previous_owner,new_owner,previous_state,new_state,actor,actor_label,reason)
 VALUES(_serial,_type,_prev_owner,_new_owner,_prev,_next,auth.uid(),public._serial_actor(),left(trim(coalesce(_reason,'')),1000));
$$;
CREATE FUNCTION public._serial_profile_ok(_user uuid,_customer uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
 SELECT _customer IS NULL OR EXISTS(SELECT 1 FROM public.customers c JOIN public.profiles p ON p.id=c.user_id WHERE c.id=_customer AND p.auth_user_id=_user);
$$;
CREATE FUNCTION public._serial_rows(_search text,_assignment text,_activation text,_request uuid)
RETURNS TABLE(id uuid,serial text,owner_user_id uuid,owner_email text,owner_name text,customer_id uuid,username text,card_request_id uuid,assignment_status text,activation_status text,created_at timestamptz,assigned_at timestamptz,activated_at timestamptz,updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
 WITH q AS (SELECT replace(replace(replace(trim(coalesce(_search,'')),'\','\\'),'%','\%'),'_','\_') AS t)
 SELECT s.id,s.serial,s.owner_user_id,p.email,p.full_name,s.customer_id,c.username,s.card_request_id,s.assignment_status,s.activation_status,s.created_at,s.assigned_at,s.activated_at,s.updated_at
 FROM public.serial_cards s CROSS JOIN q
 LEFT JOIN public.profiles p ON p.auth_user_id=s.owner_user_id
 LEFT JOIN public.customers c ON c.id=s.customer_id
 WHERE (coalesce(_assignment,'')='' OR s.assignment_status=_assignment)
  AND (coalesce(_activation,'')='' OR s.activation_status=_activation)
  AND (_request IS NULL OR s.card_request_id=_request)
  AND (q.t='' OR s.serial ILIKE '%'||q.t||'%' OR p.email ILIKE '%'||q.t||'%' OR c.username ILIKE '%'||q.t||'%'
   OR EXISTS(SELECT 1 FROM public.customers c2 WHERE c2.user_id=p.id AND c2.username ILIKE '%'||q.t||'%'));
$$;

CREATE FUNCTION public.admin_register_serials(_serials text[],_commit boolean DEFAULT false,_note text DEFAULT '') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s text; n text; seen text[]:='{}'; valid text[]:='{}'; invalid text[]:='{}'; dup text[]:='{}'; existing text[]:='{}'; created text[]:='{}'; rid uuid; r public.serial_cards%ROWTYPE;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 IF coalesce(array_length(_serials,1),0)>1000 THEN RAISE EXCEPTION 'TOO_MANY_SERIALS'; END IF;
 IF length(coalesce(_note,''))>2000 THEN RAISE EXCEPTION 'NOTES_TOO_LONG'; END IF;
 FOREACH s IN ARRAY coalesce(_serials,'{}'::text[]) LOOP
  n:=upper(trim(coalesce(s,'')));
  IF n='' THEN CONTINUE; END IF;
  IF n !~ '^OSH-[A-Z0-9]{8}$' THEN invalid:=invalid||left(trim(s),60);
  ELSIF n=ANY(seen) THEN dup:=dup||n;
  ELSE seen:=seen||n;
   IF EXISTS(SELECT 1 FROM public.serial_cards x WHERE x.serial=n) THEN existing:=existing||n; ELSE valid:=valid||n; END IF;
  END IF;
 END LOOP;
 IF _commit THEN
  FOREACH n IN ARRAY valid LOOP
   rid:=NULL;
   INSERT INTO public.serial_cards(serial,last_actor,admin_notes) VALUES(n,auth.uid(),trim(coalesce(_note,''))) ON CONFLICT (serial) DO NOTHING RETURNING id INTO rid;
   IF rid IS NULL THEN existing:=existing||n; ELSE
    created:=created||n; SELECT * INTO r FROM public.serial_cards WHERE id=rid;
    PERFORM public._serial_log(rid,'registered',NULL,NULL,NULL,public._serial_state(r),'');
   END IF;
  END LOOP;
 END IF;
 RETURN jsonb_build_object('valid',to_jsonb(valid),'invalid',to_jsonb(invalid),'duplicates',to_jsonb(dup),'existing',to_jsonb(existing),'created',to_jsonb(created));
END; $$;

CREATE FUNCTION public.admin_generate_serials(_count integer,_note text DEFAULT '') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE alpha text:='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; b bytea; code text; i integer; made text[]:='{}'; rid uuid; tries integer:=0; r public.serial_cards%ROWTYPE;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 IF _count IS NULL OR _count<1 OR _count>500 THEN RAISE EXCEPTION 'COUNT_INVALID'; END IF;
 WHILE coalesce(array_length(made,1),0)<_count AND tries<_count*5 LOOP
  tries:=tries+1; b:=decode(replace(gen_random_uuid()::text,'-',''),'hex'); code:='OSH-';
  FOREACH i IN ARRAY ARRAY[0,1,2,3,4,5,10,11] LOOP code:=code||substr(alpha,(get_byte(b,i)%32)+1,1); END LOOP;
  rid:=NULL;
  INSERT INTO public.serial_cards(serial,last_actor,admin_notes) VALUES(code,auth.uid(),left(trim(coalesce(_note,'')),2000)) ON CONFLICT (serial) DO NOTHING RETURNING id INTO rid;
  IF rid IS NOT NULL THEN made:=made||code; SELECT * INTO r FROM public.serial_cards WHERE id=rid; PERFORM public._serial_log(rid,'registered',NULL,NULL,NULL,public._serial_state(r),'Generated'); END IF;
 END LOOP;
 RETURN jsonb_build_object('created',to_jsonb(made));
END; $$;

CREATE FUNCTION public.admin_list_serials(_page integer DEFAULT 1,_search text DEFAULT '',_assignment text DEFAULT '',_activation text DEFAULT '',_sort text DEFAULT 'created',_request uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p integer:=greatest(coalesce(_page,1),1); rows jsonb; n bigint; counts jsonb;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 IF length(coalesce(_search,''))>100 THEN RAISE EXCEPTION 'SEARCH_TOO_LONG'; END IF;
 SELECT count(*) INTO n FROM public._serial_rows(_search,_assignment,_activation,_request);
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.ord),'[]') INTO rows FROM (
  SELECT r.*,row_number() OVER (ORDER BY CASE WHEN _sort='assigned' THEN r.assigned_at END DESC NULLS LAST,r.created_at DESC,r.id) ord
  FROM public._serial_rows(_search,_assignment,_activation,_request) r
  ORDER BY CASE WHEN _sort='assigned' THEN r.assigned_at END DESC NULLS LAST,r.created_at DESC,r.id LIMIT 20 OFFSET (p-1)*20) x;
 SELECT jsonb_build_object('total',count(*),'unassigned',count(*) FILTER(WHERE assignment_status='unassigned'),'assigned',count(*) FILTER(WHERE assignment_status='assigned'),'active',count(*) FILTER(WHERE activation_status='active'),'inactive',count(*) FILTER(WHERE activation_status='inactive'),'revoked',count(*) FILTER(WHERE activation_status='revoked')) INTO counts FROM public.serial_cards;
 RETURN jsonb_build_object('rows',rows,'total',n,'page',p,'page_size',20,'counts',counts,'self_activation',coalesce((SELECT self_activation FROM public.serial_settings WHERE id),false));
END; $$;

CREATE FUNCTION public.admin_get_serial(_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s jsonb; ev jsonb; profs jsonb; o uuid;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT to_jsonb(r)||jsonb_build_object('admin_notes',x.admin_notes,'last_actor_label',(SELECT username FROM public.admin_credentials WHERE user_id=x.last_actor)),r.owner_user_id INTO s,o
  FROM public._serial_rows('','','',NULL) r JOIN public.serial_cards x ON x.id=r.id WHERE r.id=_id;
 IF s IS NULL THEN RAISE EXCEPTION 'SERIAL_NOT_FOUND'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(e)||jsonb_build_object('previous_owner_email',(SELECT email FROM public.profiles WHERE auth_user_id=e.previous_owner),'new_owner_email',(SELECT email FROM public.profiles WHERE auth_user_id=e.new_owner)) ORDER BY e.created_at,e.id),'[]') INTO ev FROM public.serial_card_events e WHERE e.serial_id=_id;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',c.id,'username',c.username,'full_name',c.full_name) ORDER BY c.created_at),'[]') INTO profs FROM public.customers c JOIN public.profiles p ON p.id=c.user_id WHERE p.auth_user_id=o;
 RETURN jsonb_build_object('serial',s,'events',ev,'owner_profiles',profs);
END; $$;

CREATE FUNCTION public.admin_search_serial_users(_q text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE t text:=replace(replace(replace(trim(coalesce(_q,'')),'\','\\'),'%','\%'),'_','\_'); res jsonb;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 IF length(t)<2 OR length(t)>100 THEN RETURN '[]'::jsonb; END IF;
 SELECT coalesce(jsonb_agg(u),'[]') INTO res FROM (
  SELECT p.auth_user_id AS user_id,p.email,p.full_name,
   coalesce((SELECT jsonb_agg(jsonb_build_object('id',c.id,'username',c.username,'full_name',c.full_name) ORDER BY c.created_at) FROM public.customers c WHERE c.user_id=p.id),'[]') AS profiles
  FROM public.profiles p
  WHERE p.email ILIKE '%'||t||'%' OR p.full_name ILIKE '%'||t||'%' OR p.auth_user_id::text=lower(trim(_q))
   OR EXISTS(SELECT 1 FROM public.customers c WHERE c.user_id=p.id AND c.username ILIKE '%'||t||'%')
  ORDER BY p.created_at LIMIT 10) u;
 RETURN res;
END; $$;

CREATE FUNCTION public.admin_assign_serials(_user uuid,_ids uuid[],_customer uuid DEFAULT NULL,_request uuid DEFAULT NULL,_note text DEFAULT '') RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r public.serial_cards%ROWTYPE; bad text; n integer:=0; want integer;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 IF _user IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE auth_user_id=_user) THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;
 SELECT count(DISTINCT x) INTO want FROM unnest(coalesce(_ids,'{}'::uuid[])) x;
 IF want<1 OR want>100 THEN RAISE EXCEPTION 'SERIALS_REQUIRED'; END IF;
 IF NOT public._serial_profile_ok(_user,_customer) THEN RAISE EXCEPTION 'PROFILE_NOT_OWNED'; END IF;
 IF _request IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.card_requests WHERE id=_request AND user_id=_user) THEN RAISE EXCEPTION 'REQUEST_MISMATCH'; END IF;
 IF length(coalesce(_note,''))>1000 THEN RAISE EXCEPTION 'NOTES_TOO_LONG'; END IF;
 PERFORM 1 FROM public.serial_cards WHERE id=ANY(_ids) ORDER BY id FOR UPDATE;
 IF (SELECT count(*) FROM public.serial_cards WHERE id=ANY(_ids))<>want THEN RAISE EXCEPTION 'SERIAL_NOT_FOUND'; END IF;
 SELECT string_agg(serial,', ' ORDER BY serial) INTO bad FROM public.serial_cards WHERE id=ANY(_ids) AND (assignment_status<>'unassigned' OR activation_status='revoked');
 IF bad IS NOT NULL THEN RAISE EXCEPTION 'SERIAL_UNAVAILABLE: %',bad; END IF;
 FOR r IN SELECT * FROM public.serial_cards WHERE id=ANY(_ids) ORDER BY serial LOOP
  UPDATE public.serial_cards SET owner_user_id=_user,customer_id=_customer,card_request_id=_request,assignment_status='assigned',assigned_at=now(),updated_at=now(),last_actor=auth.uid() WHERE id=r.id;
  PERFORM public._serial_log(r.id,'assigned',NULL,_user,public._serial_state(r),(SELECT public._serial_state(x) FROM public.serial_cards x WHERE x.id=r.id),_note);
  n:=n+1;
 END LOOP;
 RETURN n;
END; $$;

CREATE FUNCTION public.admin_reassign_serial(_id uuid,_user uuid,_customer uuid DEFAULT NULL,_reason text DEFAULT '') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r public.serial_cards%ROWTYPE;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.serial_cards WHERE id=_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'SERIAL_NOT_FOUND'; END IF;
 IF r.assignment_status<>'assigned' OR r.activation_status='revoked' THEN RAISE EXCEPTION 'INVALID_TRANSITION'; END IF;
 IF _user IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE auth_user_id=_user) THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;
 IF _user=r.owner_user_id THEN RAISE EXCEPTION 'SAME_OWNER'; END IF;
 IF length(trim(coalesce(_reason,'')))<3 OR length(_reason)>1000 THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;
 IF NOT public._serial_profile_ok(_user,_customer) THEN RAISE EXCEPTION 'PROFILE_NOT_OWNED'; END IF;
 UPDATE public.serial_cards SET owner_user_id=_user,customer_id=_customer,card_request_id=NULL,assigned_at=now(),updated_at=now(),last_actor=auth.uid() WHERE id=_id;
 PERFORM public._serial_log(_id,'reassigned',r.owner_user_id,_user,public._serial_state(r),(SELECT public._serial_state(x) FROM public.serial_cards x WHERE x.id=_id),_reason);
END; $$;

CREATE FUNCTION public.admin_set_serial_activation(_id uuid,_action text,_reason text DEFAULT '') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r public.serial_cards%ROWTYPE; nxt text; ev text;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.serial_cards WHERE id=_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'SERIAL_NOT_FOUND'; END IF;
 IF length(coalesce(_reason,''))>1000 THEN RAISE EXCEPTION 'NOTES_TOO_LONG'; END IF;
 IF _action='activate' AND r.assignment_status='assigned' AND r.activation_status='inactive' THEN nxt:='active'; ev:='activated';
 ELSIF _action='deactivate' AND r.activation_status='active' THEN nxt:='inactive'; ev:='deactivated';
 ELSIF _action='revoke' AND r.activation_status<>'revoked' THEN nxt:='revoked'; ev:='revoked';
 ELSIF _action='restore' AND r.activation_status='revoked' THEN nxt:='inactive'; ev:='restored';
 ELSE RAISE EXCEPTION 'INVALID_TRANSITION'; END IF;
 IF _action<>'activate' AND length(trim(coalesce(_reason,'')))<3 THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;
 UPDATE public.serial_cards SET activation_status=nxt,activated_at=CASE WHEN nxt='active' THEN now() ELSE activated_at END,updated_at=now(),last_actor=auth.uid() WHERE id=_id;
 PERFORM public._serial_log(_id,ev,r.owner_user_id,r.owner_user_id,public._serial_state(r),(SELECT public._serial_state(x) FROM public.serial_cards x WHERE x.id=_id),_reason);
END; $$;

CREATE FUNCTION public.admin_update_serial_notes(_id uuid,_notes text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 IF length(coalesce(_notes,''))>2000 THEN RAISE EXCEPTION 'NOTES_TOO_LONG'; END IF;
 UPDATE public.serial_cards SET admin_notes=trim(coalesce(_notes,'')),updated_at=now() WHERE id=_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'SERIAL_NOT_FOUND'; END IF;
END; $$;

CREATE FUNCTION public.set_serial_profile(_id uuid,_customer uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r public.serial_cards%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.serial_cards WHERE id=_id FOR UPDATE;
 IF NOT FOUND OR (NOT public.is_admin() AND r.owner_user_id IS DISTINCT FROM auth.uid()) THEN RAISE EXCEPTION 'SERIAL_NOT_FOUND' USING ERRCODE='42501'; END IF;
 IF r.owner_user_id IS NULL OR r.activation_status='revoked' THEN RAISE EXCEPTION 'INVALID_TRANSITION'; END IF;
 IF NOT public._serial_profile_ok(r.owner_user_id,_customer) THEN RAISE EXCEPTION 'PROFILE_NOT_OWNED'; END IF;
 IF r.customer_id IS NOT DISTINCT FROM _customer THEN RETURN; END IF;
 UPDATE public.serial_cards SET customer_id=_customer,updated_at=now(),last_actor=auth.uid() WHERE id=_id;
 PERFORM public._serial_log(_id,'profile_changed',r.owner_user_id,r.owner_user_id,public._serial_state(r),(SELECT public._serial_state(x) FROM public.serial_cards x WHERE x.id=_id),'');
END; $$;

CREATE FUNCTION public.my_serial_cards() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE cards jsonb; profs jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',s.id,'serial',s.serial,'activation_status',s.activation_status,'assigned_at',s.assigned_at,'activated_at',s.activated_at,'customer_id',s.customer_id,'username',c.username,'full_name',c.full_name) ORDER BY s.assigned_at DESC,s.id),'[]') INTO cards
  FROM public.serial_cards s LEFT JOIN public.customers c ON c.id=s.customer_id WHERE s.owner_user_id=auth.uid();
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',c.id,'username',c.username,'full_name',c.full_name) ORDER BY c.created_at),'[]') INTO profs FROM public.customers c JOIN public.profiles p ON p.id=c.user_id WHERE p.auth_user_id=auth.uid();
 RETURN jsonb_build_object('cards',cards,'profiles',profs,'self_activation',coalesce((SELECT self_activation FROM public.serial_settings WHERE id),false));
END; $$;

CREATE FUNCTION public.activate_my_serial(_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r public.serial_cards%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.serial_cards WHERE id=_id FOR UPDATE;
 IF NOT FOUND OR r.owner_user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'SERIAL_NOT_FOUND' USING ERRCODE='42501'; END IF;
 IF r.activation_status<>'inactive' THEN RAISE EXCEPTION 'INVALID_TRANSITION'; END IF;
 IF NOT coalesce((SELECT self_activation FROM public.serial_settings WHERE id),false) THEN RAISE EXCEPTION 'APPROVAL_REQUIRED'; END IF;
 UPDATE public.serial_cards SET activation_status='active',activated_at=now(),updated_at=now(),last_actor=auth.uid() WHERE id=_id;
 PERFORM public._serial_log(_id,'activated',r.owner_user_id,r.owner_user_id,public._serial_state(r),(SELECT public._serial_state(x) FROM public.serial_cards x WHERE x.id=_id),'Activated by card owner');
END; $$;

CREATE FUNCTION public.save_serial_settings(_self_activation boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE old boolean;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 IF _self_activation IS NULL THEN RAISE EXCEPTION 'SETTINGS_INVALID'; END IF;
 SELECT self_activation INTO old FROM public.serial_settings WHERE id FOR UPDATE;
 IF old IS NOT DISTINCT FROM _self_activation THEN RETURN; END IF;
 INSERT INTO public.serial_settings(id,self_activation,updated_at,updated_by) VALUES(true,_self_activation,now(),auth.uid())
  ON CONFLICT (id) DO UPDATE SET self_activation=EXCLUDED.self_activation,updated_at=now(),updated_by=auth.uid();
 INSERT INTO public.card_settings_history(setting,previous_value,new_value,administrator,actor_label) VALUES('serial_self_activation',to_jsonb(coalesce(old,false)),to_jsonb(_self_activation),auth.uid(),public._serial_actor());
END; $$;

CREATE FUNCTION public.resolve_serial(_serial text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
 SELECT CASE
  WHEN s.id IS NULL THEN jsonb_build_object('state','unknown')
  WHEN s.activation_status='active' AND c.id IS NOT NULL AND c.active AND public._serial_profile_ok(s.owner_user_id,c.id) THEN jsonb_build_object('state','active','username',c.username)
  WHEN s.activation_status='active' THEN jsonb_build_object('state','unlinked')
  ELSE jsonb_build_object('state','inactive') END
 FROM (SELECT 1) one
 LEFT JOIN public.serial_cards s ON s.serial=upper(trim(coalesce(_serial,''))) AND length(trim(coalesce(_serial,'')))<=20
 LEFT JOIN public.customers c ON c.id=s.customer_id;
$$;

REVOKE EXECUTE ON FUNCTION public._serial_state(public.serial_cards), public._serial_actor(), public._serial_log(uuid,text,uuid,uuid,jsonb,jsonb,text), public._serial_profile_ok(uuid,uuid), public._serial_rows(text,text,text,uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_register_serials(text[],boolean,text), public.admin_generate_serials(integer,text), public.admin_list_serials(integer,text,text,text,text,uuid), public.admin_get_serial(uuid), public.admin_search_serial_users(text), public.admin_assign_serials(uuid,uuid[],uuid,uuid,text), public.admin_reassign_serial(uuid,uuid,uuid,text), public.admin_set_serial_activation(uuid,text,text), public.admin_update_serial_notes(uuid,text), public.set_serial_profile(uuid,uuid), public.my_serial_cards(), public.activate_my_serial(uuid), public.save_serial_settings(boolean), public.resolve_serial(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_register_serials(text[],boolean,text), public.admin_generate_serials(integer,text), public.admin_list_serials(integer,text,text,text,text,uuid), public.admin_get_serial(uuid), public.admin_search_serial_users(text), public.admin_assign_serials(uuid,uuid[],uuid,uuid,text), public.admin_reassign_serial(uuid,uuid,uuid,text), public.admin_set_serial_activation(uuid,text,text), public.admin_update_serial_notes(uuid,text), public.set_serial_profile(uuid,uuid), public.my_serial_cards(), public.activate_my_serial(uuid), public.save_serial_settings(boolean), public.resolve_serial(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_serial(text) TO anon;