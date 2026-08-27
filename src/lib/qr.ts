import QRCode from "qrcode";
import { OSHEGAH_LOGO_URL } from "@/components/OshegahLogo";

const NAVY = "#162446";

const loadLogo = () =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = OSHEGAH_LOGO_URL;
  });

/**
 * Branded OSHEGAH QR code. Encodes the profile URL verbatim, uses the highest
 * error-correction level (H) plus a white clear-space plate so the centred logo
 * never eats into scannable data.
 */
export async function renderBrandedQr(url: string, size = 1024): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  await QRCode.toCanvas(canvas, url, {
    width: size,
    margin: 3, // quiet zone
    errorCorrectionLevel: "H",
    color: { dark: NAVY, light: "#FFFFFF" },
  });

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas.toDataURL("image/png");

  const logo = await loadLogo();
  if (logo) {
    /**
     * The mark sits directly inside the modules — only a hairline knockout ring
     * (no white box) keeps the edge crisp. ~20% coverage stays well within the
     * 30% recovery budget of error-correction level H, so scanning is unaffected.
     */
    const inner = Math.round(size * 0.2);
    const knockout = Math.round(inner * 1.06);
    const cx = size / 2;
    const cy = size / 2;

    ctx.save();
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(cx, cy, knockout / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.drawImage(logo, cx - inner / 2, cy - inner / 2, inner, inner);
  }

  return canvas.toDataURL("image/png");
}
