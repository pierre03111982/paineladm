"use client";

import type { ReactNode } from "react";
import { AnimatedCard } from "@/components/ui/AnimatedCard";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <AnimatedCard className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-[var(--text-main)] font-heading">{title}</h1>
        {description && (
          <p className="text-sm font-medium text-[var(--text-secondary)] leading-relaxed">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </AnimatedCard>
  );
}


