export const LOCALE_COOKIE = "tr_locale";

export type PortalLocale = "en" | "ar";

export function isPortalLocale(value: unknown): value is PortalLocale {
  return value === "en" || value === "ar";
}

export function directionOf(locale: PortalLocale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}
