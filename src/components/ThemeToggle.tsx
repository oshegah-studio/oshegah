import { Monitor, Moon, Sun } from "lucide-react";
import { useAppTheme, type AppTheme } from "@/hooks/useAppTheme";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

const OPTIONS: { id: AppTheme; icon: typeof Sun; key: string }[] = [
  { id: "light", icon: Sun, key: "appearance.light" },
  { id: "dark", icon: Moon, key: "appearance.dark" },
  { id: "system", icon: Monitor, key: "appearance.system" },
];

export function ThemeToggle({
  className,
  tone = "default",
  labels = false,
}: {
  className?: string;
  tone?: "default" | "invert";
  labels?: boolean;
}) {
  const { theme, setTheme } = useAppTheme();
  const { t } = useI18n();

  return (
    <div
      role="radiogroup"
      aria-label={t("appearance.appTheme")}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border p-0.5",
        tone === "invert" ? "border-sidebar-border bg-sidebar-accent/40" : "border-border bg-muted/60",
        className,
      )}
    >
      {OPTIONS.map((o) => {
        const active = theme === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            title={t(o.key)}
            onClick={() => setTheme(o.id)}
            className={cn(
              "flex min-h-8 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-200",
              active
                ? tone === "invert"
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "bg-background text-foreground shadow-soft"
                : tone === "invert"
                  ? "text-sidebar-foreground/70 hover:text-sidebar-foreground"
                  : "text-muted-foreground hover:text-foreground",
            )}
          >
            <o.icon className="h-3.5 w-3.5" aria-hidden="true" />
            {labels && <span>{t(o.key)}</span>}
            {!labels && <span className="sr-only">{t(o.key)}</span>}
          </button>
        );
      })}
    </div>
  );
}
