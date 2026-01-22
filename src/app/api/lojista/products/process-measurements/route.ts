/**
 * API Route para Processamento de Imagem com Vertex AI
 * Gera imagem ghost mannequin e detecta landmarks de medidas
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { processImageWithVertex } from "@/services/vertex-ai";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lojistaIdFromQuery = searchParams.get("lojistaId");
    
    // Prioridade: query string (modo admin) > usuário logado > env var
    const lojistaIdFromAuth = lojistaIdFromQuery ? null : await getCurrentLojistaId();
    const lojistaId =
      lojistaIdFromQuery ||
      lojistaIdFromAuth ||
      process.env.NEXT_PUBLIC_LOJISTA_ID ||
      process.env.LOJISTA_ID ||
      "";

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId não encontrado" },
        { status: 400 }
      );
    }

    // Obter dados do body
    const formData = await request.formData();
    const file = formData.get("image") as File;
    const produtoId = formData.get("produtoId") as string | null;
    const category = formData.get("category") as string | null;
    const productType = formData.get("productType") as string | null;
    const color = formData.get("color") as string | null;
    const material = formData.get("material") as string | null;
    const style = formData.get("style") as string | null;
    
    // Medidas específicas (se fornecidas para regeneração ou da análise inteligente)
    const bust = formData.get("bust") as string | null;
    const waist = formData.get("waist") as string | null;
    const hip = formData.get("hip") as string | null;
    const length = formData.get("length") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "Arquivo de imagem não fornecido" },
        { status: 400 }
      );
    }

    console.log("[API process-measurements] Processando imagem:", {
      fileName: file.name,
      fileSize: file.size,
      lojistaId,
      produtoId,
      category,
    });

    // Preparar medidas customizadas (se fornecidas da análise inteligente ou regeneração)
    // IMPORTANTE: Usar medidas pré-coletadas da análise para evitar recalcular
    const customMeasurements: Record<string, number> = {};
    if (bust) customMeasurements.bust = parseFloat(bust);
    if (waist) customMeasurements.waist = parseFloat(waist);
    if (hip) {
      // IMPORTANTE: Usar 'hips' (plural) para consistência
      customMeasurements.hips = parseFloat(hip);
    }
    if (length) customMeasurements.length = parseFloat(length);
    
    console.log("[API process-measurements] 📏 Medidas pré-coletadas recebidas:", customMeasurements);

    // Processar imagem com Vertex AI
    console.log("[API process-measurements] 📤 Chamando processImageWithVertex...");
    try {
      const result = await processImageWithVertex(
        file,
        lojistaId,
        produtoId || undefined,
        {
          category: category || undefined,
          productType: productType || undefined,
          color: color || undefined,
          material: material || undefined,
          style: style || undefined,
        },
        Object.keys(customMeasurements).length > 0 ? customMeasurements : undefined
      );

      console.log("[API process-measurements] ✅ Processamento concluído com sucesso");

      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch (vertexError: any) {
      console.error("[API process-measurements] ❌ Erro no processImageWithVertex:", {
        message: vertexError.message,
        stack: vertexError.stack,
        errorType: vertexError.constructor.name,
      });
      // Re-lançar o erro para ser tratado no catch externo
      throw vertexError;
    }
  } catch (error: any) {
    console.error("[API process-measurements] Erro:", error);
    
    const errorMessage = error.message || "Erro ao processar imagem";
    
    // Detectar erro 429 e retornar com status code correto
    if (errorMessage.includes("429") || 
        errorMessage.includes("Resource exhausted") || 
        errorMessage.includes("RESOURCE_EXHAUSTED")) {
      console.error("[API process-measurements] 🚫 Erro 429 detectado, retornando status 429");
      return NextResponse.json(
        { 
          error: "⚠️ Limite de uso da API Gemini atingido. Por favor, aguarde alguns minutos e tente novamente.",
          details: errorMessage 
        },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error.stack 
      },
      { status: 500 }
    );
  }
}
