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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  NativeSelect, NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { transportApiFetch } from "@/lib/api/client";
import { TransportRoute, TransportShift, Bus } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/locale-provider";
import { SHIFT_KEY } from "@/lib/i18n/status-maps";
import { Plus, Pencil, Trash2, ArrowRight } from "lucide-react";

export default function RoutesPage() {
  const { t } = useI18n();
  const [routes, setRoutes] = useState<TransportRoute[] | null>(null);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [error, setError] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TransportRoute | null>(null);
  const [formName, setFormName] = useState("");
  const [formShift, setFormShift] = useState<TransportShift>("MORNING");
  const [formBusId, setFormBusId] = useState("none");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<TransportRoute | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deletingBusy, setDeletingBusy] = useState(false);

  const load = useCallback(() => {
    transportApiFetch<TransportRoute[]>("/transport/routes")
      .then((res) => {
        setRoutes(res);
        setError("");
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : t("routes.failedToLoad"));
        setRoutes([]);
      });
    transportApiFetch<{ data: Bus[] }>("/transport/vehicles?page=1&limit=200")
      .then((res) => setBuses(res.data))
      .catch(() => setBuses([]));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setFormName("");
    setFormShift("MORNING");
    setFormBusId("none");
    setFormError("");
    setDialogOpen(true);
  }

  function openEdit(r: TransportRoute) {
    setEditing(r);
    setFormName(r.name);
    setFormShift(r.shift);
    setFormBusId(r.bus?.id ?? "none");
    setFormError("");
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setFormError("");
    const body = {
      name: formName.trim(),
      shift: formShift,
      busId: formBusId === "none" ? null : formBusId,
    };
    try {
      if (editing) {
        await transportApiFetch(`/transport/routes/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await transportApiFetch("/transport/routes", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t("routes.couldNotSave"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    setDeleteError("");
    try {
      await transportApiFetch(`/transport/routes/${deleting.id}`, { method: "DELETE" });
      setDeleting(null);
      load();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : t("routes.couldNotDelete"));
    } finally {
      setDeletingBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t("routes.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("routes.subtitle")}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 me-1" /> {t("routes.addRoute")}
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {routes === null ? (
            <div className="p-4 space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : routes.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {t("routes.empty")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("routes.route")}</TableHead>
                  <TableHead>{t("routes.shift")}</TableHead>
                  <TableHead>{t("routes.bus")}</TableHead>
                  <TableHead>{t("routes.stops")}</TableHead>
                  <TableHead>{t("routes.assigned")}</TableHead>
                  <TableHead>{t("routes.trips")}</TableHead>
                  <TableHead className="text-end">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routes.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link
                        href={`/routes/${r.id}`}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        {r.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{t(SHIFT_KEY[r.shift])}</Badge>
                    </TableCell>
                    <TableCell>{r.bus?.plateNumber ?? "—"}</TableCell>
                    <TableCell>{r._count?.stops ?? 0}</TableCell>
                    <TableCell>{r._count?.assignments ?? 0}</TableCell>
                    <TableCell>{r._count?.trips ?? 0}</TableCell>
                    <TableCell className="text-end">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeleting(r);
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

      <p className="text-xs text-muted-foreground flex items-center gap-1">
        {t("routes.hint")}
        <ArrowRight className="h-3 w-3 rtl:rotate-180" />
      </p>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? t("routes.editRoute") : t("routes.addRoute")}</DialogTitle>
            <DialogDescription>
              {editing ? t("routes.descEdit") : t("routes.descAdd")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>{t("routes.nameLabel")}</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("routes.namePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("routes.shift")}</Label>
              <NativeSelect
                value={formShift}
                onChange={(e) => setFormShift(e.target.value as TransportShift)}
                className="w-full"
              >
                <NativeSelectOption value="MORNING">{t("shift.morning")}</NativeSelectOption>
                <NativeSelectOption value="EVENING">{t("shift.evening")}</NativeSelectOption>
                <NativeSelectOption value="BOTH">{t("shift.both")}</NativeSelectOption>
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label>{t("routes.bus")}</Label>
              <NativeSelect
                value={formBusId}
                onChange={(e) => setFormBusId(e.target.value)}
                className="w-full"
              >
                <NativeSelectOption value="none">{t("routes.busUnassigned")}</NativeSelectOption>
                {buses.map((b) => (
                  <NativeSelectOption key={b.id} value={b.id}>
                    {b.plateNumber} ({b.model})
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
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
            <DialogTitle>{t("routes.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("routes.deleteDesc", { name: deleting?.name ?? "" })}
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
