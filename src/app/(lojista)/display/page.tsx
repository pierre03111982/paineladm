import { headers } from "next/headers";
import { PageHeader } from "../components/page-header";
import { SimulatorFrame } from "../simulador/simulator-frame";
import { DisplayLinkPanel } from "./display-link-panel";
import { buildClientAppDisplayUrl } from "@/lib/client-app";

function resolveDisplayUrl(
  lojistaId: string | null,
  panelBaseUrl: string
): URL {
  try {
    // Usar a mesma função do DisplayLinkPanel para garantir URL idêntica ao QR code
    const clientAppUrl = buildClientAppDisplayUrl(lojistaId);
    const panelUrl = new URL(panelBaseUrl);
    
    // Construir URL completa
    let target: URL;
    if (clientAppUrl.startsWith("http")) {
      // URL absoluta
      target = new URL(clientAppUrl);
    } else {
      // URL relativa, usar a mesma origem do painel
      target = new URL(clientAppUrl, panelBaseUrl);
    }

    // Adicionar parâmetros do display (mesmos do QR code)
    if (lojistaId) {
      target.searchParams.set("lojista", lojistaId);
    }
    target.searchParams.set("display", "1");
    target.searchParams.set("backend", panelBaseUrl);

    return target;
  } catch (error) {
    console.error("[resolveDisplayUrl] Error:", error);
    // Fallback final - usar subdomínio padrão
    const isDev = process.env.NODE_ENV === "development";
    const fallbackBase = isDev 
      ? `http://localhost:${process.env.NEXT_PUBLIC_APPMELHORADO_PORT || "3001"}`
      : "https://app.experimenteai.com.br";
    const fallbackUrl = new URL("/display", fallbackBase);
    if (lojistaId) {
      fallbackUrl.searchParams.set("lojista", lojistaId);
    }
    fallbackUrl.searchParams.set("display", "1");
    fallbackUrl.searchParams.set("backend", panelBaseUrl);
    return fallbackUrl;
  }
}

type DisplayPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function DisplayPage({ searchParams }: DisplayPageProps) {
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

  const displayUrl = resolveDisplayUrl(lojistaId, panelBaseUrl);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Display da Loja"
        description="Projete o provador virtual em monitores e tablets na loja física. O display acompanha as últimas composições e destaca as chamadas para compra."
      />

      <DisplayLinkPanel lojistaId={lojistaId} panelBaseUrl={panelBaseUrl} />

      <SimulatorFrame src={displayUrl.toString()} />
    </div>
  );
}
