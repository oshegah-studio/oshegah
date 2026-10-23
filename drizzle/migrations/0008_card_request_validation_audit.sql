ALTER TABLE public.card_requests ADD COLUMN consent_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.card_request_history ADD COLUMN event_type text NOT NULL DEFAULT 'status';
CREATE OR REPLACE FUNCTION public.validate_card_request_snapshot() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE k text; v text;
BEGIN
 FOR k IN SELECT unnest(ARRAY['instructions','notes','email']) LOOP
  v:=CASE WHEN k='instructions' THEN NEW.delivery->>'instructions' WHEN k='notes' THEN NEW.customer_notes ELSE NEW.contact->>'email' END;
  IF coalesce(v,'') ~ '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]' THEN RAISE EXCEPTION 'INVALID_FIELD: %',k; END IF;
 END LOOP;
 IF NEW.quantity<1 OR NEW.quantity>5 OR NEW.quantity IS NULL THEN RAISE EXCEPTION 'QUANTITY_INVALID'; END IF;
 IF NEW.unit_price<>300 OR NEW.subtotal<>NEW.quantity*300 OR NEW.currency<>'EGP' THEN RAISE EXCEPTION 'PRICE_INVALID'; END IF;
 IF NEW.delivery->>'country'<>'EG' THEN RAISE EXCEPTION 'EGYPT_ONLY'; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.validate_card_request_snapshot() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_card_request_snapshot BEFORE INSERT ON public.card_requests FOR EACH ROW EXECUTE FUNCTION public.validate_card_request_snapshot();
CREATE OR REPLACE FUNCTION public.label_card_request_event() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.previous_status=NEW.new_status THEN
  NEW.event_type:=CASE WHEN NEW.internal_note LIKE 'Delivery charge confirmed:%' THEN 'delivery_charge' ELSE 'internal_note' END;
 ELSE NEW.event_type:='status'; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.label_card_request_event() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER label_card_request_event BEFORE INSERT ON public.card_request_history FOR EACH ROW EXECUTE FUNCTION public.label_card_request_event();
DO $$
DECLARE def text;
BEGIN
 SELECT pg_get_functiondef('public.change_card_request(uuid,text,text,text,text,text,numeric)'::regprocedure) INTO def;
 def:=replace(def,'WHEN admin_ok AND next_status=''shipped'' THEN','WHEN admin_ok AND _action=''status'' AND next_status=''shipped'' THEN');
 EXECUTE def;
 SELECT pg_get_functiondef('public.get_card_request(uuid,boolean)'::regprocedure) INTO def;
 def:=replace(def,'''internal_note'',internal_note,','''event_type'',event_type,''internal_note'',internal_note,');
 def:=replace(def,'WHERE request_id=_id;','WHERE request_id=_id AND (_admin OR event_type=''status'');');
 EXECUTE def;
END; $$;