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

    // Construir prompt completo
    const fullPrompt = `${systemPrompt}

USER MESSAGE: ${message}

Responda de forma útil e acionável, usando botões de navegação quando apropriado.`;

    // ESTRATÉGIA HÍBRIDA: Tentar Vertex AI primeiro, fallback para API direta
    let responseText: string | null = null;
    let usedVertexAI = false;

    // TENTATIVA 1: Vertex AI (usando Service Account do Firebase)
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || "";
    const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

    if (projectId) {
      try {
        console.log("[AI/Chat] 🔄 Tentando Vertex AI primeiro...");
        
        // Obter token de acesso via Firebase Admin
        const { getAdminApp } = await import("@/lib/firebaseAdmin");
        const adminApp = getAdminApp();
        
        if (adminApp) {
          const credential = adminApp.options.credential;
          if (credential) {
            const tokenResult = await credential.getAccessToken();
            if (tokenResult?.access_token) {
              const accessToken = tokenResult.access_token;
              const vertexEndpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-1.5-flash:generateContent`;

              console.log("[AI/Chat] 📤 Enviando requisição para Vertex AI:", {
                endpoint: vertexEndpoint,
                projectId,
                location,
                model: "gemini-1.5-flash",
              });

              const vertexResponse = await fetch(vertexEndpoint, {
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

              if (vertexResponse.ok) {
                const vertexData = await vertexResponse.json();
                const candidate = vertexData.candidates?.[0];
                
                if (candidate?.content?.parts?.[0]?.text) {
                  const text = candidate.content.parts[0].text;
                  responseText = text;
                  usedVertexAI = true;
                  console.log("[AI/Chat] ✅ Vertex AI funcionou! Resposta recebida:", {
                    responseLength: text.length,
                    preview: text.substring(0, 100),
                  });
                } else {
                  throw new Error("Vertex AI retornou resposta sem texto");
                }
              } else {
                const errorText = await vertexResponse.text();
                console.warn("[AI/Chat] ⚠️ Vertex AI retornou erro, tentando fallback:", {
                  status: vertexResponse.status,
                  error: errorText.substring(0, 200),
                });
                throw new Error(`Vertex AI error: ${vertexResponse.status}`);
              }
            } else {
              throw new Error("Token de acesso não disponível");
            }
          } else {
            throw new Error("Credencial do Firebase Admin não encontrada");
          }
        } else {
          throw new Error("Firebase Admin não inicializado");
        }
      } catch (vertexError: any) {
        console.warn("[AI/Chat] ⚠️ Vertex AI falhou, usando fallback para API direta:", {
          error: vertexError?.message,
        });
        // Continuar para fallback
      }
    }

    // TENTATIVA 2: API Direta do Gemini (Fallback)
    if (!usedVertexAI) {
      console.log("[AI/Chat] 🔄 Usando API direta do Gemini (fallback)...");
      
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

      if (!apiKey) {
        console.error("[AI/Chat] ❌ GEMINI_API_KEY ou GOOGLE_API_KEY não configurado");
        throw new Error("API Key do Gemini não encontrada. Configure GEMINI_API_KEY ou GOOGLE_API_KEY nas variáveis de ambiente.");
      }

      const geminiApiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
      
      console.log("[AI/Chat] 📤 Enviando requisição para API direta:", {
        model: "gemini-1.5-flash",
        promptLength: fullPrompt.length,
      });

      const directResponse = await fetch(`${geminiApiUrl}?key=${apiKey}`, {
        method: "POST",
        headers: {
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

      if (!directResponse.ok) {
        const errorText = await directResponse.text();
        console.error("[AI/Chat] ❌ Erro na API direta do Gemini:", {
          status: directResponse.status,
          statusText: directResponse.statusText,
          error: errorText.substring(0, 500),
        });
        throw new Error(`Gemini API error: ${directResponse.status} - ${errorText.substring(0, 200)}`);
      }

      const directData = await directResponse.json();
      const candidate = directData.candidates?.[0];
      
      if (!candidate) {
        console.error("[AI/Chat] ❌ Resposta da API direta não contém candidates:", {
          responseData: JSON.stringify(directData).substring(0, 500),
        });
        throw new Error("Resposta da API não contém candidates");
      }

      if (!candidate.content?.parts?.[0]?.text) {
        console.error("[AI/Chat] ❌ Resposta da API direta não contém texto:", {
          candidate: JSON.stringify(candidate).substring(0, 500),
        });
        throw new Error("Resposta da API não contém texto válido");
      }

      const text = candidate.content.parts[0].text;
      responseText = text;
      console.log("[AI/Chat] ✅ API direta funcionou! Resposta recebida:", {
        responseLength: text.length,
        preview: text.substring(0, 100),
      });
    }

    // Validar que temos uma resposta
    if (!responseText) {
      throw new Error("Nenhuma resposta foi gerada. Tanto Vertex AI quanto API direta falharam.");
    }

    return NextResponse.json({
      success: true,
      response: responseText,
      provider: usedVertexAI ? "vertex-ai" : "api-direct",
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

