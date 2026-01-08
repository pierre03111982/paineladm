"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type AnimatedModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
};

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-full mx-4",
};

export function AnimatedModal({
  isOpen,
  onClose,
  children,
  title,
  className,
  size = "md",
}: AnimatedModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "bg-white rounded-2xl shadow-2xl w-full",
                sizeClasses[size],
                className
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              {title && (
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
                  <motion.button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    whileTap={{ scale: 0.95 }}
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </motion.button>
                </div>
              )}
              
              {/* Content */}
              <div className={cn("p-6", !title && "pt-6")}>
                {children}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}























