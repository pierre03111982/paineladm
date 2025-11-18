import { headers } from "next/headers";
import { buildClientAppUrl } from "@/lib/client-app";
import { AdminSimulatorPanel } from "./admin-simulator-panel";

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

type AdminSimulatorPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AdminSimulatorPage({ searchParams }: AdminSimulatorPageProps) {
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

  // No admin, usar lojistaId da query string ou null
  const lojistaId = lojistaIdFromQuery || null;

  const simulatorUrl = resolveSimulatorUrl(lojistaId, panelBaseUrl);
  simulatorUrl.searchParams.set("simulator", "1");
  simulatorUrl.searchParams.set("backend", panelBaseUrl);
  
  console.log("[AdminSimulator] lojistaId usado:", lojistaId);
  console.log("[AdminSimulator] URL gerada:", simulatorUrl.toString());

  const simulatorUrlString = simulatorUrl.toString();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Simulador do App Cliente
        </h1>
        <p className="text-zinc-400">
          Teste o provador virtual de qualquer loja. Selecione uma loja abaixo para visualizar seus produtos.
        </p>
      </div>

      <AdminSimulatorPanel simulatorUrl={simulatorUrlString} initialLojistaId={lojistaId} />
    </div>
  );
}

