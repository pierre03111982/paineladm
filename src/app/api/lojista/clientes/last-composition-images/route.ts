/**
 * API Route: Últimas imagens de composição para todos os clientes
 * GET /api/lojista/clientes/last-composition-images
 * 
 * Retorna um mapa de clienteId -> imageUrl (mesma lógica do dashboard)
 * Processa todas as composições de uma vez, igual ao dashboard
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { fetchComposicoesRecentes } from "@/lib/firestore/server";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lojistaIdFromQuery = searchParams.get("lojistaId");
    
    const lojistaIdFromAuth = lojistaIdFromQuery ? null : await getCurrentLojistaId();
    const lojistaId = lojistaIdFromQuery || lojistaIdFromAuth;

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório" },
        { status: 400 }
      );
    }

    try {
      // MESMA LÓGICA DO DASHBOARD: buscar todas as composições recentes
      // Usa fetchComposicoesRecentes que já busca até 1000 composições
      const composicoes = await fetchComposicoesRecentes(lojistaId, 1000);

      // Criar um mapa de cliente -> última composição (com imagem)
      // IMPORTANTE: Mesma lógica de buildActiveCustomers no dashboard
      const lastCompositionByCustomer = new Map<string, { imageUrl: string | null; createdAt: Date }>();
      
      composicoes.forEach((comp) => {
        if (!comp.customer?.id) return;
        
        const customerId = comp.customer.id;
        const existing = lastCompositionByCustomer.get(customerId);
        
        // Buscar URL da imagem da composição (pode estar em vários campos)
        // IMPORTANTE: Mesma ordem de verificação do dashboard
        const imageUrl = 
          comp.imagemUrl || 
          (comp as any).imageUrl || 
          (comp as any).final_image_url ||
          (comp as any).looks?.[0]?.imagemUrl ||
          (comp as any).looks?.[0]?.imageUrl ||
          (comp as any).generation?.imagemUrl ||
          null;
        
        // Se não tem imagem, pular
        if (!imageUrl) {
          return;
        }
        
        // Se não existe ou esta é mais recente, atualizar
        if (!existing || comp.createdAt.getTime() > existing.createdAt.getTime()) {
          lastCompositionByCustomer.set(customerId, {
            imageUrl,
            createdAt: comp.createdAt,
          });
        }
      });

      // Converter Map para objeto simples
      const imagesMap: Record<string, string | null> = {};
      lastCompositionByCustomer.forEach((value, key) => {
        imagesMap[key] = value.imageUrl;
      });

      return NextResponse.json({ 
        images: imagesMap 
      });

    } catch (error: any) {
      console.error(`[LastCompositionImages] Erro ao buscar composições:`, error);
      return NextResponse.json({ 
        images: {},
        error: error?.message 
      });
    }

  } catch (error) {
    console.error("[LastCompositionImages] Erro geral:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro desconhecido",
        images: {},
      },
      { status: 500 }
    );
  }
}

