import type { Locale } from "./locale-provider";

const AR_TAG = "ar-EG-u-nu-latn";

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

export function fmtDate(value: string | Date | null | undefined, locale: Locale): string {
  if (!value) return "—";
  const d = toDate(value);
  return Number.isNaN(d.getTime())
    ? "-"
    : d.toLocaleDateString(locale === "ar" ? AR_TAG : "en-US", { timeZone: "UTC" });
}

export function fmtTime(value: string | Date | null | undefined, locale: Locale): string {
  if (!value) return "—";
  const d = toDate(value);
  return Number.isNaN(d.getTime())
    ? "-"
    : locale === "ar"
      ? d.toLocaleTimeString(AR_TAG, { hour: "2-digit", minute: "2-digit", hour12: false })
      : d.toLocaleTimeString();
}

export function fmtShortTime(value: string | Date, locale: Locale): string {
  const d = toDate(value);
  return locale === "ar"
    ? d.toLocaleTimeString(AR_TAG, { hour: "2-digit", minute: "2-digit", hour12: false })
    : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
