/**
 * Auto Customize — derives a readable, intentional profile palette from the
 * user's profile photo. Every returned pair is contrast-checked (WCAG AA).
 * The OSHEGAH brand logo is never touched by this.
 */

export interface GeneratedPalette {
  background_color: string;
  primary_color: string;
  text_color: string;
  muted_text_color: string;
  /** best-matching preset for surfaces/borders */
  theme: "oshegah_dark" | "oshegah_light" | "midnight" | "minimal" | "glass";
}

type RGB = { r: number; g: number; b: number };

const clamp = (n: number, min = 0, max = 255) => Math.min(max, Math.max(min, n));

export const hexOf = ({ r, g, b }: RGB) =>
  `#${[r, g, b].map((v) => clamp(Math.round(v)).toString(16).padStart(2, "0")).join("")}`.toUpperCase();

export const rgbOf = (hex: string): RGB => {
  const m = /^#?([\da-f]{6})$/i.exec(hex.trim());
  const int = m ? parseInt(m[1], 16) : 0;
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
};

const srgb = (c: number) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

export const luminance = (c: RGB) => 0.2126 * srgb(c.r) + 0.7152 * srgb(c.g) + 0.0722 * srgb(c.b);

export const contrast = (a: string, b: string) => {
  const l1 = luminance(rgbOf(a));
  const l2 = luminance(rgbOf(b));
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

/* ---------- HSL helpers ---------- */

export const rgbToHsl = ({ r, g, b }: RGB) => {
  const rr = r / 255, gg = g / 255, bb = b / 255;
  const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6;
    else if (max === gg) h = ((bb - rr) / d + 2) / 6;
    else h = ((rr - gg) / d + 4) / 6;
  }
  return { h: h * 360, s, l };
};

export const hslToHex = (h: number, s: number, l: number) => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x]
    : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return hexOf({ r: (r1 + m) * 255, g: (g1 + m) * 255, b: (b1 + m) * 255 });
};

/** Nudges lightness until the color reads clearly against `against`. */
export const ensureContrast = (hex: string, against: string, min = 4.5) => {
  const { h, s } = rgbToHsl(rgbOf(hex));
  const bgLight = luminance(rgbOf(against)) > 0.35;
  let best = hex;
  let bestRatio = contrast(hex, against);
  for (let step = 0; step <= 20; step++) {
    const l = bgLight ? Math.max(0.04, 0.5 - step * 0.024) : Math.min(0.98, 0.5 + step * 0.024);
    const candidate = hslToHex(h, Math.min(s, 0.7), l);
    const ratio = contrast(candidate, against);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = candidate;
    }
    if (ratio >= min) return candidate;
  }
  return bestRatio >= min ? best : bgLight ? "#111318" : "#FFFFFF";
};

/* ---------- extraction ---------- */

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image-load-failed"));
    img.src = src;
  });

/** Returns the dominant colors of an image, most frequent first. */
export async function extractColors(src: string, count = 6): Promise<string[]> {
  const img = await loadImage(src);
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas-unavailable");
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  const buckets = new Map<string, { rgb: RGB; n: number }>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const rgb = { r: data[i], g: data[i + 1], b: data[i + 2] };
    const key = [rgb.r, rgb.g, rgb.b].map((v) => Math.round(v / 24)).join(",");
    const hit = buckets.get(key);
    if (hit) {
      hit.n++;
      hit.rgb.r = (hit.rgb.r * (hit.n - 1) + rgb.r) / hit.n;
      hit.rgb.g = (hit.rgb.g * (hit.n - 1) + rgb.g) / hit.n;
      hit.rgb.b = (hit.rgb.b * (hit.n - 1) + rgb.b) / hit.n;
    } else {
      buckets.set(key, { rgb: { ...rgb }, n: 1 });
    }
  }

  return [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, count)
    .map((b) => hexOf(b.rgb));
}

/**
 * Builds a harmonious, readable palette from a profile photo.
 * Never returns light-on-light or dark-on-dark.
 */
export async function paletteFromImage(src: string): Promise<GeneratedPalette> {
  const colors = await extractColors(src, 8);
  if (!colors.length) throw new Error("no-colors");

  const scored = colors.map((hex) => {
    const { h, s, l } = rgbToHsl(rgbOf(hex));
    return { hex, h, s, l };
  });

  // Accent = the most characterful color (saturation + mid lightness).
  const accentSeed =
    [...scored].sort(
      (a, b) => b.s * (1 - Math.abs(b.l - 0.5)) - a.s * (1 - Math.abs(a.l - 0.5)),
    )[0] ?? scored[0];

  const avgL = scored.reduce((sum, c) => sum + c.l, 0) / scored.length;
  const goLight = avgL > 0.62;

  const background = goLight
    ? hslToHex(accentSeed.h, Math.min(accentSeed.s, 0.35), 0.95)
    : hslToHex(accentSeed.h, Math.min(Math.max(accentSeed.s, 0.25), 0.55), 0.12);

  const text = ensureContrast(goLight ? "#101828" : "#FFFFFF", background, 7);
  const muted = ensureContrast(
    hslToHex(accentSeed.h, Math.min(accentSeed.s, 0.25), goLight ? 0.42 : 0.72),
    background,
    4.5,
  );
  const accent = ensureContrast(
    hslToHex(accentSeed.h, Math.max(accentSeed.s, 0.45), goLight ? 0.42 : 0.68),
    background,
    3.2,
  );

  return {
    background_color: background,
    primary_color: accent,
    text_color: text,
    muted_text_color: muted,
    theme: goLight ? "oshegah_light" : "oshegah_dark",
  };
}

/* ---------- background-photo aware palette ---------- */

export interface BackgroundPalette extends GeneratedPalette {
  surface_color: string;
  surface_border_color: string;
  overlay_color: string;
}

const rgba = (hex: string, a: number) => {
  const { r, g, b } = rgbOf(hex);
  return `rgba(${r},${g},${b},${a})`;
};
/** Solid colour seen when `top` at `alpha` is painted over `under`. */
const mix = (top: string, under: string, alpha: number) => {
  const a = rgbOf(top), b = rgbOf(under);
  return hexOf({ r: a.r * alpha + b.r * (1 - alpha), g: a.g * alpha + b.g * (1 - alpha), b: a.b * alpha + b.b * (1 - alpha) });
};

/**
 * Analyses the whole photo (light AND dark regions, not just the dominant
 * colour) and returns overlay + translucent button surfaces whose text is
 * contrast-checked against the worst-case spot of the image. The photo itself
 * is never modified.
 */
export async function paletteFromBackground(src: string): Promise<BackgroundPalette> {
  const img = await loadImage(src);
  const size = 48;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas-unavailable");
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  const lums: number[] = [];
  let brightest = { l: -1, hex: "#FFFFFF" };
  let darkest = { l: 2, hex: "#000000" };
  for (let i = 0; i < data.length; i += 4) {
    const rgb = { r: data[i], g: data[i + 1], b: data[i + 2] };
    const l = luminance(rgb);
    lums.push(l);
    if (l > brightest.l) brightest = { l, hex: hexOf(rgb) };
    if (l < darkest.l) darkest = { l, hex: hexOf(rgb) };
  }
  lums.sort((a, b) => a - b);
  const median = lums[Math.floor(lums.length / 2)] ?? 0.2;

  const colors = await extractColors(src, 8);
  const scored = colors.map((hex) => ({ hex, ...rgbToHsl(rgbOf(hex)) }));
  const seed =
    [...scored].sort((a, b) => b.s * (1 - Math.abs(b.l - 0.5)) - a.s * (1 - Math.abs(a.l - 0.5)))[0] ??
    { h: 215, s: 0.5, l: 0.3 };

  // Mostly-light photos get dark type on frosted white; everything else (dark or mixed) light type on navy-tinted glass.
  const lightMode = median > 0.45;
  const scrim = lightMode ? "#FFFFFF" : hslToHex(seed.h, Math.min(seed.s, 0.45), 0.08);
  const text = lightMode ? "#101828" : "#FFFFFF";

  // Smallest overlay that keeps text readable even over the worst spot.
  const worst = lightMode ? darkest.hex : brightest.hex;
  let overlayA = 0.2;
  while (overlayA < 0.85 && contrast(text, mix(scrim, worst, overlayA)) < 4.5) overlayA += 0.05;

  // Button surface: tinted, translucent; text must clear AA on top of it at the worst spot.
  const surfaceBase = lightMode ? "#FFFFFF" : hslToHex(seed.h, Math.min(seed.s, 0.4), 0.14);
  let surfaceA = 0.55;
  const behind = mix(scrim, worst, overlayA);
  while (surfaceA < 0.95 && contrast(text, mix(surfaceBase, behind, surfaceA)) < 4.5) surfaceA += 0.05;
  const surfaceSolid = mix(surfaceBase, behind, surfaceA);

  const accent = ensureContrast(
    hslToHex(seed.h, Math.max(seed.s, 0.5), lightMode ? 0.38 : 0.72),
    surfaceSolid,
    3.2,
  );
  const muted = ensureContrast(lightMode ? "#3A4256" : "#D6DEEA", mix(scrim, worst, overlayA), 4.5);

  return {
    background_color: lightMode ? "#F4F6FA" : hslToHex(seed.h, Math.min(seed.s, 0.45), 0.1),
    primary_color: accent,
    text_color: text,
    muted_text_color: muted,
    theme: lightMode ? "oshegah_light" : "oshegah_dark",
    surface_color: rgba(surfaceBase, Math.round(surfaceA * 100) / 100),
    surface_border_color: lightMode ? "rgba(16,24,40,0.14)" : "rgba(255,255,255,0.22)",
    overlay_color: `linear-gradient(180deg, ${rgba(scrim, Math.max(0.15, overlayA - 0.1))} 0%, ${rgba(scrim, Math.min(0.9, overlayA + 0.05))} 100%)`,
  };
}
