import { Link } from "react-router-dom";
import { Instagram, Music2, Phone } from "lucide-react";
import { OshegahLogo } from "@/components/OshegahLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/i18n";

export const OSHEGAH_CONTACT = {
  instagram: "https://www.instagram.com/oshegahstudio/",
  tiktok: "https://www.tiktok.com/@oshegah.studio",
  phone: "+201070485277",
  phoneDisplay: "+20 107 048 5277",
};

export function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-border bg-secondary/20">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <OshegahLogo size={34} />
            <span className="font-display text-lg font-semibold tracking-[0.2em]">OSHEGAH</span>
          </div>
          <p className="mt-3 text-sm font-medium text-primary">{t("brand.slogan")}</p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">{t("footer.about")}</p>
        </div>

        <div>
          <h2 className="eyebrow text-muted-foreground">{t("footer.social")}</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <a
                href={OSHEGAH_CONTACT.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:text-primary"
              >
                <Instagram className="h-4 w-4" aria-hidden="true" /> Instagram
              </a>
            </li>
            <li>
              <a
                href={OSHEGAH_CONTACT.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:text-primary"
              >
                <Music2 className="h-4 w-4" aria-hidden="true" /> TikTok
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="eyebrow text-muted-foreground">{t("footer.contact")}</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <a
                href={`tel:${OSHEGAH_CONTACT.phone}`}
                className="inline-flex items-center gap-2 hover:text-primary"
                dir="ltr"
              >
                <Phone className="h-4 w-4" aria-hidden="true" /> {OSHEGAH_CONTACT.phoneDisplay}
              </a>
            </li>
            <li>
              <Link to="/leaderboard" className="hover:text-primary">
                {t("leaderboard.title")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="eyebrow text-muted-foreground">{t("footer.legal")}</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link to="/privacy" className="hover:text-primary">{t("footer.privacy")}</Link></li>
            <li><Link to="/terms" className="hover:text-primary">{t("footer.terms")}</Link></li>
          </ul>
          <div className="mt-5">
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      <div className="border-t border-border/70">
        <p className="mx-auto w-full max-w-6xl px-5 py-5 text-xs text-muted-foreground">
          {t("landing.rights", { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
