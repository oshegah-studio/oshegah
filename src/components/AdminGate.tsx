import { createContext, useContext, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { Wordmark } from "@/components/Brand";
import { PageLoader } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Second admin verification step. The real enforcement lives in the database:
 * is_admin() requires the admin role AND a live step-up session bound to the
 * current sign-in session, so this screen is only the way to obtain one.
 */
interface AdminGateValue {
  owner: boolean;
  expiresAt: string | null;
  lock: () => Promise<void>;
}
const Ctx = createContext<AdminGateValue>({ owner: false, expiresAt: null, lock: async () => {} });
export const useAdminGate = () => useContext(Ctx);

interface Status {
  eligible: boolean;
  configured: boolean;
  verified: boolean;
  owner: boolean;
  username: string | null;
  locked_until: string | null;
  expires_at: string | null;
}

const USERNAME_RE = /^[a-z0-9._-]{3,32}$/i;
const strong = (p: string) =>
  p.length >= 12 && p.length <= 128 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p);

export function AdminGate({ children }: { children: ReactNode }) {
  const { t, lang } = useI18n();
  const { user, signOut } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [needReauth, setNeedReauth] = useState(false);

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ["admin-auth-status", user?.id],
    enabled: Boolean(user),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_auth_status");
      if (error) throw error;
      return (Array.isArray(data) ? data[0] : data) as Status;
    },
  });

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-GB", { hour: "2-digit", minute: "2-digit" });

  const errorText = (code: string | null | undefined, until?: string | null) => {
    if (!code) return t("adminAuth.generic");
    const msg = t(`adminAuth.${code}`, { time: until ? fmtTime(until) : "" });
    return msg === `adminAuth.${code}` ? t("adminAuth.generic") : msg;
  };

  const afterSuccess = async () => {
    setPassword(""); setConfirm(""); setError(null);
    qc.removeQueries({ queryKey: ["admin-customers"] });
    await refetch();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const setup = !status?.configured;
    if (setup) {
      if (!USERNAME_RE.test(username.trim())) return setError(t("adminAuth.INVALID_USERNAME"));
      if (!strong(password)) return setError(t("adminAuth.WEAK_PASSWORD"));
      if (password !== confirm) return setError(t("adminAuth.mismatch"));
    }
    setBusy(true);
    try {
      const { data, error: rpcError } = setup
        ? await supabase.rpc("admin_setup_credentials", { _username: username.trim(), _password: password })
        : await supabase.rpc("admin_login", { _username: username.trim(), _password: password });
      if (rpcError) throw rpcError;
      const row = (Array.isArray(data) ? data[0] : data) as { ok: boolean; error: string | null; expires_at: string | null };
      if (!row?.ok) {
        setPassword("");
        setError(errorText(row?.error, row?.expires_at));
        return;
      }
      await afterSuccess();
    } catch {
      setError(t("adminAuth.generic"));
    } finally {
      setBusy(false);
    }
  };

  const resetOwn = async () => {
    if (!window.confirm(t("adminAuth.resetConfirm"))) return;
    const { data, error: rpcError } = await supabase.rpc("admin_reset_own_credentials");
    const row = (Array.isArray(data) ? data[0] : data) as { ok: boolean; error: string | null } | null;
    if (rpcError || !row?.ok) {
      if (row?.error === "REAUTH_REQUIRED") setNeedReauth(true);
      setError(errorText(row?.error));
      return;
    }
    toast.success(t("adminAuth.resetDone"));
    setUsername("");
    await afterSuccess();
  };

  const reauth = async () => {
    await signOut();
    navigate("/login", { state: { from: "/admin" }, replace: true });
  };

  const lock = async () => {
    await supabase.rpc("admin_logout");
    qc.removeQueries({ queryKey: ["admin-customers"] });
    await refetch();
  };

  if (isLoading || !status) return <PageLoader label={t("auth.checkingSession")} />;

  if (status.verified) {
    return (
      <Ctx.Provider value={{ owner: status.owner, expiresAt: status.expires_at, lock }}>
        {children}
      </Ctx.Provider>
    );
  }

  const setup = !status.configured;
  const lockedUntil = status.locked_until;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
        <Wordmark />
        <div className="mt-6 flex items-center gap-2 text-primary">
          {setup ? <KeyRound className="h-5 w-5" aria-hidden="true" /> : <ShieldCheck className="h-5 w-5" aria-hidden="true" />}
          <h1 className="font-display text-xl font-semibold text-foreground">
            {setup ? t("adminAuth.setupTitle") : t("adminAuth.loginTitle")}
          </h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{setup ? t("adminAuth.setupText") : t("adminAuth.loginText")}</p>

        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="admin-username">{t("adminAuth.username")}</Label>
            <Input
              id="admin-username" dir="ltr" autoComplete="username" required
              value={username} onChange={(e) => setUsername(e.target.value)} maxLength={32}
            />
            {setup && <p className="text-xs text-muted-foreground">{t("adminAuth.usernameHint")}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-password">{t("adminAuth.password")}</Label>
            <Input
              id="admin-password" type="password" dir="ltr" required maxLength={128}
              autoComplete={setup ? "new-password" : "current-password"}
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
            {setup && <p className="text-xs text-muted-foreground">{t("adminAuth.passwordHint")}</p>}
          </div>
          {setup && (
            <div className="space-y-1.5">
              <Label htmlFor="admin-confirm">{t("adminAuth.confirm")}</Label>
              <Input
                id="admin-confirm" type="password" dir="ltr" required maxLength={128} autoComplete="new-password"
                value={confirm} onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          )}

          {(error || lockedUntil) && (
            <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error ?? errorText("LOCKED", lockedUntil)}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={busy}>
            {setup ? t("adminAuth.create") : t("adminAuth.signIn")}
          </Button>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">{t("adminAuth.backToAccount")}</Link>
          {!setup && (
            needReauth ? (
              <button type="button" onClick={() => void reauth()} className="font-medium text-primary hover:underline">
                {t("adminAuth.reauth")}
              </button>
            ) : (
              <button type="button" onClick={() => void resetOwn()} className="font-medium text-primary hover:underline">
                {t("adminAuth.forgot")}
              </button>
            )
          )}
        </div>
      </div>
    </main>
  );
}
