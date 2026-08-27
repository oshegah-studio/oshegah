import { OshegahLogo } from "@/components/OshegahLogo";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

/**
 * The real OSHEGAH NFC card — product representation, not a personalised card.
 * Layout mirrors the physical card: mark + wordmark top-start, slogan under it,
 * NFC contactless mark bottom-start, oversized clipped brand mark on the end edge.
 */
export function OshegahCard({ className }: { className?: string }) {
  const { t } = useI18n();

  return (
    <div className={cn("mx-auto w-full max-w-[420px] [perspective:1400px]", className)}>
      <div className="animate-card-float [transform-style:preserve-3d]">
        <div className="rounded-[1.15rem] bg-white shadow-lift transition-transform duration-500 ease-out [transform:rotateX(5deg)_rotateY(-9deg)] hover:[transform:rotateX(1deg)_rotateY(-2deg)]">
          <div className="relative flex aspect-[1.586/1] flex-col justify-between overflow-hidden rounded-[1.15rem] p-6 sm:p-7">
            {/* oversized mark clipped by the card edge, exactly like the print card */}
            <span
              className="pointer-events-none absolute -end-[22%] top-1/2 -translate-y-1/2 opacity-[0.22]"
              aria-hidden="true"
            >
              <OshegahLogo size={260} />
            </span>

            {/* soft light sweep */}
            <span
              className="pointer-events-none absolute inset-0 animate-card-sheen"
              aria-hidden="true"
              style={{
                background:
                  "linear-gradient(115deg, transparent 35%, hsl(var(--brand-cyan) / 0.12) 50%, transparent 65%)",
              }}
            />

            <div className="relative flex items-center gap-2.5">
              <OshegahLogo size={38} />
              <span className="font-display text-lg font-semibold tracking-[0.26em] text-navy sm:text-xl">
                OSHEGAH
              </span>
            </div>

            <p className="relative font-display text-base font-semibold tracking-[0.22em] text-brand-cyan sm:text-lg">
              {t("card.tagline")}
            </p>

            <div className="relative flex items-center gap-2.5">
              <NfcWaves />
              <span className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-navy/70">
                {t("card.nfc")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NfcWaves() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-brand-cyan" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <path d="M6.5 8.5a6 6 0 0 1 0 7" className="animate-nfc-wave" style={{ animationDelay: "0ms" }} />
        <path d="M10.5 6a10 10 0 0 1 0 12" className="animate-nfc-wave" style={{ animationDelay: "220ms" }} />
        <path d="M14.5 3.5a14 14 0 0 1 0 17" className="animate-nfc-wave" style={{ animationDelay: "440ms" }} />
      </g>
    </svg>
  );
}
