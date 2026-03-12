
"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/header";
import { Toaster } from "@/components/ui/toaster";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar from "@/components/app-sidebar";
import FullScreenLoader from "@/components/global-loader";
import ScrollToTop from "@/components/ui/scroll-to-top";
import PageLoader from "@/components/page-loader";
import BottomNav from "@/components/bottom-nav";

export default function LayoutClient({ 
    children,
    footer 
}: { 
    children: React.ReactNode,
    footer: React.ReactNode,
}) {
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  return (
    <SidebarProvider>
      <Sidebar>
        <AppSidebar />
      </Sidebar>
      <SidebarInset>
        <PageLoader />
        <FullScreenLoader />
        <div className="flex min-h-screen flex-col pb-16">
          <Header />
          <main className="flex-grow">{children}</main>
          {isHomePage && footer}
        </div>
        <BottomNav />
        <Toaster />
        <ScrollToTop />
      </SidebarInset>
    </SidebarProvider>
  );
}
