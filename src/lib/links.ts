import {
  MessageCircle, Phone, Mail, Instagram, Facebook, Youtube, Linkedin, Twitter,
  Send, Globe, MapPin, Star, Wallet, Smartphone, Link as LinkIcon, Music2, Ghost,
  type LucideIcon,
} from "lucide-react";

export type LinkType =
  | "whatsapp" | "phone" | "email" | "instagram" | "facebook" | "tiktok" | "youtube"
  | "linkedin" | "twitter" | "snapchat" | "telegram" | "website" | "maps" | "reviews"
  | "instapay" | "vodafone_cash" | "custom";

export interface LinkTypeMeta {
  type: LinkType;
  label: string;
  icon: LucideIcon;
  placeholder: string;
  hint: string;
  /** brand tint used on the public profile */
  tint: string;
  buildHref: (value: string) => string;
  validate: (value: string) => string | null;
  normalize?: (value: string) => string;
}

const digits = (v: string) => v.replace(/[^\d+]/g, "");

/**
 * Egyptian mobile numbers are usually typed locally (01xxxxxxxxx).
 * Normalise once, here, so WhatsApp links always use +20 and never double it.
 */
export const normalizeEgyptianPhone = (raw: string) => {
  let v = (raw ?? "").replace(/[^\d+]/g, "");
  if (!v) return "";
  if (v.startsWith("00")) v = `+${v.slice(2)}`;
  if (v.startsWith("+")) return v; // already international — leave alone
  if (/^20(10|11|12|15)\d{8}$/.test(v)) return `+${v}`;
  if (/^0(10|11|12|15)\d{8}$/.test(v)) return `+20${v.slice(1)}`;
  if (/^(10|11|12|15)\d{8}$/.test(v)) return `+20${v}`;
  return `+${v}`;
};

/** Local Egyptian form (01xxxxxxxxx) used by wallet USSD codes. */
export const toEgyptianLocal = (raw: string) => {
  const v = (raw ?? "").replace(/\D/g, "");
  if (/^20\d{10}$/.test(v)) return `0${v.slice(2)}`;
  if (/^(10|11|12|15)\d{8}$/.test(v)) return `0${v}`;
  return v;
};


export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const isMobileUa = () =>
  typeof navigator !== "undefined" && /android|iphone|ipad|ipod/i.test(navigator.userAgent);

/**
 * Best Gmail experience: compose in Gmail on desktop, fall back to the device's
 * mail handler (Gmail app included) on mobile so nothing breaks without Gmail.
 */
export const buildEmailHref = (value: string) => {
  const email = value.trim();
  if (!EMAIL_RE.test(email)) return `mailto:${encodeURIComponent(email)}`;
  if (isMobileUa()) return `mailto:${email}`;
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;
};

const stripped = (v: string) => v.trim().replace(/^@/, "").replace(/\/+$/, "");

const asUrl = (v: string) => {
  const t = v.trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
};

const urlValidator = (label: string) => (value: string) => {
  const v = asUrl(value);
  try {
    const u = new URL(v);
    if (!u.hostname.includes(".")) return `Enter a valid ${label} link`;
    return null;
  } catch {
    return `Enter a valid ${label} link`;
  }
};

const handleUrl = (base: string) => (value: string) => {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  return `${base}${stripped(v)}`;
};

export const LINK_TYPES: Record<LinkType, LinkTypeMeta> = {
  whatsapp: {
    type: "whatsapp", label: "WhatsApp", icon: MessageCircle, tint: "#25D366",
    placeholder: "010 0000 0000", hint: "Egyptian numbers automatically get +20",
    buildHref: (v) => `https://wa.me/${normalizeEgyptianPhone(v).replace(/\D/g, "")}`,
    validate: (v) => (digits(v).replace(/\+/g, "").length >= 8 ? null : "Enter a valid phone number"),
    normalize: (v) => normalizeEgyptianPhone(v),
  },

  phone: {
    type: "phone", label: "Phone", icon: Phone, tint: "#4B7BEC",
    placeholder: "+20 100 000 0000", hint: "Opens the phone dialer",
    buildHref: (v) => `tel:${digits(v)}`,
    validate: (v) => (digits(v).length >= 6 ? null : "Enter a valid phone number"),
  },
  email: {
    type: "email", label: "Email", icon: Mail, tint: "#EA4335",
    placeholder: "you@example.com", hint: "Opens Gmail on desktop, the mail app on mobile",
    buildHref: (v) => buildEmailHref(v),
    validate: (v) => (EMAIL_RE.test(v.trim()) ? null : "Enter a valid email address"),
    normalize: (v) => v.trim(),
  },
  instagram: {
    type: "instagram", label: "Instagram", icon: Instagram, tint: "#E1306C",
    placeholder: "@username", hint: "Username or full profile link",
    buildHref: handleUrl("https://instagram.com/"),
    validate: (v) => (stripped(v).length >= 2 ? null : "Enter your Instagram username"),
    normalize: (v) => stripped(v),
  },
  facebook: {
    type: "facebook", label: "Facebook", icon: Facebook, tint: "#1877F2",
    placeholder: "@page or full link", hint: "Page name or full profile link",
    buildHref: handleUrl("https://facebook.com/"),
    validate: (v) => (stripped(v).length >= 2 ? null : "Enter your Facebook page"),
  },
  tiktok: {
    type: "tiktok", label: "TikTok", icon: Music2, tint: "#010101",
    placeholder: "@username", hint: "Username or full profile link",
    buildHref: (v) => (/^https?:\/\//i.test(v.trim()) ? v.trim() : `https://tiktok.com/@${stripped(v)}`),
    validate: (v) => (stripped(v).length >= 2 ? null : "Enter your TikTok username"),
  },
  youtube: {
    type: "youtube", label: "YouTube", icon: Youtube, tint: "#FF0000",
    placeholder: "@channel or full link", hint: "Channel handle or full link",
    buildHref: (v) => (/^https?:\/\//i.test(v.trim()) ? v.trim() : `https://youtube.com/@${stripped(v)}`),
    validate: (v) => (stripped(v).length >= 2 ? null : "Enter your YouTube channel"),
  },
  linkedin: {
    type: "linkedin", label: "LinkedIn", icon: Linkedin, tint: "#0A66C2",
    placeholder: "in/username", hint: "Profile path or full link",
    buildHref: (v) => (/^https?:\/\//i.test(v.trim()) ? v.trim() : `https://linkedin.com/in/${stripped(v)}`),
    validate: (v) => (stripped(v).length >= 2 ? null : "Enter your LinkedIn profile"),
  },
  twitter: {
    type: "twitter", label: "X / Twitter", icon: Twitter, tint: "#111111",
    placeholder: "@username", hint: "Username or full profile link",
    buildHref: handleUrl("https://x.com/"),
    validate: (v) => (stripped(v).length >= 2 ? null : "Enter your X username"),
  },
  snapchat: {
    type: "snapchat", label: "Snapchat", icon: Ghost, tint: "#FFFC00",
    placeholder: "@username", hint: "Username or full profile link",
    buildHref: handleUrl("https://snapchat.com/add/"),
    validate: (v) => (stripped(v).length >= 2 ? null : "Enter your Snapchat username"),
  },
  telegram: {
    type: "telegram", label: "Telegram", icon: Send, tint: "#26A5E4",
    placeholder: "@username", hint: "Username or full link",
    buildHref: handleUrl("https://t.me/"),
    validate: (v) => (stripped(v).length >= 2 ? null : "Enter your Telegram username"),
  },
  website: {
    type: "website", label: "Website", icon: Globe, tint: "#162446",
    placeholder: "yourdomain.com", hint: "Your website address",
    buildHref: asUrl, validate: urlValidator("website"),
  },
  maps: {
    type: "maps", label: "Google Maps", icon: MapPin, tint: "#34A853",
    placeholder: "https://maps.app.goo.gl/…", hint: "Google Maps location link",
    buildHref: asUrl, validate: urlValidator("Google Maps"),
  },
  reviews: {
    type: "reviews", label: "Google Reviews", icon: Star, tint: "#FBBC05",
    placeholder: "https://g.page/r/…", hint: "Link where customers leave reviews",
    buildHref: asUrl, validate: urlValidator("Google Reviews"),
  },
  instapay: {
    type: "instapay", label: "InstaPay", icon: Wallet, tint: "#7B2FF7",
    placeholder: "username@instapay", hint: "InstaPay address or payment link",
    buildHref: (v) => (/^https?:\/\//i.test(v.trim()) ? v.trim() : `https://ipn.eg/S/${stripped(v)}/instapay`),
    validate: (v) => (v.trim().length >= 3 ? null : "Enter your InstaPay address"),
  },
  vodafone_cash: {
    type: "vodafone_cash", label: "Vodafone Cash", icon: Smartphone, tint: "#E60000",
    placeholder: "010 0000 0000", hint: "Opens the dialer with the Vodafone Cash code",
    buildHref: (v) => `tel:${digits(v)}`,
    validate: (v) => (toEgyptianLocal(v).length >= 8 ? null : "Enter a valid wallet number"),
    normalize: (v) => toEgyptianLocal(v),
  },

  custom: {
    type: "custom", label: "Custom URL", icon: LinkIcon, tint: "#162446",
    placeholder: "https://…", hint: "Any link you want to share",
    buildHref: asUrl, validate: urlValidator("URL"),
  },
};

export const LINK_TYPE_LIST = Object.values(LINK_TYPES);

export const linkMeta = (type: string): LinkTypeMeta =>
  LINK_TYPES[(type as LinkType)] ?? LINK_TYPES.custom;

export const buildLinkHref = (type: string, value: string) => linkMeta(type).buildHref(value);

export const USERNAME_RE = /^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])$/;

export const normalizeUsername = (v: string) =>
  v.trim().toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9._-]/g, "");

export const validateUsername = (v: string) =>
  USERNAME_RE.test(v) ? null : "3–30 characters, lowercase letters, numbers, dots, dashes";

export const RESERVED_USERNAMES = new Set([
  "login", "signup", "dashboard", "business", "admin", "about", "contact",
  "privacy", "terms", "api", "oshegah", "app", "www", "profile", "settings",
]);
