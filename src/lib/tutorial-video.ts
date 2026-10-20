/**
 * Homepage tutorial video configuration.
 *
 * The tutorial film is published to the CDN as a Lovable Asset
 * (src/assets/oshegah-guide.mp4.asset.json). To replace it with a new
 * recording, upload the new file and point the imports below at the new
 * pointer, or set TUTORIAL_VIDEO_URL to either:
 *   - a direct MP4/WebM URL (e.g. a file uploaded to storage), or
 *   - a YouTube watch/share URL (https://www.youtube.com/watch?v=… or https://youtu.be/…)
 *
 * Leave it empty to show the polished "coming soon" placeholder.
 * TUTORIAL_VIDEO_POSTER is the thumbnail shown before playback (MP4 sources only).
 * TUTORIAL_VIDEO_WEBM_URL is an optional smaller companion file; browsers that
 * support WebM use it, everything else (Safari, iOS) falls back to the MP4.
 * TUTORIAL_VIDEO_ASPECT keeps the player box at the film's own ratio so a
 * screen recording is never cropped.
 */
import guideVideo from "@/assets/oshegah-guide.mp4.asset.json";
import guideWebm from "@/assets/oshegah-guide.webm.asset.json";
import guidePoster from "@/assets/oshegah-guide-poster.jpg.asset.json";

export const TUTORIAL_VIDEO_URL = guideVideo.url;
export const TUTORIAL_VIDEO_WEBM_URL = guideWebm.url;
export const TUTORIAL_VIDEO_POSTER = guidePoster.url;
export const TUTORIAL_VIDEO_ASPECT = "32 / 27";

export type TutorialSource =
  | { kind: "file"; sources: { src: string; type: string }[] }
  | { kind: "youtube"; embedUrl: string }
  | null;

const YOUTUBE_ID = /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/;

function mimeFor(url: string): string {
  return /\.(webm|ogv)$/i.test(url.split("?")[0]) ? "video/webm" : "video/mp4";
}

export function resolveTutorialSource(url: string, webmUrl = ""): TutorialSource {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const yt = trimmed.match(YOUTUBE_ID);
  if (yt) {
    return { kind: "youtube", embedUrl: `https://www.youtube-nocookie.com/embed/${yt[1]}` };
  }
  const sources = [{ src: trimmed, type: mimeFor(trimmed) }];
  const webm = webmUrl.trim();
  if (webm && mimeFor(webm) === "video/webm") sources.unshift({ src: webm, type: "video/webm" });
  return { kind: "file", sources };
}
