"use client";

import { Badge } from "@/components/ui/badge";
import type { BusStatus } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/locale-provider";

const CLS: Record<BusStatus, string> = {
  ACTIVE: "text-emerald-600 border-emerald-600/40",
  MAINTENANCE: "text-amber-600 border-amber-600/40",
  INACTIVE: "text-muted-foreground",
};

const KEY: Record<BusStatus, "fleet.active" | "fleet.maintenance" | "fleet.inactive"> = {
  ACTIVE: "fleet.active",
  MAINTENANCE: "fleet.maintenance",
  INACTIVE: "fleet.inactive",
};

export function StatusBadge({ status }: { status: BusStatus }) {
  const { t } = useI18n();
  return (
    <Badge variant="outline" className={CLS[status]}>
      {t(KEY[status])}
    </Badge>
  );
}
