import {useEffect,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Plus,Save,Trash2,Loader2} from 'lucide-react';
import {toast} from 'sonner';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/hooks/useAuth';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Switch} from '@/components/ui/switch';
import {RadioGroup,RadioGroupItem} from '@/components/ui/radio-group';
import {CardShell,RequestError} from '@/features/cards/ui';
import {formatMoney,useCardText} from '@/features/cards/model';
import {governorates,settingsSchema,settingsText,type CardSettings,type SettingsHistory} from '@/features/cards/settings';

export default function CardDeliverySettings(){
 const {lang,text:cardText}=useCardText();const text=settingsText[lang==='ar'?'ar':'en'];const {user}=useAuth();const qc=useQueryClient();const [page,setPage]=useState(1);const [form,setForm]=useState<CardSettings|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [conflict,setConflict]=useState(false);const [adding,setAdding]=useState('');
 const query=useQuery({queryKey:['card-settings',user?.id,page],queryFn:async()=>{const {data,error}=await supabase.rpc('get_card_delivery_settings',{_page:page});if(error)throw error;return data as unknown as {settings:CardSettings;history:SettingsHistory[];total:number};}});
 useEffect(()=>{if(query.data?.settings)setForm(query.data.settings);},[query.data?.settings.version]);
 const reload=async()=>{const next=await query.refetch();if(next.data){setForm(next.data.settings);setError('');setConflict(false);}};
 const save=async()=>{
  if(!form)return;const parsed=settingsSchema.safeParse(form);if(!parsed.success){setError(text.invalid);return;}setBusy(true);setError('');
  try{const {error}=await supabase.rpc('save_card_delivery_settings',{_version:form.version,_settings:parsed.data});if(error)throw error;await qc.invalidateQueries({queryKey:['card-config']});await qc.invalidateQueries({queryKey:['card-settings']});toast.success(text.saved);}catch(e){const code=e&&typeof e==='object'&&'message' in e?String(e.message):'';setConflict(code.includes('SETTINGS_CONFLICT'));setError(code.includes('SETTINGS_CONFLICT')?text.conflict:code.includes('INVALID')||code.includes('REQUIRED')?text.invalid:text.failed);}finally{setBusy(false);}
 };
 const date=(s:string)=>new Date(s).toLocaleString(lang==='ar'?'ar-EG':'en-GB');
 const number=(value:string)=>value.trim()===''?NaN:Number(value);
 const amountInput=(id:string,label:string,value:number|null,onChange:(v:number|null)=>void)=><div className="space-y-1.5"><Label htmlFor={id}>{label}</Label><Input id={id} type="number" min="0" step="0.01" inputMode="decimal" dir="ltr" value={value===null||Number.isNaN(value)?'':value} onChange={e=>onChange(e.target.value===''?null:number(e.target.value))}/></div>;
 const active=query.data?.settings;
 const displayValue=(v:unknown)=>{
  if(v===null)return text.pending;
  if(typeof v==='object'&&v){return Object.entries(v).map(([key,value])=>{const item=value as {fee:number;enabled:boolean};return `${governorates.find(g=>g[0]===key)?.[lang==='ar'?1:0]||key}: ${formatMoney(item.fee,lang)} · ${item.enabled?(lang==='ar'?'مفعّل':'Enabled'):(lang==='ar'?'معطّل':'Disabled')}`;}).join(' / ')||'—';}
  if(v==='flat')return text.flat;if(v==='governorate')return text.regional;return String(v);
 };
 const settingLabel=(key:string)=>({unit_price:text.price,max_quantity:text.max,delivery_mode:text.delivery,flat_fee:text.fee,governorate_fees:text.regional}[key]||key);
 return <CardShell title={text.title} admin>
  {query.isLoading?<p>{cardText.loading}</p>:query.isError||!form||!active?<RequestError retry={()=>void reload()}/>:<div className="max-w-4xl space-y-8">
   <form className="space-y-8" onSubmit={e=>{e.preventDefault();void save();}} noValidate>
    <fieldset disabled={busy} className="min-w-0 space-y-8">
     <section className="space-y-4 border-b border-border pb-7"><h2 className="font-display text-xl font-semibold">{text.pricing}</h2><div className="grid gap-6 sm:grid-cols-2">{amountInput('setting-price',text.price,form.unit_price,v=>setForm({...form,unit_price:v??NaN}))}<dl className="space-y-2 text-sm"><div><dt className="text-muted-foreground">{text.active}</dt><dd className="font-medium">{formatMoney(active.unit_price,lang)}</dd></div><div><dt className="text-muted-foreground">{text.updated}</dt><dd>{date(active.price_updated_at)}</dd></div>{active.price_updated_by_label&&<div><dt className="text-muted-foreground">{text.by}</dt><dd>{active.price_updated_by_label}</dd></div>}</dl></div></section>
     <section className="space-y-4 border-b border-border pb-7"><h2 className="font-display text-xl font-semibold">{text.limits}</h2><div className="grid gap-6 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="setting-max">{text.max}</Label><Input id="setting-max" type="number" inputMode="numeric" min="1" step="1" dir="ltr" value={Number.isNaN(form.max_quantity)?'':form.max_quantity} onChange={e=>setForm({...form,max_quantity:number(e.target.value)})}/></div><p className="text-sm text-muted-foreground">{text.activeMax}: <span className="font-medium text-foreground">{active.max_quantity}</span></p></div></section>
     <section className="min-w-0 space-y-5"><h2 className="font-display text-xl font-semibold">{text.delivery}</h2><RadioGroup value={form.delivery_mode} onValueChange={v=>setForm({...form,delivery_mode:v==='flat'?'flat':'governorate'})} className="flex flex-wrap gap-5">{(['flat','governorate'] as const).map(mode=><div key={mode} className="flex items-center gap-2"><RadioGroupItem id={'mode-'+mode} value={mode}/><Label htmlFor={'mode-'+mode}>{mode==='flat'?text.flat:text.regional}</Label></div>)}</RadioGroup>
      {form.delivery_mode==='flat'?<div className="max-w-sm space-y-2">{amountInput('setting-flat',text.fee,form.flat_fee,v=>setForm({...form,flat_fee:v}))}{active.flat_fee===null&&<p className="text-xs text-muted-foreground">{text.pending}</p>}</div>:<div className="space-y-4">
       <div className="flex flex-wrap gap-2"><select aria-label={text.select} className="h-10 min-w-0 max-w-full flex-1 rounded-md border border-input bg-background px-3 text-sm sm:flex-none" value={adding} onChange={e=>setAdding(e.target.value)}><option value="">{text.select}</option>{governorates.filter(g=>!form.governorate_fees[g[0]]).map(g=><option key={g[0]} value={g[0]}>{g[lang==='ar'?1:0]}</option>)}</select><Button type="button" variant="outline" disabled={!adding} onClick={()=>{setForm({...form,governorate_fees:{...form.governorate_fees,[adding]:{fee:NaN,enabled:true}}});setAdding('');}}><Plus className="me-2 h-4 w-4"/>{text.add}</Button></div>
       <ul className="divide-y divide-border">{Object.entries(form.governorate_fees).map(([region,item])=><li key={region} className="grid min-w-0 items-end gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]"><p className="self-center font-medium">{governorates.find(g=>g[0]===region)?.[lang==='ar'?1:0]||region}</p>{amountInput('fee-'+region,text.fee,item.fee,v=>setForm({...form,governorate_fees:{...form.governorate_fees,[region]:{...item,fee:v??NaN}}}))}<div className="flex items-center gap-2 py-2"><Switch id={'enabled-'+region} checked={item.enabled} onCheckedChange={enabled=>setForm({...form,governorate_fees:{...form.governorate_fees,[region]:{...item,enabled}}})}/><Label htmlFor={'enabled-'+region}>{text.enabled}</Label></div><Button type="button" variant="ghost" size="icon" title={text.remove} aria-label={`${text.remove}: ${region}`} onClick={()=>{const fees={...form.governorate_fees};delete fees[region];setForm({...form,governorate_fees:fees});}}><Trash2 className="h-4 w-4 text-destructive"/></Button></li>)}</ul>
      </div>}
     </section>
    </fieldset>
    {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex flex-wrap gap-3"><Button type="submit" disabled={busy||conflict}>{busy?<Loader2 className="me-2 h-4 w-4 animate-spin"/>:<Save className="me-2 h-4 w-4"/>}{text.save}</Button>{conflict&&<Button type="button" variant="outline" onClick={()=>void reload()}>{text.reload}</Button>}</div>
   </form>
   <section className="space-y-4 border-t border-border pt-7"><h2 className="font-display text-xl font-semibold">{text.history}</h2>{query.data.history.length===0?<p className="text-sm text-muted-foreground">{text.empty}</p>:<ol className="divide-y divide-border">{query.data.history.map(h=><li key={h.id} className="space-y-2 py-4"><h3 className="font-medium">{settingLabel(h.setting)}</h3><p className="break-words text-xs text-muted-foreground">{date(h.created_at)} · {h.actor_label}</p><dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">{text.previous}</dt><dd className="break-words">{h.setting==='unit_price'||h.setting==='flat_fee'?formatMoney(h.previous_value as number|null,lang):displayValue(h.previous_value)}</dd></div><div><dt className="text-muted-foreground">{text.next}</dt><dd className="break-words">{h.setting==='unit_price'||h.setting==='flat_fee'?formatMoney(h.new_value as number|null,lang):displayValue(h.new_value)}</dd></div></dl></li>)}</ol>}<div className="flex flex-wrap items-center gap-3"><Button variant="outline" disabled={page===1} onClick={()=>setPage(p=>p-1)}>{cardText.previous}</Button><span className="text-sm">{cardText.page} {page}</span><Button variant="outline" disabled={page*20>=query.data.total} onClick={()=>setPage(p=>p+1)}>{cardText.next}</Button></div></section>
  </div>}
 </CardShell>;
}