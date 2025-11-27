"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav-items";

export function MobileNavLinks() {
  const searchParams = useSearchParams();
  // Tentar ler tanto lojistaId quanto lojistald (para compatibilidade com typos)
  const lojistaId = searchParams?.get("lojistaId") || searchParams?.get("lojistald");

  return (
    <>
      {NAV_ITEMS.map((item) => {
        // Preservar lojistaId na URL se estiver presente
        const href = lojistaId 
          ? `${item.href}?lojistaId=${lojistaId}`
          : item.href;

        return (
          <Link
            key={item.href}
            href={href}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 whitespace-nowrap shadow-sm"
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}

