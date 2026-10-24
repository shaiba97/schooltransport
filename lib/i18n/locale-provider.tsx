"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { DirectionProvider } from "@/components/ui/direction";
import { LOCALE_COOKIE, type PortalLocale } from "./config";
import { ar, en, type MessageKey } from "./messages";

export type { MessageKey };

export type Locale = PortalLocale;
export type TextDirection = "ltr" | "rtl";

/** Legacy localStorage key (pre-cookie releases). Kept so existing
 *  browsers migrate transparently; the cookie is canonical now. */
const LEGACY_STORAGE_KEY = "tr_locale";

export const LOCALE_STORAGE_KEY = LOCALE_COOKIE;

const dictionaries: Record<Locale, Record<MessageKey, string>> = { en, ar };

type I18nContextValue = {
  locale: Locale;
  dir: TextDirection;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function readLocaleCookie(): Locale | null {
  try {
    const entry = document.cookie
      .split(/;\s*/)
      .find((part) => part === `${LOCALE_COOKIE}=en` || part === `${LOCALE_COOKIE}=ar`);
    return entry ? (entry.split("=")[1] as Locale) : null;
  } catch {
    return null;
  }
}

function persistLocale(locale: Locale) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${365 * 24 * 60 * 60}; SameSite=Lax${secure}`;
  try {
    localStorage.setItem(LEGACY_STORAGE_KEY, locale);
  } catch {
    // storage unavailable
  }
}

function applyToDocument(locale: Locale) {
  const el = document.documentElement;
  el.lang = locale;
  el.dir = locale === "ar" ? "rtl" : "ltr";
}

const LOCALE_CHANGE_EVENT = "tr_locale_change";

function subscribeToLocale(onChange: () => void) {
  window.addEventListener(LOCALE_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(LOCALE_CHANGE_EVENT, onChange);
}

/**
 * Client-side snapshot: cookie first, then the legacy localStorage key,
 * then the browser language. The hydration pass is pinned to the server
 * snapshot (initialLocale) instead, so toggled-on users never hit a
 * hydration mismatch even when streamed-in boundaries hydrate late.
 */
function readClientLocale(): Locale {
  const cookie = readLocaleCookie();
  if (cookie === "en" || cookie === "ar") return cookie;
  try {
    const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (stored === "ar" || stored === "en") return stored;
  } catch {
    // storage unavailable
  }
  if (navigator.language?.startsWith("ar")) return "ar";
  return "en";
}

export function interpolate(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key];
    return value == null ? "" : String(value);
  });
}

export function LocaleProvider({
  initialLocale = "en",
  children,
}: {
  /** Locale the server rendered with (read from the cookie in the root
   *  layout). Pinned as the server snapshot so every hydration render —
   *  including late-attaching streamed boundaries — replays against the
   *  exact string set the server HTML contains, never raising a
   *  hydration mismatch. */
  initialLocale?: Locale;
  children: ReactNode;
}) {
  const serverSnapshot = useCallback(() => initialLocale, [initialLocale]);
  const locale = useSyncExternalStore(
    subscribeToLocale,
    readClientLocale,
    serverSnapshot,
  );
  const dir: TextDirection = locale === "ar" ? "rtl" : "ltr";

  // External-system update only (documentElement) — never setState here.
  useEffect(() => {
    applyToDocument(locale);
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      persistLocale(next);
      window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
      applyToDocument(next);
    },
    [],
  );

  const value = useMemo<I18nContextValue>(() => {
    const dict = dictionaries[locale];
    return {
      locale,
      dir,
      setLocale,
      t: (key, params) => interpolate(dict[key], params),
    };
  }, [locale, dir, setLocale]);

  return (
    <I18nContext.Provider value={value}>
      <DirectionProvider direction={dir}>{children}</DirectionProvider>
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within LocaleProvider");
  return ctx;
}
