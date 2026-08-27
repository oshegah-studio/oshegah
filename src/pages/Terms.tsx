import { Link } from "react-router-dom";
import { Wordmark } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/SiteFooter";
import { Seo } from "@/components/Seo";
import { useI18n } from "@/i18n";

export default function Terms() {
  const { t } = useI18n();

  return (
    <div className="min-h-dvh bg-background">
      <Seo
        title="Terms & Conditions — OSHEGAH"
        description="The terms that apply when you use OSHEGAH cards and digital profiles."
        path="/terms"
      />
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-5 py-4">
          <Wordmark />
          <Button asChild variant="ghost" size="sm"><Link to="/">{t("common.back")}</Link></Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 py-12">
        <h1 className="font-display text-3xl font-semibold">{t("legal.termsTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("legal.updated")}</p>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">{t("legal.terms.accountTitle")}</h2>
            <p className="mt-2">{t("legal.terms.accountText")}</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">{t("legal.terms.contentTitle")}</h2>
            <p className="mt-2">{t("legal.terms.contentText")}</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">{t("legal.terms.serviceTitle")}</h2>
            <p className="mt-2">{t("legal.terms.serviceText")}</p>
          </section>
          <p>{t("legal.contactLine")}</p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
