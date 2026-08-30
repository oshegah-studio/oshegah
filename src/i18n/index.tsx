import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from "react";
import { en } from "./en";
import { ar } from "./ar";

export type Lang = "en" | "ar";
export type Dir = "ltr" | "rtl";

const STORAGE_KEY = "oshegah.lang";
const DICTS = { en, ar } as const;

const detectLang = (): Lang => {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "ar") return stored;
  return navigator.language?.toLowerCase().startsWith("ar") ? "ar" : "en";
};

const lookup = (dict: unknown, path: string): string | undefined => {
  const value = path.split(".").reduce<unknown>(
    (acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined),
    dict,
  );
  return typeof value === "string" ? value : undefined;
};

interface I18nValue {
  lang: Lang;
  dir: Dir;
  isRtl: boolean;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

// Kept on globalThis so hot-module reloads reuse the same context instance
// instead of creating a second one that no provider is mounted against.
const GLOBAL_KEY = "__oshegah_i18n_context__";
const globalStore = globalThis as unknown as Record<string, unknown>;
const I18nContext =
  (globalStore[GLOBAL_KEY] as React.Context<I18nValue | null>) ??
  ((globalStore[GLOBAL_KEY] = createContext<I18nValue | null>(null)) as React.Context<I18nValue | null>);


export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);
  const dir: Dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = dir;
    root.classList.toggle("lang-ar", lang === "ar");
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* storage unavailable — session-only preference */
    }
  }, [lang, dir]);

  const setLang = useCallback((next: Lang) => setLangState(next), []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const raw = lookup(DICTS[lang], key) ?? lookup(en, key) ?? key;
      if (!vars) return raw;
      return raw.replace(/\{(\w+)\}/g, (m, name: string) =>
        vars[name] !== undefined ? String(vars[name]) : m,
      );
    },
    [lang],
  );

  const value = useMemo<I18nValue>(() => ({ lang, dir, isRtl: dir === "rtl", setLang, t }), [lang, dir, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider");
  return ctx;
}
