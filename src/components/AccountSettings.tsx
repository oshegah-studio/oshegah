import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Briefcase, Loader2, Trash2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth, type AccountType } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

export function AccountSettings() {
  const { profile, refresh, signOut } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [pendingType, setPendingType] = useState<AccountType | null>(null);
  const [switching, setSwitching] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const current: AccountType = profile?.account_type ?? "personal";

  const confirmSwitch = async () => {
    if (!pendingType) return;
    setSwitching(true);
    const { error } = await supabase.rpc("switch_profile_type", { _next: pendingType });
    setSwitching(false);
    setPendingType(null);
    if (error) {
      toast.error(error.message);
      await refresh();
      return;
    }
    toast.success(t("profileType.switched"));
    await refresh();
    await qc.invalidateQueries();
    navigate(pendingType === "business" ? "/business" : "/dashboard", { replace: true });
  };

  const deleteAccount = async () => {
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke("delete-account", { body: {} });
    setDeleting(false);
    if (error || (data as { error?: string })?.error) {
      return toast.error((data as { error?: string })?.error || error?.message || t("deleteAccount.failed"));
    }
    qc.clear();
    await signOut();
    toast.success(t("deleteAccount.done"));
    navigate("/", { replace: true });
  };

  const options: { id: AccountType; icon: typeof User; label: string; text: string }[] = [
    { id: "personal", icon: User, label: t("auth.personal"), text: t("profileType.personalText") },
    { id: "business", icon: Briefcase, label: t("auth.business"), text: t("profileType.businessText") },
  ];

  return (
    <div className="space-y-8">
      {/* Application appearance */}
      <section className="animate-soft-in space-y-3 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="font-display text-lg font-semibold">{t("appearance.appTheme")}</h2>
        <p className="text-sm text-muted-foreground">{t("appearance.appThemeText")}</p>
        <ThemeToggle labels />
      </section>

      {/* Profile type */}
      <section className="animate-soft-in space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div>
          <h2 className="font-display text-lg font-semibold">{t("profileType.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("profileType.switchExplain")}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {options.map((o) => {
            const active = current === o.id;
            return (
              <button
                key={o.id}
                type="button"
                disabled={active || switching}
                onClick={() => setPendingType(o.id)}
                className={cn(
                  "card-interactive rounded-xl border p-4 text-start disabled:cursor-not-allowed",
                  active ? "border-primary ring-2 ring-primary/25" : "border-border",
                )}
              >
                <span className="flex items-center gap-2 font-medium">
                  <o.icon className="h-4 w-4" aria-hidden="true" />
                  {o.label}
                  {active && <span className="text-xs text-primary">· {t("profileType.current")}</span>}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">{o.text}</span>
              </button>
            );
          })}
        </div>

      </section>

      {/* Danger zone */}
      <section className="animate-soft-in space-y-3 rounded-2xl border border-destructive/40 bg-card p-5 shadow-soft">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          {t("deleteAccount.title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("deleteAccount.text")}</p>
        <Button variant="destructive" onClick={() => { setConfirmText(""); setDeleteOpen(true); }}>
          <Trash2 className="me-2 h-4 w-4" aria-hidden="true" />
          {t("deleteAccount.button")}
        </Button>
      </section>

      {/* Switch confirmation */}
      <AlertDialog open={Boolean(pendingType)} onOpenChange={(v) => !v && setPendingType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("profileType.confirmTitle", {
                type: pendingType === "business" ? t("auth.business") : t("auth.personal"),
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("profileType.confirmText")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={switching}
              onClick={(e) => {
                e.preventDefault();
                void confirmSwitch();
              }}
            >
              {switching && <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {t("profileType.confirmButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={(v) => !v && setDeleteOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteAccount.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteAccount.confirmText")}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="delete-confirm">{t("deleteAccount.typeToConfirm")}</Label>
            <Input
              id="delete-confirm"
              dir="ltr"
              autoComplete="off"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmText.trim().toUpperCase() !== "DELETE" || deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void deleteAccount();
              }}
            >
              {deleting && <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {t("deleteAccount.finalButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
