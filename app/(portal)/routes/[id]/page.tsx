"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { transportApiFetch, ApiError } from "@/lib/api/client";
import type { TransportRoute, Stop, TransportTrip } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/locale-provider";
import { fmtDate, fmtTime } from "@/lib/i18n/format";
import { shiftKey } from "@/lib/i18n/status-maps";
import { Plus, Trash2, ArrowUp, ArrowDown, ArrowLeft, Save, Play } from "lucide-react";

interface EditableStop {
  key: string;
  name: string;
  morningEta: string;
  eveningEta: string;
}

export default function RouteDetailPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <RouteDetailContent />
    </Suspense>
  );
}

function RouteDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, locale } = useI18n();

  const [route, setRoute] = useState<TransportRoute | null>(null);
  const [stops, setStops] = useState<EditableStop[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [trips, setTrips] = useState<TransportTrip[] | null>(null);
  const [error, setError] = useState("");
  const [stopsError, setStopsError] = useState("");
  const [stopsSavedAt, setStopsSavedAt] = useState<string | null>(null);
  const [savingStops, setSavingStops] = useState(false);
  const [starting, setStarting] = useState(false);
  const [tripError, setTripError] = useState("");

  const load = useCallback(() => {
    transportApiFetch<TransportRoute[]>("/transport/routes")
      .then((list) => {
        const found = list.find((r) => r.id === id);
        if (!found) {
          setError(t("routeDetail.notFound"));
          setRoute(null);
          return;
        }
        setRoute(found);
        return transportApiFetch<Stop[]>(`/transport/routes/${id}/stops`).then((s) => {
          setStops(
            s.map((st) => ({
              key: st.id,
              name: st.name,
              morningEta: st.morningEta ?? "",
              eveningEta: st.eveningEta ?? "",
            }))
          );
          setStopsSavedAt(null);
          setDirty(false);
          return transportApiFetch<TransportTrip[]>(`/transport/routes/${id}/trips`).then(
            (trips) => {
              setTrips(trips);
              setError("");
            }
          );
        });
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : t("routeDetail.failedToLoad"));
        setStops([]);
        setTrips([]);
      });
  }, [id, t]);

  useEffect(() => {
    Promise.resolve().then(() => load());
  }, [load]);

  function mutateStops(mutator: (draft: EditableStop[]) => EditableStop[]) {
    setStops((prev) => (prev ? mutator([...prev]) : prev));
    setDirty(true);
    setStopsSavedAt(null);
  }

  function addStop() {
    mutateStops((d) => [
      ...d,
      {
        key: `new-${d.length}-${Date.now()}`,
        name: "",
        morningEta: "",
        eveningEta: "",
      },
    ]);
  }

  function removeStop(i: number) {
    mutateStops((d) => d.filter((_, idx) => idx !== i));
  }

  function moveStop(i: number, dir: -1 | 1) {
    mutateStops((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.length) return d;
      [d[i], d[j]] = [d[j], d[i]];
      return d;
    });
  }

  function updateStop(i: number, patch: Partial<EditableStop>) {
    mutateStops((d) => d.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  async function saveStops() {
    if (!stops) return;
    setSavingStops(true);
    setStopsError("");
    try {
      const norm = stops.map((s, i) => ({
        name: s.name.trim(),
        sequence: i + 1,
        morningEta: s.morningEta.trim() || undefined,
        eveningEta: s.eveningEta.trim() || undefined,
      }));
      if (norm.some((s) => !s.name)) {
        throw new ApiError(t("routeDetail.everyStopName"), 400);
      }
      await transportApiFetch(`/transport/routes/${id}/stops`, {
        method: "PUT",
        body: JSON.stringify({ stops: norm }),
      });
      const refreshed = await transportApiFetch<Stop[]>(
        `/transport/routes/${id}/stops`
      );
      setStops(
        refreshed.map((st) => ({
          key: st.id,
          name: st.name,
          morningEta: st.morningEta ?? "",
          eveningEta: st.eveningEta ?? "",
        }))
      );
      setDirty(false);
      setStopsSavedAt(new Date().toLocaleTimeString());
    } catch (e) {
      setStopsError(e instanceof Error ? e.message : t("routeDetail.couldNotSaveStops"));
    } finally {
      setSavingStops(false);
    }
  }

  async function startTrip() {
    setStarting(true);
    setTripError("");
    try {
      await transportApiFetch(`/transport/routes/${id}/trips`, {
        method: "POST",
      });
      void load();
    } catch (e) {
      setTripError(e instanceof Error ? e.message : t("trips.couldNotStart"));
    } finally {
      setStarting(false);
    }
  }

  if (error && !route) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/routes")}>
          <ArrowLeft className="h-4 w-4 me-1 rtl:rotate-180" /> {t("routeDetail.backToRoutes")}
        </Button>
        <Card className="border-destructive/50">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.push("/routes")}>
            <ArrowLeft className="h-4 w-4 me-1 rtl:rotate-180" /> {t("routeDetail.routesButton")}
          </Button>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            {route ? route.name : <Skeleton className="h-8 w-48" />}
          </h2>
          {route && (
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{t(shiftKey(route.shift))}</Badge>
              {route.bus?.plateNumber && (
                <span>{t("routeDetail.busPrefix", { plate: route.bus.plateNumber })}</span>
              )}
              <span>·</span>
              <span>{t("routeDetail.studentsAssigned", { count: route._count?.assignments ?? 0 })}</span>
            </div>
          )}
        </div>
        <Button onClick={startTrip} disabled={starting || !route}>
          <Play className="h-4 w-4 me-1" />
          {starting ? t("routeDetail.starting") : t("routeDetail.startTrip")}
        </Button>
      </div>

      {tripError && (
        <Card className="border-destructive/50">
          <CardContent className="py-3 text-sm text-destructive">{tripError}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{t("routeDetail.stopsTitle")}</CardTitle>
            <CardDescription>
              {t("routeDetail.stopsSubtitle")}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addStop}>
              <Plus className="h-4 w-4 me-1" /> {t("routeDetail.addStop")}
            </Button>
            <Button size="sm" onClick={saveStops} disabled={savingStops || stops === null}>
              <Save className="h-4 w-4 me-1" />
              {savingStops ? t("common.saving") : t("routeDetail.saveStopsLabel")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {stopsSavedAt && dirty === false && (
            <p className="mb-2 text-xs text-muted-foreground">
              {t("routeDetail.savedAtNote", { time: stopsSavedAt })}
            </p>
          )}
          {stopsError && <p className="mb-2 text-sm text-destructive">{stopsError}</p>}
          {stops === null ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : stops.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t("routeDetail.noStops")}
            </p>
          ) : (
            <div className="space-y-2">
              <div className="hidden sm:grid grid-cols-[24px_1fr_1fr_1fr_92px] gap-2 text-xs text-muted-foreground font-medium">
                <span className="text-center">#</span>
                <span>{t("routeDetail.stopName")}</span>
                <span>{t("routeDetail.morningEta")}</span>
                <span>{t("routeDetail.eveningEta")}</span>
                <span></span>
              </div>
              {stops.map((s, i) => (
                <div
                  key={s.key}
                  className="grid grid-cols-1 sm:grid-cols-[24px_1fr_1fr_1fr_92px] gap-2 items-center"
                >
                  <span className="hidden sm:block text-center text-sm text-muted-foreground">
                    {i + 1}
                  </span>
                  <Input
                    value={s.name}
                    onChange={(e) => updateStop(i, { name: e.target.value })}
                    placeholder={t("routeDetail.stopPlaceholder", { n: i + 1 })}
                  />
                  <Input
                    type="time"
                    value={s.morningEta}
                    onChange={(e) => updateStop(i, { morningEta: e.target.value })}
                  />
                  <Input
                    type="time"
                    value={s.eveningEta}
                    onChange={(e) => updateStop(i, { eveningEta: e.target.value })}
                  />
                  <div className="flex gap-0.5 justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveStop(i, -1)}
                      disabled={i === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveStop(i, 1)}
                      disabled={i === stops.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => removeStop(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("routeDetail.recentTrips")}</CardTitle>
          <CardDescription>
            {t("routeDetail.recentTripsDesc")}
          </CardDescription>
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
              {t("routeDetail.noTrips")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("routeDetail.date")}</TableHead>
                  <TableHead>{t("routeDetail.started")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("routeDetail.arrivals")}</TableHead>
                  <TableHead className="text-end">{t("routeDetail.control")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips.map((t2) => {
                  const arrived = t2.events?.filter((e) => e.type === "ARRIVED_STOP").length ?? 0;
                  return (
                    <TableRow key={t2.id}>
                      <TableCell>{fmtDate(t2.startedAt, locale)}</TableCell>
                      <TableCell>{fmtTime(t2.startedAt, locale)}</TableCell>
                      <TableCell>
                        {t2.status === "IN_PROGRESS" ? (
                          <Badge className="bg-emerald-600 text-white">{t("status.inProgress")}</Badge>
                        ) : (
                          <Badge variant="outline">{t("status.completed")}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{arrived}</TableCell>
                      <TableCell className="text-end">
                        <Link
                          href={`/trips?routeId=${t2.routeId}&tripId=${t2.id}`}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          {t("routeDetail.open")}
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

