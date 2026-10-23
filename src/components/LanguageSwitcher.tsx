import { Globe } from "lucide-react";
import { useI18n, type Lang } from "@/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
  fullLabels = false,
  onSelect,
}: {
  className?: string;
  tone?: "default" | "invert";
  compact?: boolean;
  fullLabels?: boolean;
  onSelect?: () => void;
}) {
  const { lang, setLang, t } = useI18n();
  const invert = tone === "invert";

  return (
    <div
      role="group"
      aria-label={t("lang.label")}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border p-0.5 transition-colors",
        invert ? "border-sidebar-border bg-sidebar-accent/40" : "border-border bg-muted/50",
        className,
      )}
    >
      <Globe
        className={cn("ms-1.5 h-3.5 w-3.5 shrink-0", invert ? "text-sidebar-foreground/60" : "text-muted-foreground")}
        aria-hidden="true"
      />
      {OPTIONS.map((opt) => {
        const active = lang === opt.id;
        return (
          <Button
            variant="ghost"
            key={opt.id}
            type="button"
            onClick={() => { setLang(opt.id); onSelect?.(); }}
            aria-pressed={active}
            aria-label={`${t("lang.switchTo")}: ${opt.full}`}
            className={cn(
              "h-auto rounded-full px-2.5 py-1 text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? invert
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "bg-primary text-primary-foreground shadow-soft"
                : invert
                  ? "text-sidebar-foreground/70 hover:text-sidebar-foreground"
                  : "text-muted-foreground hover:text-foreground",
            )}
          >
            {fullLabels ? opt.full : compact ? opt.short : opt.id === "en" ? "EN" : "العربية"}
          </Button>
        );
      })}
    </div>
  );
}
