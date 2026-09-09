import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/Brand";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth, homeRouteFor } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { Seo } from "@/components/Seo";
import { OAuthButtons } from "@/components/OAuthButtons";

export default function Signup() {
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<"personal" | "business">("personal");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeRouteFor(profile, isAdmin)} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error(t("auth.passwordTooShort"));
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName.trim(), account_type: accountType },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("auth.accountCreated"));
    navigate(accountType === "business" ? "/business" : "/dashboard", { replace: true });
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-secondary/25 px-5 py-12">
      <Seo
        title="Create your OSHEGAH account"
        description="Create a free OSHEGAH account and share your contact details instantly with a smart NFC or QR profile."
        path="/signup"
      />
      <div className="w-full max-w-sm animate-soft-in rounded-2xl border border-border bg-card p-7 shadow-soft">
        <div className="flex items-center justify-between gap-2">
          <Wordmark />
          <ThemeToggle className="hidden sm:inline-flex" />
          <LanguageSwitcher compact />
        </div>
        <h1 className="mt-6 font-display text-2xl font-semibold">{t("auth.signupTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("auth.signupSubtitle")}</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(["personal", "business"] as const).map((type) => {
              const soon = type === "business";
              return (
                <button
                  key={type}
                  type="button"
                  disabled={soon}
                  aria-disabled={soon}
                  onClick={() => !soon && setAccountType(type)}
                  className={cn(
                    "relative rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-200",
                    accountType === type && !soon
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                    soon && "cursor-not-allowed opacity-60 hover:border-border",
                  )}
                >
                  {t(`auth.${type}`)}
                  {soon && (
                    <span className="mt-0.5 block text-[0.65rem] font-normal">{t("common.comingSoon")}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fullName">{t("auth.fullName")}</Label>
            <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
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
            {busy ? t("auth.creating") : t("auth.createAccount")}
          </Button>
        </form>
        <div className="mt-5">
          <OAuthButtons />
        </div>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {t("auth.haveAccount")}{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">{t("auth.loginTitle")}</Link>
        </p>
      </div>
    </main>
  );
}
