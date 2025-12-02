/**
 * API Route: AI Chat (Consultoria de Vendas & Onboarding)
 * POST /api/ai/chat
 * 
 * Chat inteligente com contexto de negócios do lojista
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getGeminiTextService } from "@/lib/ai-services/gemini-text";
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
    let recentInsights: any[] = [];
    try {
      recentInsights = await getAllInsights(lojistaId, 3);
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

    // Chamar Gemini diretamente (não usar generateInsight que retorna JSON estruturado)
    const accessToken = await (async () => {
      try {
        const { getAdminApp } = await import("@/lib/firebaseAdmin");
        const adminApp = getAdminApp();
        if (!adminApp) throw new Error("Firebase Admin não inicializado");
        const client = await adminApp.options.credential?.getAccessToken();
        if (!client || !client.access_token) throw new Error("Token não disponível");
        return client.access_token;
      } catch (error) {
        console.error("[AI/Chat] Erro ao obter token:", error);
        throw new Error("Falha na autenticação");
      }
    })();

    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || "";
    const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-1.5-flash:generateContent`;

    // Construir prompt completo
    const fullPrompt = `${systemPrompt}

USER MESSAGE: ${message}

Responda de forma útil e acionável, usando botões de navegação quando apropriado.`;

    // Fazer requisição direta ao Gemini
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: fullPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const responseData = await response.json();
    const candidate = responseData.candidates?.[0];
    if (!candidate || !candidate.content?.parts?.[0]?.text) {
      throw new Error("Resposta da API não contém texto válido");
    }

    const responseText = candidate.content.parts[0].text;

    return NextResponse.json({
      success: true,
      response: responseText,
      context: {
        produtosCount,
        displayConnected,
        salesConfigured,
        insightsCount: recentInsights.length,
      },
    });
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

