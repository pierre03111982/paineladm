"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AnimatedButtonProps = Omit<HTMLMotionProps<"button">, "children"> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline";
  className?: string;
};

export function AnimatedButton({ 
  children, 
  variant = "primary",
  className,
  ...props 
}: AnimatedButtonProps) {
  const baseClasses = "px-4 py-2 rounded-lg font-medium transition-colors duration-200";
  
  const variantClasses = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white",
    secondary: "bg-slate-200 hover:bg-slate-300 text-slate-800",
    outline: "border-2 border-[#4169E1] hover:bg-[#4169E1] hover:text-white text-[#4169E1]"
  };

  return (
    <motion.button
      className={cn(baseClasses, variantClasses[variant], className)}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

