"use client";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/locale-provider";
import { cn } from "@/lib/utils";

// Compact one-language-at-a-time switch: the button always shows the
// language it will switch TO, keeping the header space for long titles.
export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  const toArabic = locale === "en";
  const hint = toArabic ? "التبديل إلى العربية" : "Switch to English";
  return (
    <Button
      variant="outline"
      className={cn("shrink-0 px-3 text-primary", className)}
      onClick={() => setLocale(toArabic ? "ar" : "en")}
      aria-label={hint}
      title={hint}
    >
      {toArabic ? <span lang="ar">عربي</span> : <span lang="en">En</span>}
    </Button>
  );
}
