import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Globe, Menu, Palette, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useI18n } from "@/i18n";

/** Narrow-screen settings in the existing header; Radix handles focus and dismissal. */
export function MobileHeaderMenu({ children, breakpoint = "sm", tone = "default" }: {
  children?: ReactNode;
  breakpoint?: "sm" | "lg";
  tone?: "default" | "invert";
}) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { t, lang } = useI18n();
  const close = () => setOpen(false);

  useEffect(() => { setOpen(false); }, [location.key]);
  useEffect(() => {
    const media = window.matchMedia(`(min-width: ${breakpoint === "lg" ? 1024 : 640}px)`);
    const resize = () => { if (media.matches) setOpen(false); };
    media.addEventListener("change", resize);
    return () => media.removeEventListener("change", resize);
  }, [breakpoint]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={`h-11 w-11 shrink-0 ${breakpoint === "lg" ? "lg:hidden" : "sm:hidden"} ${tone === "invert" ? "text-sidebar-foreground hover:bg-sidebar-accent" : ""}`}
          aria-label={open ? t("common.close") : t("common.openMenu")}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} collisionPadding={12}
        dir={lang === "ar" ? "rtl" : "ltr"} aria-label={t("nav.mobile")}
        className={`w-[296px] max-w-[calc(100vw-24px)] max-h-[calc(100dvh-88px)] overflow-y-auto p-4 ${breakpoint === "lg" ? "lg:hidden" : "sm:hidden"} motion-reduce:animate-none`}>
        <div className="space-y-4">
          <section className="space-y-2" aria-label={t("appearance.appTheme")}>
            <h2 className="flex items-center gap-2 text-sm font-semibold"><Palette className="h-4 w-4 text-primary" />{t("appearance.appTheme")}</h2>
            <ThemeToggle labels onSelect={close} className="w-full justify-between" />
          </section>
          <section className="space-y-2" aria-label={t("lang.label")}>
            <h2 className="flex items-center gap-2 text-sm font-semibold"><Globe className="h-4 w-4 text-primary" />{t("lang.label")}</h2>
            <LanguageSwitcher fullLabels onSelect={close} className="w-full justify-center" />
          </section>
          <nav aria-label={t("nav.mobile")} className="border-t border-border pt-2" onClick={(event) => {
            if (event.target instanceof Element && event.target.closest("a")) close();
          }}>
            <Button asChild variant="ghost" className="w-full justify-start gap-2">
              <Link to="/leaderboard"><Trophy className="h-4 w-4 text-primary" />{t("leaderboard.title")}</Link>
            </Button>
            {children}
          </nav>
        </div>
      </PopoverContent>
    </Popover>
  );
}