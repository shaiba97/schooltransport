"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  NativeSelect, NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { transportApiFetch, ApiError } from "@/lib/api/client";
import { BusListResponse, Bus, BusStatus } from "@/lib/api/types";
import { StatusBadge } from "@/components/portal/bus-status-badge";
import { useI18n } from "@/lib/i18n/locale-provider";
import { Plus, Search, Pencil, Trash2, ChevronRight } from "lucide-react";

const PAGE_SIZE = 50;

const emptyForm = {
  plateNumber: "",
  model: "",
  capacity: "30",
  driverName: "",
  driverPhone: "",
  driverLicenseNumber: "",
  driverEmergencyContact: "",
  status: "ACTIVE" as BusStatus,
};

export default function FleetPage() {
  const { t } = useI18n();
  const [buses, setBuses] = useState<Bus[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Bus | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<Bus | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deletingBusy, setDeletingBusy] = useState(false);

  const load = useCallback(
    async (opts: { search?: string; page?: number } = {}) => {
      const s = opts.search ?? query;
      const p = opts.page ?? page;
      try {
        const res = await transportApiFetch<BusListResponse>(
          `/transport/vehicles?page=${p}&limit=${PAGE_SIZE}${s ? `&search=${encodeURIComponent(s)}` : ""}`
        );
        setBuses(res.data);
        setTotal(res.total);
        setError("");
      } catch (e) {
        setError(e instanceof Error ? e.message : t("fleet.failedToLoad"));
        setBuses([]);
      }
    },
    [page, query, t]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    Promise.resolve().then(() => load());
  }, [page, query, load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setDialogOpen(true);
  }

  function openEdit(bus: Bus) {
    setEditing(bus);
    setForm({
      plateNumber: bus.plateNumber,
      model: bus.model,
      capacity: String(bus.capacity),
      driverName: bus.driverName,
      driverPhone: bus.driverPhone,
      driverLicenseNumber: bus.driverLicenseNumber,
      driverEmergencyContact: bus.driverEmergencyContact,
      status: bus.status,
    });
    setFormError("");
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setFormError("");
    const body = {
      plateNumber: form.plateNumber.trim(),
      model: form.model.trim(),
      capacity: Number(form.capacity),
      driverName: form.driverName.trim(),
      driverPhone: form.driverPhone.trim(),
      driverLicenseNumber: form.driverLicenseNumber.trim(),
      driverEmergencyContact: form.driverEmergencyContact.trim(),
      status: form.status,
    };
    try {
      if (editing) {
        await transportApiFetch(`/transport/vehicles/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await transportApiFetch("/transport/vehicles", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      setDialogOpen(false);
      void load();
    } catch (e) {
      setFormError(
        e instanceof Error ? e.message : t("fleet.couldNotSave")
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    setDeleteError("");
    try {
      await transportApiFetch(`/transport/vehicles/${deleting.id}`, {
        method: "DELETE",
      });
      setDeleting(null);
      setPage(1);
      void load({ page: 1 });
    } catch (e) {
      const message =
        e instanceof ApiError && e.status === 409
          ? e.message
          : e instanceof Error
            ? e.message
            : t("fleet.couldNotDelete");
      setDeleteError(message);
    } finally {
      setDeletingBusy(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t("fleet.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("fleet.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute inset-s-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("fleet.searchPlaceholder")}
              className="ps-8 w-64"
            />
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 me-1" /> {t("fleet.addVehicle")}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {buses === null ? (
            <div className="p-4 space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : buses.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {query ? t("fleet.emptySearch") : t("fleet.empty")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("fleet.plate")}</TableHead>
                  <TableHead>{t("fleet.model")}</TableHead>
                  <TableHead>{t("fleet.capacity")}</TableHead>
                  <TableHead>{t("fleet.driver")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("fleet.routesColumn")}</TableHead>
                  <TableHead className="text-end">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buses.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/fleet/${b.id}`}
                        className="inline-flex items-center gap-1 text-start font-medium hover:underline"
                      >
                        {b.plateNumber}
                        <ChevronRight className="h-3.5 w-3.5 opacity-60 rtl:rotate-180" />
                      </Link>
                    </TableCell>
                    <TableCell>{b.model}</TableCell>
                    <TableCell>{b.capacity}</TableCell>
                    <TableCell>
                      {b.driverName}
                      <span className="block text-xs text-muted-foreground">
                        {b.driverPhone}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={b.status} />
                    </TableCell>
                    <TableCell>{b._count?.routes ?? 0}</TableCell>
                    <TableCell className="text-end">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(b)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeleting(b);
                          setDeleteError("");
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
            {total === 1 ? t("fleet.vehicleCountOne") : t("fleet.vehicleCountOther", { count: total })}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? t("fleet.editVehicle") : t("fleet.addVehicle")}</DialogTitle>
            <DialogDescription>
              {editing ? t("fleet.descEdit") : t("fleet.descAdd")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <Field label={t("fleet.plateNumber")}>
              <Input
                value={form.plateNumber}
                onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
                placeholder={t("fleet.platePlaceholder")}
              />
            </Field>
            <Field label={t("fleet.modelLabel")}>
              <Input
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder={t("fleet.modelPlaceholder")}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("fleet.capacityLabel")}>
                <Input
                  type="number"
                  min="1"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                />
              </Field>
              <Field label={t("fleet.statusLabel")}>
                <NativeSelect
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as BusStatus })
                  }
                  className="w-full"
                >
                  <NativeSelectOption value="ACTIVE">{t("fleet.active")}</NativeSelectOption>
                  <NativeSelectOption value="MAINTENANCE">{t("fleet.maintenance")}</NativeSelectOption>
                  <NativeSelectOption value="INACTIVE">{t("fleet.inactive")}</NativeSelectOption>
                </NativeSelect>
              </Field>
            </div>
            <Field label={t("fleet.driverName")}>
              <Input
                value={form.driverName}
                onChange={(e) => setForm({ ...form, driverName: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("fleet.driverPhone")}>
                <Input
                  value={form.driverPhone}
                  onChange={(e) => setForm({ ...form, driverPhone: e.target.value })}
                />
              </Field>
              <Field label={t("fleet.licenseNumber")}>
                <Input
                  value={form.driverLicenseNumber}
                  onChange={(e) =>
                    setForm({ ...form, driverLicenseNumber: e.target.value })
                  }
                />
              </Field>
            </div>
            <Field label={t("fleet.emergencyContact")}>
              <Input
                value={form.driverEmergencyContact}
                onChange={(e) =>
                  setForm({ ...form, driverEmergencyContact: e.target.value })
                }
              />
            </Field>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("fleet.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("fleet.deleteDesc", { plate: deleting?.plateNumber ?? "" })}
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={deletingBusy}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deletingBusy}>
              {deletingBusy ? t("common.deleting") : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
