import { ProfileClient } from "@/components/profile/profile-client";
import { ToastProvider } from "@/components/ui/toast";

export default function ProfilePage() {
  return (
    <ToastProvider>
      <ProfileClient />
    </ToastProvider>
  );
}
