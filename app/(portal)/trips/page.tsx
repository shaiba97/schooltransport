"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { transportApiFetch } from "@/lib/api/client";
import type {
  TransportRoute, TransportTrip, Stop,
} from "@/lib/api/types";
import {
  useTransportRealtimeEvent,
} from "@/lib/realtime/socket";
import { useI18n } from "@/lib/i18n/locale-provider";
import { fmtDate, fmtTime } from "@/lib/i18n/format";
import { Play, Navigation, CheckCircle2, RefreshCw } from "lucide-react";

export default function TripsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <TripsContent />
    </Suspense>
  );
}

function TripsContent() {
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();
  const [routes, setRoutes] = useState<TransportRoute[] | null>(null);
  const [routeId, setRouteId] = useState(searchParams.get("routeId") ?? "");
  const [trip, setTrip] = useState<TransportTrip | null>(null);
  const [trips, setTrips] = useState<TransportTrip[] | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [pendingStopId, setPendingStopId] = useState("");
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);

  const explicitTripId = searchParams.get("tripId");

  // Select the route carrying the requested trip once routes are known.
  useEffect(() => {
    if (!routes || routeId) return;
    Promise.resolve().then(() => {
      if (explicitTripId) {
        transportApiFetch<TransportTrip>(`/transport/trips/${explicitTripId}`)
          .then((t2) => setRouteId(t2.routeId))
          .catch(() => undefined);
      } else if (routes.length > 0) {
        setRouteId(routes[0].id);
      }
    });
  }, [routes, routeId, explicitTripId]);

  useEffect(() => {
    let cancelled = false;
    transportApiFetch<TransportRoute[]>("/transport/routes")
      .then((list) => {
        if (!cancelled) setRoutes(list);
      })
      .catch(() => {
        if (!cancelled) setRoutes([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const reloadRouteData = useCallback(
    async (rid: string) => {
      if (!rid) return;
      try {
        const list = await transportApiFetch<TransportTrip[]>(`/transport/routes/${rid}/trips`);
        setTrips(list);
        const active = explicitTripId
          ? list.find((t2) => t2.id === explicitTripId)
          : list.find((t2) => t2.status === "IN_PROGRESS");
        if (active && active.status === "IN_PROGRESS") {
          const full = await transportApiFetch<TransportTrip>(`/transport/trips/${active.id}`);
          setTrip(full);
        } else {
          setTrip(null);
        }
        const s = await transportApiFetch<Stop[]>(`/transport/routes/${rid}/stops`);
        setStops(s);
        if (s.length > 0) {
          setPendingStopId(s[0].id);
        }
        setError("");
      } catch (e) {
        setError(e instanceof Error ? e.message : t("trips.failedToLoad"));
        setTrips([]);
        setTrip(null);
      }
    },
    [explicitTripId, t]
  );

  useEffect(() => {
    Promise.resolve().then(() => reloadRouteData(routeId));
  }, [routeId, reloadRouteData]);

  const realtime = useTransportRealtimeEvent(
    ["bus_trip_started", "bus_arrived_stop"],
    {
      onEvent: (_kind, payload) => {
        const p = (payload ?? {}) as { routeId?: string };
        if (p.routeId && p.routeId === routeId) {
          void reloadRouteData(routeId);
        }
        if (!explicitTripId) return;
      },
      onReconnect: () => {
        void reloadRouteData(routeId);
      },
    },
    { enabled: Boolean(routeId) }
  );

  const arrivedStopIds = useMemo(() => {
    const set = new Set<string>();
    for (const e of trip?.events ?? []) {
      if (e.type === "ARRIVED_STOP" && e.stopId) set.add(e.stopId);
    }
    return set;
  }, [trip]);

  const remainingStops = stops.filter((s) => !arrivedStopIds.has(s.id));

  async function startTrip() {
    if (!routeId) return;
    setBusy(true);
    setActionError("");
    try {
      await transportApiFetch(`/transport/routes/${routeId}/trips`, { method: "POST" });
      await reloadRouteData(routeId);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : t("trips.couldNotStart"));
    } finally {
      setBusy(false);
    }
  }

  async function markArrived() {
    if (!trip || !pendingStopId) return;
    setBusy(true);
    setActionError("");
    try {
      await transportApiFetch(`/transport/trips/${trip.id}/arrive`, {
        method: "POST",
        body: JSON.stringify({ stopId: pendingStopId }),
      });
      await reloadRouteData(routeId);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : t("trips.couldNotArrive"));
    } finally {
      setBusy(false);
    }
  }

  async function completeTrip() {
    if (!trip) return;
    setBusy(true);
    setActionError("");
    try {
      await transportApiFetch(`/transport/trips/${trip.id}/complete`, { method: "POST" });
      setTrip(null);
      await reloadRouteData(routeId);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : t("trips.couldNotComplete"));
    } finally {
      setBusy(false);
    }
  }

  const selectedRoute = routes?.find((r) => r.id === routeId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{t("trips.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("trips.subtitle")}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <NativeSelect
          value={routeId}
          onChange={(e) => setRouteId(e.target.value)}
          className="w-full sm:w-72"
        >
          {(routes ?? []).map((r) => (
            <NativeSelectOption key={r.id} value={r.id}>
              {r.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button variant="outline" size="sm" onClick={() => void reloadRouteData(routeId)}>
          <RefreshCw className="h-4 w-4 me-1" /> {t("trips.refresh")}
        </Button>
        <RealtimeBadge status={realtime.status} />
      </div>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t("trips.tripControl")}</span>
            {trip?.status === "IN_PROGRESS" && (
              <Badge className="bg-emerald-600 text-white">{t("status.inProgress")}</Badge>
            )}
          </CardTitle>
          {selectedRoute && (
            <CardDescription>
              {selectedRoute.name}
              {selectedRoute.bus
                ? t("trips.busLine", {
                    plate: selectedRoute.bus.plateNumber,
                    driver: selectedRoute.bus.driverName,
                  })
                : t("trips.noBusAssigned")}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {actionError && <p className="text-sm text-destructive">{actionError}</p>}

          {trip?.status === "IN_PROGRESS" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t("trips.startedAt", {
                  time: trip?.startedAt ? fmtTime(trip.startedAt, locale) : "—",
                })}
                {" · "}
                {t("trips.stopReported", { count: arrivedStopIds.size, total: stops.length })}
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-52">
                  <NativeSelect
                    value={pendingStopId}
                    onChange={(e) => setPendingStopId(e.target.value)}
                    className="w-full"
                  >
                    {remainingStops.map((s) => (
                      <NativeSelectOption key={s.id} value={s.id}>
                        {s.sequence}. {s.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
                <Button onClick={markArrived} disabled={busy || remainingStops.length === 0}>
                  <Navigation className="h-4 w-4 me-1" />
                  {remainingStops.length === 0
                    ? t("trips.allStopsReported")
                    : t("trips.markArrived")}
                </Button>
                <Button variant="outline" onClick={completeTrip} disabled={busy}>
                  <CheckCircle2 className="h-4 w-4 me-1" /> {t("trips.completeTrip")}
                </Button>
              </div>
              {stops.length > 0 && (
                <ul className="text-sm space-y-1">
                  {stops.map((s) => {
                    const arrived = arrivedStopIds.has(s.id);
                    return (
                      <li key={s.id} className="flex items-center gap-2">
                        <span
                          className={
                            arrived
                              ? "text-muted-foreground line-through"
                              : "font-medium"
                          }
                        >
                          {s.sequence}. {s.name}
                        </span>
                        {arrived && (
                          <span className="text-xs text-emerald-600">
                            {t("trips.arrivedAt", {
                              time: (trip?.events ?? [])
                                .filter((e) => e.stopId === s.id && e.type === "ARRIVED_STOP")
                                .map((e) => fmtTime(e.at, locale))
                                .join(", "),
                            })}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">
                {t("trips.noTripInProgress")}
              </p>
              <Button onClick={startTrip} disabled={busy || !routeId}>
                <Play className="h-4 w-4 me-1" />
                {busy ? t("trips.starting") : t("routeDetail.startTrip")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("trips.history")}</CardTitle>
          <CardDescription>{t("trips.historyDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {trips === null ? (
            <div className="p-4 space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : trips.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("trips.noTripsHistory")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("trips.date")}</TableHead>
                  <TableHead>{t("trips.started")}</TableHead>
                  <TableHead>{t("trips.completed")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("trips.stops")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips.map((t2) => (
                  <TableRow
                    key={t2.id}
                    className={
                      trip && t2.id === trip.id ? "bg-muted/40" : ""
                    }
                  >
                    <TableCell>{fmtDate(t2.startedAt, locale)}</TableCell>
                    <TableCell>{fmtTime(t2.startedAt, locale)}</TableCell>
                    <TableCell>{t2.completedAt ? fmtTime(t2.completedAt, locale) : "—"}</TableCell>
                    <TableCell>
                      {t2.status === "IN_PROGRESS" ? (
                        <Badge className="bg-emerald-600 text-white">{t("status.inProgress")}</Badge>
                      ) : (
                        <Badge variant="outline">{t("status.completed")}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {t2.events?.filter((e) => e.type === "ARRIVED_STOP").length ?? 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RealtimeBadge({
  status,
}: {
  status: "connecting" | "live" | "offline";
}) {
  const { t } = useI18n();
  if (status === "live") {
    return (
      <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-600/40">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {t("trips.liveUpdates")}
      </Badge>
    );
  }
  if (status === "offline") {
    return <Badge variant="outline" className="text-muted-foreground">{t("dashboard.offline")}</Badge>;
  }
  return <Badge variant="outline" className="text-muted-foreground">{t("dashboard.connecting")}</Badge>;
}
