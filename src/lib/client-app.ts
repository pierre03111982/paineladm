export function buildClientAppUrl(path: string = ""): string {
  const isDev = process.env.NODE_ENV === "development";
  let baseUrl: string;
  
  // Prioridade 1: Variável de ambiente explícita
  if (process.env.NEXT_PUBLIC_CLIENT_APP_URL) {
    baseUrl = process.env.NEXT_PUBLIC_CLIENT_APP_URL.replace(/\/$/, "");
  } 
  // Prioridade 2: Subdomínio em produção
  else if (!isDev && process.env.NEXT_PUBLIC_APP_SUBDOMAIN) {
    const subdomain = process.env.NEXT_PUBLIC_APP_SUBDOMAIN;
    const protocol = process.env.NEXT_PUBLIC_APP_PROTOCOL || "https";
    baseUrl = `${protocol}://${subdomain}`;
  }
  // Prioridade 3: Subdomínio padrão em produção
  else if (!isDev) {
    baseUrl = "https://app.experimenteai.com.br";
  }
  // Desenvolvimento: usar porta local (modelo-2 usa porta 3005)
  else {
    const port = process.env.NEXT_PUBLIC_APPMELHORADO_PORT || process.env.NEXT_PUBLIC_MODELO2_PORT || "3005";
    baseUrl = `http://localhost:${port}`;
  }
  
  if (!path) {
    return baseUrl;
  }
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildClientAppShareUrl(lojistaId?: string | null): string {
  const base = buildClientAppUrl();
  if (!lojistaId) {
    return `${base}/lojista-demo`;
  }
  
  // Se base é relativa, construir URL relativa
  if (base.startsWith("/")) {
    return `${base}/${lojistaId}`;
  }
  
  // Se base é absoluta, usar URL completa
  try {
    const url = new URL(base);
    url.pathname = `/${lojistaId}`;
    return url.toString();
  } catch {
    return `${base}/${lojistaId}`;
  }
}

export function buildClientAppDisplayUrl(
  lojistaId?: string | null,
  targetDisplayId?: string | null
): string {
  // Verificar se está em desenvolvimento (client-side e server-side)
  const isDev = 
    process.env.NODE_ENV === "development" ||
    (typeof window !== "undefined" && window.location.hostname === "localhost");
  
  let baseUrl: string;

  // Fase 11: Usar domínio de display dedicado
  // SEMPRE usar display.experimenteai.com.br em produção, mesmo sem variável de ambiente
  const displayDomain = process.env.NEXT_PUBLIC_DISPLAY_DOMAIN || "display.experimenteai.com.br";
  
  // Em desenvolvimento, usar localhost com porta do modelo-2
  if (isDev) {
    const port = process.env.NEXT_PUBLIC_MODELO2_PORT || "3005";
    baseUrl = `http://localhost:${port}`;
  } else {
    // Em produção, SEMPRE usar subdomínio de display
    // Se não tiver variável, usar o padrão
    const protocol = process.env.NEXT_PUBLIC_DISPLAY_PROTOCOL || "https";
    baseUrl = `${protocol}://${displayDomain}`;
  }

  // Construir path
  if (!lojistaId) {
    const url = `${baseUrl}/experimentar`;
    return targetDisplayId ? `${url}?target_display=${targetDisplayId}` : url;
  }

  // Construir URL completa: https://display.experimenteai.com.br/[lojistaId]/experimentar
  try {
    const url = new URL(baseUrl);
    url.pathname = `/${lojistaId}/experimentar`;
    
    // Fase 10: Adicionar target_display se fornecido
    if (targetDisplayId) {
      url.searchParams.set("target_display", targetDisplayId);
    }
    
    return url.toString();
  } catch (error) {
    console.error("[buildClientAppDisplayUrl] Error creating URL:", error);
    // Fallback simples
    const fallbackUrl = `${baseUrl}/${lojistaId}/experimentar`;
    return targetDisplayId ? `${fallbackUrl}?target_display=${targetDisplayId}` : fallbackUrl;
  }
}


