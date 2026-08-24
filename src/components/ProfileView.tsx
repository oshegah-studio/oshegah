import { BadgeCheck, MapPin, ChevronRight, Download, Phone } from "lucide-react";
import { getTheme, buttonRadius } from "@/lib/themes";
import { linkMeta, buildLinkHref } from "@/lib/links";

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
  const theme = getTheme(customer.theme);
  const radius = buttonRadius(customer.button_style);
  const text = customer.text_color || theme.text;
  const accent = customer.primary_color || theme.accent;
  const enabled = links.filter((l) => l.enabled !== false);
  const contactLink = customer.phone ? { href: `tel:${customer.phone.replace(/[^\d+]/g, "")}` } : null;

  return (
    <div
      className="min-h-full w-full"
      style={{ background: theme.background, color: text }}
    >
      <div
        className={`mx-auto flex w-full max-w-md flex-col items-center ${compact ? "px-4 py-8" : "px-5 pb-14 pt-12 sm:pt-16"}`}
      >
        {/* Avatar */}
        <div className="relative">
          <div
            className="flex items-center justify-center overflow-hidden rounded-full"
            style={{
              width: compact ? 76 : 104,
              height: compact ? 76 : 104,
              border: `2px solid ${theme.surfaceBorder}`,
              background: theme.surface,
              backdropFilter: theme.blur ? "blur(12px)" : undefined,
            }}
          >
            {customer.avatar_url ? (
              <img
                src={customer.avatar_url}
                alt={`${customer.full_name} profile photo`}
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

        {/* Name */}
        <h1
          className={`mt-4 flex items-center gap-1.5 text-center font-display font-semibold ${compact ? "text-lg" : "text-2xl"}`}
        >
          {customer.full_name}
          {customer.verified && (
            <BadgeCheck
              className={compact ? "h-4 w-4" : "h-5 w-5"}
              style={{ color: accent }}
              aria-label="Verified profile"
            />
          )}
        </h1>

        {customer.job_title && (
          <p className="mt-1 text-xs uppercase tracking-[0.18em]" style={{ color: theme.mutedText }}>
            {customer.job_title}
          </p>
        )}

        {customer.bio && (
          <p
            className={`mt-2 max-w-xs text-center ${compact ? "text-xs" : "text-sm"} leading-relaxed`}
            style={{ color: theme.mutedText }}
          >
            {customer.bio}
          </p>
        )}

        {customer.location && (
          <p className="mt-2 flex items-center gap-1 text-xs" style={{ color: theme.mutedText }}>
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {customer.location}
          </p>
        )}

        {/* Links */}
        <div className="mt-7 flex w-full flex-col gap-3">
          {enabled.map((link) => {
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
                className="group flex min-h-[56px] items-center gap-3 px-4 py-3.5 transition-transform duration-200 active:scale-[0.985] sm:hover:-translate-y-0.5"
                style={{
                  borderRadius: radius,
                  background: theme.surface,
                  border: `1px solid ${theme.surfaceBorder}`,
                  backdropFilter: theme.blur ? "blur(14px)" : undefined,
                  color: text,
                }}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{ background: `${meta.tint}22`, color: meta.tint === "#010101" || meta.tint === "#111111" ? text : meta.tint }}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="flex-1 truncate text-sm font-medium">{link.title || meta.label}</span>
                <ChevronRight className="h-4 w-4 opacity-40" aria-hidden="true" />
              </a>
            );
          })}

          {enabled.length === 0 && (
            <p className="py-6 text-center text-sm" style={{ color: theme.mutedText }}>
              No links yet.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex w-full flex-col gap-3">
          {contactLink && (
            <a
              href={contactLink.href}
              className="flex min-h-[52px] items-center justify-center gap-2 text-sm font-semibold transition-transform active:scale-[0.985]"
              style={{ borderRadius: radius, background: accent, color: theme.id === "oshegah_light" || theme.id === "minimal" ? "#FFFFFF" : "#162446" }}
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              Contact Me
            </a>
          )}
          <button
            type="button"
            onClick={onSaveContact}
            className="flex min-h-[52px] items-center justify-center gap-2 text-sm font-semibold transition-transform active:scale-[0.985]"
            style={{
              borderRadius: radius,
              background: "transparent",
              border: `1px solid ${theme.surfaceBorder}`,
              color: text,
            }}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Save Contact
          </button>
        </div>

        <p className="mt-10 text-[0.68rem] uppercase tracking-[0.24em]" style={{ color: theme.mutedText }}>
          Powered by OSHEGAH
        </p>
      </div>
    </div>
  );
}

export function PhoneFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative mx-auto w-[300px] shrink-0 rounded-[2.4rem] border border-white/15 bg-navy-deep p-2.5 shadow-lift ${className ?? ""}`}
    >
      <div className="absolute left-1/2 top-4 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-white/20" />
      <div className="h-[560px] overflow-y-auto overscroll-contain rounded-[2rem] no-scrollbar">
        {children}
      </div>
    </div>
  );
}
