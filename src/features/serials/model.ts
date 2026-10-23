import {useI18n} from '@/i18n';

export const SERIAL_PATTERN=/^OSH-[A-Z0-9]{8}$/;
export type Activation='inactive'|'active'|'revoked';
export type Assignment='unassigned'|'assigned';
export interface SerialRow{id:string;serial:string;owner_user_id:string|null;owner_email:string|null;owner_name:string|null;customer_id:string|null;username:string|null;card_request_id:string|null;assignment_status:Assignment;activation_status:Activation;created_at:string;assigned_at:string|null;activated_at:string|null;updated_at:string}
export interface SerialEvent{id:string;event_type:string;previous_owner_email:string|null;new_owner_email:string|null;actor_label:string;reason:string;created_at:string}
export interface OwnedProfile{id:string;username:string;full_name:string}
export interface UserHit{user_id:string;email:string|null;full_name:string|null;profiles:OwnedProfile[]}
export interface MyCard{id:string;serial:string;activation_status:Activation;assigned_at:string;activated_at:string|null;customer_id:string|null;username:string|null;full_name:string|null}

/** Splits pasted text or CSV content into candidate serials (lines, commas, semicolons, tabs, quotes). */
export function parseSerialList(input:string){return input.split(/[\r\n,;\t]+/).map(s=>s.replace(/^["']|["']$/g,'').trim()).filter(Boolean);}

const en={
 title:'Serial Number Management',mine:'My OSHEGAH Cards',total:'Total Serial Numbers',unassigned:'Unassigned Cards',assigned:'Assigned Cards',active:'Active Cards',inactive:'Inactive Cards',revoked:'Revoked Cards',
 serial:'Serial Number',user:'Assigned User',username:'Username',profile:'Linked Profile',assignment:'Assignment Status',activation:'Activation Status',assignedAt:'Assigned Date',activatedAt:'Activated Date',actions:'Actions',createdAt:'Registered',updatedAt:'Last updated',
 search:'Search serial, username or email',all:'All',sortCreated:'Newest registered',sortAssigned:'Newest assigned',empty:'No serial numbers match.',loading:'Loading…',failed:'Something went wrong. Please try again.',retry:'Retry',
 register:'Register Serial Numbers',single:'Single',bulk:'Bulk',generate:'Generate',serialPlaceholder:'OSH-XXXXXXXX',bulkHint:'One serial number per line, or upload a CSV file.',csv:'Upload CSV',preview:'Preview',confirmRegister:'Register valid serials',count:'How many new serials?',
 validNew:'Valid new',duplicates:'Duplicates in list',invalidList:'Invalid format',existing:'Already registered',created:'Created',importDone:'Import finished',formatHint:'Format: OSH- followed by 8 letters or digits.',
 assign:'Assign Serial Number',reassign:'Reassign',activate:'Activate',deactivate:'Deactivate',revoke:'Revoke',restore:'Restore',view:'Details',history:'History',
 findUser:'Find user by email, name or username',selectUser:'Select user',selectSerials:'Select available serial numbers',findSerial:'Search available serials',review:'Review',confirm:'Confirm',back:'Back',noProfile:'No linked profile',linkProfile:'Link to profile',
 reason:'Reason',reasonHint:'Required (at least 3 characters).',currentOwner:'Current owner',newOwner:'New owner',notAssignedYet:'Assignment links a card to an account. It does not activate it.',
 statusNames:{unassigned:'Unassigned',assigned:'Assigned',inactive:'Inactive',active:'Active',revoked:'Revoked'} as Record<string,string>,
 events:{registered:'Registered',assigned:'Assigned',reassigned:'Reassigned',activated:'Activated',deactivated:'Deactivated',revoked:'Revoked',restored:'Restored to inactive',profile_changed:'Linked profile changed'} as Record<string,string>,
 selfActivation:'Allow customers to activate their own assigned cards',saved:'Saved',notes:'Internal notes',saveNotes:'Save notes',
 activateYours:'Activate Your Card',approval:'The OSHEGAH team will activate this card for you.',revokedNote:'This card was revoked and can no longer be used.',noCards:'You have no OSHEGAH cards assigned yet.',requestCard:'Request a card',confirmActivate:'Activate this card now? Its NFC and QR will open your linked profile.',
 revokeWarn:'Revoking is permanent until restored by an administrator. Use for lost, compromised or retired cards.',page:'Page',previous:'Previous',next:'Next',selected:'selected',physical:'Physical cards (serial numbers)',assignForRequest:'Assign serials for this request',
 inactiveTitle:'This card isn’t active',inactiveBody:'This OSHEGAH card is not linked to an active profile right now.',unknownTitle:'Card not found',home:'Back to OSHEGAH',
 errors:{SERIAL_UNAVAILABLE:'Some serial numbers are no longer available:',REASON_REQUIRED:'Please enter a reason.',INVALID_TRANSITION:'This action is not allowed for the card’s current state.',PROFILE_NOT_OWNED:'That profile does not belong to the selected user.',USER_NOT_FOUND:'User not found.',SAME_OWNER:'Choose a different user.',APPROVAL_REQUIRED:'The OSHEGAH team must activate this card.',ADMIN_REQUIRED:'Administrator verification required.'} as Record<string,string>,
};
const ar:typeof en={
 title:'إدارة الأرقام التسلسلية',mine:'بطاقات OSHEGAH الخاصة بي',total:'إجمالي الأرقام التسلسلية',unassigned:'بطاقات غير مخصصة',assigned:'بطاقات مخصصة',active:'بطاقات مفعّلة',inactive:'بطاقات غير مفعّلة',revoked:'بطاقات ملغاة',
 serial:'الرقم التسلسلي',user:'المستخدم',username:'اسم المستخدم',profile:'الملف المرتبط',assignment:'حالة التخصيص',activation:'حالة التفعيل',assignedAt:'تاريخ التخصيص',activatedAt:'تاريخ التفعيل',actions:'الإجراءات',createdAt:'تاريخ التسجيل',updatedAt:'آخر تحديث',
 search:'ابحث بالرقم أو اسم المستخدم أو البريد',all:'الكل',sortCreated:'الأحدث تسجيلًا',sortAssigned:'الأحدث تخصيصًا',empty:'لا توجد أرقام مطابقة.',loading:'جارٍ التحميل…',failed:'حدث خطأ. حاول مرة أخرى.',retry:'إعادة المحاولة',
 register:'تسجيل أرقام تسلسلية',single:'رقم واحد',bulk:'مجموعة',generate:'توليد',serialPlaceholder:'OSH-XXXXXXXX',bulkHint:'رقم واحد في كل سطر، أو ارفع ملف CSV.',csv:'رفع CSV',preview:'معاينة',confirmRegister:'تسجيل الأرقام الصالحة',count:'عدد الأرقام الجديدة',
 validNew:'جديدة وصالحة',duplicates:'مكررة في القائمة',invalidList:'صيغة غير صالحة',existing:'مسجلة مسبقًا',created:'تم إنشاؤها',importDone:'اكتمل الاستيراد',formatHint:'الصيغة: OSH- ثم 8 حروف أو أرقام.',
 assign:'تخصيص رقم تسلسلي',reassign:'إعادة تخصيص',activate:'تفعيل',deactivate:'إيقاف',revoke:'إلغاء',restore:'استعادة',view:'التفاصيل',history:'السجل',
 findUser:'ابحث عن مستخدم بالبريد أو الاسم أو اسم المستخدم',selectUser:'اختر المستخدم',selectSerials:'اختر الأرقام المتاحة',findSerial:'ابحث في الأرقام المتاحة',review:'مراجعة',confirm:'تأكيد',back:'رجوع',noProfile:'بدون ملف مرتبط',linkProfile:'ربط بملف',
 reason:'السبب',reasonHint:'مطلوب (3 أحرف على الأقل).',currentOwner:'المالك الحالي',newOwner:'المالك الجديد',notAssignedYet:'التخصيص يربط البطاقة بحساب ولا يفعّلها.',
 statusNames:{unassigned:'غير مخصصة',assigned:'مخصصة',inactive:'غير مفعّلة',active:'مفعّلة',revoked:'ملغاة'},
 events:{registered:'تم التسجيل',assigned:'تم التخصيص',reassigned:'أعيد التخصيص',activated:'تم التفعيل',deactivated:'تم الإيقاف',revoked:'تم الإلغاء',restored:'استعيدت كغير مفعّلة',profile_changed:'تغيّر الملف المرتبط'},
 selfActivation:'السماح للعملاء بتفعيل بطاقاتهم المخصصة بأنفسهم',saved:'تم الحفظ',notes:'ملاحظات داخلية',saveNotes:'حفظ الملاحظات',
 activateYours:'فعّل بطاقتك',approval:'سيقوم فريق OSHEGAH بتفعيل هذه البطاقة لك.',revokedNote:'تم إلغاء هذه البطاقة ولا يمكن استخدامها.',noCards:'لا توجد بطاقات OSHEGAH مخصصة لك بعد.',requestCard:'اطلب بطاقة',confirmActivate:'تفعيل البطاقة الآن؟ ستفتح NFC وQR ملفك المرتبط.',
 revokeWarn:'الإلغاء دائم حتى يستعيده مسؤول. استخدمه للبطاقات المفقودة أو المخترقة أو المتقاعدة.',page:'صفحة',previous:'السابق',next:'التالي',selected:'محدد',physical:'البطاقات الفعلية (الأرقام التسلسلية)',assignForRequest:'تخصيص أرقام لهذا الطلب',
 inactiveTitle:'هذه البطاقة غير مفعّلة',inactiveBody:'بطاقة OSHEGAH هذه غير مرتبطة بملف مفعّل حاليًا.',unknownTitle:'البطاقة غير موجودة',home:'العودة إلى OSHEGAH',
 errors:{SERIAL_UNAVAILABLE:'بعض الأرقام لم تعد متاحة:',REASON_REQUIRED:'يرجى إدخال السبب.',INVALID_TRANSITION:'هذا الإجراء غير مسموح لحالة البطاقة الحالية.',PROFILE_NOT_OWNED:'هذا الملف لا يخص المستخدم المحدد.',USER_NOT_FOUND:'المستخدم غير موجود.',SAME_OWNER:'اختر مستخدمًا مختلفًا.',APPROVAL_REQUIRED:'يجب أن يفعّل فريق OSHEGAH هذه البطاقة.',ADMIN_REQUIRED:'يلزم تحقق المسؤول.'},
};
export function useSerialText(){const {lang}=useI18n();return {lang,text:lang==='ar'?ar:en};}
export function serialError(e:unknown,text:typeof en){const m=e&&typeof e==='object'&&'message' in e?String((e as {message:unknown}).message):'';const key=Object.keys(text.errors).find(k=>m.includes(k));if(!key)return text.failed;return key==='SERIAL_UNAVAILABLE'?`${text.errors[key]} ${m.split(':').slice(1).join(':').trim()}`:text.errors[key];}
