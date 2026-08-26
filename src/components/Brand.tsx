import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { OshegahLogo } from "@/components/OshegahLogo";

export function BrandMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <OshegahLogo
      size={size}
      className={cn("transition-transform duration-300 group-hover:scale-105", className)}
    />
  );
}

export function Wordmark({
  className,
  to = "/",
  invert = false,
}: { className?: string; to?: string; invert?: boolean }) {
  const { t } = useI18n();
  return (
    <Link to={to} className={cn("group inline-flex min-w-0 items-center gap-2.5", className)} aria-label={t("brand.home")}>
      <BrandMark />
      <span
        className={cn(
          "truncate font-display text-[1.05rem] font-semibold tracking-[0.18em]",
          invert ? "text-white" : "text-foreground",
        )}
      >
        OSHEGAH
      </span>
    </Link>
  );
}
