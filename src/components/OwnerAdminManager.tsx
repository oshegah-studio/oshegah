import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Crown, UserMinus, UserPlus, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n";
import { useAdminGate } from "@/components/AdminGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AdminRow {
  user_id: string;
  email: string;
  full_name: string | null;
  is_owner: boolean;
  configured: boolean;
}

type Pending =
  | { kind: "add"; email: string }
  | { kind: "remove"; row: AdminRow }
  | { kind: "reset"; row: AdminRow };

/** Owner-only admin list. Every action is re-authorized by owner-only database functions. */
export function OwnerAdminManager() {
  const { t } = useI18n();
  const { owner } = useAdminGate();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);

  const { data: admins } = useQuery({
    queryKey: ["owner-admins"],
    enabled: owner,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("owner_list_admins");
      if (error) throw error;
      return (data ?? []) as AdminRow[];
    },
  });

  if (!owner) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="font-display text-lg font-semibold">{t("owner.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("owner.notOwner")}</p>
      </section>
    );
  }

  const msg = (code?: string | null) => {
    const m = code ? t(`owner.${code}`) : "";
    return code && m !== `owner.${code}` ? m : t("adminAuth.generic");
  };

  const run = async () => {
    if (!pending) return;
    const p = pending;
    setPending(null);
    const call =
      p.kind === "add"
        ? supabase.rpc("owner_grant_admin", { _email: p.email })
        : p.kind === "remove"
          ? supabase.rpc("owner_revoke_admin", { _user_id: p.row.user_id })
          : supabase.rpc("owner_reset_admin_credentials", { _user_id: p.row.user_id });
    const { data, error } = await call;
    const row = (Array.isArray(data) ? data[0] : data) as { ok: boolean; error: string | null } | null;
    if (error || !row?.ok) return toast.error(msg(row?.error));
    toast.success(p.kind === "add" ? t("owner.added") : p.kind === "remove" ? t("owner.removed") : t("owner.resetDone"));
    if (p.kind === "add") setEmail("");
    await qc.invalidateQueries({ queryKey: ["owner-admins"] });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return toast.error(t("owner.USER_NOT_FOUND"));
    setPending({ kind: "add", email: v });
  };

  const target = pending?.kind === "add" ? pending.email : pending?.row.email ?? "";

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <h2 className="font-display text-lg font-semibold">{t("owner.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("owner.text")}</p>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="owner-add-email">{t("owner.addLabel")}</Label>
          <Input id="owner-add-email" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
        </div>
        <Button type="submit"><UserPlus className="me-2 h-4 w-4" aria-hidden="true" />{t("owner.add")}</Button>
      </form>

      <ul className="mt-5 divide-y divide-border">
        {(admins ?? []).map((a) => (
          <li key={a.user_id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                {a.full_name || a.email}
                {a.is_owner && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[0.7rem] text-primary">
                    <Crown className="h-3 w-3" aria-hidden="true" />{t("owner.ownerBadge")}
                  </span>
                )}
              </p>
              <p className="truncate font-mono text-xs text-muted-foreground" dir="ltr">{a.email}</p>
              {!a.configured && <p className="text-xs text-muted-foreground">{t("owner.notSetUp")}</p>}
            </div>
            {!a.is_owner && (
              <div className="flex gap-1.5">
                {a.configured && (
                  <Button size="sm" variant="ghost" onClick={() => setPending({ kind: "reset", row: a })}>
                    <RotateCcw className="me-1.5 h-3.5 w-3.5" aria-hidden="true" />{t("owner.resetCreds")}
                  </Button>
                )}
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => setPending({ kind: "remove", row: a })}>
                  <UserMinus className="me-1.5 h-3.5 w-3.5" aria-hidden="true" />{t("owner.remove")}
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <AlertDialog open={Boolean(pending)} onOpenChange={(v) => !v && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.kind === "add" ? t("owner.confirmAddTitle") : pending?.kind === "remove" ? t("owner.confirmRemoveTitle") : t("owner.confirmResetTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.kind === "add"
                ? t("owner.confirmAdd", { email: target })
                : pending?.kind === "remove"
                  ? t("owner.confirmRemove", { email: target })
                  : t("owner.confirmReset", { email: target })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void run()}>{t("owner.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
