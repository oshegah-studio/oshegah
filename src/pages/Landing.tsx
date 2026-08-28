import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Nfc, QrCode, Smartphone, Palette, ShieldCheck } from "lucide-react";
import { Wordmark } from "@/components/Brand";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { OshegahCard } from "@/components/OshegahCard";
import { SiteFooter } from "@/components/SiteFooter";
import { Reveal } from "@/components/Reveal";
import { useAuth, homeRouteFor } from "@/hooks/useAuth";
import { useLeaderboard } from "@/hooks/useOshegah";
import { useI18n } from "@/i18n";
import { Seo } from "@/components/Seo";

/** Fallback demo profile used only when the leaderboard is still empty. */
const DEMO_USERNAME = "yahiahani";

const features = [
  { icon: Nfc, key: "nfc" },
  { icon: Palette, key: "themes" },
  { icon: BarChart3, key: "analytics" },
  { icon: Smartphone, key: "vcard" },
  { icon: QrCode, key: "qr" },
  { icon: ShieldCheck, key: "business" },
] as const;

export default function Landing() {
  const { user, profile, isAdmin } = useAuth();
  const { t } = useI18n();
  const home = homeRouteFor(profile, isAdmin);
  const { data: topProfiles } = useLeaderboard("all_time", 1);
  const topUsername = topProfiles?.[0]?.username ?? DEMO_USERNAME;

  return (
    <div className="min-h-dvh bg-background">
      <Seo
        title="OSHEGAH — smart NFC business cards & digital profiles"
        description="Share your identity in one tap. OSHEGAH pairs premium NFC cards with a permanent digital profile, QR code and analytics."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: "OSHEGAH Smart NFC Card",
          description:
            "Premium NFC business card linked to a permanent OSHEGAH digital profile with QR sharing and visitor analytics.",
          url: "https://oshegah.com/",
          brand: { "@type": "Brand", name: "OSHEGAH" },
        }}
      />
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-4">
          <Wordmark />
          <nav className="flex items-center gap-2" aria-label={t("nav.main")}>
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <LanguageSwitcher className="sm:hidden" compact />
            {user ? (
              <Button asChild className="hover-lift"><Link to={home}>{t("common.dashboard")}</Link></Button>
            ) : (
              <>
                <Button variant="ghost" asChild><Link to="/login">{t("nav.login")}</Link></Button>
                <Button asChild className="hover-lift"><Link to="/signup">{t("nav.signup")}</Link></Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        {/* Hero — navy atmosphere with soft-blue lighting */}
        <section className="relative overflow-hidden bg-navy text-white">
          <div
            className="pointer-events-none absolute -top-32 end-[-10%] h-[420px] w-[420px] rounded-full opacity-30 blur-3xl"
            style={{ background: "radial-gradient(circle, hsl(var(--sky)) 0%, transparent 70%)" }}
            aria-hidden="true"
          />
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-2 lg:py-24">
            <div>
              <p className="eyebrow animate-soft-in text-sky/80">{t("brand.slogan")}</p>
              <h1
                className="mt-4 animate-soft-in font-display text-4xl font-semibold leading-tight sm:text-5xl"
                style={{ animationDelay: "80ms" }}
              >
                {t("landing.heroTitle")}
              </h1>
              <p
                className="mt-5 max-w-lg animate-soft-in text-base text-white/70"
                style={{ animationDelay: "160ms" }}
              >
                {t("landing.heroText")}
              </p>
              <div className="mt-8 flex animate-soft-in flex-wrap gap-3" style={{ animationDelay: "240ms" }}>
                <Button size="lg" asChild className="hover-lift bg-sky text-navy hover:bg-sky/90">
                  <Link to={user ? home : "/signup"}>
                    {user ? t("landing.goDashboard") : t("landing.createProfile")}
                    <ArrowRight className="ms-2 h-4 w-4 rtl:-scale-x-100" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <Link to={`/${topUsername}`}>{t("landing.seeLive")}</Link>
                </Button>
              </div>
            </div>
            <div className="animate-soft-in" style={{ animationDelay: "300ms" }}>
              <OshegahCard />
              <div className="mt-6 flex justify-center">
                <Button asChild variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white">
                  <Link to="/leaderboard">{t("leaderboard.viewTop")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-secondary/25 py-16">
          <div className="mx-auto w-full max-w-6xl px-5">
            <Reveal as="h2" className="font-display text-2xl font-semibold sm:text-3xl">
              {t("landing.featuresTitle")}
            </Reveal>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => (
                <Reveal key={f.key} delay={i * 70}>
                  <article className="card-interactive h-full rounded-2xl border border-border bg-card p-6 shadow-soft">
                    <f.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    <h3 className="mt-4 font-display text-lg font-semibold">
                      {t(`landing.features.${f.key}.title`)}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">{t(`landing.features.${f.key}.text`)}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-3xl px-5 py-20 text-center">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold">{t("landing.ctaTitle")}</h2>
            <p className="mt-4 text-muted-foreground">{t("landing.ctaText")}</p>
            <Button size="lg" className="mt-8 hover-lift" asChild>
              <Link to={user ? home : "/signup"}>
                {t("landing.getStarted")} <ArrowRight className="ms-2 h-4 w-4 rtl:-scale-x-100" />
              </Link>
            </Button>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
