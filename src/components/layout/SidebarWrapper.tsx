"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Menu, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import LojistaNav from "@/app/components/lojista-nav";

type SidebarWrapperProps = {};

export function SidebarWrapper({}: SidebarWrapperProps = {}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <motion.aside
      className="hidden md:flex flex-col relative z-20"
      style={{ 
        background: 'linear-gradient(180deg, #113574 0%, #4169E1 50%, #113574 100%)',
        overflow: 'visible'
      }}
      animate={{
        width: isCollapsed ? "80px" : "256px", // w-20 = 80px, w-64 = 256px
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {/* Botão Toggle - Topo */}
      <div className={cn(
        "flex-shrink-0 z-30 flex pt-2 pb-1.5 border-b border-blue-900/30",
        isCollapsed ? "justify-center" : "justify-end pr-3"
      )}>
        <motion.button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-blue-900/50 rounded-lg transition-colors text-white bg-blue-900/30 backdrop-blur-sm shadow-lg border border-blue-800/30"
          whileTap={{ scale: 0.95 }}
          aria-label={isCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
        >
          {isCollapsed ? (
            <Menu className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </motion.button>
      </div>

      {/* Navegação */}
      <div 
        className={cn(
          "flex-1 pt-1 pb-1 relative",
          isCollapsed ? "px-2" : "px-4"
        )}
        style={{ overflowY: 'auto', overflowX: 'visible' }}
      >
        <LojistaNav collapsed={isCollapsed} />
      </div>
    </motion.aside>
  );
}

