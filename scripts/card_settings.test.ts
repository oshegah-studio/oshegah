import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';
import {orderAmounts,settingsSchema} from '../src/features/cards/settings';

// Runs the real migrations in isolated Postgres, never edits production settings.
const db=new PGlite();
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
 CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
 CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT coalesce(current_setting('test.admin',true),'false')='true' $$;
 CREATE FUNCTION public.owns_customer(_id uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT _id='11111111-1111-4111-8111-111111111111'::uuid $$;
 CREATE TABLE public.customers(id uuid PRIMARY KEY,active boolean,full_name text,username text,avatar_url text);
 CREATE TABLE public.profiles(auth_user_id uuid,email text);
 CREATE TABLE public.admin_credentials(user_id uuid,username text);
 INSERT INTO public.customers VALUES('11111111-1111-4111-8111-111111111111',true,'Test profile','settings_test',null);
 INSERT INTO public.admin_credentials VALUES('22222222-2222-4222-8222-222222222222','Isolated test admin');
 SET test.uid='22222222-2222-4222-8222-222222222222'; SET test.admin='true';`);
for(const file of ['0004_card_request_storage.sql','0005_card_request_submit.sql','0006_card_request_retrieval.sql','0007_card_request_actions.sql','0008_card_request_validation_audit.sql','0009_card_request_rpc_only_writes.sql','0010_card_delivery_settings.sql','0011_lock_card_submission_configuration.sql','0012_card_settings_rpc_only_writes.sql','0015_card_request_multiline_address.sql'])await db.exec(readFileSync(`drizzle/migrations/${file}`,'utf8'));
await db.exec('INSERT INTO public.card_delivery_settings(id) VALUES(true)');
let passed=0;
async function test(name:string,fn:()=>Promise<void>|void){await fn();console.log(`PASS ${++passed}: ${name}`);}
async function config(){return (await db.query<{c:any}>('SELECT public.card_request_config() c')).rows[0].c;}
async function save(values:any,version?:number){const c=await config();await db.query('SELECT public.save_card_delivery_settings($1,$2)',[version??c.version,values]);}
const flat={unit_price:300,max_quantity:5,delivery_mode:'flat',flat_fee:50,governorate_fees:{}};
const payload={full_name:'Validation',phone:'01012345678',email:'',contact_method:'whatsapp',country:'EG',governorate:'Cairo',city:'Test',address:'Test only',instructions:'',notes:'',quantity:2,consent:true,unit_price:1,subtotal:1,delivery_charge:1,total:1};
async function submit(changes={}){const r=await db.query<{id:string}>('SELECT public.submit_card_request($1,$2,$3) id',['11111111-1111-4111-8111-111111111111',crypto.randomUUID(),{...payload,...changes}]);return r.rows[0].id;}
async function request(id:string){return (await db.query<any>('SELECT * FROM public.card_requests WHERE id=$1',[id])).rows[0];}
await test('admin saves active database pricing',async()=>{await save(flat);assert.equal((await config()).unit_price,300);});
let oldId='';let old:any;
await test('flat fee: 300 × 2 + 50 = 650; client prices ignored',async()=>{oldId=await submit();old=await request(oldId);assert.equal(Number(old.subtotal),600);assert.equal(Number(old.delivery_charge),50);assert.equal(Number(old.total),650);assert.equal(Number(old.unit_price),300);});
await test('multiline delivery address is preserved',async()=>{const address='Building 10\nFloor 2\r\nApartment\t4';const id=await submit({address});assert.equal((await request(id)).delivery.address,address);});
await test('address unsafe control bytes remain rejected',async()=>{await assert.rejects(()=>submit({address:'Building\u0001hidden'}),/INVALID_FIELD: address/);});
await test('single-line contact fields still reject newlines',async()=>{await assert.rejects(()=>submit({full_name:'Name\nInjected'}),/INVALID_FIELD: full_name/);});
await test('empty address still rejects without creating an order',async()=>{const before=(await db.query<any>('SELECT count(*) n FROM public.card_requests')).rows[0].n;await assert.rejects(()=>submit({address:''}),/INVALID_FIELD: address/);assert.equal((await db.query<any>('SELECT count(*) n FROM public.card_requests')).rows[0].n,before);});
await test('display calculations match server subtotal and total',async()=>{const a=orderAmounts(await config(),2,'Cairo');assert.equal(a.total,650);assert.equal(a.subtotal,600);});
await test('configured quantity cap enforced when bypassing form',async()=>{await assert.rejects(()=>submit({quantity:6}),/QUANTITY_EXCEEDS_LIMIT/);});
await test('zero, negative and fractional quantities rejected',async()=>{for(const quantity of [0,-1,1.5])await assert.rejects(()=>submit({quantity}));});
const regional={...flat,unit_price:123.45,max_quantity:1,delivery_mode:'governorate',governorate_fees:{Cairo:{fee:12.34,enabled:true},Giza:{fee:99,enabled:false}}};
await test('price change visible through customer config',async()=>{await save(regional);assert.equal((await config()).unit_price,123.45);});
await test('governorate fee replaces flat fee; exact cents calculated',async()=>{const id=await submit({quantity:1});const r=await request(id);assert.equal(Number(r.total),135.79);assert.equal(Number(r.delivery_charge),12.34);assert.equal(r.delivery_pricing_mode,'governorate');assert.equal(r.financial_snapshot.governorate,'Cairo');assert.equal(orderAmounts(await config(),1,'Cairo').total,135.79);});
await test('disabled and missing governorates cannot submit',async()=>{for(const governorate of ['Giza','Alexandria'])await assert.rejects(()=>submit({quantity:1,governorate}),/DELIVERY_UNAVAILABLE/);});
await test('existing amounts and snapshot survive price, fees, limit changes',async()=>{const r=await request(oldId);for(const k of ['unit_price','subtotal','quantity','delivery_charge','total','financial_snapshot'])assert.deepEqual(r[k],old[k]);});
await test('new lower limit rejects new submissions only',async()=>{await assert.rejects(()=>submit({quantity:2}),/QUANTITY_EXCEEDS_LIMIT/);assert.equal((await request(oldId)).quantity,2);});
await test('server and frontend reject invalid money and limits',async()=>{for(const changes of [{unit_price:-1},{unit_price:1.123},{max_quantity:0},{max_quantity:1.5},{flat_fee:-1}]){const v={...flat,...changes};assert.equal(settingsSchema.safeParse(v).success,false);await assert.rejects(()=>save(v));}});
await test('mode activation requires fee or enabled governorate',async()=>{for(const v of [{...flat,flat_fee:null},{...flat,delivery_mode:'governorate'}]){assert.equal(settingsSchema.safeParse(v).success,false);await assert.rejects(()=>save(v));}});
await test('stale concurrent save rejected with version conflict',async()=>{await assert.rejects(()=>save(flat,1),/SETTINGS_CONFLICT/);});
await test('settings audit captures old/new administrator/time',async()=>{const r=(await db.query<any>("SELECT * FROM public.card_settings_history WHERE setting='unit_price' ORDER BY created_at DESC LIMIT 1")).rows[0];assert.equal(r.previous_value,300);assert.equal(r.new_value,123.45);assert.equal(r.administrator,'22222222-2222-4222-8222-222222222222');assert.ok(r.created_at);});
await test('global snapshot cannot be silently edited',async()=>{await assert.rejects(()=>db.query('UPDATE public.card_requests SET unit_price=1 WHERE id=$1',[oldId]),/SNAPSHOT_IMMUTABLE/);});
await test('explicit authorized delivery adjustment has financial audit',async()=>{await db.query("SELECT public.change_card_request($1,'delivery',_delivery=>55)",[oldId]);assert.equal(Number((await request(oldId)).total),655);assert.deepEqual((await request(oldId)).financial_snapshot,old.financial_snapshot);const h=(await db.query<any>('SELECT financial_change FROM public.card_request_history WHERE request_id=$1 AND financial_change IS NOT NULL',[oldId])).rows[0];assert.equal(h.financial_change.previous.total,650);assert.equal(h.financial_change.new.total,655);});
await db.exec("SET test.admin='false'");
await test('unverified users denied settings read/write RPCs',async()=>{await assert.rejects(()=>db.query('SELECT public.get_card_delivery_settings()'),/ADMIN_REQUIRED/);await assert.rejects(()=>save(flat),/ADMIN_REQUIRED/);});
await test('ordinary users denied order financial changes',async()=>{await assert.rejects(()=>db.query("SELECT public.change_card_request($1,'delivery',_delivery=>1)",[oldId]),/ADMIN_REQUIRED/);});
await test('RLS hides settings and audit; direct writes denied',async()=>{await db.exec('SET ROLE authenticated');assert.equal((await db.query('SELECT * FROM public.card_delivery_settings')).rows.length,0);assert.equal((await db.query('SELECT * FROM public.card_settings_history')).rows.length,0);await assert.rejects(()=>db.query('UPDATE public.card_delivery_settings SET unit_price=1'),/permission denied/);await db.exec('RESET ROLE');});
await test('customer cancellation and safe history still work',async()=>{await db.query("SELECT public.change_card_request($1,'customer_cancel')",[oldId]);const r=(await db.query<any>('SELECT public.get_card_request($1) r',[oldId])).rows[0].r;assert.equal(r.request.status,'cancelled');assert.ok(r.history.every((h:any)=>!('financial_change' in h)&&!('changed_by' in h)));});
await db.close();console.log(`${passed} isolated database acceptance tests passed.`);