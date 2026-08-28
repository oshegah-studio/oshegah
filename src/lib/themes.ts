export type ThemeId = "oshegah_dark" | "oshegah_light" | "midnight" | "minimal" | "glass";

export interface ProfileThemeTokens {
  id: ThemeId;
  name: string;
  /** page background */
  background: string;
  /** card / button surface */
  surface: string;
  surfaceBorder: string;
  /** main text */
  text: string;
  mutedText: string;
  /** accent used for the verified badge / highlights */
  accent: string;
  /** readable foreground on top of `accent` */
  onAccent: string;
  /** short, human description used in the appearance picker */
  description: string;
  blur: boolean;
  /** preview swatch for pickers */
  swatch: string[];
}

export const PROFILE_THEMES: Record<ThemeId, ProfileThemeTokens> = {
  oshegah_dark: {
    id: "oshegah_dark",
    name: "OSHEGAH Dark",
    description: "Navy gradient, sky accents — the signature OSHEGAH look.",
    background: "linear-gradient(170deg, #162446 0%, #0d1730 60%, #0a1226 100%)",
    surface: "rgba(255,255,255,0.07)",
    surfaceBorder: "rgba(190,227,240,0.16)",
    text: "#FFFFFF",
    mutedText: "rgba(226,240,248,0.66)",
    accent: "#BEE3F0",
    onAccent: "#162446",
    blur: false,
    swatch: ["#162446", "#BEE3F0", "#FFFFFF"],
  },
  oshegah_light: {
    id: "oshegah_light",
    name: "OSHEGAH Light",
    description: "Airy sky-to-white gradient with deep navy text.",
    background: "linear-gradient(170deg, #BEE3F0 0%, #E4F3F9 55%, #FFFFFF 100%)",
    surface: "#FFFFFF",
    surfaceBorder: "rgba(22,36,70,0.08)",
    text: "#162446",
    mutedText: "rgba(22,36,70,0.6)",
    accent: "#162446",
    onAccent: "#FFFFFF",
    blur: false,
    swatch: ["#BEE3F0", "#FFFFFF", "#162446"],
  },
  midnight: {
    id: "midnight",
    name: "Midnight",
    description: "Near-black canvas with soft silver typography.",
    background: "linear-gradient(180deg, #08080C 0%, #0E0E14 100%)",
    surface: "rgba(255,255,255,0.05)",
    surfaceBorder: "rgba(255,255,255,0.1)",
    text: "#F5F5F7",
    mutedText: "rgba(245,245,247,0.55)",
    accent: "#C7C9D1",
    onAccent: "#0E0E14",
    blur: false,
    swatch: ["#08080C", "#2A2A33", "#F5F5F7"],
  },
  minimal: {
    id: "minimal",
    name: "Minimal",
    description: "Plain light paper, pure black type, no distractions.",
    background: "#FAFAFA",
    surface: "#FFFFFF",
    surfaceBorder: "rgba(0,0,0,0.08)",
    text: "#111111",
    mutedText: "rgba(17,17,17,0.55)",
    accent: "#111111",
    onAccent: "#FFFFFF",
    blur: false,
    swatch: ["#FAFAFA", "#FFFFFF", "#111111"],
  },
  glass: {
    id: "glass",
    name: "Glass",
    description: "Frosted translucent cards over a blue gradient.",
    background: "linear-gradient(150deg, #1b2b52 0%, #33578a 45%, #8fc6dd 100%)",
    surface: "rgba(255,255,255,0.14)",
    surfaceBorder: "rgba(255,255,255,0.28)",
    text: "#FFFFFF",
    mutedText: "rgba(255,255,255,0.72)",
    accent: "#FFFFFF",
    onAccent: "#162446",
    blur: true,
    swatch: ["#33578a", "rgba(255,255,255,0.6)", "#FFFFFF"],
  },
};

export const THEME_LIST = Object.values(PROFILE_THEMES);

export const getTheme = (id?: string | null): ProfileThemeTokens =>
  PROFILE_THEMES[(id as ThemeId) ?? "oshegah_dark"] ?? PROFILE_THEMES.oshegah_dark;

export type ButtonStyle = "rounded" | "pill" | "square";

export const BUTTON_STYLES: { id: ButtonStyle; name: string; radius: string }[] = [
  { id: "rounded", name: "Rounded", radius: "18px" },
  { id: "pill", name: "Pill", radius: "999px" },
  { id: "square", name: "Square", radius: "6px" },
];

export const buttonRadius = (style?: string | null) =>
  BUTTON_STYLES.find((s) => s.id === style)?.radius ?? "18px";

export const FONT_STYLES: { id: string; name: string; stack: string }[] = [
  { id: "default", name: "Modern", stack: "" },
  { id: "serif", name: "Editorial", stack: "Georgia, 'Times New Roman', serif" },
  { id: "mono", name: "Technical", stack: "ui-monospace, SFMono-Regular, Menlo, monospace" },
];

export const fontStack = (id?: string | null) =>
  FONT_STYLES.find((f) => f.id === id)?.stack || undefined;

export interface ProfileStyleSource {
  theme?: string | null;
  primary_color?: string | null;
  text_color?: string | null;
  button_style?: string | null;
  background_color?: string | null;
  muted_text_color?: string | null;
  button_shadow?: boolean | null;
  font_style?: string | null;
}

export interface ResolvedProfileStyle extends ProfileThemeTokens {
  radius: string;
  shadow: string | undefined;
  fontFamily: string | undefined;
  /** readable foreground for filled accent buttons */
  onAccent: string;
}

const isLight = (hex: string) => {
  const m = /^#?([\da-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255, g = (int >> 8) & 255, b = int & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
};

/** Merges the chosen preset with the customer's own palette overrides. */
export function resolveProfileStyle(c: ProfileStyleSource): ResolvedProfileStyle {
  const base = getTheme(c.theme);
  const accent = c.primary_color || base.accent;
  return {
    ...base,
    background: c.background_color || base.background,
    text: c.text_color || base.text,
    mutedText: c.muted_text_color || base.mutedText,
    accent,
    radius: buttonRadius(c.button_style),
    shadow: c.button_shadow ? "0 12px 28px -14px rgba(0,0,0,0.55)" : undefined,
    fontFamily: fontStack(c.font_style),
    onAccent: isLight(accent) ? "#162446" : "#FFFFFF",
  };
}
