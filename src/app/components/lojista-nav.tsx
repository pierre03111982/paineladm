 "use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav-items";

type LojistaNavProps = {
  collapsed?: boolean;
};

export function LojistaNav({ collapsed }: LojistaNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Tentar ler tanto lojistaId quanto lojistald (para compatibilidade com typos)
  const lojistaId = searchParams?.get("lojistaId") || searchParams?.get("lojistald");

  return (
    <nav className="flex flex-1 flex-col gap-1 text-xs md:text-sm font-medium text-zinc-400 md:text-[13px]">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        // Preservar lojistaId na URL se estiver presente
        const href = lojistaId 
          ? `${item.href}?lojistaId=${lojistaId}`
          : item.href;

        return (
          <Link
            key={item.href}
            href={href}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
              active
                ? "bg-indigo-50 text-indigo-600"
                : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className={cn("truncate", collapsed && "md:hidden")}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}







