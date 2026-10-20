import { Link } from "react-router-dom";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OshegahLogo } from "@/components/OshegahLogo";
import { useAuth, homeRouteFor } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import {
  TUTORIAL_VIDEO_URL,
  TUTORIAL_VIDEO_WEBM_URL,
  TUTORIAL_VIDEO_POSTER,
  TUTORIAL_VIDEO_ASPECT,
  resolveTutorialSource,
} from "@/lib/tutorial-video";

/**
 * Homepage hero tutorial: heading, responsive video player and signup CTA.
 * The video URL lives in src/lib/tutorial-video.ts so the owner can swap it
 * without touching this component. Empty URL → branded placeholder.
 */
export function ProfileTutorial() {
  const { user, profile, isAdmin } = useAuth();
  const { t } = useI18n();
  const home = homeRouteFor(profile, isAdmin);
  const source = resolveTutorialSource(TUTORIAL_VIDEO_URL, TUTORIAL_VIDEO_WEBM_URL);

  return (
    <div className="w-full">
      <h2 className="font-display text-xl font-semibold text-white sm:text-2xl">
        {t("landing.tutorial.title")}
      </h2>
      <p className="mt-2 max-w-md text-sm text-white/70">{t("landing.tutorial.text")}</p>

      <div className="mt-5 overflow-hidden rounded-2xl border border-white/15 bg-navy shadow-lift">
        <div
          className={`relative w-full ${source?.kind === "file" ? "" : "aspect-video"}`}
          style={source?.kind === "file" ? { aspectRatio: TUTORIAL_VIDEO_ASPECT } : undefined}
        >
          {source?.kind === "file" && (
            <video
              className="h-full w-full object-cover"
              controls
              preload="metadata"
              playsInline
              poster={TUTORIAL_VIDEO_POSTER}
            >
              {source.sources.map((s) => (
                <source key={s.src} src={s.src} type={s.type} />
              ))}
            </video>
          )}
          {source?.kind === "youtube" && (
            <iframe
              className="h-full w-full"
              src={source.embedUrl}
              title={t("landing.tutorial.title")}
              loading="lazy"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
          {!source && (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-navy px-6 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-sky/40 bg-sky/10">
                <Play className="h-7 w-7 text-sky rtl:-scale-x-100" aria-hidden="true" />
              </span>
              <span className="font-display text-sm font-medium tracking-wide text-white/85">
                {t("landing.tutorial.comingSoon")}
              </span>
              <OshegahLogo size={22} className="opacity-40" />
            </div>
          )}
        </div>
      </div>

      <Button size="lg" asChild className="mt-6 hover-lift bg-sky text-navy hover:bg-sky/90">
        <Link to={user ? home : "/signup"}>
          {t("landing.tutorial.cta")}
          <ArrowRight className="ms-2 h-4 w-4 rtl:-scale-x-100" />
        </Link>
      </Button>
    </div>
  );
}
