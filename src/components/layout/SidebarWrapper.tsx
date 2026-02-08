"use client";

import { motion } from "framer-motion";
import { ChevronLeft, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import LojistaNav from "@/app/components/lojista-nav";

type SidebarWrapperProps = {
  lojaLogo?: string | null;
  lojaNome?: string;
  initials?: string;
  isCollapsed: boolean;
  onToggleSidebar: () => void;
};

export function SidebarWrapper({
  lojaLogo = null,
  lojaNome = "Experimente AI",
  initials = "EA",
  isCollapsed,
  onToggleSidebar,
}: SidebarWrapperProps) {
  return (
    <motion.aside
      className="lojista-sidebar hidden md:flex flex-col relative z-20 h-full min-h-full overflow-x-visible overflow-y-hidden bg-[#1e3a8a]"
      animate={{ width: isCollapsed ? "80px" : "256px" }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {/* Botão recolher — na borda direita da sidebar, centralizado na barra superior (h-16) */}
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label={isCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
        className="absolute -right-[18px] top-[14px] z-50 flex h-9 w-9 items-center justify-center rounded-full border border-blue-800/50 bg-[#1e3a8a] text-white shadow-lg transition-colors hover:bg-[#2563eb] hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-white"
        style={{
          boxShadow:
            "0 0 0 4px #ffffff, 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
        }}
      >
        {isCollapsed ? (
          <Menu className="h-5 w-5 text-white" />
        ) : (
          <ChevronLeft className="h-5 w-5 text-white" />
        )}
      </button>

      <div
        className={cn(
          "flex-1 pt-24 pb-1 relative",
          isCollapsed ? "px-2" : "px-4"
        )}
        style={{ overflowY: "auto", overflowX: "hidden" }}
      >
        <LojistaNav collapsed={isCollapsed} />
      </div>
    </motion.aside>
  );
}

