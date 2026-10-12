import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronsUpDown, LayoutDashboard, LogOut, Plus, ShieldCheck, UserRoundX } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { forgetAccount, switchToAccount, MAX_ACCOUNTS, type ParkedAccount } from "@/lib/accounts";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

const initials = (name?: string | null, email?: string | null) => {
  const base = name?.trim() || email?.split("@")[0] || "O";
  return base.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
};

export function AccountSwitcher({ className, tone = "invert" }: { className?: string; tone?: "default" | "invert" }) {
  const { user, profile, isAdmin, accounts, refreshAccounts, signOut } = useAuth();
  const location = useLocation();
  const inAdmin = location.pathname.startsWith("/admin");
  const { t } = useI18n();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const activeName = profile?.full_name || user?.email || t("dashboard.user");

  const doSwitch = async (account: ParkedAccount) => {
    if (account.userId === user?.id || busy) return;
    setBusy(true);
    try {
      await switchToAccount(account);
      // Hard isolation: nothing from the previous account survives in cache.
      qc.clear();
      await refreshAccounts();
      toast.success(t("accounts.switched", { name: account.name || account.email || "" }));
      navigate("/dashboard", { replace: true });
    } catch {
      toast.error(t("accounts.switchFailed"));
      await refreshAccounts();
    } finally {
      setBusy(false);
    }
  };

  const addAccount = () => {
    if (accounts.length >= MAX_ACCOUNTS) return toast.error(t("accounts.limit", { max: MAX_ACCOUNTS }));
    navigate("/login", { state: { addAccount: true } });
  };

  const remove = async (account: ParkedAccount) => {
    await forgetAccount(account.userId);
    await refreshAccounts();
    toast.success(t("accounts.removed"));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex w-full items-center gap-3 rounded-xl p-3 text-start transition-colors",
          tone === "invert" ? "bg-sidebar-accent/50 hover:bg-sidebar-accent" : "bg-muted hover:bg-accent",
          className,
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(profile?.full_name, user?.email)
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-sm font-medium", tone === "invert" ? "text-sidebar-foreground" : "text-foreground")}>{activeName}</span>
          <span className={cn("block truncate text-xs", tone === "invert" ? "text-sidebar-foreground/60" : "text-muted-foreground")}>
            {isAdmin && inAdmin
              ? t("views.admin")
              : profile?.account_type === "business" ? t("auth.business") : t("auth.personal")}
          </span>
        </span>
        <ChevronsUpDown className={cn("h-4 w-4 shrink-0", tone === "invert" ? "text-sidebar-foreground/50" : "text-muted-foreground")} aria-hidden="true" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        {isAdmin && (
          <>
            <DropdownMenuLabel>{t("views.switch")}</DropdownMenuLabel>
            {[
              { to: "/dashboard", label: t("views.normal"), icon: LayoutDashboard, active: !inAdmin },
              { to: "/admin", label: t("views.admin"), icon: ShieldCheck, active: inAdmin },
            ].map((v) => (
              <DropdownMenuItem
                key={v.to}
                aria-current={v.active ? "true" : undefined}
                onSelect={() => navigate(v.to)}
                className="flex items-center gap-2"
              >
                <v.icon className="h-4 w-4" aria-hidden="true" />
                <span className="flex-1">{v.label}</span>
                {v.active && <span className="text-xs text-primary">{t("views.current")}</span>}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuLabel>{t("accounts.switchAccount")}</DropdownMenuLabel>
        {accounts.map((a) => {
          const active = a.userId === user?.id;
          return (
            <DropdownMenuItem
              key={a.userId}
              onSelect={(e) => {
                e.preventDefault();
                void doSwitch(a);
              }}
              className="flex items-center gap-2"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[0.65rem] font-semibold">
                {a.avatarUrl ? (
                  <img src={a.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials(a.name, a.email)
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{a.name || a.email}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {a.accountType === "business" ? t("auth.business") : t("auth.personal")}
                </span>
              </span>
              {active ? (
                <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              ) : (
                <button
                  type="button"
                  aria-label={t("accounts.remove")}
                  className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    void remove(a);
                  }}
                >
                  <UserRoundX className="h-3.5 w-3.5" />
                </button>
              )}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); addAccount(); }}>
          <Plus className="me-2 h-4 w-4" aria-hidden="true" />
          {t("accounts.add")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            void signOut().then(() => navigate("/"));
          }}
        >
          <LogOut className="me-2 h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
          {t("common.signOut")}
        </DropdownMenuItem>
        <p className="px-2 py-1.5 text-[0.68rem] text-muted-foreground">
          {t("accounts.hint", { max: MAX_ACCOUNTS })}
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
