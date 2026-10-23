import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { cardReturnPath } from "@/features/cards/intent";
import { ArrowRight, BarChart3, Nfc, QrCode, Smartphone, Palette, ShieldCheck, Trophy } from "lucide-react";
import { Wordmark } from "@/components/Brand";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MobileHeaderMenu } from "@/components/MobileHeaderMenu";
import { Button } from "@/components/ui/button";
import { ProfileTutorial } from "@/components/ProfileTutorial";
import { SiteFooter } from "@/components/SiteFooter";
import { Reveal } from "@/components/Reveal";
import { useAuth, homeRouteFor } from "@/hooks/useAuth";
import { useLeaderboard } from "@/hooks/useOshegah";
import { useI18n } from "@/i18n";
import { Seo } from "@/components/Seo";
import { PrimaryNavigation } from "@/components/PrimaryNavigation";

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
  const navigate = useNavigate();
  useEffect(() => {
    const back = user ? cardReturnPath() : null;
    if (back) {
      if (back === "/get-your-card") sessionStorage.removeItem("oshegah-card-return");
      navigate(back, { replace: true });
    }
  }, [user?.id, navigate]);
  const { t } = useI18n();
  const home = homeRouteFor(profile, isAdmin);
  const { data: topProfiles } = useLeaderboard("all_time", 1);
  const topUsername = topProfiles?.[0]?.username ?? DEMO_USERNAME;

  return (
    <div className="min-h-dvh bg-background">
      <Seo
        title="OSHEGAH — smart NFC business cards & digital profiles"
        description="Share your identity in one touch. OSHEGAH pairs premium NFC cards with a permanent digital profile, QR code and analytics."
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
      <header className="sticky top-0 z-40 border-b border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-3 px-5 lg:h-20 lg:gap-4">
          <Wordmark invert className="shrink-0 [&>span]:tracking-normal [&>span]:text-sidebar-foreground" />
          <PrimaryNavigation restrained className="hidden shrink-0 gap-0.5 lg:flex" />
          <MobileHeaderMenu breakpoint="lg" tone="invert">
            <div className="hidden sm:block"><PrimaryNavigation className="flex flex-col items-stretch" /></div>
            {user ? (
              <Button asChild variant="ghost" className="w-full justify-start"><Link to={home}>{t("common.dashboard")}</Link></Button>
            ) : (
              <>
                <Button asChild variant="ghost" className="w-full justify-start"><Link to="/login">{t("nav.login")}</Link></Button>
                <Button asChild className="mt-2 w-full"><Link to="/get-your-card">{t("nav.signup")}</Link></Button>
              </>
            )}
          </MobileHeaderMenu>
          <nav className="hidden shrink-0 items-center justify-end gap-1.5 lg:flex xl:gap-2" aria-label={t("nav.main")}>
            <ThemeToggle tone="invert" className="shrink-0 [&_button]:px-2" />
            <LanguageSwitcher tone="invert" compact className="shrink-0 [&_button]:px-2" />
            <Button asChild variant="ghost" size="sm" className="h-9 gap-1.5 px-2 text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground">
              <Link to="/leaderboard" aria-label={t("leaderboard.button")}>
                <Trophy className="h-4 w-4" aria-hidden="true" />
                <span>{t("leaderboard.button")}</span>
              </Link>
            </Button>
            {user ? (
              <Button asChild size="sm" className="h-9 rounded-md bg-sidebar-primary px-3 text-xs text-sidebar-primary-foreground hover:bg-sidebar-primary/90"><Link to={home}>{t("common.dashboard")}</Link></Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild className="h-9 px-2 text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"><Link to="/login">{t("nav.login")}</Link></Button>
                <Button asChild size="sm" className="h-9 rounded-md bg-sidebar-primary px-3 text-xs text-sidebar-primary-foreground hover:bg-sidebar-primary/90"><Link to="/get-your-card">{t("nav.signup")}</Link></Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="bg-sidebar-accent/100 text-sidebar-foreground">
          <div className="mx-auto grid w-full max-w-[1200px] items-center gap-10 px-5 py-10 sm:gap-12 sm:py-14 md:grid-cols-2 md:gap-8 lg:gap-14 lg:py-20">
            <div className="min-w-0">
              <p className="animate-soft-in text-xs font-semibold uppercase text-sidebar-primary/80">{t("brand.slogan")}</p>
              <h1
                className="mt-4 max-w-[480px] animate-soft-in font-display text-4xl font-semibold leading-[1.15] tracking-normal lg:text-5xl"
                style={{ animationDelay: "80ms" }}
              >
                {t("landing.heroTitle")}
              </h1>
              <p
                className="mt-5 max-w-md animate-soft-in text-base leading-relaxed text-sidebar-foreground/70"
                style={{ animationDelay: "160ms" }}
              >
                {t("landing.heroText")}
              </p>
              <div className="mt-7 flex animate-soft-in flex-wrap gap-3" style={{ animationDelay: "240ms" }}>
                <Button size="lg" asChild className="h-11 rounded-md bg-sidebar-primary px-5 text-sm text-sidebar-primary-foreground hover:bg-sidebar-primary/90">
                  <Link to={user ? home : "/signup"}>
                    {t("landing.createProfile")}
                    <ArrowRight className="ms-2 h-4 w-4 rtl:-scale-x-100" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="h-11 rounded-md border-sidebar-foreground/25 bg-transparent px-5 text-sm text-sidebar-foreground hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground"
                >
                  <Link to={`/${topUsername}`}>{t("landing.seeLive")}</Link>
                </Button>
              </div>
            </div>
            <div className="min-w-0 animate-soft-in" style={{ animationDelay: "300ms" }}>
              <ProfileTutorial />
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
