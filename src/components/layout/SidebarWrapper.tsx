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
      {/* Navegação */}
      <div 
        className={cn(
          "flex-1 pt-1 pb-1 relative",
          isCollapsed ? "px-2" : "px-4"
        )}
        style={{ overflowY: 'auto', overflowX: 'visible' }}
      >
        {/* Botão Toggle - Topo (acima do Dashboard) */}
        <div className="flex justify-center pt-3 pb-3">
          <motion.button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-3.5 hover:bg-blue-900/50 rounded-xl transition-colors text-white bg-blue-900/30 backdrop-blur-sm shadow-lg border border-blue-800/30 flex items-center justify-center"
            whileTap={{ scale: 0.95 }}
            aria-label={isCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
          >
            {isCollapsed ? (
              <Menu className="h-6 w-6" />
            ) : (
              <ChevronLeft className="h-6 w-6" />
            )}
          </motion.button>
        </div>

        <LojistaNav collapsed={isCollapsed} />
      </div>
    </motion.aside>
  );
}

