"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { transportApiFetch } from "@/lib/api/client";
import type { TransportDashboard as DashboardData } from "@/lib/api/types";
import {
  useTransportRealtimeEvent,
  type TransportRealtimeKind,
} from "@/lib/realtime/socket";
import { useI18n } from "@/lib/i18n/locale-provider";
import { fmtShortTime } from "@/lib/i18n/format";
import { Bus, Route, Users, MapPin, Radio } from "lucide-react";

interface LiveEvent {
  id: string;
  kind: TransportRealtimeKind;
  label: string;
  at: string;
}

export default function DashboardPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [reconnected, setReconnected] = useState(false);

  const load = useCallback(() => {
    transportApiFetch<DashboardData>("/transport/dashboard")
      .then((data) => {
        setStats(data);
        setError("");
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : t("dashboard.failedToLoad"));
      });
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const realtime = useTransportRealtimeEvent(
    ["bus_trip_started", "bus_arrived_stop"],
    {
      onEvent: (kind, payload) => {
        void handleRealtimeEvent(kind, payload);
      },
      onReconnect: () => {
        setReconnected(true);
        setTimeout(() => setReconnected(false), 4000);
      },
    }
  );

  async function handleRealtimeEvent(
    kind: TransportRealtimeKind,
    payload: unknown
  ) {
    const p = (payload ?? {}) as Record<string, unknown>;
    const route = p.route as { name?: string } | undefined;
    const bus = p.bus as { plateNumber?: string } | undefined;
    const stop = p.stop as { name?: string } | undefined;
    const label =
      kind === "bus_trip_started"
        ? t("dashboard.eventDeparted", {
            route: route?.name ?? t("dashboard.fallbackRoute"),
            bus: bus?.plateNumber ?? t("dashboard.fallbackBusLower"),
          })
        : t("dashboard.eventArrived", {
            bus: bus?.plateNumber ?? t("dashboard.fallbackBus"),
            stop: stop?.name ?? t("dashboard.fallbackStop"),
          });
    setEvents((prev) =>
      [
        { id: `${Date.now()}-${Math.random()}`, kind, label, at: new Date().toISOString() },
        ...prev,
      ].slice(0, 20)
    );
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{t("dashboard.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
      </div>

      <RealtimeBanner
        status={reconnected ? "refreshed" : realtime.status}
        events={events}
      />

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={MapPin}
          labelKey="dashboard.statVehicles"
          loading={!stats}
          value={stats ? String(stats.vehicles.total) : ""}
          sub={
            stats
              ? t("dashboard.statVehiclesSub", {
                  active: stats.vehicles.active,
                  maintenance: stats.vehicles.maintenance,
                  inactive: stats.vehicles.inactive,
                })
              : ""
          }
        />
        <StatCard
          icon={Route}
          labelKey="dashboard.statRoutes"
          loading={!stats}
          value={stats ? String(stats.routes) : ""}
          sub={stats ? t("dashboard.statRoutesSub") : ""}
        />
        <StatCard
          icon={Users}
          labelKey="dashboard.statStudents"
          loading={!stats}
          value={stats ? String(stats.studentsAssigned) : ""}
          sub={stats ? t("dashboard.statStudentsSub") : ""}
        />
        <StatCard
          icon={Bus}
          labelKey="dashboard.statTrips"
          loading={!stats}
          value={stats ? String(stats.tripsToday.total) : ""}
          sub={
            stats
              ? t("dashboard.statTripsSub", {
                  inProgress: stats.tripsToday.inProgress,
                  completed: stats.tripsToday.completed,
                })
              : ""
          }
        />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  labelKey,
  value,
  sub,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  labelKey: "dashboard.statVehicles" | "dashboard.statRoutes" | "dashboard.statStudents" | "dashboard.statTrips";
  value: string;
  sub: string;
  loading: boolean;
}) {
  const { t } = useI18n();
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{t(labelKey)}</CardTitle>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-semibold">{value}</div>
        )}
        {loading ? (
          <Skeleton className="mt-1 h-4 w-40" />
        ) : (
          <p className="text-xs text-muted-foreground">{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}

function RealtimeBadge({
  status,
}: {
  status: "connecting" | "live" | "offline" | "refreshed";
}) {
  const { t } = useI18n();
  return status === "live" ? (
    <Badge variant="outline" className="gap-1.5 text-success border-success/40">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>{" "}
      {t("dashboard.live")}
    </Badge>
  ) : status === "offline" ? (
    <Badge variant="outline" className="text-muted-foreground">{t("dashboard.offline")}</Badge>
  ) : status === "refreshed" ? (
    <Badge variant="outline" className="text-success">{t("dashboard.reconnected")}</Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">{t("dashboard.connecting")}</Badge>
  );
}

function RealtimeBanner({
  status,
  events,
}: {
  status: "connecting" | "live" | "offline" | "refreshed";
  events: LiveEvent[];
}) {
  const { t, locale } = useI18n();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Radio className="h-4 w-4" /> {t("dashboard.feedTitle")}
        </CardTitle>
        <RealtimeBadge status={status} />
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("dashboard.emptyFeed")}</p>
        ) : (
          <ul className="space-y-1.5 max-h-48 overflow-y-auto">
            {events.map((e) => (
              <li key={e.id} className="flex items-center gap-2 text-sm">
                <Badge variant="secondary" className="shrink-0 text-[10px] uppercase">
                  {t(e.kind === "bus_trip_started" ? "dashboard.evtTripStarted" : "dashboard.evtBusArrival")}
                </Badge>
                <span className="truncate">{e.label}</span>
                <span className="ms-auto shrink-0 text-xs text-muted-foreground">
                  {fmtShortTime(e.at, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
