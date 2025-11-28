import { NextRequest, NextResponse } from "next/server";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { fetchLojaPerfil } from "@/lib/firestore/server";

/**
 * API Route: /api/ai/insights
 * 
 * Retorna insights inteligentes baseados nos dados da loja.
 * Por enquanto usa mock data, mas está preparada para integração com Gemini.
 */
export async function GET(request: NextRequest) {
  try {
    // Buscar ID do lojista logado
    const lojistaId = await getCurrentLojistaId();
    
    if (!lojistaId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    // Buscar dados da loja (para usar em análise futura)
    const perfil = await fetchLojaPerfil(lojistaId).catch(() => null);
    
    // TODO: Buscar dados reais de vendas, produtos, etc.
    // const orders = await fetchRecentOrders(lojistaId, 7);
    // const topProducts = await fetchTopProducts(lojistaId);
    // const rejectedProducts = await fetchRejectedProducts(lojistaId);

    // Por enquanto, retornar insights mockados baseados em padrões
    const insights = generateMockInsights(perfil?.nome || "Sua loja");

    return NextResponse.json({
      insights,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[API /api/ai/insights] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao gerar insights" },
      { status: 500 }
    );
  }
}

/**
 * Gera insights mockados
 * 
 * No futuro, este será substituído por uma chamada ao Gemini:
 * 
 * const prompt = `
 * Analise os seguintes dados de uma loja de moda:
 * - Pedidos últimos 7 dias: ${orders.length}
 * - Produto mais vendido: ${topProducts[0]?.nome}
 * - Produtos com mais rejeições: ${rejectedProducts.map(p => p.nome).join(", ")}
 * 
 * Forneça 3 insights acionáveis para o proprietário aumentar as vendas hoje.
 * Formato: JSON array com { id, text, priority }.
 * Tom: Profissional e encorajador.
 * `;
 * 
 * const geminiResponse = await callGeminiFlash(prompt);
 */
function generateMockInsights(lojaNome: string): Array<{
  id: string;
  text: string;
  priority: "high" | "medium" | "low";
}> {
  const baseInsights = [
    {
      id: "1",
      text: `Verifique o estoque dos produtos mais visualizados nos últimos dias. Clientes interessados podem estar esperando restock!`,
      priority: "high" as const,
    },
    {
      id: "2",
      text: `Envie promoções personalizadas para clientes ativos nas últimas horas. Eles já demonstraram interesse!`,
      priority: "high" as const,
    },
    {
      id: "3",
      text: `Analise os motivos de rejeição dos produtos. Ajustes de tamanho ou estilo podem aumentar as conversões.`,
      priority: "medium" as const,
    },
  ];

  // Rotacionar insights para variar
  const hour = new Date().getHours();
  const rotationIndex = Math.floor(hour / 8) % baseInsights.length;
  
  return [
    baseInsights[rotationIndex],
    baseInsights[(rotationIndex + 1) % baseInsights.length],
    baseInsights[(rotationIndex + 2) % baseInsights.length],
  ];
}

