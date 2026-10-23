import {PGlite} from '@electric-sql/pglite';
import {readFileSync,readdirSync} from 'node:fs';
import {strict as assert} from 'node:assert';
import {parseSerialList} from '../src/features/serials/model';

// Runs the real serial migration in isolated Postgres; never touches production data.
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',U1='11111111-1111-4111-8111-111111111111',U2='22222222-2222-4222-8222-222222222222';
const P1='33333333-3333-4333-8333-333333333333',P2='44444444-4444-4444-8444-444444444444';
const db=new PGlite();
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
 CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT coalesce(current_setting('test.admin',true),'false')='true' $$;
 CREATE TABLE public.profiles(id uuid PRIMARY KEY,auth_user_id uuid,email text,full_name text,created_at timestamptz DEFAULT now());
 CREATE TABLE public.customers(id uuid PRIMARY KEY,user_id uuid,active boolean,full_name text,username text,created_at timestamptz DEFAULT now());
 CREATE TABLE public.card_requests(id uuid PRIMARY KEY,user_id uuid);
 CREATE TABLE public.admin_credentials(user_id uuid,username text);
 CREATE TABLE public.card_settings_history(setting text,previous_value jsonb,new_value jsonb,administrator uuid,actor_label text);
 INSERT INTO public.profiles VALUES('${U1}','${U1}','one@test.dev','One'),('${U2}','${U2}','two@test.dev','Two');
 INSERT INTO public.customers VALUES('${P1}','${U1}',true,'One','user_one'),('${P2}','${U2}',true,'Two','user_two');
 INSERT INTO public.admin_credentials VALUES('${A}','testadmin');`);
const file=readdirSync('drizzle/migrations').find(f=>f.endsWith('serial_numbers.sql'))!;
await db.exec(readFileSync(`drizzle/migrations/${file}`,'utf8'));
let passed=0;
async function test(name:string,fn:()=>Promise<void>|void){await fn();console.log(`PASS ${++passed}: ${name}`);}
async function as(uid:string,admin:boolean){await db.exec(`SET test.uid='${uid}'; SET test.admin='${admin}'`);}
async function q(sql:string,args:unknown[]=[]){return (await db.query<any>(sql,args)).rows;}
async function rejects(sql:string,args:unknown[],code:RegExp){await assert.rejects(()=>db.query(sql,args),code);}
const id=async(serial:string)=>(await q('SELECT id FROM serial_cards WHERE serial=$1',[serial]))[0].id;
const mine=async()=>(await q('SELECT public.my_serial_cards() r'))[0].r;

await as(A,true);
await test('admin registers a single serial',async()=>{const r=(await q('SELECT public.admin_register_serials($1,true) r',[['osh-a82k9m4p']]))[0].r;assert.deepEqual(r.created,['OSH-A82K9M4P']);});
await test('bulk preview classifies valid, invalid, duplicate and existing without writing',async()=>{const r=(await q('SELECT public.admin_register_serials($1,false) r',[['OSH-B73L2N5Q','OSH-B73L2N5Q','bad','OSH-A82K9M4P','OSH-C64R8T1W']]))[0].r;assert.deepEqual(r.valid,['OSH-B73L2N5Q','OSH-C64R8T1W']);assert.deepEqual(r.duplicates,['OSH-B73L2N5Q']);assert.deepEqual(r.invalid,['bad']);assert.deepEqual(r.existing,['OSH-A82K9M4P']);assert.equal((await q('SELECT count(*)::int n FROM serial_cards'))[0].n,1);});
await test('bulk register creates only new serials',async()=>{const r=(await q('SELECT public.admin_register_serials($1,true) r',[['OSH-B73L2N5Q','OSH-C64R8T1W','OSH-A82K9M4P','OSH-D11111111']]))[0].r;assert.deepEqual(r.created,['OSH-B73L2N5Q','OSH-C64R8T1W']);assert.deepEqual(r.existing,['OSH-A82K9M4P']);});
await test('duplicate serial rejected by database constraint',async()=>{await rejects("INSERT INTO serial_cards(serial) VALUES('OSH-A82K9M4P')",[],/duplicate|unique/);});
await test('generated serials match format and are unique',async()=>{const r=(await q('SELECT public.admin_generate_serials(5) r'))[0].r;assert.equal(r.created.length,5);for(const s of r.created)assert.match(s,/^OSH-[A-Z0-9]{8}$/);});
const a=await id('OSH-A82K9M4P'),b=await id('OSH-B73L2N5Q'),c=await id('OSH-C64R8T1W');
await test('admin assigns multiple serials to one user atomically; still inactive',async()=>{assert.equal((await q('SELECT public.admin_assign_serials($1,$2,$3) n',[U1,[a,b,c],P1]))[0].n,3);const rows=await q('SELECT assignment_status,activation_status,owner_user_id FROM serial_cards WHERE id=ANY($1)',[[a,b,c]]);for(const r of rows){assert.equal(r.assignment_status,'assigned');assert.equal(r.activation_status,'inactive');assert.equal(r.owner_user_id,U1);}});
await test('already-assigned serial cannot be assigned again (no partial assignment)',async()=>{const [extra]=(await q("SELECT id FROM serial_cards WHERE assignment_status='unassigned' LIMIT 1"));await rejects('SELECT public.admin_assign_serials($1,$2)',[U2,[extra.id,a]],/SERIAL_UNAVAILABLE: OSH-A82K9M4P/);assert.equal((await q('SELECT assignment_status s FROM serial_cards WHERE id=$1',[extra.id]))[0].s,'unassigned');});
await test("cannot link another user's profile",async()=>{const [extra]=(await q("SELECT id FROM serial_cards WHERE assignment_status='unassigned' LIMIT 1"));await rejects('SELECT public.admin_assign_serials($1,$2,$3)',[U1,[extra.id],P2],/PROFILE_NOT_OWNED/);});
await test('inactive card does not expose profile',async()=>{assert.equal((await q("SELECT public.resolve_serial('OSH-A82K9M4P') r"))[0].r.state,'inactive');});
await as(U1,false);
await test('owner sees own cards; self activation off requires approval',async()=>{const m=await mine();assert.equal(m.cards.length,3);assert.equal(m.self_activation,false);await rejects('SELECT public.activate_my_serial($1)',[a],/APPROVAL_REQUIRED/);});
await test('ordinary users cannot assign, reassign or change activation',async()=>{await rejects('SELECT public.admin_assign_serials($1,$2)',[U1,[a]],/ADMIN_REQUIRED/);await rejects('SELECT public.admin_reassign_serial($1,$2,null,$3)',[a,U2,'test'],/ADMIN_REQUIRED/);await rejects("SELECT public.admin_set_serial_activation($1,'activate')",[a],/ADMIN_REQUIRED/);await rejects('SELECT public.admin_list_serials()',[],/ADMIN_REQUIRED/);});
await as(A,true);
await test('admin enables self activation (audited)',async()=>{await q('SELECT public.save_serial_settings(true)');assert.equal((await q("SELECT count(*)::int n FROM card_settings_history WHERE setting='serial_self_activation'"))[0].n,1);});
await test('admin activates assigned card; resolves to linked profile',async()=>{await q("SELECT public.admin_set_serial_activation($1,'activate')",[a]);assert.deepEqual((await q("SELECT public.resolve_serial('osh-a82k9m4p') r"))[0].r,{state:'active',username:'user_one'});});
await test('unassigned card cannot be activated even by admin',async()=>{const [extra]=(await q("SELECT id FROM serial_cards WHERE assignment_status='unassigned' LIMIT 1"));await rejects("SELECT public.admin_set_serial_activation($1,'activate')",[extra.id],/INVALID_TRANSITION/);});
await as(U2,false);
await test("users cannot see or activate other users' cards",async()=>{assert.equal((await mine()).cards.length,0);await rejects('SELECT public.activate_my_serial($1)',[b],/SERIAL_NOT_FOUND/);await rejects('SELECT public.set_serial_profile($1,$2)',[b,P2],/SERIAL_NOT_FOUND/);});
await as(U1,false);
await test('owner self-activates an assigned inactive card',async()=>{await q('SELECT public.activate_my_serial($1)',[b]);assert.equal((await q('SELECT activation_status s FROM serial_cards WHERE id=$1',[b]))[0].s,'active');});
await as(A,true);
await test('reassignment keeps serial and activation, swaps owner and profile, needs reason',async()=>{await rejects('SELECT public.admin_reassign_serial($1,$2,$3,$4)',[a,U2,P2,''],/REASON_REQUIRED/);await q('SELECT public.admin_reassign_serial($1,$2,$3,$4)',[a,U2,P2,'Customer transfer']);const r=(await q('SELECT * FROM serial_cards WHERE id=$1',[a]))[0];assert.equal(r.serial,'OSH-A82K9M4P');assert.equal(r.activation_status,'active');assert.equal(r.owner_user_id,U2);assert.equal(r.customer_id,P2);assert.equal((await q("SELECT public.resolve_serial('OSH-A82K9M4P') r"))[0].r.username,'user_two');});
await as(U1,false);
await test('previous owner loses the card',async()=>{assert.ok(!(await mine()).cards.some((x:any)=>x.id===a));await rejects('SELECT public.set_serial_profile($1,$2)',[a,P1],/SERIAL_NOT_FOUND/);});
await as(U2,false);
await test('new owner sees reassigned card',async()=>{assert.ok((await mine()).cards.some((x:any)=>x.id===a&&x.serial==='OSH-A82K9M4P'));});
await as(A,true);
await test('deactivate and revoke need reasons; revoked hides profile and blocks reactivation',async()=>{await rejects("SELECT public.admin_set_serial_activation($1,'deactivate','')",[a],/REASON_REQUIRED/);await q("SELECT public.admin_set_serial_activation($1,'deactivate','Paused')",[a]);await q("SELECT public.admin_set_serial_activation($1,'revoke','Lost card')",[a]);assert.equal((await q("SELECT public.resolve_serial('OSH-A82K9M4P') r"))[0].r.state,'inactive');await rejects("SELECT public.admin_set_serial_activation($1,'activate')",[a],/INVALID_TRANSITION/);await rejects('SELECT public.admin_reassign_serial($1,$2,null,$3)',[a,U1,'again'],/INVALID_TRANSITION/);});
await as(U2,false);
await test('owner cannot self-activate a revoked card',async()=>{await rejects('SELECT public.activate_my_serial($1)',[a],/INVALID_TRANSITION/);});
await as(A,true);
await test('history records every event in order with owners and reasons',async()=>{const ev=(await q('SELECT public.admin_get_serial($1) r',[a]))[0].r.events;assert.deepEqual(ev.map((e:any)=>e.event_type),['registered','assigned','activated','reassigned','deactivated','revoked']);const re=ev[3];assert.equal(re.previous_owner,U1);assert.equal(re.new_owner,U2);assert.equal(re.reason,'Customer transfer');assert.equal(re.actor_label,'testadmin');});
await test('list: counts, search by email/username/serial, filters, pagination',async()=>{const l=(await q("SELECT public.admin_list_serials(1,'',''::text,'','created') r"))[0].r;assert.equal(l.counts.total,8);assert.equal(l.counts.assigned,3);assert.equal(l.counts.revoked,1);assert.equal((await q("SELECT public.admin_list_serials(1,'two@test') r"))[0].r.total,1);assert.equal((await q("SELECT public.admin_list_serials(1,'user_one') r"))[0].r.total,2);assert.equal((await q("SELECT public.admin_list_serials(1,'C64R') r"))[0].r.total,1);assert.equal((await q("SELECT public.admin_list_serials(1,'','unassigned','inactive') r"))[0].r.total,5);});
await test('direct table writes are refused for app users',async()=>{await db.exec('SET ROLE authenticated');try{await rejects("UPDATE public.serial_cards SET owner_user_id=$1",[U1],/permission denied/);await rejects("INSERT INTO public.serial_card_events(serial_id,event_type,actor_label) VALUES($1,'activated','x')",[a],/permission denied/);await rejects('DELETE FROM public.serial_card_events',[],/permission denied/);}finally{await db.exec('RESET ROLE');}});
await test('frontend list parser splits lines, commas and CSV cells',()=>{assert.deepEqual(parseSerialList('serial\nOSH-AAAA1111, osh-bbbb2222\n"OSH-CCCC3333";x\n\n'),['serial','OSH-AAAA1111','osh-bbbb2222','OSH-CCCC3333','x']);});
console.log(`${passed} serial tests passed`);
