import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type IconPageHeaderProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  gradientFrom: string;
  gradientTo: string;
  shadowColor: string;
  actions?: ReactNode;
};

export function IconPageHeader({
  icon: Icon,
  title,
  description,
  gradientFrom,
  gradientTo,
  shadowColor,
  actions,
}: IconPageHeaderProps) {
  return (
    <div className="neon-card rounded-2xl p-3 mb-3 w-full">
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
            <h1 className="text-lg font-bold text-[var(--text-main)] mb-1 font-heading">{title}</h1>
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
  );
}

