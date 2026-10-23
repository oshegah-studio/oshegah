CREATE TABLE public.card_delivery_settings (
 id boolean PRIMARY KEY DEFAULT true CHECK(id), unit_price numeric NOT NULL DEFAULT 300 CHECK(unit_price >= 0 AND unit_price < 10000000000 AND unit_price=round(unit_price,2)), max_quantity integer NOT NULL DEFAULT 5 CHECK(max_quantity>0), delivery_mode text NOT NULL DEFAULT 'flat' CHECK(delivery_mode IN ('flat','governorate')), flat_fee numeric CHECK(flat_fee>=0 AND flat_fee<10000000000 AND flat_fee=round(flat_fee,2)), governorate_fees jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(governorate_fees)='object'), version integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid, price_updated_at timestamptz NOT NULL DEFAULT now(), price_updated_by uuid
);
GRANT SELECT ON public.card_delivery_settings TO authenticated;
GRANT ALL ON public.card_delivery_settings TO service_role;
ALTER TABLE public.card_delivery_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY settings_admin_read ON public.card_delivery_settings FOR SELECT TO authenticated USING(public.is_admin());
CREATE TABLE public.card_settings_history(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),setting text NOT NULL,previous_value jsonb,new_value jsonb,administrator uuid NOT NULL,actor_label text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.card_settings_history TO authenticated;
GRANT ALL ON public.card_settings_history TO service_role;
ALTER TABLE public.card_settings_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY settings_history_admin_read ON public.card_settings_history FOR SELECT TO authenticated USING(public.is_admin());
CREATE INDEX card_settings_history_date ON public.card_settings_history(created_at DESC);
ALTER TABLE public.card_requests ADD COLUMN financial_snapshot jsonb;
ALTER TABLE public.card_requests ADD COLUMN delivery_pricing_mode text NOT NULL DEFAULT 'unconfirmed';
ALTER TABLE public.card_request_history ADD COLUMN financial_change jsonb;
CREATE OR REPLACE FUNCTION public.card_request_config() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT jsonb_build_object('product_name','OSHEGAH NFC Card','unit_price',unit_price,'currency','EGP','max_quantity',max_quantity,'country','EG','delivery_mode',delivery_mode,'delivery_charge',CASE WHEN delivery_mode='flat' THEN flat_fee ELSE NULL END,'governorate_fees',governorate_fees,'version',version) FROM public.card_delivery_settings WHERE id=true; $$;
REVOKE ALL ON FUNCTION public.card_request_config() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.card_request_config() TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.get_card_delivery_settings(_page integer DEFAULT 1) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s jsonb; h jsonb; n bigint;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT to_jsonb(c)||jsonb_build_object('updated_by_label',(SELECT username FROM public.admin_credentials WHERE user_id=c.updated_by),'price_updated_by_label',(SELECT username FROM public.admin_credentials WHERE user_id=c.price_updated_by)) INTO s FROM public.card_delivery_settings c WHERE id=true;
 SELECT count(*) INTO n FROM public.card_settings_history;
 SELECT coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) INTO h FROM (SELECT * FROM public.card_settings_history ORDER BY created_at DESC,id LIMIT 20 OFFSET (greatest(coalesce(_page,1),1)-1)*20) a;
 RETURN jsonb_build_object('settings',s,'history',h,'total',n);
END; $$;
REVOKE ALL ON FUNCTION public.get_card_delivery_settings(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_card_delivery_settings(integer) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.save_card_delivery_settings(_version integer,_settings jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE old public.card_delivery_settings%ROWTYPE; price numeric; mx numeric; fee numeric; fees jsonb; mode text; k text; v jsonb; actor text; before_json jsonb; after_json jsonb;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT * INTO old FROM public.card_delivery_settings WHERE id=true FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'SETTINGS_UNAVAILABLE'; END IF;
 IF old.version IS DISTINCT FROM _version THEN RAISE EXCEPTION 'SETTINGS_CONFLICT'; END IF;
 IF jsonb_typeof(_settings) IS DISTINCT FROM 'object' OR jsonb_typeof(_settings->'unit_price') IS DISTINCT FROM 'number' OR jsonb_typeof(_settings->'max_quantity') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'SETTINGS_INVALID'; END IF;
 price:=(_settings->>'unit_price')::numeric; mx:=(_settings->>'max_quantity')::numeric; mode:=_settings->>'delivery_mode'; fees:=_settings->'governorate_fees';
 IF price<0 OR price>=10000000000 OR price<>round(price,2) OR mx<1 OR mx>2147483647 OR mx<>trunc(mx) OR mode IS NULL OR mode NOT IN ('flat','governorate') OR jsonb_typeof(fees) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'SETTINGS_INVALID'; END IF;
 IF _settings->'flat_fee'<>'null'::jsonb THEN
  IF jsonb_typeof(_settings->'flat_fee') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'DELIVERY_INVALID'; END IF;
  fee:=(_settings->>'flat_fee')::numeric;
  IF fee<0 OR fee>=10000000000 OR fee<>round(fee,2) THEN RAISE EXCEPTION 'DELIVERY_INVALID'; END IF;
 END IF;
 FOR k,v IN SELECT * FROM jsonb_each(fees) LOOP
  IF k NOT IN ('Cairo','Giza','Alexandria','Dakahlia','Red Sea','Beheira','Fayoum','Gharbia','Ismailia','Menofia','Minya','Qalyubia','New Valley','Suez','Aswan','Assiut','Beni Suef','Port Said','Damietta','Sharkia','South Sinai','Kafr El Sheikh','Matrouh','Luxor','Qena','North Sinai','Sohag') OR jsonb_typeof(v) IS DISTINCT FROM 'object' OR jsonb_typeof(v->'enabled') IS DISTINCT FROM 'boolean' OR jsonb_typeof(v->'fee') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'GOVERNORATE_INVALID'; END IF;
  IF (v->>'fee')::numeric<0 OR (v->>'fee')::numeric>=10000000000 OR (v->>'fee')::numeric<>round((v->>'fee')::numeric,2) THEN RAISE EXCEPTION 'DELIVERY_INVALID'; END IF;
 END LOOP;
 IF mode='flat' AND fee IS NULL THEN RAISE EXCEPTION 'FLAT_FEE_REQUIRED'; END IF;
 IF mode='governorate' AND NOT EXISTS(SELECT 1 FROM jsonb_each(fees) x WHERE (x.value->>'enabled')::boolean) THEN RAISE EXCEPTION 'ENABLED_GOVERNORATE_REQUIRED'; END IF;
 before_json:=jsonb_build_object('unit_price',old.unit_price,'max_quantity',old.max_quantity,'delivery_mode',old.delivery_mode,'flat_fee',old.flat_fee,'governorate_fees',old.governorate_fees);
 after_json:=jsonb_build_object('unit_price',price,'max_quantity',mx,'delivery_mode',mode,'flat_fee',fee,'governorate_fees',fees);
 IF before_json=after_json THEN RETURN; END IF;
 SELECT coalesce(username,'Administrator') INTO actor FROM public.admin_credentials WHERE user_id=auth.uid();
 FOR k,v IN SELECT * FROM jsonb_each(after_json) LOOP
  IF before_json->k IS DISTINCT FROM v THEN INSERT INTO public.card_settings_history(setting,previous_value,new_value,administrator,actor_label) VALUES(k,before_json->k,v,auth.uid(),coalesce(actor,'Administrator')); END IF;
 END LOOP;
 UPDATE public.card_delivery_settings SET unit_price=price,max_quantity=mx::integer,delivery_mode=mode,flat_fee=fee,governorate_fees=fees,version=version+1,updated_at=now(),updated_by=auth.uid(),price_updated_at=CASE WHEN unit_price IS DISTINCT FROM price THEN now() ELSE price_updated_at END,price_updated_by=CASE WHEN unit_price IS DISTINCT FROM price THEN auth.uid() ELSE price_updated_by END WHERE id=true;
END; $$;
REVOKE ALL ON FUNCTION public.save_card_delivery_settings(integer,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_card_delivery_settings(integer,jsonb) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.validate_card_request_snapshot() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE k text; v text; s public.card_delivery_settings%ROWTYPE; region text; fee numeric;
BEGIN
 FOR k IN SELECT unnest(ARRAY['instructions','notes','email']) LOOP
  v:=CASE WHEN k='instructions' THEN NEW.delivery->>'instructions' WHEN k='notes' THEN NEW.customer_notes ELSE NEW.contact->>'email' END;
  IF coalesce(v,'') ~ '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]' THEN RAISE EXCEPTION 'INVALID_FIELD: %',k; END IF;
 END LOOP;
 SELECT * INTO s FROM public.card_delivery_settings WHERE id=true FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'SETTINGS_UNAVAILABLE'; END IF;
 IF NEW.quantity IS NULL OR NEW.quantity<1 OR NEW.quantity>s.max_quantity THEN RAISE EXCEPTION 'QUANTITY_EXCEEDS_LIMIT: %',s.max_quantity; END IF;
 IF NEW.delivery->>'country' IS DISTINCT FROM 'EG' THEN RAISE EXCEPTION 'EGYPT_ONLY'; END IF;
 region:=NEW.delivery->>'governorate';
 IF region IS NULL OR region NOT IN ('Cairo','Giza','Alexandria','Dakahlia','Red Sea','Beheira','Fayoum','Gharbia','Ismailia','Menofia','Minya','Qalyubia','New Valley','Suez','Aswan','Assiut','Beni Suef','Port Said','Damietta','Sharkia','South Sinai','Kafr El Sheikh','Matrouh','Luxor','Qena','North Sinai','Sohag') THEN RAISE EXCEPTION 'GOVERNORATE_INVALID'; END IF;
 IF s.delivery_mode='governorate' THEN
  IF coalesce((s.governorate_fees->region->>'enabled')::boolean,false)=false THEN RAISE EXCEPTION 'DELIVERY_UNAVAILABLE'; END IF;
  fee:=(s.governorate_fees->region->>'fee')::numeric;
 ELSE fee:=s.flat_fee; END IF;
 NEW.unit_price:=s.unit_price; NEW.subtotal:=s.unit_price*NEW.quantity; NEW.discount:=0; NEW.delivery_charge:=fee; NEW.total:=NEW.subtotal+fee; NEW.currency:='EGP'; NEW.delivery_pricing_mode:=s.delivery_mode;
 NEW.financial_snapshot:=jsonb_build_object('unit_price',NEW.unit_price,'quantity',NEW.quantity,'subtotal',NEW.subtotal,'delivery_mode',s.delivery_mode,'governorate',region,'delivery_fee',fee,'total',NEW.total,'discount',0,'currency','EGP','submitted_at',NEW.created_at,'settings_version',s.version);
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.validate_card_request_snapshot() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE def text; BEGIN
 SELECT pg_get_functiondef('public.submit_card_request(uuid,uuid,jsonb)'::regprocedure) INTO def;
 def:=replace(def,'''^[1-5]$''','''^[1-9][0-9]{0,9}$''');
 def:=replace(def,'IF q<1 OR q>(cfg->>''max_quantity'')::integer THEN RAISE EXCEPTION ''QUANTITY_INVALID''; END IF;','IF q<1 OR q>(cfg->>''max_quantity'')::integer THEN RAISE EXCEPTION ''QUANTITY_EXCEEDS_LIMIT: %'',cfg->>''max_quantity''; END IF;');
 EXECUTE def;
END; $$;
CREATE OR REPLACE FUNCTION public.guard_card_financial_snapshot() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.financial_snapshot IS DISTINCT FROM OLD.financial_snapshot OR NEW.unit_price IS DISTINCT FROM OLD.unit_price OR NEW.quantity IS DISTINCT FROM OLD.quantity OR NEW.subtotal IS DISTINCT FROM OLD.subtotal OR NEW.currency IS DISTINCT FROM OLD.currency OR NEW.delivery_pricing_mode IS DISTINCT FROM OLD.delivery_pricing_mode OR NEW.delivery IS DISTINCT FROM OLD.delivery THEN RAISE EXCEPTION 'SNAPSHOT_IMMUTABLE'; END IF;
 IF NEW.delivery_charge IS DISTINCT FROM OLD.delivery_charge OR NEW.total IS DISTINCT FROM OLD.total OR NEW.discount IS DISTINCT FROM OLD.discount THEN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
  IF NEW.discount IS DISTINCT FROM OLD.discount OR NEW.delivery_charge IS NULL OR NEW.delivery_charge<0 OR NEW.delivery_charge<>round(NEW.delivery_charge,2) OR NEW.total IS DISTINCT FROM NEW.subtotal+NEW.delivery_charge-NEW.discount THEN RAISE EXCEPTION 'PRICE_INVALID'; END IF;
  INSERT INTO public.card_request_history(request_id,previous_status,new_status,changed_by,actor_label,internal_note,event_type,financial_change) VALUES(OLD.id,OLD.status,OLD.status,auth.uid(),'Administrator','Delivery charge adjusted','delivery_charge',jsonb_build_object('previous',jsonb_build_object('delivery_fee',OLD.delivery_charge,'total',OLD.total),'new',jsonb_build_object('delivery_fee',NEW.delivery_charge,'total',NEW.total)));
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.guard_card_financial_snapshot() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_card_financial_snapshot BEFORE UPDATE ON public.card_requests FOR EACH ROW EXECUTE FUNCTION public.guard_card_financial_snapshot();
CREATE OR REPLACE FUNCTION public.label_card_request_event() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.financial_change IS NOT NULL THEN NEW.event_type:='delivery_charge';
 ELSIF NEW.previous_status=NEW.new_status THEN NEW.event_type:=CASE WHEN NEW.internal_note LIKE 'Delivery charge confirmed:%' THEN 'delivery_charge' ELSE 'internal_note' END;
 ELSE NEW.event_type:='status'; END IF;
 RETURN NEW;
END; $$;
DO $$ DECLARE def text; BEGIN
 SELECT pg_get_functiondef('public.get_card_request(uuid,boolean)'::regprocedure) INTO def;
 def:=replace(def,'''event_type'',event_type,','''financial_change'',financial_change,''event_type'',event_type,'); EXECUTE def;
END; $$;