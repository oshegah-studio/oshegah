DO $$ DECLARE def text; BEGIN
 SELECT pg_get_functiondef('public.submit_card_request(uuid,uuid,jsonb)'::regprocedure) INTO def;
 def:=replace(def,'cfg:=public.card_request_config();','PERFORM 1 FROM public.card_delivery_settings WHERE id=true FOR SHARE; cfg:=public.card_request_config(); IF _payload ? ''settings_version'' AND (_payload->>''settings_version'')::integer IS DISTINCT FROM (cfg->>''version'')::integer THEN RAISE EXCEPTION ''SETTINGS_CHANGED''; END IF;');
 EXECUTE def;
END; $$;