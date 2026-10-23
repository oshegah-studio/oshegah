import { z } from 'zod';

export const governorates = [
 ['Cairo','القاهرة'],['Giza','الجيزة'],['Alexandria','الإسكندرية'],['Dakahlia','الدقهلية'],['Red Sea','البحر الأحمر'],['Beheira','البحيرة'],['Fayoum','الفيوم'],['Gharbia','الغربية'],['Ismailia','الإسماعيلية'],['Menofia','المنوفية'],['Minya','المنيا'],['Qalyubia','القليوبية'],['New Valley','الوادي الجديد'],['Suez','السويس'],['Aswan','أسوان'],['Assiut','أسيوط'],['Beni Suef','بني سويف'],['Port Said','بورسعيد'],['Damietta','دمياط'],['Sharkia','الشرقية'],['South Sinai','جنوب سيناء'],['Kafr El Sheikh','كفر الشيخ'],['Matrouh','مطروح'],['Luxor','الأقصر'],['Qena','قنا'],['North Sinai','شمال سيناء'],['Sohag','سوهاج'],
] as const;
export const moneySchema=z.number().finite().min(0).lt(10000000000).refine(v=>Math.abs(v*100-Math.round(v*100))<0.00001);
export const settingsSchema=z.object({
 unit_price:moneySchema,max_quantity:z.number().int().min(1).max(2147483647),delivery_mode:z.enum(['flat','governorate']),flat_fee:moneySchema.nullable(),
 governorate_fees:z.record(z.object({fee:moneySchema,enabled:z.boolean()})).refine(v=>Object.keys(v).every(k=>governorates.some(g=>g[0]===k))),
}).superRefine((s,ctx)=>{
 if(s.delivery_mode==='flat'&&s.flat_fee===null)ctx.addIssue({code:'custom',path:['flat_fee'],message:'FLAT_FEE_REQUIRED'});
 if(s.delivery_mode==='governorate'&&!Object.values(s.governorate_fees).some(g=>g.enabled))ctx.addIssue({code:'custom',path:['governorate_fees'],message:'ENABLED_GOVERNORATE_REQUIRED'});
});
export type SettingsInput=z.infer<typeof settingsSchema>;
export interface CardSettings extends SettingsInput {version:number;updated_at:string;updated_by_label:string|null;price_updated_at:string;price_updated_by_label:string|null}
export interface SettingsHistory {id:string;setting:string;previous_value:unknown;new_value:unknown;actor_label:string;created_at:string}
export interface DeliveryConfig {unit_price:number;max_quantity:number;delivery_mode:'flat'|'governorate';delivery_charge:number|null;governorate_fees:SettingsInput['governorate_fees'];version:number}
export function orderAmounts(config:DeliveryConfig,quantity:number,governorate:string){
 const area=config.governorate_fees[governorate];
 const available=config.delivery_mode==='flat'||Boolean(area?.enabled);
 const fee=config.delivery_mode==='flat'?config.delivery_charge:available?area.fee:null;
 const subtotal=Math.round(config.unit_price*100)*quantity/100;
 return {unit_price:config.unit_price,quantity,subtotal,delivery_charge:fee,discount:0,total:fee==null?null:Math.round((subtotal+fee)*100)/100,available};
}
export const settingsText={
 en:{title:'Card & Delivery Settings',pricing:'Card Pricing',limits:'Order Limits',delivery:'Delivery Fees',price:'Card price per unit (EGP)',active:'Current active price',max:'Maximum Cards Per Order',activeMax:'Current active limit',updated:'Last updated',by:'Updated by',flat:'Flat Delivery Fee',regional:'Delivery Fees by Governorate',fee:'Delivery Fee (EGP)',enabled:'Enabled',add:'Add governorate',remove:'Remove governorate',select:'Select governorate',save:'Save Changes',saved:'Settings saved. New requests will use these values.',invalid:'Enter non-negative amounts with up to two decimal places and a positive whole-number limit. Set a flat fee or at least one enabled governorate.',failed:'Unable to save settings. Please try again.',conflict:'Another administrator changed these settings. Reload the active values before saving.',reload:'Reload settings',history:'Configuration History',previous:'Previous value',next:'New value',empty:'No settings changes yet.',pending:'Not configured — team confirmation required',unavailable:'Delivery is unavailable for this governorate.',quantityError:'Quantity must be a whole number from 1 to',changed:'Prices or delivery settings changed. Review the updated amounts before submitting.',unit:'Price per card',snapshot:'Saved order amounts do not change when settings change.'},
 ar:{title:'إعدادات البطاقة والتوصيل',pricing:'أسعار البطاقات',limits:'حدود الطلب',delivery:'رسوم التوصيل',price:'سعر البطاقة الواحدة (جنيه مصري)',active:'السعر الحالي',max:'الحد الأقصى للبطاقات لكل طلب',activeMax:'الحد الحالي',updated:'آخر تحديث',by:'تم التحديث بواسطة',flat:'رسوم توصيل موحدة',regional:'رسوم التوصيل حسب المحافظة',fee:'رسوم التوصيل (جنيه مصري)',enabled:'مفعّل',add:'إضافة محافظة',remove:'حذف المحافظة',select:'اختر المحافظة',save:'حفظ التغييرات',saved:'تم حفظ الإعدادات وستطبق على الطلبات الجديدة.',invalid:'أدخل مبالغ غير سالبة بمنزلتين عشريتين كحد أقصى وحدًا صحيحًا موجبًا. حدد رسومًا موحدة أو محافظة واحدة مفعّلة على الأقل.',failed:'تعذّر حفظ الإعدادات. حاول مرة أخرى.',conflict:'عدّل مسؤول آخر الإعدادات. أعد تحميل القيم الحالية قبل الحفظ.',reload:'إعادة تحميل الإعدادات',history:'سجل تغييرات الإعدادات',previous:'القيمة السابقة',next:'القيمة الجديدة',empty:'لا توجد تغييرات بعد.',pending:'غير محددة — يؤكدها الفريق',unavailable:'التوصيل غير متاح لهذه المحافظة.',quantityError:'يجب أن تكون الكمية عددًا صحيحًا من ١ إلى',changed:'تغيرت الأسعار أو إعدادات التوصيل. راجع المبالغ المحدثة قبل الإرسال.',unit:'سعر البطاقة',snapshot:'لا تتغير مبالغ الطلب المحفوظة عند تغيير الإعدادات.'},
};