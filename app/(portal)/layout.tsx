import { Suspense } from "react";
import { TenantLockedNotice } from "@/components/portal/tenant-locked-notice";
import { Sidebar } from "@/components/portal/sidebar";
import { MobileTopBar, BottomNav } from "@/components/portal/mobile-nav";
import { CurrencyProvider } from "@/components/portal/currency-provider";

// Static shells (no runtime hooks inside) so dynamic routes can prerender:
// usePathname() in Sidebar/BottomNav streams in after prerender instead of
// blocking it.
function SidebarFallback() {
  return (
    <aside
      className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-e bg-sidebar"
      aria-hidden="true"
    />
  );
}

function BottomNavFallback() {
  return <nav className="lg:hidden fixed bottom-0 inset-x-0 border-t bg-sidebar z-40" aria-hidden="true" />;
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CurrencyProvider>
      <div className="min-h-screen bg-background">
        <TenantLockedNotice />
        <Suspense fallback={<SidebarFallback />}>
          <Sidebar />
        </Suspense>
        <MobileTopBar />
        <div className="lg:ps-64 flex flex-col min-h-screen">
          <main className="flex-1 p-4 lg:p-6 pb-28 lg:pb-6">{children}</main>
        </div>
        <Suspense fallback={<BottomNavFallback />}>
          <BottomNav />
        </Suspense>
      </div>
    </CurrencyProvider>
  );
}
