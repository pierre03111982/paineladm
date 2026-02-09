"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav-items";

const FOOTER_HREFS = ["/configuracoes"];
const MAIN_ITEMS = NAV_ITEMS.filter((i) => !FOOTER_HREFS.includes(i.href));
const FOOTER_ITEMS = NAV_ITEMS.filter((i) => FOOTER_HREFS.includes(i.href));

type LojistaNavProps = {
  collapsed?: boolean;
  iconOnly?: boolean;
};

function NavItemContent({
  item,
  href,
  active,
  iconOnly,
  collapsed,
}: {
  item: (typeof NAV_ITEMS)[0];
  href: string;
  active: boolean;
  iconOnly: boolean;
  collapsed?: boolean;
}) {
  const Icon = item.icon;
  const [showTooltip, setShowTooltip] = useState(false);

  if (iconOnly) {
    return (
      <Link
        href={href}
        className={cn(
          "relative flex items-center justify-center w-12 h-12 rounded-xl transition-colors",
          active
            ? "bg-white/20 text-white"
            : "text-blue-200 hover:bg-white/10 hover:text-white"
        )}
        title={item.label}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={item.label}
      >
        {active && (
          <motion.span
            layoutId="icon-sidebar-active"
            className="absolute inset-0 rounded-xl bg-white/20"
            initial={false}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            aria-hidden
          />
        )}
        <Icon className="relative z-10 h-6 w-6 shrink-0" />
        {/* Tooltip à direita do ícone */}
        {showTooltip && (
          <span
            className="absolute left-full ml-3 z-50 px-2.5 py-1.5 rounded-md bg-slate-800 text-white text-xs font-medium whitespace-nowrap shadow-lg pointer-events-none"
            role="tooltip"
          >
            {item.label}
          </span>
        )}
      </Link>
    );
  }

  const isCollapsed = collapsed ?? false;
  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center text-sm font-medium transition-all duration-300 w-full",
        isCollapsed ? "justify-center px-0 py-1.5" : "gap-2.5 px-3 py-1.5",
        active
          ? isCollapsed
            ? "text-white font-bold"
            : "text-[#113574] font-bold"
          : "text-blue-200 hover:text-white hover:translate-x-1"
      )}
      style={{ zIndex: 30, position: "relative" }}
    >
      <div
        className={cn(
          "flex items-center justify-start shrink-0 relative",
          isCollapsed ? "w-10 h-5 justify-center" : "w-5 h-5"
        )}
      >
        <Icon
          className={cn(
            "transition-colors relative z-10 h-5 w-5",
            active ? (isCollapsed ? "text-white" : "text-[#113574]") : "text-blue-200"
          )}
        />
      </div>
      {!isCollapsed ? (
        <span className="truncate flex-1 relative z-10">{item.label}</span>
      ) : (
        <span className="hidden" aria-hidden="true">
          {item.label}
        </span>
      )}
    </Link>
  );
}

export default function LojistaNav({ collapsed = false, iconOnly = false }: LojistaNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lojistaId = searchParams?.get("lojistaId") || searchParams?.get("lojistald");

  const renderItem = (item: (typeof NAV_ITEMS)[0], index?: number, totalItems?: number) => {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    const href = lojistaId ? `${item.href}?lojistaId=${lojistaId}` : item.href;
    const isLastItem = index !== undefined && totalItems !== undefined && index === totalItems - 1;

    if (iconOnly) {
      return (
        <div key={item.href} className="mb-1">
          <NavItemContent item={item} href={href} active={active} iconOnly />
        </div>
      );
    }

    return (
      <div
        key={item.href}
        className="relative"
        style={{ position: "relative", width: "100%" }}
      >
        {active && !collapsed && (
          <motion.div
            layoutId="active-nav-background"
            className="absolute"
            style={{
              top: "0",
              bottom: "0",
              left: "-16px",
              right: "-16px",
              width: "calc(100% + 32px)",
              borderRadius: "0",
              zIndex: 1,
              pointerEvents: "none",
              backgroundColor: "#ffffff",
              boxShadow: "inset -10px 0 20px -6px rgba(0, 0, 0, 0.7)",
            }}
            initial={false}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        <NavItemContent
          item={item}
          href={href}
          active={active}
          iconOnly={false}
          collapsed={collapsed}
        />
      </div>
    );
  };

  if (iconOnly) {
    return (
      <nav className="flex flex-1 flex-col items-center w-full" style={{ position: "relative" }}>
        {/* Menu principal — ícones com espaçamento generoso */}
        <div className="flex flex-col items-center gap-0">
          {MAIN_ITEMS.map((item, index) => renderItem(item, index, MAIN_ITEMS.length))}
        </div>
        {/* Espaço flex para empurrar o menu inferior para a base */}
        <div className="flex-1 min-h-[24px]" aria-hidden />
        {/* Menu inferior — configurações fixo na base */}
        <div className="flex flex-col items-center gap-0 pt-4 border-t border-blue-800/50 w-full">
          {FOOTER_ITEMS.map((item, index) => renderItem(item, index, FOOTER_ITEMS.length))}
        </div>
      </nav>
    );
  }

  return (
    <nav
      className={cn(
        "flex flex-col gap-0 relative",
        collapsed ? "px-0 mt-0" : "px-0 mt-0"
      )}
      style={{ position: "relative" }}
    >
      {NAV_ITEMS.map((item, index) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const href = lojistaId ? `${item.href}?lojistaId=${lojistaId}` : item.href;
        const isLastItem = index === NAV_ITEMS.length - 1;
        
        return (
          <React.Fragment key={item.href}>
            <div
              className="relative"
              style={{ position: "relative", width: "100%" }}
            >
              {active && !collapsed && (
                <motion.div
                  layoutId="active-nav-background"
                  className="absolute"
                  style={{
                    top: "0",
                    bottom: "0",
                    left: "-16px",
                    right: "-16px",
                    width: "calc(100% + 32px)",
                    borderRadius: "0",
                    zIndex: 1,
                    pointerEvents: "none",
                    backgroundColor: "#ffffff",
                    boxShadow: "inset -10px 0 20px -6px rgba(0, 0, 0, 0.7)",
                  }}
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <NavItemContent item={item} href={href} active={active} iconOnly={false} collapsed={collapsed} />
            </div>
            {!collapsed && !isLastItem && (
              <div 
                className="h-px w-full bg-gradient-to-r from-transparent via-white/50 to-transparent"
                style={{
                  zIndex: 30,
                  position: 'relative'
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
