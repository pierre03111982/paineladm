/**
 * API Route: Última imagem com LIKE do cliente (ou última composição se não houver like)
 * GET /api/lojista/clientes/[clienteId]/last-liked-image
 * 
 * Busca a última composição do cliente, priorizando as que têm LIKE
 * Se não houver nenhuma com like, retorna a última composição com imagem
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";

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

    const db = getAdminDb();
    const lojaRef = db.collection("lojas").doc(lojistaId);
    const composicoesRef = lojaRef.collection("composicoes");

    console.log(`[LastLikedImage] 🔍 Buscando imagem para cliente ${clienteId} na loja ${lojistaId}`);

    try {
      // Estratégia: Buscar TODAS as composições do cliente (sem filtrar por liked)
      // Depois priorizar as que têm liked === true, mas aceitar qualquer uma com imagem
      let composicoesSnapshot;
      
      try {
        // Tentar buscar ordenadas por data
        composicoesSnapshot = await composicoesRef
          .where("customer.id", "==", clienteId)
          .orderBy("createdAt", "desc")
          .limit(100) // Buscar mais para garantir que encontramos uma com imagem
          .get();
        console.log(`[LastLikedImage] ✅ Query retornou ${composicoesSnapshot.size} composições`);
      } catch (error: any) {
        // Se não tiver índice, buscar sem orderBy
        if (error?.code === "failed-precondition") {
          console.log(`[LastLikedImage] ⚠️ Índice não encontrado, buscando sem orderBy (fallback)`);
          composicoesSnapshot = await composicoesRef
            .where("customer.id", "==", clienteId)
            .limit(200)
            .get();
          console.log(`[LastLikedImage] ✅ Query fallback retornou ${composicoesSnapshot.size} composições`);
        } else {
          throw error;
        }
      }

      if (composicoesSnapshot.empty) {
        console.log(`[LastLikedImage] ⚠️ Nenhuma composição encontrada para o cliente ${clienteId}`);
        return NextResponse.json({ imageUrl: null });
      }

      // Processar composições: priorizar as com like, mas aceitar qualquer uma com imagem
      let lastCompositionWithLike: { imageUrl: string; createdAt: Date } | null = null;
      let lastCompositionWithImage: { imageUrl: string; createdAt: Date } | null = null;

      composicoesSnapshot.docs.forEach((doc) => {
        const comp = doc.data();
        
        // Verificar se tem like (pode estar em 'liked' ou 'curtido')
        const hasLike = comp.liked === true || (comp as any).curtido === true;
        
        // Buscar URL da imagem em vários campos possíveis
        const imageUrl = 
          comp.imagemUrl || 
          comp.imageUrl || 
          (comp as any).final_image_url ||
          (comp as any).looks?.[0]?.imagemUrl ||
          (comp as any).looks?.[0]?.imageUrl ||
          (comp as any).generation?.imagemUrl ||
          null;
        
        // Se não tem imagem, pular
        if (!imageUrl) {
          return;
        }

        // Converter createdAt para Date
        const createdAt = comp.createdAt?.toDate?.() || 
                         (comp.createdAt instanceof Date ? comp.createdAt : new Date());

        // Se tem like e é mais recente que a última com like, atualizar
        if (hasLike) {
          if (!lastCompositionWithLike || createdAt.getTime() > lastCompositionWithLike.createdAt.getTime()) {
            lastCompositionWithLike = {
              imageUrl,
              createdAt,
            };
            console.log(`[LastLikedImage] ✅ Composição com LIKE encontrada:`, imageUrl.substring(0, 80));
          }
        }

        // Se é mais recente que a última com imagem, atualizar (fallback)
        if (!lastCompositionWithImage || createdAt.getTime() > lastCompositionWithImage.createdAt.getTime()) {
          lastCompositionWithImage = {
            imageUrl,
            createdAt,
          };
        }
      });

      // Priorizar composição com like, mas usar qualquer composição com imagem como fallback
      const finalImageUrl = lastCompositionWithLike?.imageUrl || lastCompositionWithImage?.imageUrl || null;

      if (finalImageUrl) {
        const source = lastCompositionWithLike ? "com LIKE" : "qualquer composição";
        console.log(`[LastLikedImage] ✅ Imagem encontrada (${source}):`, finalImageUrl.substring(0, 100));
        return NextResponse.json({ imageUrl: finalImageUrl });
      } else {
        console.log(`[LastLikedImage] ⚠️ Nenhuma composição com imagem encontrada para o cliente ${clienteId}`);
        return NextResponse.json({ imageUrl: null });
      }

    } catch (error: any) {
      console.error(`[LastLikedImage] ❌ Erro ao buscar composições:`, error);
      return NextResponse.json({ 
        imageUrl: null,
        error: error?.message 
      });
    }

  } catch (error) {
    console.error("[LastLikedImage] ❌ Erro geral:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro desconhecido",
        imageUrl: null,
      },
      { status: 500 }
    );
  }
}
