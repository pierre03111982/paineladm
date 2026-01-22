/**
 * API Route: Detecção de Landmarks de Roupas
 * Detecta pontos de referência automaticamente usando Gemini Vision
 */

import { NextRequest, NextResponse } from "next/server";
import { measurementsAIService } from "@/lib/ai-services/measurements-ai";
import type { GarmentCategory } from "@/lib/ai-services/measurements-ai";

/**
 * Mapeia categoria do produto para categoria de landmark
 */
function mapCategoryToGarmentCategory(category: string): GarmentCategory {
  const categoryLower = category.toLowerCase();
  
  // Vestidos e tops (incluindo moletons, sweatshirts, hoodies)
  if (
    categoryLower.includes("vestido") ||
    categoryLower.includes("dress") ||
    categoryLower.includes("macacão") ||
    categoryLower.includes("macaquinho") ||
    categoryLower.includes("jumpsuit") ||
    categoryLower.includes("blusa") ||
    categoryLower.includes("camisa") ||
    categoryLower.includes("camiseta") ||
    categoryLower.includes("top") ||
    categoryLower.includes("blazer") ||
    categoryLower.includes("jaqueta") ||
    categoryLower.includes("casaco") ||
    categoryLower.includes("moletom") ||
    categoryLower.includes("sweatshirt") ||
    categoryLower.includes("hoodie") ||
    categoryLower.includes("agasalho") ||
    // OBS: saia é BOTTOMS (não DRESS)
    false
  ) {
    // Se for vestido, é DRESS; caso contrário, é TOPS
    if (
      categoryLower.includes("vestido") ||
      categoryLower.includes("dress") ||
      categoryLower.includes("macacão") ||
      categoryLower.includes("macaquinho") ||
      categoryLower.includes("jumpsuit")
    ) {
      return "DRESS";
    }
    return "TOPS";
  }
  
  // Saias: tratar como BOTTOMS (medidas: cintura/quadril/comprimento)
  if (categoryLower.includes("saia")) {
    return "BOTTOMS";
  }

  // Calças, shorts, bermudas, etc.
  if (
    categoryLower.includes("calça") ||
    categoryLower.includes("pants") ||
    categoryLower.includes("short") ||
    categoryLower.includes("bermuda") ||
    categoryLower.includes("legging") ||
    // Moda praia / íntimos (landmarks similares a BOTTOMS; a UI filtra as medidas depois)
    categoryLower.includes("sunga") ||
    categoryLower.includes("cueca") ||
    categoryLower.includes("calcinha") ||
    categoryLower.includes("biquíni") ||
    categoryLower.includes("bikini")
  ) {
    return "BOTTOMS";
  }
  
  // Padrão: TOPS (mais comum)
  return "TOPS";
}

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lojistaId = searchParams.get("lojistaId");

    if (!lojistaId) {
      return NextResponse.json(
        { success: false, error: "lojistaId é obrigatório" },
        { status: 400 }
      );
    }

    // Ler corpo da requisição
    const body = await request.json();
    const { imageUrl, category } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: "imageUrl é obrigatório" },
        { status: 400 }
      );
    }

    // Mapear categoria
    const garmentCategory = category
      ? mapCategoryToGarmentCategory(category)
      : "TOPS"; // Padrão

    console.log("[API] 🔍 Iniciando detecção de landmarks:", {
      imageUrl: imageUrl.substring(0, 100) + "...",
      category,
      garmentCategory,
    });

    // Chamar serviço de detecção
    const result = await measurementsAIService.detectGarmentLandmarks(
      imageUrl,
      garmentCategory
    );

    if (!result.success) {
      console.error("[API] ❌ Erro na detecção de landmarks:", result.error);
      
      // Retornar fallback em caso de erro
      const fallbackLandmarks =
        measurementsAIService.getFallbackLandmarks(garmentCategory);
      
      return NextResponse.json(
        {
          success: true,
          data: fallbackLandmarks,
          fallback: true,
          warning:
            "Não foi possível detectar landmarks automaticamente. Usando posições padrão. Ajuste fino sugerido.",
          executionTime: result.executionTime,
        },
        { status: 200 }
      );
    }

    console.log("[API] ✅ Landmarks detectados com sucesso");

    return NextResponse.json({
      success: true,
      data: result.data,
      executionTime: result.executionTime,
    });
  } catch (error: any) {
    console.error("[API] ❌ Erro na API de detecção de landmarks:", error);
    
    const errorMessage =
      error?.message || "Erro desconhecido ao detectar landmarks";
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
