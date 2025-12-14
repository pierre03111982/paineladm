"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AnimatedCardProps = {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
};

export function AnimatedCard({ children, className, onClick, style }: AnimatedCardProps) {
  return (
    <motion.div
      className={cn(
        "bg-white shadow-sm rounded-2xl animated-card-border",
        className
      )}
      style={{
        border: '1px solid oklch(67.3% 0.182 276.935)',
        ...style
      }}
      whileHover={{ y: -2, boxShadow: "0 10px 25px -5px rgba(65, 105, 225, 0.2)" }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}



