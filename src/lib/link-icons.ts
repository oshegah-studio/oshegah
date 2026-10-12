import { Camera, Heart, Briefcase, Calendar, ShoppingBag, Utensils, FileText, Link as LinkIcon, type LucideIcon } from "lucide-react";
import { LINK_TYPES, linkMeta } from "@/lib/links";

export const LINK_ICONS: { id: string; label: string; ar: string; icon: LucideIcon; group: "social" | "contact" | "general" }[] = [
  ...(["instagram", "facebook", "whatsapp", "linkedin", "youtube", "tiktok", "twitter", "snapchat", "telegram"] as const).map((id) => ({ id, label: LINK_TYPES[id].label, ar: ({ instagram: "إنستجرام", facebook: "فيسبوك", whatsapp: "واتساب", linkedin: "لينكدإن", youtube: "يوتيوب", tiktok: "تيك توك", twitter: "إكس", snapchat: "سناب شات", telegram: "تيليجرام" })[id], icon: LINK_TYPES[id].icon, group: "social" as const })),
  ...(["website", "email", "phone", "maps"] as const).map((id) => ({ id, label: LINK_TYPES[id].label, ar: ({ website: "موقع إلكتروني", email: "بريد إلكتروني", phone: "هاتف", maps: "موقع" })[id], icon: LINK_TYPES[id].icon, group: "contact" as const })),
  { id: "document", label: "Document", ar: "مستند", icon: FileText, group: "general" },
  { id: "menu", label: "Menu", ar: "قائمة", icon: Utensils, group: "general" },
  { id: "link", label: "Link", ar: "رابط", icon: LinkIcon, group: "general" },
  { id: "camera", label: "Camera", ar: "كاميرا", icon: Camera, group: "general" },
  { id: "heart", label: "Heart", ar: "قلب", icon: Heart, group: "general" },
  { id: "briefcase", label: "Work", ar: "عمل", icon: Briefcase, group: "general" },
  { id: "calendar", label: "Calendar", ar: "تقويم", icon: Calendar, group: "general" },
  { id: "shop", label: "Shop", ar: "متجر", icon: ShoppingBag, group: "general" },
];

export function resolveLinkIcon(type: string, value: string, override?: string | null): LucideIcon {
  if (override) return LINK_ICONS.find((i) => i.id === override)?.icon ?? linkMeta(type).icon;
  if (type === "website" || type === "custom") {
    try {
      const host = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).hostname.toLowerCase().replace(/^www\./, "");
      const platforms = { "instagram.com": "instagram", "facebook.com": "facebook", "wa.me": "whatsapp", "whatsapp.com": "whatsapp", "linkedin.com": "linkedin", "youtube.com": "youtube", "youtu.be": "youtube", "tiktok.com": "tiktok" };
      const platform = Object.entries(platforms).find(([domain]) => host === domain || host.endsWith(`.${domain}`))?.[1];
      if (platform) return linkMeta(platform).icon;
    } catch { /* Unrecognised URLs retain the type's default icon. */ }
  }
  return linkMeta(type).icon;
}