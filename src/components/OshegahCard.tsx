import { Nfc } from "lucide-react";
import { OshegahLogo } from "@/components/OshegahLogo";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

/**
 * Physical OSHEGAH NFC card visual — the hero object of the product.
 * Pure CSS/SVG so it stays crisp on every screen and costs no extra bytes.
 */
export function OshegahCard({ className, name, username }: { className?: string; name?: string; username?: string }) {
  const { t } = useI18n();

  return (
    <div className={cn("mx-auto w-full max-w-[420px] [perspective:1400px]", className)}>
      <div className="animate-soft-in rounded-[1.6rem] bg-white p-6 shadow-lift transition-transform duration-500 ease-out [transform:rotateX(6deg)_rotateY(-10deg)] hover:[transform:rotateX(2deg)_rotateY(-3deg)] sm:p-7">
        <div className="relative flex aspect-[1.586/1] flex-col justify-between overflow-hidden">
          {/* oversized brand mark, clipped like the real card */}
          <span className="pointer-events-none absolute -end-10 -top-6 opacity-[0.10]" aria-hidden="true">
            <OshegahLogo size={230} />
          </span>

          <div className="relative flex items-center gap-3">
            <OshegahLogo size={40} />
            <span className="font-display text-lg font-semibold tracking-[0.22em] text-navy">OSHEGAH</span>
          </div>

          <div className="relative">
            <p className="font-display text-xl font-semibold text-navy sm:text-2xl">
              {t("card.tagline")}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-navy/50">{t("card.nfc")}</p>
          </div>

          <div className="relative flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold text-navy">{name ?? "Yahia Hani"}</p>
              <p className="truncate text-xs text-navy/55" dir="ltr">
                oshegah.com/{username ?? "yahiahani"}
              </p>
            </div>
            <Nfc className="h-7 w-7 shrink-0 text-navy/60" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}
