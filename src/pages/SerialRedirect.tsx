import {useEffect} from 'react';
import {Link,useParams} from 'react-router-dom';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {CheckCircle2,CreditCard,Loader2} from 'lucide-react';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/hooks/useAuth';
import {useMyCustomer} from '@/hooks/useOshegah';
import {PageLoader} from '@/components/states';
import {Seo} from '@/components/Seo';
import {Button} from '@/components/ui/button';
import {CustomerService} from '@/components/CustomerService';
import {OshegahLogo} from '@/components/OshegahLogo';
import {useI18n} from '@/i18n';
import {rememberReturn,clearReturn} from '@/features/cards/intent';
import PublicProfile from './PublicProfile';

type Resolved={state:'unknown'|'revoked'|'unassigned'|'active'|'pending'|'unlinked'|'inactive';serial?:string;username?:string;self_activation?:boolean;mine?:boolean};

const copy={
 en:{readyTitle:'Your OSHEGAH Card Is Ready',readyBody:'Connect your card to your digital identity to start sharing your profile with a single touch.',login:'Log In',signup:'Create Account',
  needProfileTitle:'Create your OSHEGAH profile first.',needProfileBody:'Your profile is what people will see when they scan or tap your card. Once your profile is ready, you can connect this card to it.',createProfile:'Create My Profile',
  confirm:'Connect this card to your account and the profile below?',activate:'Activate My Card',approvalNote:'After you connect it, the OSHEGAH team will activate the card.',
  doneTitle:'Your OSHEGAH Card Is Activated!',doneBody:'Your card is now connected to your profile. You can share your digital identity with a single touch.',openProfile:'Open My Profile',
  pendingTitle:'Your card is awaiting activation',pendingBody:'This card is connected to your account. The OSHEGAH team will activate it shortly.',myCards:'My OSHEGAH Cards',
  inactiveTitle:'This OSHEGAH card isn’t active',inactiveBody:'This card requires activation by the OSHEGAH team.',unlinkedBody:'This card isn’t linked to a profile right now.',
  revokedTitle:'This OSHEGAH card is no longer active.',revokedBody:'It can’t be used or claimed. Contact us if you think this is a mistake.',
  unknownTitle:'We couldn’t find this OSHEGAH card.',unknownBody:'The serial number may be invalid, or the card may not be registered in our system yet.',
  serial:'Serial number',home:'Back to OSHEGAH',error:'Something went wrong. Please try again.',
  errors:{SERIAL_ALREADY_ASSIGNED:'This card has already been claimed.',SERIAL_REVOKED:'This card is no longer active.',PROFILE_NOT_OWNED:'You can only connect your own profile.',SERIAL_NOT_FOUND:'We couldn’t find this card.'} as Record<string,string>},
 ar:{readyTitle:'بطاقة OSHEGAH الخاصة بك جاهزة',readyBody:'اربط بطاقتك بهويتك الرقمية لتبدأ بمشاركة ملفك بلمسة واحدة.',login:'تسجيل الدخول',signup:'إنشاء حساب',
  needProfileTitle:'أنشئ ملفك في OSHEGAH أولًا.',needProfileBody:'ملفك هو ما سيراه الناس عند مسح بطاقتك أو لمسها. بعد تجهيز ملفك يمكنك ربط هذه البطاقة به.',createProfile:'إنشاء ملفي',
  confirm:'هل تريد ربط هذه البطاقة بحسابك وبالملف أدناه؟',activate:'تفعيل بطاقتي',approvalNote:'بعد الربط، سيقوم فريق OSHEGAH بتفعيل البطاقة.',
  doneTitle:'تم تفعيل بطاقة OSHEGAH الخاصة بك!',doneBody:'بطاقتك الآن مرتبطة بملفك. يمكنك مشاركة هويتك الرقمية بلمسة واحدة.',openProfile:'فتح ملفي',
  pendingTitle:'بطاقتك بانتظار التفعيل',pendingBody:'هذه البطاقة مرتبطة بحسابك، وسيقوم فريق OSHEGAH بتفعيلها قريبًا.',myCards:'بطاقات OSHEGAH الخاصة بي',
  inactiveTitle:'بطاقة OSHEGAH هذه غير مفعّلة',inactiveBody:'تحتاج هذه البطاقة إلى تفعيل من فريق OSHEGAH.',unlinkedBody:'هذه البطاقة غير مرتبطة بملف حاليًا.',
  revokedTitle:'بطاقة OSHEGAH هذه لم تعد نشطة.',revokedBody:'لا يمكن استخدامها أو المطالبة بها. تواصل معنا إذا كنت تعتقد أن هذا خطأ.',
  unknownTitle:'لم نتمكن من العثور على بطاقة OSHEGAH هذه.',unknownBody:'قد يكون الرقم التسلسلي غير صحيح، أو لم تُسجّل البطاقة في نظامنا بعد.',
  serial:'الرقم التسلسلي',home:'العودة إلى OSHEGAH',error:'حدث خطأ ما. حاول مرة أخرى.',
  errors:{SERIAL_ALREADY_ASSIGNED:'تمت المطالبة بهذه البطاقة بالفعل.',SERIAL_REVOKED:'هذه البطاقة لم تعد نشطة.',PROFILE_NOT_OWNED:'يمكنك ربط ملفك الخاص فقط.',SERIAL_NOT_FOUND:'لم نتمكن من العثور على هذه البطاقة.'} as Record<string,string>},
};

/** Physical card destination (/OSH-XXXXXXXX and legacy /s/<serial>). The database is the source of truth. */
export default function SerialRedirect({serial:fixed}:{serial?:string}={}){
 const params=useParams();const serial=(fixed??params.serial??'').toUpperCase();
 const {lang}=useI18n() as {lang?:string};const text=lang==='ar'?copy.ar:copy.en;
 const {user,loading:authLoading}=useAuth() as {user:unknown;loading?:boolean};
 const qc=useQueryClient();
 const q=useQuery({queryKey:['serial-resolve',serial,Boolean(user)],retry:false,queryFn:async()=>{const {data,error}=await supabase.rpc('resolve_serial',{_serial:serial});if(error)throw error;return data as unknown as Resolved;}});
 const me=useMyCustomer();
 const claim=useMutation({mutationFn:async(customer:string)=>{const {data,error}=await supabase.rpc('claim_serial',{_serial:serial,_customer:customer});if(error)throw error;return data as unknown as {state:string;username:string};},
  onSuccess:()=>{clearReturn();qc.invalidateQueries({queryKey:['serial-resolve',serial]});}});
 const path=`/${serial}`;
 const unassigned=q.data?.state==='unassigned';
 useEffect(()=>{if(unassigned&&user&&me.data)clearReturn();},[unassigned,user,me.data]);

 if(q.isLoading||authLoading)return <PageLoader label="…"/>;
 if(q.data?.state==='active'&&q.data.username&&!claim.data)return <PublicProfile username={q.data.username}/>;

 let title='',body='',content:React.ReactNode=null;
 const s=q.data?.state;
 if(claim.data){
  const active=claim.data.state==='active';
  title=active?text.doneTitle:text.pendingTitle;body=active?text.doneBody:text.pendingBody;
  content=active?<Button asChild><Link to={`/${claim.data.username}`}>{text.openProfile}</Link></Button>:<Button asChild variant="outline"><Link to="/my-oshegah-cards">{text.myCards}</Link></Button>;
 }else if(q.isError||!q.data||s==='unknown'){title=text.unknownTitle;body=text.unknownBody;content=<CustomerService/>;}
 else if(s==='revoked'){title=text.revokedTitle;body=text.revokedBody;content=<CustomerService/>;}
 else if(s==='pending'){title=text.pendingTitle;body=text.pendingBody;content=<Button asChild variant="outline"><Link to="/my-oshegah-cards">{text.myCards}</Link></Button>;}
 else if(s==='unassigned'){
  if(!user){title=text.readyTitle;body=text.readyBody;content=<div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
   <Button asChild onClick={()=>rememberReturn(path)}><Link to="/login" state={{from:path}}>{text.login}</Link></Button>
   <Button asChild variant="outline" onClick={()=>rememberReturn(path)}><Link to="/signup" state={{from:path}}>{text.signup}</Link></Button></div>;}
  else if(me.isLoading)return <PageLoader label="…"/>;
  else if(!me.data){title=text.needProfileTitle;body=text.needProfileBody;content=<Button asChild onClick={()=>rememberReturn(path)}><Link to="/dashboard">{text.createProfile}</Link></Button>;}
  else{title=text.readyTitle;body=text.confirm;const p=me.data;content=<div className="w-full space-y-4">
   <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-start">
    {p.avatar_url?<img src={p.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover"/>:<div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary font-semibold">{p.full_name.slice(0,1)}</div>}
    <div className="min-w-0"><p className="truncate font-medium">{p.full_name}</p><p dir="ltr" className="truncate text-sm text-muted-foreground">oshegah.com/{p.username}</p></div>
   </div>
   {!q.data.self_activation&&<p className="text-sm text-muted-foreground">{text.approvalNote}</p>}
   {claim.isError&&<p role="alert" className="text-sm text-destructive">{Object.entries(text.errors).find(([k])=>(claim.error as Error).message?.includes(k))?.[1]??text.error}</p>}
   <Button className="w-full" disabled={claim.isPending} onClick={()=>claim.mutate(p.id)}>{claim.isPending&&<Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true"/>}{text.activate}</Button>
  </div>;}
 }else{title=text.inactiveTitle;body=s==='unlinked'?text.unlinkedBody:text.inactiveBody;content=q.data.mine?<Button asChild variant="outline"><Link to="/my-oshegah-cards">{text.myCards}</Link></Button>:<CustomerService/>;}

 return <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-5 py-12">
  <Seo title="OSHEGAH card" description="OSHEGAH NFC card" path={path} noindex/>
  <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
   <Link to="/" aria-label="OSHEGAH"><OshegahLogo/></Link>
   {claim.data?.state==='active'?<CheckCircle2 className="h-10 w-10 text-primary" aria-hidden="true"/>:<CreditCard className="h-10 w-10 text-primary" aria-hidden="true"/>}
   <h1 className="font-display text-2xl font-semibold">{title}</h1>
   <p className="text-muted-foreground">{body}</p>
   {s&&s!=='unknown'&&<p className="text-sm"><span className="text-muted-foreground">{text.serial}: </span><span dir="ltr" className="font-mono font-medium">{serial}</span></p>}
   {content}
   <Link to="/" className="text-sm font-medium text-primary hover:underline">{text.home}</Link>
  </div>
 </main>;
}
