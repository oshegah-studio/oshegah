import { Play } from "lucide-react";
import { OshegahLogo } from "@/components/OshegahLogo";
import { useI18n } from "@/i18n";
import {
  TUTORIAL_VIDEO_URL,
  TUTORIAL_VIDEO_WEBM_URL,
  TUTORIAL_VIDEO_POSTER,
  resolveTutorialSource,
} from "@/lib/tutorial-video";

/**
 * Homepage hero tutorial: concise label and a contained, uncropped video.
 * The video URL lives in src/lib/tutorial-video.ts so the owner can swap it
 * without touching this component. Empty URL → branded placeholder.
 */
export function ProfileTutorial() {
  const { t } = useI18n();
  const source = resolveTutorialSource(TUTORIAL_VIDEO_URL, TUTORIAL_VIDEO_WEBM_URL);

  return (
    <div className="w-full">
      <p className="text-xs font-semibold leading-relaxed text-sidebar-foreground/65">
        {t("landing.tutorial.label")}
      </p>
      <div className="mt-3 overflow-hidden rounded-lg border border-sidebar-border bg-sidebar">
        <div className="relative aspect-video w-full">
          {source?.kind === "file" && (
            <video
              className="h-full w-full object-contain"
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
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-sidebar px-6 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-sidebar-border">
                <Play className="h-5 w-5 text-sidebar-primary rtl:-scale-x-100" aria-hidden="true" />
              </span>
              <span className="font-display text-sm font-medium text-sidebar-foreground">
                {t("landing.tutorial.comingSoon")}
              </span>
              <OshegahLogo size={22} className="opacity-40" />
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
