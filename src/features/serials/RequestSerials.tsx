import {Link} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {Button} from '@/components/ui/button';
import {serialRpc,StatusPill} from '@/pages/SerialManagement';
import {useSerialText,type SerialRow} from './model';

/** Admin-only: physical cards (serials) linked to a card request. Order status, assignment and activation stay separate. */
export function RequestSerials({requestId,userId,customerId,quantity}:{requestId:string;userId:string;customerId:string|null;quantity:number}){
 const {text}=useSerialText();
 const q=useQuery({queryKey:['serials','request',requestId],queryFn:()=>serialRpc<{rows:SerialRow[]}>('admin_list_serials',{_page:1,_request:requestId})});
 const rows=q.data?.rows||[];
 const qs=new URLSearchParams({assignUser:userId,request:requestId,...(customerId?{customer:customerId}:{})});
 return <section className="space-y-3 border-b border-border pb-6"><h2 className="font-display text-lg font-semibold">{text.physical} ({rows.length}/{quantity})</h2>
  {rows.length>0&&<ul className="space-y-2">{rows.map(r=><li key={r.id} className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm" dir="ltr">{r.serial}</span><StatusPill value={r.activation_status} text={text}/></li>)}</ul>}
  <Button variant="outline" size="sm" asChild><Link to={`/admin/serials?${qs}`}>{text.assignForRequest}</Link></Button>
  <p className="text-xs text-muted-foreground">{text.notAssignedYet}</p>
 </section>;
}
