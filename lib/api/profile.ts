import { transportApiFetch } from "@/lib/api/client";

export interface StaffProfileTenant {
  id: string;
  name: string;
}

export interface StaffProfile {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  staffNumber: string | null;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  status: string;
  position: string;
  positionTitle: string;
  roles: string[];
  tenant: StaffProfileTenant;
}

export interface UpdateStaffProfileDto {
  fullName?: string;
  phone?: string;
}

export interface ChangeStaffPasswordDto {
  currentPassword: string;
  newPassword: string;
}

export async function getStaffProfile(): Promise<StaffProfile> {
  return transportApiFetch<StaffProfile>("/staff/me/profile");
}

export async function updateStaffProfile(dto: UpdateStaffProfileDto) {
  return transportApiFetch<StaffProfile>("/staff/me/profile", {
    method: "PATCH",
    body: JSON.stringify(dto),
  });
}

export async function changeStaffPassword(dto: ChangeStaffPasswordDto) {
  return transportApiFetch<{ changed: boolean }>("/staff/me/password", {
    method: "PATCH",
    body: JSON.stringify(dto),
  });
}
