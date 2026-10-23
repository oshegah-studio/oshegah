import {useQuery} from '@tanstack/react-query';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/hooks/useAuth';
import type {CardConfig,CardRequest,CardHistory} from './model';
export function useCardConfig(){return useQuery({queryKey:['card-config'],queryFn:async()=>{const {data,error}=await supabase.rpc('card_request_config');if(error)throw error;return data as unknown as CardConfig;}});}
export function useCardRequests(admin:boolean,page:number,search='',status='',from='',to=''){
 const {user}=useAuth();
 return useQuery({queryKey:['card-requests',user?.id,admin,page,search,status,from,to],enabled:Boolean(user),refetchOnMount:'always',queryFn:async()=>{
 const {data,error}=await supabase.rpc('get_card_requests',{_admin:admin,_page:page,_search:search,_status:status,_from:from||null,_to:to||null});if(error)throw error;
 return data as unknown as {rows:CardRequest[];total:number;counts:Record<string,number>|null};}});
}
export function useCardRequest(id:string|undefined,admin:boolean){const {user}=useAuth();return useQuery({queryKey:['card-request',user?.id,id,admin],enabled:Boolean(user&&id),refetchOnMount:'always',queryFn:async()=>{if(!id)throw Error('Missing request');const {data,error}=await supabase.rpc('get_card_request',{_id:id,_admin:admin});if(error)throw error;return data as unknown as {request:CardRequest;history:CardHistory[];account_email:string|null};}});}
