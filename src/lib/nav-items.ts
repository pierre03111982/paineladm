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
  ShoppingCart,
  Instagram,
  Plug,
  Smartphone,
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
    href: "/pedidos",
    label: "Pedidos",
    icon: ShoppingCart,
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
    icon: Smartphone,
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
    href: "/redes-sociais",
    label: "Redes Sociais",
    icon: Instagram,
  },
  {
    href: "/integracoes",
    label: "Integrações",
    icon: Plug,
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    icon: Settings,
  },
];



