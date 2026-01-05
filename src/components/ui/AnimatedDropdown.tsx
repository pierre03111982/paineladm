"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AnimatedDropdownProps = {
  isOpen: boolean;
  children: ReactNode;
  className?: string;
  align?: "left" | "right";
};

export function AnimatedDropdown({
  isOpen,
  children,
  className,
  align = "left",
}: AnimatedDropdownProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "absolute z-50 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden",
            align === "right" ? "right-0" : "left-0",
            className
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}





















