import { z } from 'zod';

// Addresses may contain normal multiline whitespace, but not hidden control bytes.
export const deliveryAddressSchema = z.string().trim().min(1).max(500)
 .refine(value => !/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(value));

const messages = {
 en: {
  session: 'Your session has expired. Please log in again.',
  profile: "We couldn't verify your selected profile. Please check your saved profile.",
  delivery: 'Please complete your delivery information.',
  contact: 'Please check your contact information and Egyptian mobile number.',
  consent: 'Please confirm that your information is correct before submitting.',
  settings: 'Pricing is temporarily unavailable. Please try again.',
  network: "We couldn't confirm your request. Please check your connection and retry; retries won't create a duplicate request.",
  failed: "We couldn't submit your request. Please try again.",
 },
 ar: {
  session: 'انتهت جلسة الدخول. يرجى تسجيل الدخول مرة أخرى.',
  profile: 'تعذّر التحقق من ملفك المختار. يرجى مراجعة ملفك المحفوظ.',
  delivery: 'يرجى إكمال بيانات التوصيل.',
  contact: 'يرجى مراجعة بيانات التواصل ورقم المحمول المصري.',
  consent: 'يرجى تأكيد صحة بياناتك قبل إرسال الطلب.',
  settings: 'الأسعار غير متاحة مؤقتًا. يرجى المحاولة مرة أخرى.',
  network: 'تعذّر تأكيد الطلب. تحقق من اتصالك وأعد المحاولة؛ لن تؤدي إعادة المحاولة إلى طلب مكرر.',
  failed: 'تعذّر إرسال طلبك. يرجى المحاولة مرة أخرى.',
 },
};
function errorMessage(error: unknown) {
 return error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
}
export function submissionError(error: unknown, lang: string) {
 const message = errorMessage(error); const t = messages[lang === 'ar' ? 'ar' : 'en'];
 if (/AUTH_REQUIRED|JWT|session|refresh.token/i.test(message)) return t.session;
 if (/PROFILE_REQUIRED|PROFILE_INCOMPLETE/.test(message)) return t.profile;
 if (/CONSENT_REQUIRED/.test(message)) return t.consent;
 if (/INVALID_FIELD: (address|city|governorate)|GOVERNORATE_INVALID|EGYPT_ONLY/.test(message)) return t.delivery;
 if (/INVALID_FIELD|PHONE_INVALID|EMAIL_INVALID|EMAIL_REQUIRED|CONTACT_METHOD_INVALID/.test(message)) return t.contact;
 if (/SETTINGS_UNAVAILABLE|PRICE_INVALID/.test(message)) return t.settings;
 if (/fetch|network|timeout|connection/i.test(message)) return t.network;
 return t.failed;
}
export function logSubmissionError(operation: 'session' | 'settings' | 'submit' | 'readback', error: unknown) {
 const message = errorMessage(error);
 // Never log raw messages, details, payloads, identifiers or auth data.
 const known = message.match(/\b(AUTH_REQUIRED|PROFILE_REQUIRED|PROFILE_INCOMPLETE|CONSENT_REQUIRED|INVALID_FIELD|PHONE_INVALID|EMAIL_INVALID|EMAIL_REQUIRED|CONTACT_METHOD_INVALID|GOVERNORATE_INVALID|EGYPT_ONLY|SETTINGS_UNAVAILABLE|SETTINGS_CHANGED|PRICE_INVALID|QUANTITY_EXCEEDS_LIMIT|DELIVERY_UNAVAILABLE)\b/)?.[1];
 const rawCode = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
 const code = /^[A-Z0-9]{5,12}$/.test(rawCode) ? rawCode : undefined;
 const field = message.match(/^INVALID_FIELD: (address|city|governorate|full_name|phone|email|instructions|notes|contact_method)$/)?.[1];
 console.error('Card request operation failed', { operation, code, reason: known ?? 'UNEXPECTED_FAILURE', field });
}

export interface SubmissionResult { id: string; number: number; date: string }
interface RpcResult { data: unknown; error: unknown }
export async function confirmCardSubmission(operations: {
 submit: () => PromiseLike<RpcResult>;
 readback: (id: string) => PromiseLike<RpcResult>;
}): Promise<{ id: string; summary: SubmissionResult | null }> {
 const response = await operations.submit();
 if (response.error) throw response.error;
 const id = z.string().uuid().parse(response.data);
 // Creation is confirmed. A failed details fetch must never be reported as failed creation.
 try {
  const details = await operations.readback(id);
  if (details.error) throw details.error;
  const parsed = z.object({ request: z.object({ id: z.literal(id), request_number: z.number().int().positive(), created_at: z.string().datetime({ offset: true }) }) }).parse(details.data);
  return { id, summary: { id, number: parsed.request.request_number, date: parsed.request.created_at } };
 } catch (error) {
  logSubmissionError('readback', error);
  return { id, summary: null };
 }
}