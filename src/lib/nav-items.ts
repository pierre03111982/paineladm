import {
  LayoutDashboard,
  Package,
  Users,
  Image,
  Settings,
  Monitor,
  Share2,
  QrCode,
  Radar,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/produtos",
    label: "Produtos",
    icon: Package,
  },
  {
    href: "/clientes",
    label: "Clientes",
    icon: Users,
  },
  {
    href: "/crm",
    label: "Radar de Oportunidades",
    icon: Radar,
  },
  {
    href: "/composicoes",
    label: "Composições",
    icon: Image,
  },
  {
    href: "/simulador",
    label: "Simulador",
    icon: Monitor,
  },
  {
    href: "/display",
    label: "Display",
    icon: Monitor,
  },
  {
    href: "/app-cliente",
    label: "Aplicativo Cliente",
    icon: QrCode,
  },
  {
    href: "/compartilhamento",
    label: "Compartilhar",
    icon: Share2,
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    icon: Settings,
  },
];



