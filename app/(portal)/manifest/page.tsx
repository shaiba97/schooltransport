"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { transportApiFetch } from "@/lib/api/client";
import {
  ManifestResponse, ManifestRow, ManifestFeeStatus, TransportRoute, Bus, BusListResponse,
  CandidateStudent, CandidateResponse,
} from "@/lib/api/types";
import { useCurrency } from "@/components/portal/currency-provider";
import { useI18n } from "@/lib/i18n/locale-provider";
import { SHIFT_KEY, FEE_KEY } from "@/lib/i18n/status-maps";
import { Search, UserPlus, Trash2, Check, X } from "lucide-react";

const PAGE_SIZE = 50;

const FEE_CLS: Record<ManifestFeeStatus, string> = {
  NOT_BILLED: "text-muted-foreground",
PAID: "text-success border-success/40",
PARTIAL: "text-warning border-warning/40",
  PENDING: "text-destructive border-destructive/40",
};

export default function ManifestPage() {
  const { t } = useI18n();
  const { money } = useCurrency();
  const [rows, setRows] = useState<ManifestRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [routeFilter, setRouteFilter] = useState("all");
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [error, setError] = useState("");

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignBuses, setAssignBuses] = useState<Bus[]>([]);
  const [assignBusId, setAssignBusId] = useState("");
  const [assignRouteId, setAssignRouteId] = useState("");
  const [selected, setSelected] = useState<CandidateStudent[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState<CandidateStudent[]>([]);
  const [studentBusy, setStudentBusy] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assigning, setAssigning] = useState(false);

  const [unassigning, setUnassigning] = useState<ManifestRow | null>(null);
  const [unassignError, setUnassignError] = useState("");
  const [unassignBusy, setUnassignBusy] = useState(false);

  const load = useCallback(
    async (q: string, rid: string, p: number) => {
      try {
        const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
        if (q) params.set("search", q);
        if (rid !== "all") params.set("routeId", rid);
        const res = await transportApiFetch<ManifestResponse>(`/transport/students?${params}`);
        setRows(res.data);
        setTotal(res.total);
        setError("");
      } catch (e) {
        setError(e instanceof Error ? e.message : t("manifest.failedToLoad"));
        setRows([]);
      }
    },
    [t]
  );

  useEffect(() => {
    transportApiFetch<TransportRoute[]>("/transport/routes")
      .then(setRoutes)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    Promise.resolve().then(() => load(query, routeFilter, page));
  }, [query, routeFilter, page, load]);

  // ----- assign dialog -----

  function openAssign() {
    setAssignBusId("");
    setAssignRouteId("");
    setSelected([]);
    setStudentSearch("");
    setStudentResults([]);
    setAssignError("");
    setStudentBusy(false);
    setAssigning(false);
    setAssignOpen(true);
  }

  // Fleets that can take students: buses with at least one route.
  useEffect(() => {
    if (!assignOpen) return;
    transportApiFetch<BusListResponse>("/transport/vehicles?limit=200")
      .then((res) => {
        const withRoute = new Set(
          routes.flatMap((r) => (r.busId ? [r.busId] : [])),
        );
        setAssignBuses(res.data.filter((b) => withRoute.has(b.id)));
      })
      .catch(() => setAssignBuses([]));
  }, [assignOpen, routes]);

  useEffect(() => {
    if (!assignOpen) return;
    const timer = setTimeout(() => {
      setStudentBusy(true);
      const params = new URLSearchParams({ page: "1", limit: "20" });
      if (studentSearch.trim()) params.set("search", studentSearch.trim());
      transportApiFetch<CandidateResponse>(`/transport/students/candidates?${params}`)
        .then((res) => setStudentResults(res.data))
        .catch(() => setStudentResults([]))
        .finally(() => setStudentBusy(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [assignOpen, studentSearch]);

  const busRoutes = routes.filter((r) => r.busId === assignBusId);

  function toggleStudent(s: CandidateStudent) {
    setSelected((prev) =>
      prev.some((x) => x.id === s.id)
        ? prev.filter((x) => x.id !== s.id)
        : [...prev, s],
    );
  }

  async function handleAssign() {
    if (!assignBusId) {
      setAssignError(t("manifest.selectFleetFirst"));
      return;
    }
    const routeId = busRoutes.length > 1 ? assignRouteId : busRoutes[0]?.id;
    if (!routeId) {
      setAssignError(t("manifest.selectFleetFirst"));
      return;
    }
    setAssigning(true);
    setAssignError("");
    try {
      await transportApiFetch("/transport/assignments/batch", {
        method: "POST",
        body: JSON.stringify({
          studentIds: selected.map((s) => s.id),
          routeId,
        }),
      });
      setAssignOpen(false);
      setSelected([]);
      setPage(1);
      void load(query, routeFilter, 1);
    } catch (e) {
      setAssignError(e instanceof Error ? e.message : t("manifest.couldNotAssign"));
    } finally {
      setAssigning(false);
    }
  }

  async function handleUnassign() {
    if (!unassigning) return;
    setUnassignBusy(true);
    setUnassignError("");
    try {
      await transportApiFetch(`/transport/assignments/${unassigning.studentId}`, {
        method: "DELETE",
      });
      setUnassigning(null);
      void load(query, routeFilter, page);
    } catch (e) {
      setUnassignError(e instanceof Error ? e.message : t("manifest.couldNotUnassign"));
    } finally {
      setUnassignBusy(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t("manifest.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("manifest.subtitle")}
          </p>
        </div>
        <Button className="bg-transport-accent text-transport-accent-foreground hover:bg-transport-accent/85" onClick={openAssign}>
          <UserPlus className="h-4 w-4 me-1" /> {t("manifest.assignStudent")}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute inset-s-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("manifest.searchPlaceholder")}
            className="ps-8 w-64"
          />
        </div>
        <NativeSelect
          value={routeFilter}
          onChange={(e) => {
            setRouteFilter(e.target.value);
            setPage(1);
          }}
          className="w-52"
        >
          <NativeSelectOption value="all">{t("manifest.allRoutes")}</NativeSelectOption>
          {routes.map((r) => (
            <NativeSelectOption key={r.id} value={r.id}>
              {r.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {rows === null ? (
            <div className="p-4 space-y-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {query || routeFilter !== "all" ? t("manifest.emptyFiltered") : t("manifest.empty")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("manifest.student")}</TableHead>
                  <TableHead>{t("manifest.roleNumber")}</TableHead>
                  <TableHead>{t("manifest.class")}</TableHead>
                  <TableHead>{t("manifest.route")}</TableHead>
                  <TableHead>{t("manifest.stop")}</TableHead>
                  <TableHead className="text-end">{t("manifest.fee")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead className="text-end">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.assignmentId}>
                    <TableCell className="font-medium">{r.studentName}</TableCell>
                    <TableCell>{r.roleNumber}</TableCell>
                    <TableCell>{r.className ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{t(SHIFT_KEY[r.shift])}</Badge>{" "}
                      <span>{r.routeName}</span>
                    </TableCell>
                    <TableCell>{r.stopName ?? "—"}</TableCell>
                    <TableCell className="text-end">{money(r.transportFee)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={FEE_CLS[r.feeStatus]}>
                        {t(FEE_KEY[r.feeStatus])}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setUnassigning(r);
                          setUnassignError("");
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {t("manifest.studentCount", { count: total })}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              {t("common.previous")}
            </Button>
            <span className="text-sm px-2 py-1">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("common.next")}
            </Button>
          </div>
        </div>
      )}

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("manifest.assignTitle")}</DialogTitle>
            <DialogDescription>
              {t("manifest.assignDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {selected.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {t("manifest.selectedCount", { count: selected.length })}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setSelected([])}
                    disabled={assigning}
                  >
                    {t("manifest.clearSelection")}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selected.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-0.5 text-xs"
                    >
                      {s.fullName}
                      <button
                        type="button"
                        aria-label={t("manifest.removeStudent", { name: s.fullName })}
                        className="opacity-60 hover:opacity-100"
                        disabled={assigning}
                        onClick={() => toggleStudent(s)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <Input
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder={t("manifest.searchStudentsPlaceholder")}
            />
            <div className="max-h-56 overflow-y-auto rounded-md border divide-y">
              {studentBusy ? (
                <div className="p-3 space-y-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-4/5" />
                </div>
              ) : studentResults.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">{t("manifest.noStudents")}</p>
              ) : (
                studentResults.map((s) => {
                  const checked = selected.some((x) => x.id === s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={checked}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-start hover:bg-muted/50 disabled:opacity-50"
                      disabled={assigning}
                      onClick={() => toggleStudent(s)}
                    >
                      <span
                        className={
                          checked
                            ? "flex h-4 w-4 shrink-0 items-center justify-center rounded border border-primary bg-primary text-primary-foreground"
                            : "flex h-4 w-4 shrink-0 items-center justify-center rounded border"
                        }
                      >
                        {checked && <Check className="h-3 w-3" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{s.fullName}</span>
                        <span className="block text-xs text-muted-foreground">{s.roleNumber}</span>
                      </span>
                      {s.assignment && (
                        <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground">
                          {t("manifest.assignedBadge", { route: s.assignment.routeName })}
                        </Badge>
                      )}
                    </button>
                  );
                })
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("manifest.fleet")}</label>
              <NativeSelect
                value={assignBusId}
                onChange={(e) => {
                  setAssignBusId(e.target.value);
                  setAssignRouteId("");
                }}
                className="w-full"
                disabled={assigning}
              >
                <NativeSelectOption value="">{t("manifest.selectOption")}</NativeSelectOption>
                {assignBuses.map((b) => (
                  <NativeSelectOption key={b.id} value={b.id}>
                    {t("manifest.fleetOption", { plate: b.plateNumber, model: b.model })}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {assignBuses.length === 0 && (
                <p className="text-xs text-muted-foreground">{t("manifest.fleetHintNoBuses")}</p>
              )}
            </div>
            {assignBusId && busRoutes.length > 1 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("manifest.assignRoute")}</label>
                <NativeSelect
                  value={assignRouteId}
                  onChange={(e) => setAssignRouteId(e.target.value)}
                  className="w-full"
                  disabled={assigning}
                >
                  <NativeSelectOption value="">{t("manifest.selectOption")}</NativeSelectOption>
                  {busRoutes.map((r) => (
                    <NativeSelectOption key={r.id} value={r.id}>
                      {r.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            )}
            {assignError && <p className="text-sm text-destructive">{assignError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)} disabled={assigning}>
              {t("common.close")}
            </Button>
            <Button
              onClick={handleAssign}
              disabled={
                assigning ||
                selected.length === 0 ||
                !assignBusId ||
                (busRoutes.length > 1 && !assignRouteId)
              }
            >
              <UserPlus className="h-4 w-4" />
              {assigning
                ? t("manifest.assigning")
                : `${t("manifest.assign")} (${selected.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={unassigning !== null} onOpenChange={(o) => !o && setUnassigning(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("manifest.unassignTitle")}</DialogTitle>
            <DialogDescription>
              {t("manifest.unassignDesc", { name: unassigning?.studentName ?? "" })}
            </DialogDescription>
          </DialogHeader>
          {unassignError && <p className="text-sm text-destructive">{unassignError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnassigning(null)} disabled={unassignBusy}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleUnassign} disabled={unassignBusy}>
              {unassignBusy ? t("manifest.removing") : t("manifest.unassign")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
