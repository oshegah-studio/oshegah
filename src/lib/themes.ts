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
  blur: boolean;
  /** preview swatch for pickers */
  swatch: string[];
}

export const PROFILE_THEMES: Record<ThemeId, ProfileThemeTokens> = {
  oshegah_dark: {
    id: "oshegah_dark",
    name: "OSHEGAH Dark",
    background: "linear-gradient(170deg, #162446 0%, #0d1730 60%, #0a1226 100%)",
    surface: "rgba(255,255,255,0.07)",
    surfaceBorder: "rgba(190,227,240,0.16)",
    text: "#FFFFFF",
    mutedText: "rgba(226,240,248,0.66)",
    accent: "#BEE3F0",
    blur: false,
    swatch: ["#162446", "#BEE3F0", "#FFFFFF"],
  },
  oshegah_light: {
    id: "oshegah_light",
    name: "OSHEGAH Light",
    background: "linear-gradient(170deg, #BEE3F0 0%, #E4F3F9 55%, #FFFFFF 100%)",
    surface: "#FFFFFF",
    surfaceBorder: "rgba(22,36,70,0.08)",
    text: "#162446",
    mutedText: "rgba(22,36,70,0.6)",
    accent: "#162446",
    blur: false,
    swatch: ["#BEE3F0", "#FFFFFF", "#162446"],
  },
  midnight: {
    id: "midnight",
    name: "Midnight",
    background: "linear-gradient(180deg, #08080C 0%, #0E0E14 100%)",
    surface: "rgba(255,255,255,0.05)",
    surfaceBorder: "rgba(255,255,255,0.1)",
    text: "#F5F5F7",
    mutedText: "rgba(245,245,247,0.55)",
    accent: "#C7C9D1",
    blur: false,
    swatch: ["#08080C", "#2A2A33", "#F5F5F7"],
  },
  minimal: {
    id: "minimal",
    name: "Minimal",
    background: "#FAFAFA",
    surface: "#FFFFFF",
    surfaceBorder: "rgba(0,0,0,0.08)",
    text: "#111111",
    mutedText: "rgba(17,17,17,0.55)",
    accent: "#111111",
    blur: false,
    swatch: ["#FAFAFA", "#FFFFFF", "#111111"],
  },
  glass: {
    id: "glass",
    name: "Glass",
    background: "linear-gradient(150deg, #1b2b52 0%, #33578a 45%, #8fc6dd 100%)",
    surface: "rgba(255,255,255,0.14)",
    surfaceBorder: "rgba(255,255,255,0.28)",
    text: "#FFFFFF",
    mutedText: "rgba(255,255,255,0.72)",
    accent: "#FFFFFF",
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
