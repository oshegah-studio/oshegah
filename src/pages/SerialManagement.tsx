import {useEffect,useMemo,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Loader2,Plus,Search,UserPlus} from 'lucide-react';
import {toast} from 'sonner';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Switch} from '@/components/ui/switch';
import {Checkbox} from '@/components/ui/checkbox';
import {Tabs,TabsContent,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {CardShell,RequestError} from '@/features/cards/ui';
import {parseSerialList,serialError,useSerialText,SERIAL_PATTERN,type OwnedProfile,type SerialEvent,type SerialRow,type UserHit} from '@/features/serials/model';

type Text=ReturnType<typeof useSerialText>['text'];
interface ListResult{rows:SerialRow[];total:number;counts:Record<string,number>;self_activation:boolean}
const rpc=async<T,>(fn:string,args:Record<string,unknown>={})=>{const {data,error}=await (supabase.rpc as unknown as (f:string,a:Record<string,unknown>)=>Promise<{data:unknown;error:unknown}>)(fn,args);if(error)throw error;return data as T;};
const selectCls='h-10 min-w-0 rounded-md border border-input bg-background px-3 text-sm';

export function StatusPill({value,text}:{value:string;text:Text}){const tone=value==='active'?'border-primary/30 bg-primary/10 text-primary':value==='revoked'?'border-destructive/30 bg-destructive/5 text-destructive':value==='assigned'?'border-accent bg-accent/40 text-foreground':'border-border bg-muted text-muted-foreground';return <span className={`inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${tone}`}>{text.statusNames[value]||value}</span>;}

export default function SerialManagement(){
 const {text,lang}=useSerialText();const qc=useQueryClient();const [params,setParams]=useSearchParams();
 const [page,setPage]=useState(1);const [search,setSearch]=useState('');const [assignment,setAssignment]=useState('');const [activation,setActivation]=useState('');const [sort,setSort]=useState('created');
 const [registerOpen,setRegisterOpen]=useState(false);const [assignOpen,setAssignOpen]=useState(Boolean(params.get('assignUser')));const [detail,setDetail]=useState<string|null>(null);
 useEffect(()=>{setPage(1);},[search,assignment,activation,sort]);
 const list=useQuery({queryKey:['serials',page,search,assignment,activation,sort],queryFn:()=>rpc<ListResult>('admin_list_serials',{_page:page,_search:search.trim(),_assignment:assignment,_activation:activation,_sort:sort})});
 const refresh=()=>qc.invalidateQueries({queryKey:['serials']});
 const date=(s:string|null)=>s?new Date(s).toLocaleDateString(lang==='ar'?'ar-EG':'en-GB'):'—';
 const counts=list.data?.counts;
 const summary:[string,number|undefined][]=[[text.total,counts?.total],[text.unassigned,counts?.unassigned],[text.assigned,counts?.assigned],[text.active,counts?.active],[text.inactive,counts?.inactive],[text.revoked,counts?.revoked]];
 const toggleSelf=async(v:boolean)=>{try{await rpc('save_serial_settings',{_self_activation:v});toast.success(text.saved);refresh();}catch(e){toast.error(serialError(e,text));}};
 return <CardShell title={text.title} admin actions={<><Button variant="outline" onClick={()=>setRegisterOpen(true)}><Plus className="me-2 h-4 w-4"/><span className="hidden sm:inline">{text.register}</span></Button><Button onClick={()=>setAssignOpen(true)}><UserPlus className="me-2 h-4 w-4"/><span className="hidden sm:inline">{text.assign}</span></Button></>}>
  <div className="min-w-0 space-y-6">
   <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">{summary.map(([l,v])=><div key={l} className="rounded-xl border border-border bg-card p-4"><dt className="text-xs text-muted-foreground">{l}</dt><dd className="mt-1 font-display text-2xl font-semibold">{v??'—'}</dd></div>)}</dl>
   <div className="flex items-center gap-3 rounded-xl border border-border p-4"><Switch id="self-activation" checked={Boolean(list.data?.self_activation)} disabled={!list.data} onCheckedChange={v=>void toggleSelf(v)}/><Label htmlFor="self-activation" className="leading-snug">{text.selfActivation}</Label></div>
   <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
    <div className="relative"><Search className="pointer-events-none absolute start-3 top-3 h-4 w-4 text-muted-foreground"/><Input aria-label={text.search} placeholder={text.search} className="ps-9" value={search} maxLength={100} onChange={e=>setSearch(e.target.value)}/></div>
    <select aria-label={text.assignment} className={selectCls} value={assignment} onChange={e=>setAssignment(e.target.value)}><option value="">{text.assignment}: {text.all}</option>{['unassigned','assigned'].map(s=><option key={s} value={s}>{text.statusNames[s]}</option>)}</select>
    <select aria-label={text.activation} className={selectCls} value={activation} onChange={e=>setActivation(e.target.value)}><option value="">{text.activation}: {text.all}</option>{['inactive','active','revoked'].map(s=><option key={s} value={s}>{text.statusNames[s]}</option>)}</select>
    <select aria-label="Sort" className={selectCls} value={sort} onChange={e=>setSort(e.target.value)}><option value="created">{text.sortCreated}</option><option value="assigned">{text.sortAssigned}</option></select>
   </div>
   {list.isLoading?<p className="py-8 text-muted-foreground">{text.loading}</p>:list.isError?<RequestError retry={()=>void list.refetch()}/>:list.data!.rows.length===0?<p className="rounded-xl border border-dashed border-border py-12 text-center text-muted-foreground">{text.empty}</p>:<>
    <div className="hidden overflow-x-auto rounded-xl border border-border md:block"><table className="w-full text-sm"><thead className="bg-muted/50 text-start text-xs text-muted-foreground"><tr>{[text.serial,text.user,text.username,text.assignment,text.activation,text.assignedAt,text.activatedAt,text.actions].map(h=><th key={h} className="px-3 py-2 text-start font-medium">{h}</th>)}</tr></thead><tbody className="divide-y divide-border">{list.data!.rows.map(r=><tr key={r.id}><td className="px-3 py-2 font-mono" dir="ltr">{r.serial}</td><td className="max-w-[14rem] truncate px-3 py-2">{r.owner_email||'—'}</td><td className="px-3 py-2" dir="ltr">{r.username?'@'+r.username:'—'}</td><td className="px-3 py-2"><StatusPill value={r.assignment_status} text={text}/></td><td className="px-3 py-2"><StatusPill value={r.activation_status} text={text}/></td><td className="px-3 py-2">{date(r.assigned_at)}</td><td className="px-3 py-2">{date(r.activated_at)}</td><td className="px-3 py-2"><Button size="sm" variant="outline" onClick={()=>setDetail(r.id)}>{text.view}</Button></td></tr>)}</tbody></table></div>
    <ul className="space-y-3 md:hidden">{list.data!.rows.map(r=><li key={r.id} className="space-y-2 rounded-xl border border-border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-sm" dir="ltr">{r.serial}</span><div className="flex gap-1"><StatusPill value={r.assignment_status} text={text}/><StatusPill value={r.activation_status} text={text}/></div></div><p className="break-all text-sm text-muted-foreground">{r.owner_email||'—'}{r.username?` · @${r.username}`:''}</p><Button size="sm" variant="outline" className="w-full" onClick={()=>setDetail(r.id)}>{text.view}</Button></li>)}</ul>
    <div className="flex flex-wrap items-center gap-3"><Button variant="outline" disabled={page===1} onClick={()=>setPage(p=>p-1)}>{text.previous}</Button><span className="text-sm">{text.page} {page} / {Math.max(1,Math.ceil(list.data!.total/20))}</span><Button variant="outline" disabled={page*20>=list.data!.total} onClick={()=>setPage(p=>p+1)}>{text.next}</Button></div>
   </>}
  </div>
  <RegisterDialog open={registerOpen} onOpenChange={setRegisterOpen} onDone={refresh}/>
  <AssignDialog open={assignOpen} onOpenChange={o=>{setAssignOpen(o);if(!o&&params.get('assignUser'))setParams({},{replace:true});}} presetUser={params.get('assignUser')} presetRequest={params.get('request')} presetCustomer={params.get('customer')} onDone={refresh}/>
  <SerialDetail id={detail} onClose={()=>setDetail(null)} onChanged={refresh}/>
 </CardShell>;
}

function ResultLists({r,text}:{r:Record<string,string[]>;text:Text}){const groups:[string,string,string[]][]=[['created',text.created,r.created],['valid',text.validNew,r.valid],['existing',text.existing,r.existing],['duplicates',text.duplicates,r.duplicates],['invalid',text.invalidList,r.invalid]];return <div className="space-y-3">{groups.filter(g=>g[2]?.length).map(([k,l,items])=><div key={k}><p className={`text-sm font-medium ${k==='invalid'||k==='existing'||k==='duplicates'?'text-destructive':''}`}>{l} ({items.length})</p><p className="max-h-28 overflow-y-auto break-all font-mono text-xs text-muted-foreground" dir="ltr">{items.join(', ')}</p></div>)}</div>;}

function RegisterDialog({open,onOpenChange,onDone}:{open:boolean;onOpenChange:(o:boolean)=>void;onDone:()=>void}){
 const {text}=useSerialText();const [tab,setTab]=useState('single');const [single,setSingle]=useState('');const [bulk,setBulk]=useState('');const [count,setCount]=useState('10');const [preview,setPreview]=useState<Record<string,string[]>|null>(null);const [result,setResult]=useState<Record<string,string[]>|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 useEffect(()=>{if(!open){setSingle('');setBulk('');setPreview(null);setResult(null);setError('');}},[open]);
 const run=async(list:string[],commit:boolean)=>{setBusy(true);setError('');try{const r=await rpc<Record<string,string[]>>('admin_register_serials',{_serials:list,_commit:commit});if(commit){setResult(r);setPreview(null);onDone();toast.success(`${text.importDone}: ${r.created.length}`);}else setPreview(r);}catch(e){setError(serialError(e,text));}finally{setBusy(false);}};
 const singleValid=SERIAL_PATTERN.test(single.trim().toUpperCase());
 const generate=async()=>{const n=Number(count);if(!Number.isInteger(n)||n<1||n>500){setError(text.failed);return;}setBusy(true);setError('');try{const r=await rpc<{created:string[]}>('admin_generate_serials',{_count:n});setResult({created:r.created});onDone();}catch(e){setError(serialError(e,text));}finally{setBusy(false);}};
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-xl overflow-y-auto"><DialogHeader><DialogTitle>{text.register}</DialogTitle><DialogDescription>{text.formatHint}</DialogDescription></DialogHeader>
  <Tabs value={tab} onValueChange={v=>{setTab(v);setPreview(null);setResult(null);setError('');}}><TabsList className="grid w-full grid-cols-3"><TabsTrigger value="single">{text.single}</TabsTrigger><TabsTrigger value="bulk">{text.bulk}</TabsTrigger><TabsTrigger value="generate">{text.generate}</TabsTrigger></TabsList>
   <TabsContent value="single" className="space-y-3 pt-3"><Label htmlFor="serial-single">{text.serial}</Label><Input id="serial-single" dir="ltr" placeholder={text.serialPlaceholder} value={single} maxLength={20} onChange={e=>setSingle(e.target.value)} aria-invalid={Boolean(single)&&!singleValid}/>{single&&!singleValid&&<p className="text-xs text-destructive">{text.formatHint}</p>}<Button disabled={busy||!singleValid} onClick={()=>void run([single],true)}>{busy&&<Loader2 className="me-2 h-4 w-4 animate-spin"/>}{text.register}</Button></TabsContent>
   <TabsContent value="bulk" className="space-y-3 pt-3"><Label htmlFor="serial-bulk">{text.bulkHint}</Label><Textarea id="serial-bulk" dir="ltr" rows={7} className="font-mono" value={bulk} onChange={e=>{setBulk(e.target.value);setPreview(null);}}/><Input type="file" accept=".csv,text/csv,text/plain" aria-label={text.csv} onChange={async e=>{const f=e.target.files?.[0];if(f&&f.size<1_000_000){setBulk(await f.text());setPreview(null);}}}/><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy||!bulk.trim()} onClick={()=>void run(parseSerialList(bulk),false)}>{text.preview}</Button>{preview&&<Button disabled={busy||preview.valid.length===0} onClick={()=>void run(preview.valid,true)}>{busy&&<Loader2 className="me-2 h-4 w-4 animate-spin"/>}{text.confirmRegister} ({preview.valid.length})</Button>}</div>{preview&&<ResultLists r={{...preview,created:[]}} text={text}/>}</TabsContent>
   <TabsContent value="generate" className="space-y-3 pt-3"><Label htmlFor="serial-count">{text.count}</Label><Input id="serial-count" type="number" min={1} max={500} step={1} value={count} onChange={e=>setCount(e.target.value)}/><Button disabled={busy} onClick={()=>void generate()}>{busy&&<Loader2 className="me-2 h-4 w-4 animate-spin"/>}{text.generate}</Button></TabsContent>
  </Tabs>
  {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  {result&&<div className="rounded-lg border border-border p-3"><p className="mb-2 font-medium">{text.importDone}</p><ResultLists r={{created:result.created||[],existing:result.existing||[],duplicates:result.duplicates||[],invalid:result.invalid||[],valid:[]}} text={text}/></div>}
 </DialogContent></Dialog>;
}

function UserPicker({value,onChange}:{value:UserHit|null;onChange:(u:UserHit|null)=>void}){
 const {text}=useSerialText();const [q,setQ]=useState('');
 const hits=useQuery({queryKey:['serial-users',q],enabled:q.trim().length>=2,queryFn:()=>rpc<UserHit[]>('admin_search_serial_users',{_q:q.trim()})});
 if(value)return <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3"><div className="min-w-0"><p className="break-all font-medium">{value.email}</p><p className="text-xs text-muted-foreground">{value.full_name||''} {value.profiles.map(p=>'@'+p.username).join(' ')}</p></div><Button size="sm" variant="ghost" onClick={()=>onChange(null)}>{text.back}</Button></div>;
 return <div className="space-y-2"><Input aria-label={text.findUser} placeholder={text.findUser} value={q} onChange={e=>setQ(e.target.value)}/>{hits.isFetching&&<p className="text-xs text-muted-foreground">{text.loading}</p>}<ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-lg border border-border empty:hidden">{(hits.data||[]).map(u=><li key={u.user_id}><button type="button" className="w-full p-3 text-start hover:bg-muted" onClick={()=>onChange(u)}><p className="break-all text-sm font-medium">{u.email}</p><p className="text-xs text-muted-foreground">{u.full_name||''} {u.profiles.map(p=>'@'+p.username).join(' ')}</p></button></li>)}</ul></div>;
}
function ProfileSelect({profiles,value,onChange,id}:{profiles:OwnedProfile[];value:string;onChange:(v:string)=>void;id:string}){const {text}=useSerialText();return <div className="space-y-1.5"><Label htmlFor={id}>{text.linkProfile}</Label><select id={id} className={selectCls+' w-full'} value={value} onChange={e=>onChange(e.target.value)}><option value="">{text.noProfile}</option>{profiles.map(p=><option key={p.id} value={p.id}>@{p.username} · {p.full_name}</option>)}</select></div>;}

function AssignDialog({open,onOpenChange,presetUser,presetRequest,presetCustomer,onDone}:{open:boolean;onOpenChange:(o:boolean)=>void;presetUser:string|null;presetRequest:string|null;presetCustomer:string|null;onDone:()=>void}){
 const {text}=useSerialText();const [step,setStep]=useState(1);const [user,setUser]=useState<UserHit|null>(null);const [customer,setCustomer]=useState('');const [q,setQ]=useState('');const [picked,setPicked]=useState<Record<string,string>>({});const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 useEffect(()=>{if(!open){setStep(1);setUser(null);setPicked({});setError('');setQ('');return;}if(presetUser&&!user)void rpc<UserHit[]>('admin_search_serial_users',{_q:presetUser}).then(r=>{if(r[0]){setUser(r[0]);setCustomer(presetCustomer&&r[0].profiles.some(p=>p.id===presetCustomer)?presetCustomer:r[0].profiles[0]?.id||'');}});},[open]);// eslint-disable-line react-hooks/exhaustive-deps
 const avail=useQuery({queryKey:['serials-available',q],enabled:open&&step===2,queryFn:()=>rpc<ListResult>('admin_list_serials',{_page:1,_search:q.trim(),_assignment:'unassigned',_activation:'inactive'})});
 const ids=Object.keys(picked);
 const confirm=async()=>{if(!user)return;setBusy(true);setError('');try{const n=await rpc<number>('admin_assign_serials',{_user:user.user_id,_ids:ids,_customer:customer||null,_request:presetRequest||null});toast.success(`${text.assigned}: ${n}`);onDone();onOpenChange(false);}catch(e){setError(serialError(e,text));setStep(2);void avail.refetch();}finally{setBusy(false);}};
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-xl overflow-y-auto"><DialogHeader><DialogTitle>{text.assign} · {step}/3</DialogTitle><DialogDescription>{text.notAssignedYet}</DialogDescription></DialogHeader>
  {step===1&&<div className="space-y-4"><UserPicker value={user} onChange={u=>{setUser(u);setCustomer(u?.profiles[0]?.id||'');}}/>{user&&<ProfileSelect id="assign-profile" profiles={user.profiles} value={customer} onChange={setCustomer}/>}</div>}
  {step===2&&<div className="space-y-3"><Input aria-label={text.findSerial} placeholder={text.findSerial} dir="ltr" value={q} onChange={e=>setQ(e.target.value)}/><p className="text-xs text-muted-foreground">{ids.length} {text.selected}</p>{avail.isLoading?<p>{text.loading}</p>:<ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">{(avail.data?.rows||[]).length===0&&<li className="p-3 text-sm text-muted-foreground">{text.empty}</li>}{(avail.data?.rows||[]).map(r=><li key={r.id}><label className="flex cursor-pointer items-center gap-3 p-3 hover:bg-muted"><Checkbox checked={Boolean(picked[r.id])} onCheckedChange={c=>setPicked(p=>{const n={...p};if(c)n[r.id]=r.serial;else delete n[r.id];return n;})}/><span className="font-mono text-sm" dir="ltr">{r.serial}</span></label></li>)}</ul>}</div>}
  {step===3&&user&&<dl className="space-y-3 text-sm"><div><dt className="text-muted-foreground">{text.user}</dt><dd className="break-all font-medium">{user.email}</dd></div><div><dt className="text-muted-foreground">{text.profile}</dt><dd>{user.profiles.find(p=>p.id===customer)?'@'+user.profiles.find(p=>p.id===customer)!.username:text.noProfile}</dd></div><div><dt className="text-muted-foreground">{text.serial} ({ids.length})</dt><dd><ul className="font-mono" dir="ltr">{Object.values(picked).map(s=><li key={s}>{s}</li>)}</ul></dd></div><p className="rounded-md bg-muted p-3 text-xs">{text.notAssignedYet}</p></dl>}
  {error&&<p role="alert" className="break-words text-sm text-destructive">{error}</p>}
  <DialogFooter className="gap-2">{step>1&&<Button variant="outline" onClick={()=>setStep(s=>s-1)}>{text.back}</Button>}{step<3?<Button disabled={step===1?!user:ids.length===0} onClick={()=>setStep(s=>s+1)}>{step===2?text.review:text.selectSerials}</Button>:<Button disabled={busy} onClick={()=>void confirm()}>{busy&&<Loader2 className="me-2 h-4 w-4 animate-spin"/>}{text.confirm}</Button>}</DialogFooter>
 </DialogContent></Dialog>;
}

type Action='activate'|'deactivate'|'revoke'|'restore'|'reassign';
function SerialDetail({id,onClose,onChanged}:{id:string|null;onClose:()=>void;onChanged:()=>void}){
 const {text,lang}=useSerialText();
 const q=useQuery({queryKey:['serial',id],enabled:Boolean(id),queryFn:()=>rpc<{serial:SerialRow&{admin_notes:string;last_actor_label:string|null};events:SerialEvent[];owner_profiles:OwnedProfile[]}>('admin_get_serial',{_id:id})});
 const [action,setAction]=useState<Action|null>(null);const [reason,setReason]=useState('');const [newUser,setNewUser]=useState<UserHit|null>(null);const [newCustomer,setNewCustomer]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [notes,setNotes]=useState('');
 useEffect(()=>{setNotes(q.data?.serial.admin_notes||'');},[q.data?.serial.admin_notes]);
 const s=q.data?.serial;const dt=(v:string|null)=>v?new Date(v).toLocaleString(lang==='ar'?'ar-EG':'en-GB'):'—';
 const after=()=>{void q.refetch();onChanged();};
 const run=async()=>{if(!s||!action)return;setBusy(true);setError('');try{if(action==='reassign')await rpc('admin_reassign_serial',{_id:s.id,_user:newUser?.user_id,_customer:newCustomer||null,_reason:reason});else await rpc('admin_set_serial_activation',{_id:s.id,_action:action,_reason:reason});toast.success(text.saved);setAction(null);after();}catch(e){setError(serialError(e,text));}finally{setBusy(false);}};
 const link=async(c:string)=>{if(!s)return;try{await rpc('set_serial_profile',{_id:s.id,_customer:c||null});toast.success(text.saved);after();}catch(e){toast.error(serialError(e,text));}};
 const saveNotes=async()=>{if(!s)return;try{await rpc('admin_update_serial_notes',{_id:s.id,_notes:notes});toast.success(text.saved);}catch(e){toast.error(serialError(e,text));}};
 const actions:Action[]=!s?[]:s.activation_status==='revoked'?['restore']:[...(s.assignment_status==='assigned'&&s.activation_status==='inactive'?['activate' as Action]:[]),...(s.activation_status==='active'?['deactivate' as Action]:[]),...(s.assignment_status==='assigned'?['reassign' as Action]:[]),'revoke'];
 const needsReason=action&&action!=='activate';
 return <Sheet open={Boolean(id)} onOpenChange={o=>{if(!o){onClose();setAction(null);}}}><SheetContent className="w-full overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle className="font-mono" dir="ltr">{s?.serial||text.loading}</SheetTitle><SheetDescription>{text.notAssignedYet}</SheetDescription></SheetHeader>
  {q.isError?<RequestError retry={()=>void q.refetch()}/>:s&&<div className="mt-6 space-y-6">
   <div className="flex flex-wrap gap-2"><StatusPill value={s.assignment_status} text={text}/><StatusPill value={s.activation_status} text={text}/></div>
   <dl className="grid grid-cols-2 gap-3 text-sm">{([[text.currentOwner,s.owner_email||'—'],[text.profile,s.username?'@'+s.username:text.noProfile],[text.createdAt,dt(s.created_at)],[text.assignedAt,dt(s.assigned_at)],[text.activatedAt,dt(s.activated_at)],[text.updatedAt,dt(s.updated_at)]] as [string,string][]).map(([l,v])=><div key={l} className="min-w-0"><dt className="text-xs text-muted-foreground">{l}</dt><dd className="break-words">{v}</dd></div>)}</dl>
   {s.owner_user_id&&s.activation_status!=='revoked'&&<ProfileSelect id="detail-profile" profiles={q.data!.owner_profiles} value={s.customer_id||''} onChange={c=>void link(c)}/>}
   <div className="flex flex-wrap gap-2">{actions.map(a=><Button key={a} size="sm" variant={a==='revoke'?'destructive':a==='activate'?'default':'outline'} onClick={()=>{setAction(a);setReason('');setError('');setNewUser(null);setNewCustomer('');}}>{text[a]}</Button>)}</div>
   <div className="space-y-2"><Label htmlFor="serial-notes">{text.notes}</Label><Textarea id="serial-notes" rows={3} maxLength={2000} value={notes} onChange={e=>setNotes(e.target.value)}/><Button size="sm" variant="outline" onClick={()=>void saveNotes()}>{text.saveNotes}</Button></div>
   <section><h3 className="mb-3 font-display font-semibold">{text.history}</h3><ol className="space-y-4 border-s border-border ps-4">{q.data!.events.map(e=><li key={e.id} className="text-sm"><p className="font-medium">{text.events[e.event_type]||e.event_type}</p><p className="text-xs text-muted-foreground">{dt(e.created_at)} · {e.actor_label}</p>{(e.previous_owner_email||e.new_owner_email)&&e.event_type!=='activated'&&e.event_type!=='deactivated'&&<p className="break-all text-xs">{e.previous_owner_email||'—'} → {e.new_owner_email||'—'}</p>}{e.reason&&<p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">{e.reason}</p>}</li>)}</ol></section>
  </div>}
  <Dialog open={Boolean(action)} onOpenChange={o=>!o&&setAction(null)}><DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto"><DialogHeader><DialogTitle>{action?text[action]:''} · <span dir="ltr" className="font-mono">{s?.serial}</span></DialogTitle><DialogDescription>{action==='revoke'?text.revokeWarn:action==='activate'?text.confirmActivate:text.reasonHint}</DialogDescription></DialogHeader>
   {action==='reassign'&&s&&<div className="space-y-3"><p className="text-sm"><span className="text-muted-foreground">{text.currentOwner}:</span> <span className="break-all">{s.owner_email}</span></p><Label>{text.newOwner}</Label><UserPicker value={newUser} onChange={u=>{setNewUser(u);setNewCustomer(u?.profiles[0]?.id||'');}}/>{newUser&&<ProfileSelect id="reassign-profile" profiles={newUser.profiles} value={newCustomer} onChange={setNewCustomer}/>}</div>}
   {needsReason&&<div className="space-y-1.5"><Label htmlFor="action-reason">{text.reason}</Label><Textarea id="action-reason" rows={3} maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></div>}
   {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
   <DialogFooter className="gap-2"><Button variant="outline" onClick={()=>setAction(null)}>{text.back}</Button><Button variant={action==='revoke'?'destructive':'default'} disabled={busy||(needsReason&&reason.trim().length<3)||(action==='reassign'&&!newUser)} onClick={()=>void run()}>{busy&&<Loader2 className="me-2 h-4 w-4 animate-spin"/>}{text.confirm}</Button></DialogFooter>
  </DialogContent></Dialog>
 </SheetContent></Sheet>;
}

export function useSerialRpc(){return useMemo(()=>rpc,[]);}
export {rpc as serialRpc};
