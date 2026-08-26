import { BadgeCheck, MapPin, ChevronRight, Download, Phone, Mail } from "lucide-react";
import { resolveProfileStyle } from "@/lib/themes";
import { linkMeta, buildLinkHref } from "@/lib/links";
import { useI18n } from "@/i18n";

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
  background_color?: string | null;
  muted_text_color?: string | null;
  button_shadow?: boolean | null;
  font_style?: string | null;
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
}

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

export function ProfileView({ customer, links, onLinkClick, onSaveContact, compact }: Props) {
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

  return (
    <div
      className="min-h-full w-full overflow-x-hidden"
      style={{ background: s.background, color: text, fontFamily: s.fontFamily }}
    >
      <div
        className={`mx-auto flex w-full max-w-md min-w-0 flex-col items-center ${compact ? "px-4 py-8" : "px-5 pb-14 pt-12 sm:pt-16"}`}
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
            return (
              <a
                key={link.id}
                href={href}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
                onClick={() => onLinkClick?.(link)}
                className="group flex min-h-[56px] w-full min-w-0 animate-soft-in items-center gap-3 px-4 py-3.5 transition-transform duration-200 active:scale-[0.985] sm:hover:-translate-y-0.5"
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
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{ background: `${meta.tint}22`, color: meta.tint === "#010101" || meta.tint === "#111111" ? text : meta.tint }}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{link.title || meta.label}</span>
                <ChevronRight
                  className="h-4 w-4 shrink-0 opacity-40 transition-transform duration-200 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
                  aria-hidden="true"
                />
              </a>
            );
          })}

          {enabled.length === 0 && (
            <p className="py-6 text-center text-sm" style={{ color: s.mutedText }}>
              {t("publicProfile.noLinks")}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex w-full min-w-0 flex-col gap-3">
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
          <button
            type="button"
            onClick={onSaveContact}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 px-4 text-sm font-semibold transition-transform active:scale-[0.985] sm:hover:-translate-y-0.5"
            style={{
              borderRadius: radius,
              background: "transparent",
              border: `1px solid ${s.surfaceBorder}`,
              color: text,
            }}
          >
            <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{t("publicProfile.saveContact")}</span>
          </button>
        </div>

        <p className="mt-10 text-center text-[0.68rem] uppercase tracking-[0.24em]" style={{ color: s.mutedText }}>
          {t("brand.poweredBy")}
        </p>
      </div>
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
