"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { transportApiFetch } from "@/lib/api/client";
import type { BusDetail, ManifestResponse, ManifestRow } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/locale-provider";
import { fmtDate } from "@/lib/i18n/format";
import { SHIFT_KEY, shiftKey } from "@/lib/i18n/status-maps";
import { StatusBadge } from "@/components/portal/bus-status-badge";
import { ArrowLeft, Search, ChevronRight } from "lucide-react";

const PAGE_SIZE = 50;

export default function FleetDetailPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <FleetDetailContent />
    </Suspense>
  );
}

function FleetDetailContent() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useI18n();

  const [bus, setBus] = useState<BusDetail | null>(null);
  const [error, setError] = useState("");

  const [rows, setRows] = useState<ManifestRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [studentsError, setStudentsError] = useState("");

  const load = useCallback(() => {
    transportApiFetch<BusDetail>(`/transport/vehicles/${id}`)
      .then((b) => {
        setBus(b);
        setError("");
      })
      .catch(() => {
        setError(t("fleetDetail.notFound"));
        setBus(null);
      });
  }, [id, t]);

  useEffect(() => {
    Promise.resolve().then(() => load());
  }, [load]);

  const loadStudents = useCallback(
    async (q: string, p: number) => {
      try {
        const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
        if (q) params.set("search", q);
        params.set("busId", id);
        const res = await transportApiFetch<ManifestResponse>(`/transport/students?${params}`);
        setRows(res.data);
        setTotal(res.total);
        setStudentsError("");
      } catch (e) {
        setStudentsError(e instanceof Error ? e.message : t("fleetDetail.failedToLoad"));
        setRows([]);
      }
    },
    [id, t]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    Promise.resolve().then(() => loadStudents(query, page));
  }, [query, page, loadStudents]);

  if (error && !bus) {
    return (
      <div className="space-y-4">
        <BackLink />
        <Card className="border-destructive/50">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <BackLink />
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">
          {bus ? bus.plateNumber : <Skeleton className="h-8 w-48" />}
        </h2>
        <p className="text-sm text-muted-foreground">{t("fleetDetail.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("fleetDetail.detailsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {bus === null ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <Detail label={t("fleet.plateNumber")} value={bus.plateNumber} />
              <Detail label={t("fleet.modelLabel")} value={bus.model} />
              <Detail label={t("fleet.capacityLabel")} value={String(bus.capacity)} />
              <Detail
                label={t("fleet.statusLabel")}
                value={<StatusBadge status={bus.status} />}
              />
              <Detail label={t("fleet.driverName")} value={bus.driverName} />
              <Detail label={t("fleet.driverPhone")} value={bus.driverPhone} />
              <Detail label={t("fleet.licenseNumber")} value={bus.driverLicenseNumber} />
              <Detail label={t("fleet.emergencyContact")} value={bus.driverEmergencyContact} />
              <Detail
                label={t("fleetDetail.createdAt")}
                value={bus.createdAt ? fmtDate(bus.createdAt, locale) : "—"}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("fleetDetail.routesTitle")}</CardTitle>
          <CardDescription>{t("fleetDetail.routesDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {bus === null ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : bus.routes.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t("fleetDetail.noRoutes")}
            </p>
          ) : (
            <div className="divide-y rounded-md border">
              {bus.routes.map((r) => (
                <Link
                  key={r.id}
                  href={`/routes/${r.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{r.name}</span>
                      <Badge variant="outline">{t(shiftKey(r.shift))}</Badge>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t("fleetDetail.stopsCount", { count: r._count?.stops ?? 0 })} ·{" "}
                      {t("fleetDetail.studentsCount", { count: r._count?.assignments ?? 0 })}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-xs ${buttonVariants({ variant: "ghost", size: "sm" })}`}
                  >
                    {t("fleetDetail.openRoute")}
                    <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{t("fleetDetail.studentsTitle")}</CardTitle>
            <CardDescription>{t("fleetDetail.studentsDesc")}</CardDescription>
          </div>
          <div className="relative">
            <Search className="absolute inset-s-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("manifest.searchPlaceholder")}
              className="ps-8 w-64"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {studentsError && (
            <p className="px-4 py-2 text-sm text-destructive">{studentsError}</p>
          )}
          {rows === null ? (
            <div className="p-4 space-y-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {query ? t("manifest.emptyFiltered") : t("fleetDetail.noStudents")}
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
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
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
    </div>
  );
}

function BackLink() {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <Button variant="ghost" size="sm" onClick={() => router.push("/fleet")}>
      <ArrowLeft className="h-4 w-4 me-1 rtl:rotate-180" /> {t("fleetDetail.backToFleet")}
    </Button>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}
