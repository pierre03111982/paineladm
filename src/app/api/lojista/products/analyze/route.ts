/**
 * PHASE 28: API Route para Análise de Produto com IA
 * Analisa imagem do produto e retorna metadados estruturados
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { productAnalyzerService } from "@/lib/ai-services/product-analyzer";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // Obter lojistaId da query string ou da autenticação
    const { searchParams } = new URL(request.url);
    const lojistaIdFromQuery = searchParams.get("lojistaId");
    
    let lojistaId = lojistaIdFromQuery;
    
    // Se não veio na query, tentar autenticação
    if (!lojistaId) {
      lojistaId = await getCurrentLojistaId();
    }
    
    if (!lojistaId) {
      return NextResponse.json(
        { error: "Não autorizado. Faça login como lojista ou forneça lojistaId." },
        { status: 401 }
      );
    }

    // Parsear body
    let body: any;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: "Corpo da requisição inválido", details: "JSON malformado" },
        { status: 400 }
      );
    }

    // Validar imageUrl (foto frente); imageUrlBack (foto costas) é opcional para análise com duas imagens
    const { imageUrl, imageUrlBack, context } = body;

    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json(
        { error: "imageUrl é obrigatório e deve ser uma string" },
        { status: 400 }
      );
    }

    // Validar que é uma URL HTTP/HTTPS válida
    if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
      return NextResponse.json(
        { error: "imageUrl deve ser uma URL HTTP ou HTTPS válida" },
        { status: 400 }
      );
    }

    if (imageUrlBack != null && typeof imageUrlBack !== "string") {
      return NextResponse.json(
        { error: "imageUrlBack deve ser uma string quando informado" },
        { status: 400 }
      );
    }
    if (imageUrlBack && !imageUrlBack.startsWith("http://") && !imageUrlBack.startsWith("https://")) {
      return NextResponse.json(
        { error: "imageUrlBack deve ser uma URL HTTP ou HTTPS válida" },
        { status: 400 }
      );
    }

    // Validar contexto se fornecido
    if (context) {
      if (context.audience && !['KIDS', 'ADULT'].includes(context.audience)) {
        return NextResponse.json(
          { error: "context.audience deve ser 'KIDS' ou 'ADULT'" },
          { status: 400 }
        );
      }
      if (context.sizeSystem && !['AGE_BASED', 'LETTER_BASED', 'NUMERIC'].includes(context.sizeSystem)) {
        return NextResponse.json(
          { error: "context.sizeSystem deve ser 'AGE_BASED', 'LETTER_BASED' ou 'NUMERIC'" },
          { status: 400 }
        );
      }
    }

    console.log("[api/products/analyze] Iniciando análise para lojistaId:", lojistaId, "com foto costas:", !!imageUrlBack, "context:", context);

    // Chamar serviço de análise (com uma ou duas imagens: frente + costas para melhor detalhamento, ex. Short saia)
    let analysisResult;
    try {
      analysisResult = await productAnalyzerService.analyzeProductImage(imageUrl, context, imageUrlBack || undefined);
    } catch (serviceError: any) {
      console.error("[api/products/analyze] Erro no serviço de análise:", serviceError);
      
      // Sanitizar a mensagem de erro para garantir JSON válido
      const errorMessage = serviceError?.message || "Erro ao analisar produto";
      const sanitizedMessage = String(errorMessage)
        .replace(/"/g, '\\"')
        .replace(/\n/g, ' ')
        .replace(/\r/g, '')
        .substring(0, 500); // Limitar tamanho
      
      // Garantir que sempre retornamos JSON válido
      return NextResponse.json(
        { 
          error: sanitizedMessage,
          details: "A análise automática falhou. Você pode preencher os campos manualmente.",
        },
        { status: 500 }
      );
    }

    if (!analysisResult || !analysisResult.success) {
      console.error("[api/products/analyze] Erro na análise:", analysisResult?.error || "Resultado inválido");
      
      // Retornar erro suave para permitir preenchimento manual
      return NextResponse.json(
        { 
          error: analysisResult?.error || "Erro ao analisar produto",
          details: "A análise automática falhou. Você pode preencher os campos manualmente.",
        },
        { status: 500 }
      );
    }

    console.log("[api/products/analyze] ✅ Análise concluída com sucesso");

    // Retornar resultado estruturado
    return NextResponse.json({
      success: true,
      data: analysisResult.data,
      executionTime: analysisResult.executionTime,
    });
  } catch (error: any) {
    console.error("[api/products/analyze] Erro inesperado:", error);
    
    // Sanitizar a mensagem de erro para garantir JSON válido
    const errorMessage = error?.message || "Erro desconhecido";
    const sanitizedMessage = String(errorMessage)
      .replace(/"/g, '\\"')
      .replace(/\n/g, ' ')
      .replace(/\r/g, '')
      .substring(0, 500); // Limitar tamanho
    
    return NextResponse.json(
      { 
        error: "Erro interno do servidor",
        details: sanitizedMessage,
      },
      { status: 500 }
    );
  }
}

