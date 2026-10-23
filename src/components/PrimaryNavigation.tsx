import { Home, Users, User } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function usePrimaryDestinations() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  return [
    { to: "/", label: t("nav.home"), icon: Home, end: true },
    { to: "/my-circle", label: t("circle.title"), icon: Users, end: true },
    { to: user ? (profile?.account_type === "business" ? "/business" : "/dashboard") : "/login", label: t("nav.profile"), icon: User, end: false },
  ];
}

export function PrimaryNavigation({ mobile = false }: { mobile?: boolean }) {
  const items = usePrimaryDestinations();
  return (
    <nav aria-label={useI18n().t("nav.main")} className={cn(
      mobile
        ? "fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-border bg-background/95 px-2 pt-1 backdrop-blur pb-[max(0.375rem,env(safe-area-inset-bottom))] sm:hidden"
        : "hidden items-center justify-center gap-2 sm:flex",
    )}>
      {items.map(item => (
        <Button key={item.to} variant="ghost" asChild className={mobile ? "h-auto min-h-14 rounded-md px-1 py-2" : "gap-2"}>
          <NavLink to={item.to} end={item.end} state={item.to === "/login" ? { from: "/dashboard" } : undefined}
            className={({ isActive }) => cn(mobile ? "flex flex-col gap-1 text-xs" : "flex items-center", isActive ? "bg-accent text-primary" : "text-muted-foreground")}>
            <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        </Button>
      ))}
    </nav>
  );
}

/** DashboardShell owns its existing bottom bar; all other pages share one mobile bar. */
export function PublicMobileNavigation() {
  const { pathname } = useLocation();
  if (["/dashboard", "/business", "/admin", "/my-circle"].includes(pathname)) return null;
  return <><div className="h-20 sm:hidden" aria-hidden="true" /><PrimaryNavigation mobile /></>;
}