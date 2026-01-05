/**
 * API Route: Última composição com imagem do cliente
 * GET /api/lojista/clientes/[clienteId]/last-composition-image
 * 
 * Retorna a URL da imagem da última composição do cliente (mesma lógica do dashboard)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { fetchComposicoesRecentes } from "@/lib/firestore/server";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clienteId: string }> }
) {
  try {
    const { clienteId } = await params;
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

    if (!clienteId) {
      return NextResponse.json(
        { error: "clienteId é obrigatório" },
        { status: 400 }
      );
    }

    // Usar a mesma função que o dashboard usa para buscar composições
    console.log("[API/Clientes/LastCompositionImage] Buscando composições para cliente:", clienteId, "lojista:", lojistaId);
    
    try {
      // Buscar composições recentes (mesma função do dashboard)
      const composicoes = await fetchComposicoesRecentes(lojistaId, 1000);
      console.log("[API/Clientes/LastCompositionImage] Total de composições encontradas:", composicoes.length);

      // Filtrar composições do cliente específico
      const composicoesDoCliente = composicoes.filter(
        (comp) => comp.customer?.id === clienteId
      );
      console.log("[API/Clientes/LastCompositionImage] Composições do cliente:", composicoesDoCliente.length);

      if (composicoesDoCliente.length === 0) {
        console.log("[API/Clientes/LastCompositionImage] Nenhuma composição encontrada para o cliente");
        return NextResponse.json({ imageUrl: null });
      }

      // Processar composições: encontrar a mais recente com imagem (mesma lógica do dashboard)
      type CompositionWithImage = { imageUrl: string; createdAt: Date };
      let lastCompositionWithImage: CompositionWithImage | null = null;

      composicoesDoCliente.forEach((comp) => {
        // Buscar URL da imagem da composição (pode estar em vários campos) - MESMA LÓGICA DO DASHBOARD
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

        // Usar createdAt da composição
        const createdAt = comp.createdAt instanceof Date ? comp.createdAt : new Date();

        // Se não existe ou esta é mais recente, atualizar
        if (!lastCompositionWithImage || createdAt.getTime() > lastCompositionWithImage.createdAt.getTime()) {
          lastCompositionWithImage = {
            imageUrl: imageUrl as string,
            createdAt,
          };
          console.log("[API/Clientes/LastCompositionImage] ✅ Imagem encontrada:", imageUrl.substring(0, 100));
        }
      });

      const finalImageUrl: string | null = lastCompositionWithImage ? lastCompositionWithImage.imageUrl : null;
      console.log("[API/Clientes/LastCompositionImage] Resultado final:", finalImageUrl ? "✅ Tem imagem" : "❌ Sem imagem");

      return NextResponse.json({ 
        imageUrl: finalImageUrl 
      });

    } catch (error: any) {
      console.error("[API/Clientes/LastCompositionImage] Erro ao buscar composições:", error);
      return NextResponse.json({ 
        imageUrl: null,
        error: error?.message 
      });
    }

  } catch (error) {
    console.error("[API/Clientes/LastCompositionImage] Erro:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro desconhecido",
        imageUrl: null,
      },
      { status: 500 }
    );
  }
}

