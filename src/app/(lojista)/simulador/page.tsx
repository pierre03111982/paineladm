import { headers } from "next/headers";
import { IconPageHeader } from "../components/icon-page-header";
import { getPageHeaderColors } from "../components/page-header-colors";
import { buildClientAppUrl } from "@/lib/client-app";
import { SimulatorPanel } from "./simulator-panel";
import { Monitor } from "lucide-react";

function resolveSimulatorUrl(
  lojistaId: string | null,
  panelBaseUrl: string
): URL {
  try {
    const isDev = process.env.NODE_ENV === "development";
    let appmelhoradoUrl: string;
    
    // Prioridade 1: Variável de ambiente explícita
    if (process.env.NEXT_PUBLIC_CLIENT_APP_URL) {
      appmelhoradoUrl = process.env.NEXT_PUBLIC_CLIENT_APP_URL;
    } 
    // Prioridade 2: Subdomínio em produção
    else if (!isDev && process.env.NEXT_PUBLIC_APP_SUBDOMAIN) {
      const subdomain = process.env.NEXT_PUBLIC_APP_SUBDOMAIN;
      const protocol = process.env.NEXT_PUBLIC_APP_PROTOCOL || "https";
      appmelhoradoUrl = `${protocol}://${subdomain}`;
    }
    // Prioridade 3: Subdomínio padrão em produção
    else if (!isDev) {
      appmelhoradoUrl = "https://app.experimenteai.com.br";
    }
    // Desenvolvimento: usar porta local
    else {
      const port = process.env.NEXT_PUBLIC_APPMELHORADO_PORT || "3001";
      appmelhoradoUrl = `http://localhost:${port}`;
    }
    
    // Construir URL completa
    const targetUrl = new URL(appmelhoradoUrl);
    
    // Adicionar lojistaId no path
    if (lojistaId) {
      targetUrl.pathname = targetUrl.pathname.replace(/\/$/, "") + `/${lojistaId}`;
    } else {
      targetUrl.pathname = targetUrl.pathname.replace(/\/$/, "") + `/lojista-demo`;
    }
    
    return targetUrl;
  } catch (error) {
    console.error("[resolveSimulatorUrl] Error:", error);
    // Fallback final
    const isDev = process.env.NODE_ENV === "development";
    const port = process.env.NEXT_PUBLIC_APPMELHORADO_PORT || "3001";
    const fallbackUrl = isDev
      ? `http://localhost:${port}/${lojistaId || "lojista-demo"}`
      : `https://app.experimenteai.com.br/${lojistaId || "lojista-demo"}`;
    return new URL(fallbackUrl);
  }
}

export const dynamic = 'force-dynamic';

type SimulatorPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function SimulatorPage({ searchParams }: SimulatorPageProps) {
  const params = await searchParams;
  const lojistaIdFromQuery = params.lojistaId as string | undefined;
  
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ??
    headerList.get("host") ??
    "localhost:3000";
  const protocol =
    headerList.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const panelBaseUrl = `${protocol}://${host}`;

  // Prioridade: query string (modo admin) > usuário logado > env var
  const { getCurrentLojistaId } = await import("@/lib/auth/lojista-auth");
  const lojistaIdFromAuth = lojistaIdFromQuery ? null : await getCurrentLojistaId();
  const lojistaId =
    lojistaIdFromQuery ||
    lojistaIdFromAuth ||
    process.env.NEXT_PUBLIC_LOJISTA_ID ||
    process.env.LOJISTA_ID ||
    null;

  const simulatorUrl = resolveSimulatorUrl(lojistaId, panelBaseUrl);
  simulatorUrl.searchParams.set("simulator", "1");
  simulatorUrl.searchParams.set("backend", panelBaseUrl);
  
  console.log("[Simulator] lojistaId usado:", lojistaId);
  console.log("[Simulator] URL gerada:", simulatorUrl.toString());
  console.log("[Simulator] URL completa:", simulatorUrl.href);

  const simulatorUrlString = simulatorUrl.toString();
  const colors = getPageHeaderColors('/simulador');

  return (
    <div className="space-y-6">
      <IconPageHeader
        icon={Monitor}
        title="Simulador do App Cliente"
        description="Acesse sua vitrine virtual e teste a experiência completa do provador virtual. Disponível para desktop e mobile."
        gradientFrom={colors.from}
        gradientTo={colors.to}
        shadowColor={colors.shadow}
      />

      <SimulatorPanel simulatorUrl={simulatorUrlString} initialLojistaId={lojistaId} />
    </div>
  );
}


