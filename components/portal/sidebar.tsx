"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useI18n, type MessageKey } from "@/lib/i18n/locale-provider";
import {
  LayoutDashboard,
  Bus,
  Route,
  Users,
  MapPin,
  UserRound,
} from "lucide-react";

const navItems: { href: string; labelKey: MessageKey; icon: typeof Bus }[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/trips", labelKey: "nav.liveTrips", icon: Bus },
  { href: "/routes", labelKey: "nav.routesLabel", icon: Route },
  { href: "/manifest", labelKey: "nav.manifestLabel", icon: Users },
  { href: "/fleet", labelKey: "nav.fleet", icon: MapPin },
  { href: "/profile", labelKey: "nav.labelProfile", icon: UserRound },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-e bg-sidebar">
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <h1 className="text-lg font-semibold">{t("nav.portalTitle")}</h1>
      </div>
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md border-s-2 px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-s-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                  : "border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActive ? "text-sidebar-primary" : ""
                )}
              />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
