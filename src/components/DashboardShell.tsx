import { useState, type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Menu, Trophy, X, type LucideIcon } from "lucide-react";
import { Wordmark } from "@/components/Brand";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export function DashboardShell({
  items,
  title,
  subtitle,
  actions,
  children,
  areaLabel,
}: {
  items: NavItem[];
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  areaLabel: string;
}) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
      isActive
        ? "bg-sidebar-accent text-sidebar-primary"
        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground hover:translate-x-0.5 rtl:hover:-translate-x-0.5",
    );

  return (
    <div className="flex min-h-dvh w-full bg-background">
      {/* Sidebar (desktop) — follows document direction automatically */}
      <aside className="hidden w-[264px] shrink-0 flex-col justify-between border-e border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
        <div>
          <div className="px-2">
            <Wordmark invert />
            <p className="mt-1 ps-[3.1rem] text-[0.6rem] uppercase tracking-[0.22em] text-sidebar-foreground/50">
              {areaLabel}
            </p>
          </div>
          <nav className="mt-8 flex flex-col gap-1" aria-label={t("nav.dashboard")}>
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </NavLink>
            ))}
            <NavLink to="/leaderboard" className={navLinkClass}>
              <Trophy className="h-4 w-4" aria-hidden="true" />
              {t("leaderboard.title")}
            </NavLink>
          </nav>
        </div>
        <div className="space-y-3 px-2">
          <LanguageSwitcher tone="invert" className="w-full justify-center" />
          <div className="rounded-xl bg-sidebar-accent/50 p-3">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {profile?.full_name || t("dashboard.user")}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60">{profile?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" /> {t("common.signOut")}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-sidebar-border bg-sidebar px-4 py-3 lg:hidden">
          <Wordmark invert />
          <div className="flex items-center gap-2">
            <LanguageSwitcher tone="invert" compact />
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("common.openMenu")}
              className="text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </header>

        {menuOpen && (
          <nav
            className="animate-soft-in border-b border-sidebar-border bg-sidebar px-4 py-3 lg:hidden"
            aria-label={t("nav.mobile")}
          >
            <div className="flex flex-col gap-1">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={navLinkClass}
                  onClick={() => setMenuOpen(false)}
                >
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </NavLink>
              ))}
              <button
                onClick={handleSignOut}
                className="mt-1 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-sidebar-foreground/70"
              >
                <LogOut className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" /> {t("common.signOut")}
              </button>
            </div>
          </nav>
        )}

        <main className="flex-1 px-4 pb-24 pt-6 sm:px-8 sm:pb-12 lg:pt-10">
          <div className="mx-auto w-full max-w-5xl">
            <div className="flex animate-soft-in flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
                {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
              </div>
              {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
            </div>
            <div className="mt-7 animate-soft-in" style={{ animationDelay: "80ms" }}>
              {children}
            </div>
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav
          className="fixed bottom-0 start-0 end-0 z-40 flex items-stretch gap-1 overflow-x-auto border-t border-sidebar-border bg-sidebar px-2 py-1.5 no-scrollbar sm:hidden"
          aria-label={t("nav.quick")}
        >
          {items.slice(0, 5).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex min-h-11 min-w-[64px] flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[0.65rem] font-medium transition-colors",
                  isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60",
                )
              }
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

export function ShellLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}
