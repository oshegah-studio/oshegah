import { BadgeCheck, MapPin, ChevronRight, Download, Phone, Mail, Share2 } from "lucide-react";
import { toast } from "sonner";
import { resolveProfileStyle } from "@/lib/themes";
import { linkMeta, buildLinkHref } from "@/lib/links";
import { OSHEGAH_LOGO_URL } from "@/components/OshegahLogo";
import { useI18n } from "@/i18n";

export const OSHEGAH_SITE_URL = "https://oshegah.com";

export interface ProfileViewCustomer {
  id?: string;
  username: string;
  full_name: string;
  job_title?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  email?: string | null;
  location?: string | null;
  website?: string | null;
  verified?: boolean | null;
  theme?: string | null;
  primary_color?: string | null;
  text_color?: string | null;
  button_style?: string | null;
  show_contact_button?: boolean | null;
  show_save_contact?: boolean | null;
  background_color?: string | null;
  muted_text_color?: string | null;
  button_shadow?: boolean | null;
  font_style?: string | null;
  background_image_url?: string | null;
}

export interface ProfileViewLink {
  id: string;
  type: string;
  title: string;
  value: string;
  enabled?: boolean | null;
}

interface Props {
  customer: ProfileViewCustomer;
  links: ProfileViewLink[];
  onLinkClick?: (link: ProfileViewLink) => void;
  onSaveContact?: () => void;
  compact?: boolean;
  /** Floating OSHEGAH mark — public pages only (hidden in the editor preview). */
  showBrandBadge?: boolean;
}

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

export function ProfileView({
  customer,
  links,
  onLinkClick,
  onSaveContact,
  compact,
  showBrandBadge,
}: Props) {
  const { t } = useI18n();
  const s = resolveProfileStyle(customer);
  const { radius, accent, text } = s;
  const enabled = links.filter((l) => l.enabled !== false);

  const phone = customer.phone?.trim();
  const email = customer.email?.trim();
  // Never render a broken contact button: it needs the toggle ON *and* a real channel.
  const contactEnabled = customer.show_contact_button !== false && Boolean(phone || email);
  const contactHref = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : `mailto:${email}`;
  const ContactIcon = phone ? Phone : Mail;
  // Save Contact needs the toggle ON and at least one detail worth saving.
  const saveEnabled =
    customer.show_save_contact !== false && Boolean(phone || email || customer.website);

  /** Shares one single link — never the whole profile. */
  const shareLink = async (link: ProfileViewLink) => {
    const href = buildLinkHref(link.type, link.value);
    const url = href.startsWith("http") ? href : `${OSHEGAH_SITE_URL}/${customer.username}`;
    const title = link.title || linkMeta(link.type).label;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text: title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success(t("publicProfile.linkCopied"));
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(url);
        toast.success(t("publicProfile.linkCopied"));
      } catch {
        toast.error(t("publicProfile.shareFailed"));
      }
    }
  };

  return (
    <div
      className="relative min-h-full w-full overflow-x-hidden"
      style={{ background: s.background, color: text, fontFamily: s.fontFamily }}
    >
      {/* Customer background photo + readability scrim */}
      {s.backgroundImage && (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <img
            src={s.backgroundImage}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
          <span className="absolute inset-0" style={{ background: s.backgroundOverlay }} />
        </div>
      )}

      <div
        className={`relative mx-auto flex w-full max-w-md min-w-0 flex-col items-center ${compact ? "px-4 py-8" : "px-5 pb-14 pt-12 sm:pt-16"}`}
      >
        {/* Avatar */}
        <div className="relative animate-soft-in">
          <div
            className="flex items-center justify-center overflow-hidden rounded-full"
            style={{
              width: compact ? 76 : 104,
              height: compact ? 76 : 104,
              border: `2px solid ${s.surfaceBorder}`,
              background: s.surface,
              backdropFilter: s.blur ? "blur(12px)" : undefined,
            }}
          >
            {customer.avatar_url ? (
              <img
                src={customer.avatar_url}
                alt={t("publicProfile.photoAlt", { name: customer.full_name })}
                width={compact ? 76 : 104}
                height={compact ? 76 : 104}
                loading="eager"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="font-display text-xl font-semibold" style={{ color: text }}>
                {initials(customer.full_name) || "O"}
              </span>
            )}
          </div>
        </div>

        {/* Name — customer content is never translated */}
        <h1
          className={`mt-4 flex max-w-full animate-soft-in items-center justify-center gap-1.5 break-words text-center font-display font-semibold ${compact ? "text-lg" : "text-2xl"}`}
          style={{ animationDelay: "60ms" }}
        >
          <span className="min-w-0 break-words">{customer.full_name}</span>
          {customer.verified && (
            <BadgeCheck
              className={`shrink-0 ${compact ? "h-4 w-4" : "h-5 w-5"}`}
              style={{ color: accent }}
              aria-label={t("publicProfile.verifiedProfile")}
            />
          )}
        </h1>

        {customer.job_title && (
          <p
            className="mt-1 max-w-full animate-soft-in break-words text-center text-xs uppercase tracking-[0.18em]"
            style={{ color: s.mutedText, animationDelay: "100ms" }}
          >
            {customer.job_title}
          </p>
        )}

        {customer.bio && (
          <p
            className={`mt-2 max-w-xs animate-soft-in break-words text-center ${compact ? "text-xs" : "text-sm"} leading-relaxed`}
            style={{ color: s.mutedText, animationDelay: "140ms" }}
          >
            {customer.bio}
          </p>
        )}

        {customer.location && (
          <p
            className="mt-2 flex max-w-full animate-soft-in items-center gap-1 break-words text-xs"
            style={{ color: s.mutedText, animationDelay: "170ms" }}
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {customer.location}
          </p>
        )}

        {/* Links */}
        <div className="mt-7 flex w-full min-w-0 flex-col gap-3">
          {enabled.map((link, index) => {
            const meta = linkMeta(link.type);
            const Icon = meta.icon;
            const href = buildLinkHref(link.type, link.value);
            const external = href.startsWith("http");
            const label = link.title || meta.label;
            return (
              <div
                key={link.id}
                className="group flex min-h-[56px] w-full min-w-0 animate-soft-in items-center gap-1 pe-1.5 ps-4 transition-transform duration-200 sm:hover:-translate-y-0.5"
                style={{
                  borderRadius: radius,
                  background: s.surface,
                  border: `1px solid ${s.surfaceBorder}`,
                  boxShadow: s.shadow,
                  backdropFilter: s.blur ? "blur(14px)" : undefined,
                  color: text,
                  animationDelay: `${180 + Math.min(index, 10) * 45}ms`,
                }}
              >
                <a
                  href={href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  onClick={() => onLinkClick?.(link)}
                  className="flex min-w-0 flex-1 items-center gap-3 py-3.5 transition-transform duration-200 active:scale-[0.985]"
                  style={{ color: text }}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{ background: `${meta.tint}22`, color: meta.tint === "#010101" || meta.tint === "#111111" ? text : meta.tint }}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 opacity-40 transition-transform duration-200 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
                    aria-hidden="true"
                  />
                </a>
                <button
                  type="button"
                  aria-label={t("publicProfile.shareLink", { title: label })}
                  title={t("publicProfile.shareLink", { title: label })}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void shareLink(link);
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full opacity-55 transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100"
                  style={{ color: text }}
                >
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            );
          })}

          {enabled.length === 0 && (
            <p className="py-6 text-center text-sm" style={{ color: s.mutedText }}>
              {t("publicProfile.noLinks")}
            </p>
          )}
        </div>

        {/* Unified contact area — one place, both actions */}
        {(contactEnabled || saveEnabled) && (
          <div
            className="mt-6 flex w-full min-w-0 flex-col gap-2 p-2"
            style={{
              borderRadius: radius,
              background: s.surface,
              border: `1px solid ${s.surfaceBorder}`,
              backdropFilter: s.blur ? "blur(14px)" : undefined,
            }}
          >
            {contactEnabled && (
              <a
                href={contactHref}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 px-4 text-sm font-semibold transition-transform active:scale-[0.985] sm:hover:-translate-y-0.5"
                style={{ borderRadius: radius, background: accent, color: s.onAccent, boxShadow: s.shadow }}
              >
                <ContactIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{t("publicProfile.contactMe")}</span>
              </a>
            )}
            {saveEnabled && (
              <button
                type="button"
                onClick={onSaveContact}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 px-4 text-sm font-semibold transition-transform active:scale-[0.985] sm:hover:-translate-y-0.5"
                style={{
                  borderRadius: radius,
                  background: contactEnabled ? "transparent" : accent,
                  border: contactEnabled ? `1px solid ${s.surfaceBorder}` : "none",
                  color: contactEnabled ? text : s.onAccent,
                  boxShadow: contactEnabled ? undefined : s.shadow,
                }}
              >
                <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{t("publicProfile.saveContact")}</span>
              </button>
            )}
          </div>
        )}

        <p className="mt-10 text-center text-[0.68rem] uppercase tracking-[0.24em]" style={{ color: s.mutedText }}>
          {t("brand.poweredBy")}
        </p>
      </div>

      {/* Floating OSHEGAH mark — small, safe-area aware, never over the content column */}
      {showBrandBadge && (
        <a
          href={OSHEGAH_SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("publicProfile.visitOshegah")}
          title={t("publicProfile.visitOshegah")}
          className="fixed end-3 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/90 shadow-lg backdrop-blur transition-transform duration-200 hover:scale-105 active:scale-95"
          style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <img src={OSHEGAH_LOGO_URL} alt="" aria-hidden="true" className="h-7 w-7 object-contain" />
        </a>
      )}
    </div>
  );
}

export function PhoneFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative mx-auto w-full max-w-[300px] shrink-0 rounded-[2.4rem] border border-white/15 bg-navy-deep p-2.5 shadow-lift ${className ?? ""}`}
    >
      <div className="absolute left-1/2 top-4 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-white/20" />
      <div className="h-[560px] overflow-y-auto overscroll-contain rounded-[2rem] no-scrollbar">
        {children}
      </div>
    </div>
  );
}
