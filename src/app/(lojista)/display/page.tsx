import { headers } from "next/headers";
import { PageHeader } from "../components/page-header";
import { DisplayLinkPanel } from "./display-link-panel";
import { DisplayPageClient } from "./display-page-client";
import { buildClientAppDisplayUrl } from "@/lib/client-app";

function resolveDisplayUrl(
  lojistaId: string | null,
  panelBaseUrl: string
): URL {
  try {
    // Usar buildClientAppDisplayUrl que já retorna a URL completa correta
    const clientAppUrl = buildClientAppDisplayUrl(lojistaId);
    
    // A função já retorna URL absoluta com o path correto: https://display.experimenteai.com.br/[lojistaId]/experimentar
    const target = new URL(clientAppUrl);

    // Adicionar parâmetros adicionais se necessário
    // O middleware já adiciona display=1, mas vamos garantir
    if (!target.searchParams.has("display")) {
      target.searchParams.set("display", "1");
    }
    
    // Adicionar backend para comunicação com API
    target.searchParams.set("backend", panelBaseUrl);

    return target;
  } catch (error) {
    console.error("[resolveDisplayUrl] Error:", error);
    // Fallback final - usar domínio de display
    const isDev = process.env.NODE_ENV === "development";
    const displayDomain = process.env.NEXT_PUBLIC_DISPLAY_DOMAIN || "display.experimenteai.com.br";
    const fallbackBase = isDev 
      ? `http://localhost:${process.env.NEXT_PUBLIC_MODELO_2_PORT || "3005"}`
      : `https://${displayDomain}`;
    const fallbackPath = lojistaId ? `/${lojistaId}/experimentar` : "/experimentar";
    const fallbackUrl = new URL(fallbackPath, fallbackBase);
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

      <DisplayPageClient lojistaId={lojistaId} displayUrl={displayUrl.toString()} />
    </div>
  );
}
