"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useI18n, type MessageKey } from "@/lib/i18n/locale-provider";
import { LanguageToggle } from "@/components/portal/language-toggle";
import {
  LayoutDashboard,
  Bus,
  Route,
  Users,
  MapPin,
  UserRound,
} from "lucide-react";

const mobileNavItems: { href: string; labelKey: MessageKey; icon: typeof Bus }[] = [
  { href: "/dashboard", labelKey: "nav.home", icon: LayoutDashboard },
  { href: "/trips", labelKey: "nav.trips", icon: Bus },
  { href: "/routes", labelKey: "nav.routes", icon: Route },
  { href: "/manifest", labelKey: "nav.manifest", icon: Users },
  { href: "/fleet", labelKey: "nav.fleet", icon: MapPin },
];

export function MobileTopBar() {
  const { t } = useI18n();
  return (
    <div className="lg:hidden flex h-14 items-center gap-2 border-b px-4 bg-card sticky top-0 z-40">
      <h1 className="text-base font-semibold flex-1 truncate">{t("nav.portalTitle")}</h1>
      <LanguageToggle className="scale-90" />
      <Link
        href="/profile"
        aria-label={t("nav.profileAria")}
        className="flex items-center justify-center rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <UserRound className="h-5 w-5" />
      </Link>
    </div>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)] z-40">
      <div className="flex items-center justify-around py-2">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl px-3 py-1 text-xs transition-colors active:scale-95",
                isActive
                  ? "text-sidebar-primary font-semibold"
                  : "text-sidebar-foreground/70"
              )}
            >
              <item.icon className="h-5 w-5" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
