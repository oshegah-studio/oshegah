import { useState, type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Menu, X, type LucideIcon } from "lucide-react";
import { Wordmark } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

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
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
      isActive
        ? "bg-sidebar-accent text-sidebar-primary"
        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
    );

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-[264px] shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
        <div>
          <div className="px-2">
            <Wordmark invert />
            <p className="mt-1 pl-[3.1rem] text-[0.6rem] uppercase tracking-[0.22em] text-sidebar-foreground/50">
              {areaLabel}
            </p>
          </div>
          <nav className="mt-8 flex flex-col gap-1" aria-label="Dashboard navigation">
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="space-y-3 px-2">
          <div className="rounded-xl bg-sidebar-accent/50 p-3">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {profile?.full_name || "OSHEGAH user"}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60">{profile?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-sidebar-border bg-sidebar px-4 py-3 lg:hidden">
          <Wordmark invert />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open menu"
            className="text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </header>

        {menuOpen && (
          <nav className="border-b border-sidebar-border bg-sidebar px-4 py-3 lg:hidden" aria-label="Mobile navigation">
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
                <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
              </button>
            </div>
          </nav>
        )}

        <main className="flex-1 px-4 pb-24 pt-6 sm:px-8 sm:pb-12 lg:pt-10">
          <div className="mx-auto w-full max-w-5xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
                {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
              </div>
              {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
            </div>
            <div className="mt-7">{children}</div>
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch gap-1 overflow-x-auto border-t border-sidebar-border bg-sidebar px-2 py-1.5 no-scrollbar sm:hidden"
          aria-label="Quick navigation"
        >
          {items.slice(0, 5).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex min-w-[64px] flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[0.65rem] font-medium",
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
