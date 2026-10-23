import {useEffect} from 'react';
import {Link,useNavigate,useParams} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {supabase} from '@/integrations/supabase/client';
import {PageLoader} from '@/components/states';
import {Seo} from '@/components/Seo';
import {useSerialText} from '@/features/serials/model';

/** NFC/QR destination for a physical card: /s/<serial>. Only active, linked cards open a profile. */
export default function SerialRedirect(){
 const {serial=''}=useParams();const navigate=useNavigate();const {text}=useSerialText();
 const q=useQuery({queryKey:['serial-resolve',serial],retry:false,queryFn:async()=>{const {data,error}=await supabase.rpc('resolve_serial',{_serial:serial});if(error)throw error;return data as {state:string;username?:string};}});
 useEffect(()=>{if(q.data?.state==='active'&&q.data.username)navigate(`/${q.data.username}`,{replace:true});},[q.data,navigate]);
 if(q.isLoading||q.data?.state==='active')return <PageLoader label={text.loading}/>;
 const unknown=!q.data||q.data.state==='unknown';
 return <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
  <Seo title="OSHEGAH card" description="OSHEGAH NFC card" path={`/s/${serial}`} noindex/>
  <h1 className="font-display text-2xl font-semibold">{unknown?text.unknownTitle:text.inactiveTitle}</h1>
  {!unknown&&<p className="max-w-sm text-muted-foreground">{text.inactiveBody}</p>}
  <Link to="/" className="text-sm font-medium text-primary hover:underline">{text.home}</Link>
 </main>;
}
