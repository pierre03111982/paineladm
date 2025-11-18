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
  // Desenvolvimento: usar porta local
  else {
    const port = process.env.NEXT_PUBLIC_APPMELHORADO_PORT || "3001";
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

export function buildClientAppDisplayUrl(lojistaId?: string | null): string {
  const base = buildClientAppUrl("/display");
  
  // Se base é relativa, retornar como está (parâmetros serão adicionados depois)
  if (base.startsWith("/")) {
    return base;
  }
  
  // Se base é absoluta, adicionar parâmetros
  try {
    const url = new URL(base);
    if (lojistaId) {
      url.searchParams.set("lojista", lojistaId);
    }
    return url.toString();
  } catch (error) {
    console.error("[buildClientAppDisplayUrl] Error creating URL:", error);
    return "/appmelhorado/display";
  }
}


