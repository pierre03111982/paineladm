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

    // Validar imageUrl
    const { imageUrl } = body;

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

    console.log("[api/products/analyze] Iniciando análise para lojistaId:", lojistaId);

    // Chamar serviço de análise
    const analysisResult = await productAnalyzerService.analyzeProductImage(imageUrl);

    if (!analysisResult.success) {
      console.error("[api/products/analyze] Erro na análise:", analysisResult.error);
      
      // Retornar erro suave para permitir preenchimento manual
      return NextResponse.json(
        { 
          error: analysisResult.error || "Erro ao analisar produto",
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
    
    return NextResponse.json(
      { 
        error: "Erro interno do servidor",
        details: error.message || "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

