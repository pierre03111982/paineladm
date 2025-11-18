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
            className="inline-flex items-center gap-2 rounded-full border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-indigo-400 hover:text-indigo-200"
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

