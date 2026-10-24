"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useI18n, type Locale } from "@/lib/i18n/locale-provider";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  return (
    // Force LTR so the segmented control order is stable (En first,
    // عربي second) in both document directions; the labels themselves
    // remain in their native scripts.
    <ToggleGroup
      dir="ltr"
      variant="outline"
      size="sm"
      value={[locale]}
      onValueChange={(groupValue) => {
        const next = groupValue[0] as Locale | undefined;
        if (next) setLocale(next);
      }}
      className={cn("shrink-0", className)}
      aria-label="Language"
    >
      <ToggleGroupItem value="en" aria-label="English" lang="en">
        EN
      </ToggleGroupItem>
      <ToggleGroupItem value="ar" lang="ar">
        عربي
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
