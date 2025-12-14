"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type StaggeredItemProps = {
  children: ReactNode;
  /**
   * Variante de velocidade: 'fast' | 'normal' | 'slow'
   * @default 'normal'
   */
  variant?: "fast" | "normal" | "slow";
  /**
   * Classe CSS adicional
   */
  className?: string;
};

export function StaggeredItem({
  children,
  variant = "normal",
  className,
}: StaggeredItemProps) {
  const baseClass =
    variant === "fast"
      ? "stagger-item-fast"
      : variant === "slow"
      ? "stagger-item-slow"
      : "stagger-item";

  return (
    <div className={cn(baseClass, className)}>
      {children}
    </div>
  );
}




