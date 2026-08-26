import { Globe } from "lucide-react";
import { useI18n, type Lang } from "@/i18n";
import { cn } from "@/lib/utils";

const OPTIONS: { id: Lang; short: string; full: string }[] = [
  { id: "en", short: "EN", full: "English" },
  { id: "ar", short: "ع", full: "العربية" },
];

/**
 * Subtle segmented EN | العربية switch. `tone="invert"` for dark surfaces.
 */
export function LanguageSwitcher({
  className,
  tone = "default",
  compact = false,
}: {
  className?: string;
  tone?: "default" | "invert";
  compact?: boolean;
}) {
  const { lang, setLang, t } = useI18n();
  const invert = tone === "invert";

  return (
    <div
      role="group"
      aria-label={t("lang.label")}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border p-0.5 transition-colors",
        invert ? "border-white/15 bg-white/5" : "border-border bg-muted/50",
        className,
      )}
    >
      <Globe
        className={cn("ms-1.5 h-3.5 w-3.5 shrink-0", invert ? "text-white/50" : "text-muted-foreground")}
        aria-hidden="true"
      />
      {OPTIONS.map((opt) => {
        const active = lang === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setLang(opt.id)}
            aria-pressed={active}
            aria-label={`${t("lang.switchTo")}: ${opt.full}`}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? invert
                  ? "bg-sky text-navy"
                  : "bg-primary text-primary-foreground shadow-soft"
                : invert
                  ? "text-white/60 hover:text-white"
                  : "text-muted-foreground hover:text-foreground",
            )}
          >
            {compact ? opt.short : opt.id === "en" ? "EN" : "العربية"}
          </button>
        );
      })}
    </div>
  );
}
