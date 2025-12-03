/**
 * API Route: AI Chat (Consultoria de Vendas & Onboarding)
 * POST /api/ai/chat
 * 
 * Chat inteligente com contexto de negócios do lojista
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getVertexAgent } from "@/lib/ai/vertex-agent";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { getAllInsights } from "@/lib/firestore/insights";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, lojistaId: lojistaIdFromBody } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Mensagem é obrigatória" },
        { status: 400 }
      );
    }

    // Obter lojistaId
    const lojistaIdFromAuth = lojistaIdFromBody ? null : await getCurrentLojistaId();
    const lojistaId = lojistaIdFromBody || lojistaIdFromAuth;

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório" },
        { status: 400 }
      );
    }

    const db = getAdminDb();

    // TAREFA 1: Buscar dados de contexto expandido

    // 1. Dados de Onboarding (Perfil da Loja)
    const lojaRef = db.collection("lojas").doc(lojistaId);
    const lojaDoc = await lojaRef.get();
    const lojaData = lojaDoc.exists ? lojaDoc.data() : null;

    // Contar produtos
    const produtosRef = lojaRef.collection("produtos");
    const produtosSnapshot = await produtosRef
      .where("arquivado", "!=", true)
      .get();
    const produtosCount = produtosSnapshot.size;

    // Verificar Display conectado
    const displayConnected = !!(lojaData?.last_display_activity);

    // Verificar Sales configurado
    const salesConfigured = !!(lojaData?.salesConfig);

    // 2. Dados de Vendas (Últimos 3 insights)
    // Busca simples sem ordenação para evitar erro de índice
    let recentInsights: any[] = [];
    try {
      const insightsRef = db.collection(`lojas/${lojistaId}/insights`);
      const insightsSnap = await insightsRef
        .limit(5)
        .get();
      
      recentInsights = insightsSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type,
          title: data.title,
          message: data.message,
          priority: data.priority,
        };
      }).slice(0, 3); // Limitar a 3 após buscar
    } catch (error) {
      console.warn("[AI/Chat] Erro ao buscar insights:", error);
      // Continuar sem insights se houver erro
    }

    // Construir contexto para o prompt
    const contextData = {
      store: {
        name: lojaData?.nome || "Sua loja",
        produtosCount,
        displayConnected,
        salesConfigured,
      },
      recentInsights: recentInsights.map((insight) => ({
        type: insight.type,
        title: insight.title,
        message: insight.message,
        priority: insight.priority,
      })),
    };

    // System Prompt atualizado
    const systemPrompt = `ROLE: You are "Ana", the Intelligent Manager of Experimenta AI.

CAPABILITIES: Technical Support, Sales Consultant, and Onboarding Guide.

CONTEXT DATA:
- Store Name: ${contextData.store.name}
- Products: ${contextData.store.produtosCount} produtos cadastrados
- Display Connected: ${contextData.store.displayConnected ? "Sim" : "Não"}
- Sales Configured: ${contextData.store.salesConfigured ? "Sim" : "Não"}
${contextData.recentInsights.length > 0 ? `- Recent Sales Insights: ${JSON.stringify(contextData.recentInsights, null, 2)}` : "- Recent Sales Insights: Nenhum insight disponível ainda"}

GUIDELINES:
1. SALES MODE: If the user asks about performance, sales, or "Como vender mais?", analyze the 'Recent Sales Insights'. 
   - Focus on insights of type 'opportunity' first
   - Summarize the top opportunities and suggest specific actions
   - If there are no insights, suggest generating an analysis first

2. ONBOARDING MODE: If 'Display Connected' is false and user asks "what next?" or "o que faço agora?", guide them to connect the display. If 'Sales Configured' is false, suggest configuring sales.

3. NAVIGATION ACTIONS: If you suggest a feature, provide a link in this format: [[Button Label]](/url-path).
   - Link for Products: /produtos
   - Link for Display: /display
   - Link for Settings: /configuracoes
   - Link for Clients: /clientes
   - Link for Dashboard: /dashboard
   - Link for Sales Config: /configuracoes (scroll to sales section)

4. PRODUCT GUIDANCE: If produtosCount is 0, suggest adding products first.

5. TONE: Professional, encouraging, and data-driven. Keep answers short (max 3 sentences unless asked for detail).

6. LANGUAGE: Respond in Portuguese (pt-BR) unless the user writes in English.

IMPORTANTE: Sempre que sugerir uma ação que requer navegação, use o formato [[Label do Botão]](/caminho) para criar botões clicáveis.`;

    // USAR AGENTE ANA COM VERTEX AI
    console.log("[AI/Chat] 🤖 Usando Agente Ana com Vertex AI...");

    try {
      const vertexAgent = getVertexAgent();
      const responseText = await vertexAgent.chat(message, lojistaId, contextData);

      console.log("[AI/Chat] ✅ Resposta do Agente Ana recebida:", {
        responseLength: responseText.length,
        preview: responseText.substring(0, 100),
      });

      return NextResponse.json({
        success: true,
        response: responseText,
        provider: "vertex-ai",
        context: {
          produtosCount,
          displayConnected,
          salesConfigured,
          insightsCount: recentInsights.length,
        },
      });
    } catch (agentError: any) {
      console.error("[AI/Chat] ❌ Erro no Agente Ana (Vertex AI):", {
        error: agentError?.message,
        stack: agentError?.stack?.substring(0, 500),
      });

      // Retornar erro sem fallback - apenas Vertex AI
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao processar mensagem com Vertex AI",
          details: agentError?.message || "Erro desconhecido",
          provider: "vertex-ai",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[API/AI/Chat] Erro:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        response: "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.",
      },
      { status: 500 }
    );
  }
}

