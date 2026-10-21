"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getStaffProfile, type StaffProfile } from "@/lib/api/profile";
import { ApiError } from "@/lib/api/client";
import { useI18n, type MessageKey } from "@/lib/i18n/locale-provider";

function initialsOf(name: string): string {
  const parts = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

function DetailRow({ labelKey, value }: { labelKey: MessageKey; value: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2.5">
      <dt className="text-sm text-muted-foreground">{t(labelKey)}</dt>
      <dd className="text-sm font-medium break-all text-end">{value}</dd>
    </div>
  );
}

export function ProfileClient() {
  const router = useRouter();
  const { t } = useI18n();
  const [profile, setProfile] = React.useState<StaffProfile | null>(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);

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

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Avatar size="lg" className="size-14">
              {profile.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt="" /> : null}
              <AvatarFallback aria-hidden className="text-lg">{initials || "?"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-tight">{profile.fullName}</h1>
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

      <Card>
        <CardContent className="p-6">
          <dl className="flex flex-col divide-y">
            <DetailRow labelKey="profile.staffId" value={profile.staffNumber ?? "-"} />
            <DetailRow labelKey="profile.phone" value={profile.phone ?? "-"} />
            <DetailRow labelKey="profile.school" value={profile.tenant.name} />
          </dl>
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
