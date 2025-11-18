/**
 * API Route: Listar composições
 * GET /api/lojista/composicoes
 * 
 * Lista composições do lojista com filtros opcionais
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

const db = getAdminDb();

function applyCors(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get("origin") ?? "*";
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set(
    "Access-Control-Allow-Headers",
    request.headers.get("access-control-request-headers") ?? "Content-Type, Authorization"
  );
  response.headers.set(
    "Access-Control-Allow-Methods",
    request.headers.get("access-control-request-method") ?? "GET, OPTIONS"
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  return response;
}

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  return applyCors(request, response);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lojistaId = searchParams.get("lojistaId") || process.env.NEXT_PUBLIC_LOJISTA_ID || process.env.LOJISTA_ID || "";

    if (!lojistaId) {
      return applyCors(
        request,
        NextResponse.json({ error: "lojistaId é obrigatório" }, { status: 400 })
      );
    }

    // Parâmetros de filtro
    const periodo = searchParams.get("periodo") || "7d";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const cliente = searchParams.get("cliente");
    const produto = searchParams.get("produto");
    const liked = searchParams.get("liked") === "true";
    const shared = searchParams.get("shared") === "true";
    const anonymous = searchParams.get("anonymous") === "true";

    // Calcular data limite baseado no período
    const daysMap: Record<string, number> = {
      "1d": 1,
      "7d": 7,
      "30d": 30,
      "90d": 90,
      "all": 3650, // ~10 anos
    };
    const days = daysMap[periodo] || 7;
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    const composicoesRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("composicoes");

    // Buscar composições
    let snapshot;
    try {
      const query = composicoesRef
        .where("createdAt", ">=", dateLimit)
        .orderBy("createdAt", "desc")
        .limit(limit);
      snapshot = await query.get();
    } catch (error: any) {
      // Se falhar por falta de índice, buscar todas e ordenar em memória
      if (error?.code === "failed-precondition") {
        console.warn("[API Composicoes] Índice não encontrado, buscando todas e ordenando em memória");
        const allSnapshot = await composicoesRef.get();
        const allDocs: any[] = [];
        allSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data?.createdAt) {
            const createdAt = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            if (createdAt >= dateLimit) {
              allDocs.push({ id: doc.id, data, createdAt });
            }
          }
        });
        allDocs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        snapshot = {
          forEach: (callback: any) => {
            allDocs.slice(0, limit).forEach((item) => {
              callback({
                id: item.id,
                data: () => item.data,
                exists: true,
              });
            });
          },
        } as any;
      } else {
        throw error;
      }
    }

    const composicoes: any[] = [];

    snapshot.forEach((doc: any) => {
      const data = typeof doc.data === "function" ? doc.data() : doc.data;
      if (!data) return;

      // Aplicar filtros
      if (cliente && cliente !== "all") {
        const customerId = data.customerId || "";
        if (customerId !== cliente) return;
      }

      if (produto && produto !== "all") {
        const primaryProductId = data.primaryProductId || "";
        if (primaryProductId !== produto) return;
      }

      if (liked && !data.curtido) return;

      if (shared && !data.compartilhado) return;

      if (anonymous && data.customerId) return;

      // Pegar o primeiro look (Look Natural) como preview
      const firstLook = data.looks && data.looks.length > 0 ? data.looks[0] : null;
      const previewUrl = firstLook?.imagemUrl || null;

      composicoes.push({
        id: doc.id,
        previewUrl,
        productName: data.primaryProductName || firstLook?.produtoNome || "Produto",
        productId: data.primaryProductId || "",
        customerId: data.customerId || null,
        customerName: data.customerName || "Cliente Anônimo",
        customerWhatsapp: data.customerWhatsapp || null,
        createdAtISO: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        liked: data.curtido || false,
        shared: data.compartilhado || false,
        shares: data.shares || 0,
        isAnonymous: !data.customerId,
        images: data.looks?.map((look: any) => ({
          url: look.imagemUrl,
          storagePath: null,
        })) || [],
      });
    });

    return applyCors(
      request,
      NextResponse.json({
        success: true,
        composicoes,
        total: composicoes.length,
      })
    );
  } catch (error) {
    console.error("[API Composicoes] Erro:", error);
    return applyCors(
      request,
      NextResponse.json(
        {
          error: "Erro ao buscar composições",
          details: error instanceof Error ? error.message : "Erro desconhecido",
        },
        { status: 500 }
      )
    );
  }
}



























































































