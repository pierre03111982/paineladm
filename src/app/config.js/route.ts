import { NextRequest, NextResponse } from "next/server";
import { fetchLojaPerfil } from "@/lib/firestore/server";

function resolveLojistaId(request: NextRequest): string | null {
  const param = request.nextUrl.searchParams.get("lojista");
  if (param && param.trim().length > 0) {
    return param.trim();
  }
  return (
    process.env.NEXT_PUBLIC_LOJISTA_ID ||
    process.env.LOJISTA_ID ||
    null
  );
}

function getFirebasePublicConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? null,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? null,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? null,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? null,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? null,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? null,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? null,
  };
}

export async function GET(request: NextRequest) {
  const lojistaId = resolveLojistaId(request);
  const requestOrigin = request.nextUrl.origin;

  let perfil:
    | Awaited<ReturnType<typeof fetchLojaPerfil>>
    | null = null;
  let fetchError: string | null = null;

  if (lojistaId) {
    try {
      perfil = await fetchLojaPerfil(lojistaId);
    } catch (error) {
      console.error("[config.js] erro ao buscar perfil do lojista:", error);
      fetchError = error instanceof Error ? error.message : "Erro inesperado ao carregar perfil.";
    }
  } else {
    fetchError = "Nenhum lojista definido. Configure NEXT_PUBLIC_LOJISTA_ID.";
  }

  const config = {
    lojistaId,
    lojaNome: perfil?.nome ?? null,
    logoUrl: perfil?.logoUrl ?? null,
    backendBaseUrl: requestOrigin,
    firebase: getFirebasePublicConfig(),
    sales: {
      channel: (perfil as any)?.salesConfig?.channel ?? "whatsapp",
      whatsapp:
        (perfil as any)?.salesConfig?.salesWhatsapp ??
        (perfil as any)?.whatsapp ??
        null,
      checkoutLink:
        (perfil as any)?.salesConfig?.checkoutLink ??
        (perfil as any)?.checkoutLink ??
        null,
      buyMessageTemplate: (perfil as any)?.messageTemplate ?? null,
      receiveImagesTemplate: null,
    },
    social: {
      instagram: perfil?.instagram ?? null,
      facebook: perfil?.facebook ?? null,
      tiktok: perfil?.tiktok ?? null,
      site: (perfil as any)?.checkoutLink ?? null,
    },
    kiosk: {
      email: null,
      password: null,
    },
    diagnostic: {
      fetchedAt: new Date().toISOString(),
      error: fetchError,
    },
  };

  const script = `
    (function(){
      try {
        window.__EXPERIMENTEAI__ = ${JSON.stringify(config)};
        if (typeof window.dispatchEvent === "function") {
          window.dispatchEvent(new CustomEvent("experimenteai:config", { detail: window.__EXPERIMENTEAI__ }));
        }
      } catch (error) {
        console.error("[config.js] Falha ao atribuir configuração pública:", error);
      }
    })();
  `;

  const headers = new Headers();
  const originHeader = request.headers.get("origin") ?? "*";
  headers.set("Content-Type", "application/javascript; charset=utf-8");
  headers.set("Cache-Control", "no-store, max-age=0");
  headers.set("Access-Control-Allow-Origin", originHeader);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    request.headers.get("access-control-request-headers") ?? "*"
  );
  headers.set("Vary", "Origin");

  return new NextResponse(script, {
    status: 200,
    headers,
  });
}

export function OPTIONS(request: NextRequest) {
  const headers = new Headers();
  const originHeader = request.headers.get("origin") ?? "*";
  headers.set("Access-Control-Allow-Origin", originHeader);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    request.headers.get("access-control-request-headers") ?? "*"
  );
  headers.set("Vary", "Origin");

  return new NextResponse(null, {
    status: 204,
    headers,
  });
}




