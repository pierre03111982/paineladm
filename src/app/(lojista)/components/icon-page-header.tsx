import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type IconPageHeaderProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  gradientFrom: string;
  gradientTo: string;
  shadowColor: string;
  actions?: ReactNode;
  noMargin?: boolean;
};

function IconPageHeader({
  icon: Icon,
  title,
  description,
  gradientFrom,
  gradientTo,
  shadowColor,
  actions,
  noMargin,
}: IconPageHeaderProps) {
  return (
    <div className="w-full">
      <div className={cn("neon-card rounded-2xl p-2 w-full", !noMargin && "mb-2")}>
        <div className="flex items-start gap-2 w-full">
          <div 
            className="rounded-xl p-2 shadow-lg text-white flex-shrink-0"
            style={{
              background: `linear-gradient(to bottom right, ${gradientFrom}, ${gradientTo})`,
              boxShadow: `0 4px 6px rgba(0, 0, 0, 0.1), 0 0 20px ${shadowColor}40, 0 0 40px ${shadowColor}20`,
            }}
          >
            <Icon className="h-7 w-7 icon-animate-once" style={{ color: '#FFFFFF', stroke: '#FFFFFF', fill: 'none' }} />
          </div>
          <div className="flex-1 flex items-center justify-between gap-2">
            <div className="flex-1">
              <h1 className="text-lg font-bold text-[var(--text-main)] mb-0.5 font-heading">{title}</h1>
              {description && (
                <p className="text-xs font-medium text-[var(--text-secondary)] leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export { IconPageHeader };
