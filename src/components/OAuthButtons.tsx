import { useState } from "react";
import { toast } from "sonner";
import { Apple, Loader2 } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";

function GoogleIcon() {
  return (
    <svg className="me-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
    </svg>
  );
}

export function OAuthButtons() {
  const { t } = useI18n();
  const [busy, setBusy] = useState<"google" | "apple" | null>(null);

  const signIn = async (provider: "google" | "apple") => {
    setBusy(provider);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(null);
      toast.error(result.error.message);
      return;
    }
    // Either the browser is redirecting, or the session is already set.
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("auth.or")}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="grid gap-2">
        <Button type="button" variant="outline" className="w-full" disabled={busy !== null} onClick={() => signIn("google")}>
          {busy === "google" ? <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <GoogleIcon />}
          {t("auth.continueGoogle")}
        </Button>
        <Button type="button" variant="outline" className="w-full" disabled={busy !== null} onClick={() => signIn("apple")}>
          {busy === "apple" ? (
            <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Apple className="me-2 h-4 w-4" aria-hidden="true" />
          )}
          {t("auth.continueApple")}
        </Button>
      </div>
    </div>
  );
}
