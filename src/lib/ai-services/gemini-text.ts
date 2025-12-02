/**
 * Serviço de integração com Google Vertex AI Gemini 1.5 Flash (Texto)
 * Para análise de dados e geração de insights proativos
 * Documentação: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini
 */

import { APIResponse } from "./types";
import { InsightResult } from "@/types/insights";

/**
 * Configuração do Gemini 1.5 Flash (Texto)
 */
const GEMINI_TEXT_CONFIG = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || "",
  location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
  modelId: "gemini-1.5-flash",
  // Custo por requisição (em USD) - Valor estimado
  // ⚠️ IMPORTANTE: Consultar https://cloud.google.com/vertex-ai/generative-ai/pricing para valores atualizados
  costPerRequest: parseFloat(process.env.GEMINI_TEXT_COST || "0.0001"),
};

/**
 * Parâmetros para geração de insight
 */
export interface GeminiTextParams {
  prompt: string;
  contextData?: any; // Dados contextuais (clientes, produtos, métricas, etc.)
  temperature?: number; // 0.0-1.0, padrão 0.7
  maxOutputTokens?: number; // Padrão 1024
}

/**
 * Cliente para Google Vertex AI Gemini 1.5 Flash (Texto)
 */
export class GeminiTextService {
  private projectId: string;
  private location: string;
  private endpoint: string;

  constructor() {
    this.projectId = GEMINI_TEXT_CONFIG.projectId;
    this.location = GEMINI_TEXT_CONFIG.location;
    
    // Endpoint do Gemini 1.5 Flash (Texto)
    this.endpoint = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${GEMINI_TEXT_CONFIG.modelId}:generateContent`;

    if (!this.projectId) {
      console.warn(
        "[GeminiText] GOOGLE_CLOUD_PROJECT_ID não configurado. Serviço em modo mock."
      );
    }
  }

  /**
   * Verifica se o serviço está configurado
   */
  isConfigured(): boolean {
    return !!(this.projectId && this.location);
  }

  /**
   * Obtém token de acesso do Firebase Admin
   */
  private async getAccessToken(): Promise<string> {
    try {
      const { getAdminApp } = await import("@/lib/firebaseAdmin");
      const adminApp = getAdminApp();
      
      if (!adminApp) {
        throw new Error("Firebase Admin não inicializado");
      }

      const client = await adminApp.options.credential?.getAccessToken();
      
      if (!client || !client.access_token) {
        throw new Error("Não foi possível obter token de acesso");
      }

      return client.access_token;
    } catch (error) {
      console.error("[GeminiText] Erro ao obter access token:", error);
      throw new Error("Falha na autenticação. Configure GOOGLE_APPLICATION_CREDENTIALS ou use Service Account do Firebase.");
    }
  }

  /**
   * Gera insight estruturado (JSON) usando Gemini 1.5 Flash
   */
  async generateInsight(
    prompt: string,
    contextData?: any
  ): Promise<APIResponse<InsightResult>> {
    const startTime = Date.now();

    console.log("[GeminiText] Iniciando geração de insight", {
      promptLength: prompt.length,
      hasContextData: !!contextData,
      isConfigured: this.isConfigured(),
    });

    // Modo mock se não configurado
    if (!this.isConfigured()) {
      console.warn("[GeminiText] ⚠️ USANDO MOCK - Configure GOOGLE_CLOUD_PROJECT_ID para usar o serviço real!");
      return {
        success: true,
        data: {
          type: "opportunity",
          title: "Insight Mock",
          message: "Este é um insight de teste. Configure GOOGLE_CLOUD_PROJECT_ID para usar o serviço real.",
          priority: "medium",
        },
        executionTime: Date.now() - startTime,
        cost: 0,
      };
    }

    try {
      // Construir prompt completo com contexto
      const fullPrompt = this.buildPrompt(prompt, contextData);

      // Obter token de acesso
      const accessToken = await this.getAccessToken();

      // Preparar payload
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: fullPrompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          responseMimeType: "application/json", // Forçar resposta JSON
        },
      };

      console.log("[GeminiText] 📤 Enviando requisição para:", this.endpoint);
      console.log("[GeminiText] 📦 Prompt length:", fullPrompt.length);

      // Fazer requisição
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[GeminiText] ❌ Erro na API:", response.status, errorText.substring(0, 500));
        throw new Error(`Gemini Text API error: ${response.status} ${errorText}`);
      }

      const responseData = await response.json();
      console.log("[GeminiText] ✅ Resposta da API recebida");

      // Extrair texto da resposta
      const candidate = responseData.candidates?.[0];
      if (!candidate || !candidate.content?.parts?.[0]?.text) {
        throw new Error("Resposta da API não contém texto válido");
      }

      const responseText = candidate.content.parts[0].text;
      console.log("[GeminiText] 📝 Resposta recebida:", responseText.substring(0, 200) + "...");

      // Parsear JSON da resposta
      let insightResult: InsightResult;
      try {
        // Tentar extrair JSON se estiver em markdown code block
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          insightResult = JSON.parse(jsonMatch[1]);
        } else {
          // Tentar parsear diretamente
          insightResult = JSON.parse(responseText);
        }
      } catch (parseError) {
        console.error("[GeminiText] ❌ Erro ao parsear JSON:", parseError);
        console.error("[GeminiText] Resposta completa:", responseText);
        throw new Error("Resposta da IA não é um JSON válido");
      }

      // Validar estrutura do insight
      if (!insightResult.type || !insightResult.title || !insightResult.message || !insightResult.priority) {
        throw new Error("Insight result não contém campos obrigatórios");
      }

      const executionTime = Date.now() - startTime;
      const cost = GEMINI_TEXT_CONFIG.costPerRequest;

      console.log("[GeminiText] ✅ Insight gerado com sucesso:", {
        type: insightResult.type,
        priority: insightResult.priority,
        time: executionTime,
        cost,
      });

      return {
        success: true,
        data: insightResult,
        executionTime,
        cost,
      };
    } catch (error) {
      console.error("[GeminiText] ❌ Erro ao gerar insight:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Constrói prompt completo com contexto
   */
  private buildPrompt(userPrompt: string, contextData?: any): string {
    let fullPrompt = `Você é um assistente de inteligência de vendas para lojistas de moda.

Sua tarefa é analisar dados de clientes e produtos para gerar insights acionáveis.

IMPORTANTE: Você DEVE retornar APENAS um JSON válido, sem texto adicional antes ou depois.

Formato obrigatório do JSON:
{
  "type": "opportunity" | "risk" | "trend" | "action",
  "title": "Título curto e direto (máximo 60 caracteres)",
  "message": "Mensagem explicativa detalhada (2-3 frases)",
  "priority": "high" | "medium" | "low",
  "relatedEntity": {
    "type": "client" | "product",
    "id": "id_da_entidade",
    "name": "Nome da entidade"
  } (opcional),
  "actionLabel": "Texto do botão de ação" (opcional),
  "actionLink": "/caminho/deep/link" (opcional),
  "expiresInDays": 7 (opcional, padrão 7)
}

TIPOS DE INSIGHT:
- "opportunity": Oportunidade de venda (cliente interessado, produto em alta)
- "risk": Risco (churn, produto com baixa performance)
- "trend": Tendência (padrão de comportamento, preferências)
- "action": Ação recomendada (contato, ajuste de produto)

PRIORIDADES:
- "high": Requer atenção imediata
- "medium": Importante, mas não urgente
- "low": Informativo

PROMPT DO USUÁRIO:
${userPrompt}
`;

    // Adicionar contexto se fornecido
    if (contextData) {
      fullPrompt += `\n\nDADOS CONTEXTUAIS (JSON):\n${JSON.stringify(contextData, null, 2)}`;
    }

    fullPrompt += `\n\nGere o insight em formato JSON seguindo exatamente o formato especificado acima.`;

    return fullPrompt;
  }
}

/**
 * Singleton do serviço Gemini Text
 */
let geminiTextServiceInstance: GeminiTextService | null = null;

/**
 * Obtém instância do serviço Gemini Text
 */
export function getGeminiTextService(): GeminiTextService {
  if (!geminiTextServiceInstance) {
    geminiTextServiceInstance = new GeminiTextService();
  }
  return geminiTextServiceInstance;
}

