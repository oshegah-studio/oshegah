import { Link } from "react-router-dom";
import { Wordmark } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/SiteFooter";
import { Seo } from "@/components/Seo";
import { useI18n } from "@/i18n";

export default function Privacy() {
  const { t } = useI18n();

  return (
    <div className="min-h-dvh bg-background">
      <Seo
        title="Privacy Policy — OSHEGAH"
        description="How OSHEGAH handles the data behind your digital identity profile."
        path="/privacy"
      />
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-5 py-4">
          <Wordmark />
          <Button asChild variant="ghost" size="sm"><Link to="/">{t("common.back")}</Link></Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 py-12">
        <h1 className="font-display text-3xl font-semibold">{t("legal.privacyTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("legal.updated")}</p>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">{t("legal.privacy.collectTitle")}</h2>
            <p className="mt-2">{t("legal.privacy.collectText")}</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">{t("legal.privacy.useTitle")}</h2>
            <p className="mt-2">{t("legal.privacy.useText")}</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">{t("legal.privacy.analyticsTitle")}</h2>
            <p className="mt-2">{t("legal.privacy.analyticsText")}</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">{t("legal.privacy.controlTitle")}</h2>
            <p className="mt-2">{t("legal.privacy.controlText")}</p>
          </section>
          <p>{t("legal.contactLine")}</p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
