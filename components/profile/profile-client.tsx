"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, RefreshCw, Edit2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster, useToastManager } from "@/components/ui/toast";
import {
  getStaffProfile,
  type StaffProfile,
  updateStaffProfile,
  type UpdateStaffProfileDto,
  changeStaffPassword,
  type ChangeStaffPasswordDto,
} from "@/lib/api/profile";
import { ApiError } from "@/lib/api/client";
import { useI18n, type MessageKey } from "@/lib/i18n/locale-provider";

function initialsOf(name: string): string {
  const parts = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

function DetailRow({
  labelKey,
  value,
  action,
}: {
  labelKey: MessageKey;
  value: React.ReactNode;
  action?: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2.5">
      <dt className="text-sm text-muted-foreground">{t(labelKey)}</dt>
      <dd className="text-sm font-medium break-all text-end">{value}</dd>
      {action && <dd className="flex items-center gap-2">{action}</dd>}
    </div>
  );
}

type EditField = "fullName" | "phone" | null;

function InlineEditCard({
  labelKey,
  value,
  onChangeValue,
  saving,
  onSave,
  onCancel,
}: {
  labelKey: MessageKey;
  value: string;
  onChangeValue: (value: string) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  return (
    <Card>
      <CardContent className="p-6">
        <Label>{t(labelKey)}</Label>
        <Input
          autoFocus
          value={value}
          onChange={(e) => onChangeValue(e.target.value)}
          className="mb-3"
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
            if (e.key === "Escape") onCancel();
          }}
        />
        <div className="flex gap-2">
          <Button type="button" disabled={saving} onClick={onSave}>
            {saving ? t("common.saving") : t("common.save")}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProfileClient() {
  const router = useRouter();
  const { t } = useI18n();
  const { add } = useToastManager();
  const [profile, setProfile] = React.useState<StaffProfile | null>(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [editField, setEditField] = React.useState<EditField>(null);
  const [editValue, setEditValue] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [changingPassword, setChangingPassword] = React.useState(false);

  const load = React.useCallback(() => {
    getStaffProfile()
      .then((data) => {
        setProfile(data);
        setError("");
        setLoading(false);
      })
      .catch((cause) => {
        if (cause instanceof ApiError && cause.status === 401) return;
        setError(cause instanceof ApiError ? cause.message : t("profile.unableToLoad"));
        setLoading(false);
      });
  }, [t]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleSignOut() {
    await fetch("/api/session/logout", { method: "POST" }).catch(() => undefined);
    router.push("/login");
    router.refresh();
  }

  async function handleSave() {
    if (!profile || !editField) return;
    setSaving(true);
    try {
      const dto: UpdateStaffProfileDto =
        editField === "fullName" ? { fullName: editValue } : { phone: editValue };
      await updateStaffProfile(dto);
      add({ title: t("profile.updated") });
      setEditField(null);
      await load();
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : cause instanceof Error
            ? cause.message
            : t("profile.unableToLoad");
      add({
        title: t("profile.error"),
        description: message,
        type: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (profile) setEditValue(editField === "fullName" ? profile.fullName : profile.phone ?? "");
    setEditField(null);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setChangingPassword(true);
    try {
      const dto: ChangeStaffPasswordDto = { currentPassword, newPassword };
      await changeStaffPassword(dto);
      add({ title: t("profile.passwordChanged") });
      setCurrentPassword("");
      setNewPassword("");
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : cause instanceof Error
            ? cause.message
            : t("profile.unableToLoad");
      add({
        title: t("profile.error"),
        description: message,
        type: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold tracking-tight">{t("profile.title")}</h1>
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <span>{error || t("profile.notFound")}</span>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={load}>
              <RefreshCw size={14} aria-hidden /> {t("profile.retry")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void handleSignOut()}>
              {t("profile.signOut")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const initials = initialsOf(profile.fullName);
  const positionLabel =
    profile.positionTitle === "Transport Coordinator"
      ? t("status.transportCoordinator")
      : profile.positionTitle;
  const statusLabel = profile.status === "ACTIVE" ? t("profile.activeStatus") : profile.status;
  const isEditing = editField !== null;

  return (
    <div className="flex flex-col gap-4">
      <Toaster />

        <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Avatar size="lg" className="size-14">
              {profile.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt="" /> : null}
              <AvatarFallback aria-hidden className="text-lg">{initials || "?"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-xl font-semibold tracking-tight">
                  {profile.fullName}
                </h1>
                {!isEditing && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditField("fullName");
                      setEditValue(profile.fullName);
                    }}
                  >
                    <Edit2 size={14} aria-hidden /> {t("profile.edit")}
                  </Button>
                )}
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">{positionLabel}</Badge>
                <Badge variant={profile.status === "ACTIVE" ? "default" : "outline"}>
                  {statusLabel}
                </Badge>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {editField === "fullName" && (
        <InlineEditCard
          labelKey="profile.fullName"
          value={editValue}
          onChangeValue={setEditValue}
          saving={saving}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      <Card>
        <CardContent className="p-6">
          <dl className="flex flex-col divide-y">
            <DetailRow labelKey="profile.staffId" value={profile.staffNumber ?? "-"} />
            <DetailRow
              labelKey="profile.phone"
              value={profile.phone ?? "-"}
              action={
                !isEditing ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditField("phone");
                      setEditValue(profile.phone ?? "");
                    }}
                  >
                    <Edit2 size={14} aria-hidden /> {t("profile.edit")}
                  </Button>
                ) : null
              }
            />
            <DetailRow labelKey="profile.school" value={profile.tenant.name} />
          </dl>
          {editField === "phone" && (
            <InlineEditCard
              labelKey="profile.phone"
              value={editValue}
              onChangeValue={setEditValue}
              saving={saving}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 text-sm font-semibold">{t("profile.changePassword")}</h2>
          <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label>{t("profile.currentPassword")}</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={changingPassword}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>{t("profile.newPassword")}</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={changingPassword}
              />
            </div>
            <Button type="submit" disabled={changingPassword}>
              {changingPassword ? t("common.saving") : t("profile.changePassword")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-medium">{t("profile.signOut")}</p>
            <p className="text-xs text-muted-foreground">{t("profile.signOutDesc")}</p>
          </div>
          <Button type="button" variant="destructive" size="sm" onClick={() => void handleSignOut()}>
            <LogOut size={14} aria-hidden /> {t("profile.signOut")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
