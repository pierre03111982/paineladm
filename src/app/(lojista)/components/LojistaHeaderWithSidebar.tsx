"use client";

import { useState } from "react";
import { SidebarWrapper } from "@/components/layout/SidebarWrapper";
import { LojistaTopBar } from "./LojistaTopBar";
import { AnimatedPageWrapper } from "./AnimatedPageWrapper";
import { SidebarWallpaperProvider } from "@/hooks/useSidebarWallpaper";

type LojistaHeaderWithSidebarProps = {
  blueGradient: string;
  lojaLogo?: string | null;
  lojaNome?: string;
  initials?: string;
  lojistaId?: string | null;
  appModel?: "1" | "2" | "3";
  children: React.ReactNode;
};

export function LojistaHeaderWithSidebar({
  blueGradient,
  lojaLogo = null,
  lojaNome = "Experimente AI",
  initials = "EA",
  lojistaId = null,
  appModel = "1",
  children,
}: LojistaHeaderWithSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <SidebarWallpaperProvider lojistaId={lojistaId}>
      <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden overflow-x-hidden">
        <div className="shrink-0 h-full relative z-40">
          <SidebarWrapper
            lojaLogo={lojaLogo}
            lojaNome={lojaNome}
            initials={initials}
            isCollapsed={isCollapsed}
            onToggleSidebar={() => setIsCollapsed((v) => !v)}
          />
        </div>

      <div className="flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden">
        <LojistaTopBar
          isCollapsed={isCollapsed}
          onToggleSidebar={() => setIsCollapsed((v) => !v)}
          lojistaId={lojistaId}
          appModel={appModel}
        />
        <main
          className="flex-1 min-h-0 flex flex-col overflow-hidden relative z-10"
          style={{
            backgroundColor: "#d1d5db",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.7)",
          }}
        >
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-8 pr-10 pt-4 pb-12" style={{ backgroundColor: "#d1d5db" }}>
            <AnimatedPageWrapper>{children}</AnimatedPageWrapper>
          </div>
        </main>
      </div>
      </div>
    </SidebarWallpaperProvider>
  );
}
