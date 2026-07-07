import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { MobileBottomNav } from "./MobileBottomNav";
import { BackendNotice } from "./BackendNotice";
import { useIsMobile } from "@/hooks/use-mobile";

export function AppLayout() {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <AppHeader />
          <BackendNotice />
          <main className="flex-1 p-3 sm:p-6 pb-20 md:pb-6">
            <Outlet />
          </main>
        </div>
      </div>
      {isMobile && <MobileBottomNav />}
    </SidebarProvider>
  );
}
