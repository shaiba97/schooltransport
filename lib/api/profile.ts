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

export async function getStaffProfile(): Promise<StaffProfile> {
  return transportApiFetch<StaffProfile>("/staff/me/profile");
}
