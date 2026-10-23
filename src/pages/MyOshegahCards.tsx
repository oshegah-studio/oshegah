import {useState} from 'react';
import {Link} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {CreditCard,Loader2} from 'lucide-react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle} from '@/components/ui/alert-dialog';
import {useAuth} from '@/hooks/useAuth';
import {CardShell,RequestError} from '@/features/cards/ui';
import {serialError,useSerialText,type MyCard,type OwnedProfile} from '@/features/serials/model';
import {StatusPill,serialRpc as rpc} from './SerialManagement';

export default function MyOshegahCards(){
 const {text,lang}=useSerialText();const {user}=useAuth();const [confirm,setConfirm]=useState<MyCard|null>(null);const [busy,setBusy]=useState(false);
 const q=useQuery({queryKey:['my-serials',user?.id],queryFn:()=>rpc<{cards:MyCard[];profiles:OwnedProfile[];self_activation:boolean}>('my_serial_cards')});
 const date=(s:string|null)=>s?new Date(s).toLocaleDateString(lang==='ar'?'ar-EG':'en-GB'):'—';
 const activate=async()=>{if(!confirm)return;setBusy(true);try{await rpc('activate_my_serial',{_id:confirm.id});toast.success(text.saved);setConfirm(null);void q.refetch();}catch(e){toast.error(serialError(e,text));}finally{setBusy(false);}};
 const link=async(card:MyCard,c:string)=>{try{await rpc('set_serial_profile',{_id:card.id,_customer:c||null});toast.success(text.saved);void q.refetch();}catch(e){toast.error(serialError(e,text));}};
 return <CardShell title={text.mine}>
  {q.isLoading?<p className="text-muted-foreground">{text.loading}</p>:q.isError?<RequestError retry={()=>void q.refetch()}/>:q.data!.cards.length===0?<div className="space-y-4 rounded-xl border border-dashed border-border py-12 text-center"><CreditCard className="mx-auto h-8 w-8 text-muted-foreground"/><p className="text-muted-foreground">{text.noCards}</p><Button asChild><Link to="/get-your-card">{text.requestCard}</Link></Button></div>:
  <ul className="grid max-w-4xl gap-4 sm:grid-cols-2">{q.data!.cards.map(c=><li key={c.id} className="space-y-3 rounded-xl border border-border bg-card p-5">
   <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono font-medium" dir="ltr">{c.serial}</span><StatusPill value={c.activation_status} text={text}/></div>
   <dl className="grid grid-cols-2 gap-2 text-sm"><div><dt className="text-xs text-muted-foreground">{text.assignedAt}</dt><dd>{date(c.assigned_at)}</dd></div><div><dt className="text-xs text-muted-foreground">{text.activatedAt}</dt><dd>{date(c.activated_at)}</dd></div></dl>
   {c.activation_status==='revoked'?<p className="text-sm text-destructive">{text.revokedNote}</p>:<>
    <div className="space-y-1.5"><Label htmlFor={'p-'+c.id}>{text.profile}</Label><select id={'p-'+c.id} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={c.customer_id||''} onChange={e=>void link(c,e.target.value)}><option value="">{text.noProfile}</option>{q.data!.profiles.map(p=><option key={p.id} value={p.id}>@{p.username}</option>)}</select></div>
    {c.activation_status==='inactive'&&(q.data!.self_activation?<Button className="w-full" onClick={()=>setConfirm(c)}>{text.activateYours}</Button>:<p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">{text.approval}</p>)}
   </>}
  </li>)}</ul>}
  <AlertDialog open={Boolean(confirm)} onOpenChange={o=>!o&&setConfirm(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{text.activateYours}</AlertDialogTitle><AlertDialogDescription><span className="block font-mono" dir="ltr">{confirm?.serial}</span>{text.confirmActivate}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{text.back}</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={e=>{e.preventDefault();void activate();}}>{busy&&<Loader2 className="me-2 h-4 w-4 animate-spin"/>}{text.activate}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </CardShell>;
}
