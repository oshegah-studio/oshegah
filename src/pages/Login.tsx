import { useState } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/Brand";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth, homeRouteFor } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { Seo } from "@/components/Seo";

export default function Login() {
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={location.state?.from || homeRouteFor(profile, isAdmin)} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("auth.welcomeBack"));
    navigate(location.state?.from || "/dashboard", { replace: true });
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-secondary/25 px-5 py-12">
      <Seo
        title="Sign in — OSHEGAH digital business cards"
        description="Sign in to your OSHEGAH account to manage your digital profile, smart NFC card and analytics."
        path="/login"
      />
      <div className="w-full max-w-sm animate-soft-in rounded-2xl border border-border bg-card p-7 shadow-soft">
        <div className="flex items-center justify-between gap-2">
          <Wordmark />
          <LanguageSwitcher compact />
        </div>
        <h1 className="mt-6 font-display text-2xl font-semibold">{t("auth.loginTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("auth.loginSubtitle")}</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input id="email" dir="ltr" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input id="password" dir="ltr" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full hover-lift" disabled={busy}>
            {busy && <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            {busy ? t("auth.signingIn") : t("auth.loginTitle")}
          </Button>
        </form>
        <div className="mt-5">
          <OAuthButtons />
        </div>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {t("auth.noAccount")}{" "}
          <Link to="/signup" className="font-medium text-primary hover:underline">{t("auth.createOne")}</Link>
        </p>
      </div>
    </main>
  );
}
