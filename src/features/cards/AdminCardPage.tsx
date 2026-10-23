import type {ReactNode} from 'react';
import {Lock} from 'lucide-react';
import {useAdminGate} from '@/components/AdminGate';
import {Button} from '@/components/ui/button';
import {useCardText} from './model';
export function AdminCardPage({children}:{children:ReactNode}){const {lock}=useAdminGate();const {text}=useCardText();return <><div className="fixed bottom-20 end-4 z-40 lg:bottom-4"><Button variant="secondary" size="icon" aria-label={text.lock} title={text.lock} onClick={()=>void lock()}><Lock className="h-4 w-4"/></Button></div>{children}</>;}
