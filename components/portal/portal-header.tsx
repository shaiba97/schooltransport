"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { LanguageToggle } from "@/components/portal/language-toggle";
import { useI18n } from "@/lib/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { UserRound } from "lucide-react";

export function PortalHeader() {
  const { t } = useI18n();
  return (
    <header className="hidden lg:flex h-16 items-center justify-end gap-2 border-b px-6 bg-card">
      <LanguageToggle />
      <Link href="/profile" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
        <UserRound className="h-4 w-4 me-2" />
        {t("profile.title")}
      </Link>
    </header>
  );
}
