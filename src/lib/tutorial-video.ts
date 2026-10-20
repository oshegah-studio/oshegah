/**
 * Homepage tutorial video configuration.
 *
 * To publish the tutorial, set TUTORIAL_VIDEO_URL to either:
 *   - a direct MP4/WebM URL (e.g. a file uploaded to storage), or
 *   - a YouTube watch/share URL (https://www.youtube.com/watch?v=… or https://youtu.be/…)
 *
 * Leave it empty to show the polished "coming soon" placeholder.
 * TUTORIAL_VIDEO_POSTER is the thumbnail shown before playback (MP4 sources only).
 */
export const TUTORIAL_VIDEO_URL = "";
export const TUTORIAL_VIDEO_POSTER = "/og-image.jpg";

export type TutorialSource =
  | { kind: "file"; url: string }
  | { kind: "youtube"; embedUrl: string }
  | null;

const YOUTUBE_ID = /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/;

export function resolveTutorialSource(url: string): TutorialSource {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const yt = trimmed.match(YOUTUBE_ID);
  if (yt) {
    return { kind: "youtube", embedUrl: `https://www.youtube-nocookie.com/embed/${yt[1]}` };
  }
  return { kind: "file", url: trimmed };
}
