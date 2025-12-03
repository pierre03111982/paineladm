/**
 * Agente Ana - Serviço de IA usando Vertex AI SDK
 * Usa Gemini 1.5 Pro como principal, com fallback para Flash
 */

import { VertexAI } from "@google-cloud/vertexai";
import { ANA_TOOLS, type AnaToolName } from "../ai/ana-tools";

/**
 * Serviço do Agente Ana usando Vertex AI
 * Prioriza inteligência humana (PRO), com fallback para velocidade (FLASH)
 */
export class VertexAgent {
  private vertexAI: VertexAI;
  private project: string;
  private location: string;

  constructor() {
    this.project = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "";
    this.location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

    if (!this.project) {
      throw new Error("GOOGLE_CLOUD_PROJECT_ID ou FIREBASE_PROJECT_ID não configurado. Configure a variável de ambiente.");
    }

    // Inicializar Vertex AI usando Application Default Credentials (ADC)
    // Isso usa automaticamente as credenciais do gcloud auth (local) ou Service Account (Vercel)
    this.vertexAI = new VertexAI({
      project: this.project,
      location: this.location,
    });

    console.log("[VertexAgent] ✅ Vertex AI inicializado", {
      project: this.project,
      location: this.location,
    });
  }

  /**
   * Persona da Ana - Personalidade empática e consultiva
   */
  private getPersona(): string {
    return `Você é a Ana, gerente de sucesso do 'Experimenta AI'.

Seu tom é humano, empático, entusiasta e profissional.

Você NUNCA inventa dados. Se não souber, pergunte ou diga que vai verificar.

Seu objetivo é ajudar o lojista a vender mais, analisando o contexto fornecido.

FORMATO DE RESPOSTAS:
- Seja direta e acionável (máximo 3-4 frases, a menos que peçam detalhes).
- Use botões de navegação quando sugerir ações: [[Nome do Botão]](/caminho)
- Sempre que mencionar dados (produtos, insights, estatísticas), use as ferramentas disponíveis para buscar informações atualizadas.

LINGUAGEM:
- Responda em Português (pt-BR) a menos que o usuário escreva em inglês.
- Use tom profissional mas amigável, como uma consultora de vendas experiente.`;
  }

  /**
   * Define as funções que a IA pode chamar (Function Calling)
   */
  private getFunctionDeclarations(): any[] {
    return [
      {
        name: "getStoreVitalStats",
        description: "Busca estatísticas vitais da loja (total de produtos, composições, taxa de aprovação, vendas). Use quando o usuário perguntar sobre estatísticas gerais, desempenho da loja, ou quiser um resumo do negócio.",
        parameters: {
          type: "object",
          properties: {
            lojistaId: {
              type: "string",
              description: "ID do lojista",
            },
          },
          required: ["lojistaId"],
        },
      },
      {
        name: "getTopOpportunities",
        description: "Busca oportunidades de venda ou crescimento identificadas pela IA (insights do tipo 'opportunity'). Use quando o usuário perguntar sobre oportunidades, insights de vendas, ou quiser saber o que a IA identificou como potencial de crescimento.",
        parameters: {
          type: "object",
          properties: {
            lojistaId: {
              type: "string",
              description: "ID do lojista",
            },
            limit: {
              type: "number",
              description: "Número máximo de oportunidades a retornar (padrão: 5)",
            },
          },
          required: ["lojistaId"],
        },
      },
      {
        name: "getProductPerformance",
        description: "Busca produtos com baixa performance (alto índice de rejeição/dislikes). Use quando o usuário perguntar sobre produtos que não vendem, produtos com problemas, ou quiser identificar produtos que precisam de atenção (preço, qualidade, etc).",
        parameters: {
          type: "object",
          properties: {
            lojistaId: {
              type: "string",
              description: "ID do lojista",
            },
            limit: {
              type: "number",
              description: "Número máximo de produtos a retornar (padrão: 5)",
            },
          },
          required: ["lojistaId"],
        },
      },
    ];
  }

  /**
   * Executa uma função baseada no nome
   */
  private async executeFunction(functionName: string, args: any, lojistaId: string): Promise<any> {
    console.log(`[VertexAgent] 🔧 Executando função: ${functionName}`, { args });

    try {
      if (!(functionName in ANA_TOOLS)) {
        throw new Error(`Função desconhecida: ${functionName}`);
      }

      const tool = ANA_TOOLS[functionName as AnaToolName];
      const result = await tool(lojistaId, args.limit);

      console.log(`[VertexAgent] ✅ Função ${functionName} executada com sucesso`);
      return result;
    } catch (error: any) {
      console.error(`[VertexAgent] ❌ Erro ao executar função ${functionName}:`, error);
      return {
        error: error.message || "Erro ao executar função",
        resumo: `Erro ao buscar dados: ${error.message || "Erro desconhecido"}`,
      };
    }
  }

  /**
   * Tenta gerar resposta com um modelo específico
   */
  private async tryModel(
    modelName: string,
    userMessage: string,
    lojistaId: string,
    contextData?: any
  ): Promise<string> {
    console.log(`[VertexAgent] 🔄 Tentando modelo: ${modelName}`);
    
    const contextPrompt = contextData
      ? `\n\nCONTEXTO DA LOJA:
- Nome: ${contextData.store?.name || "Sua loja"}
- Produtos cadastrados: ${contextData.store?.produtosCount || 0}
- Display conectado: ${contextData.store?.displayConnected ? "Sim" : "Não"}
- Sales configurado: ${contextData.store?.salesConfigured ? "Sim" : "Não"}
`
      : "";

    try {
      const model = this.vertexAI.preview.getGenerativeModel({
        model: modelName,
        systemInstruction: this.getPersona(),
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          topP: 0.95,
          topK: 40,
        },
        tools: [{
          functionDeclarations: this.getFunctionDeclarations(),
        }],
      });

      console.log(`[VertexAgent] ✅ Modelo ${modelName} instanciado com sucesso`);

      const chat = model.startChat({
        history: [
          {
            role: "user",
            parts: [{ text: `Olá Ana! Sou o lojista ${lojistaId}.${contextPrompt}` }],
          },
          {
            role: "model",
            parts: [{ text: "Olá! Sou a Ana, sua Gerente de Sucesso do Cliente. Estou aqui para ajudar você a vender mais usando dados reais da sua loja! 🚀\n\nComo posso ajudar você hoje? Posso analisar seus produtos, identificar oportunidades de venda, ou qualquer outra coisa relacionada ao seu negócio." }],
          },
        ],
      });

      console.log(`[VertexAgent] 📤 Enviando mensagem para ${modelName}...`);
      const result = await chat.sendMessage(userMessage);
      const response = result.response;
      
      console.log(`[VertexAgent] 📥 Resposta recebida de ${modelName}`, {
        hasCandidates: !!response.candidates,
        candidatesLength: response.candidates?.length || 0,
      });

      // Verificar se a IA quer chamar alguma função
      // O Vertex AI SDK retorna functionCalls em response.candidates[0].content.parts
      let functionCalls: any[] = [];
      try {
        if (response.candidates && response.candidates[0]?.content?.parts) {
          const parts = response.candidates[0].content.parts;
          const functionCallParts = parts.filter((p: any) => p.functionCall);
          if (functionCallParts.length > 0) {
            functionCalls = functionCallParts.map((p: any) => p.functionCall);
            console.log(`[VertexAgent] 🔧 Function calls detectados: ${functionCalls.length}`);
          }
        }
      } catch (e: any) {
        // Se não houver function calls, continuar normalmente
        console.log("[VertexAgent] ℹ️ Nenhuma função chamada pela IA:", e?.message);
      }

      if (functionCalls && functionCalls.length > 0) {
        console.log(`[VertexAgent] 🔧 IA solicitou ${functionCalls.length} função(ões):`, 
          functionCalls.map((c: any) => c.name).join(", "));

        const functionResults = await Promise.all(
          functionCalls.map(async (call: any) => {
            const functionName = call.name;
            const args = call.args || {};
            if (!args.lojistaId) {
              args.lojistaId = lojistaId;
            }

            const result = await this.executeFunction(functionName, args, lojistaId);
            
            return {
              functionResponse: {
                name: functionName,
                response: result,
              },
            };
          })
        );

        console.log(`[VertexAgent] 📤 Enviando resultados das funções para ${modelName}...`);
        const finalResult = await chat.sendMessage(functionResults);
        const finalResponse = finalResult.response;
        
        // Extrair texto da resposta
        if (finalResponse.candidates && finalResponse.candidates[0]?.content?.parts) {
          const textPart = finalResponse.candidates[0].content.parts.find((p: any) => p.text);
          const text = textPart?.text || "";
          console.log(`[VertexAgent] ✅ Texto extraído (com function calls): ${text.length} caracteres`);
          return text;
        }
        
        console.warn(`[VertexAgent] ⚠️ Resposta final não contém texto válido`);
        return "";
      }

      // Extrair texto da resposta direta
      if (response.candidates && response.candidates[0]?.content?.parts) {
        const textPart = response.candidates[0].content.parts.find((p: any) => p.text);
        const text = textPart?.text || "";
        console.log(`[VertexAgent] ✅ Texto extraído (resposta direta): ${text.length} caracteres`);
        return text;
      }
      
      console.warn(`[VertexAgent] ⚠️ Resposta não contém candidates ou parts válidos`);
      console.log(`[VertexAgent] 🔍 Estrutura da resposta:`, JSON.stringify(response, null, 2).substring(0, 500));
      return "";
    } catch (modelError: any) {
      console.error(`[VertexAgent] ❌ Erro ao usar modelo ${modelName}:`, {
        error: modelError?.message,
        code: modelError?.code,
        status: modelError?.status,
        stack: modelError?.stack?.substring(0, 500),
      });
      throw modelError;
    }
  }

  /**
   * Gera resposta com fallback automático (PRO → FLASH)
   */
  async generateResponse(userMessage: string, lojistaId: string, contextData?: any): Promise<string> {
    console.log("[VertexAgent] 💬 Iniciando geração de resposta...", {
      messageLength: userMessage.length,
      lojistaId,
      hasContext: !!contextData,
    });

    // TENTATIVA 1: Gemini 1.5 Pro (Melhor raciocínio/Empatia)
    try {
      console.log("[VertexAgent] 🎯 Tentando Gemini 1.5 PRO-002...");
      const response = await this.tryModel("gemini-1.5-pro-002", userMessage, lojistaId, contextData);
      console.log("[VertexAgent] ✅ Resposta gerada com PRO-002");
      return response;
    } catch (proError: any) {
      console.warn("[VertexAgent] ⚠️ Falha no PRO-002, ativando fallback FLASH-002:", {
        error: proError?.message,
        code: proError?.code,
        status: proError?.status,
      });

      // TENTATIVA 2: Gemini 1.5 Flash (Fallback - Velocidade/Economia)
      try {
        console.log("[VertexAgent] ⚡ Tentando Gemini 1.5 FLASH-002 (fallback)...");
        const response = await this.tryModel("gemini-1.5-flash-002", userMessage, lojistaId, contextData);
        console.log("[VertexAgent] ✅ Resposta gerada com FLASH-002 (fallback)");
        return response;
      } catch (flashError: any) {
        console.error("[VertexAgent] ❌ Erro fatal em ambos os modelos:", {
          proError: proError?.message,
          flashError: flashError?.message,
        });
        throw new Error("Não consegui conectar com a Ana no momento. Tente novamente em alguns instantes.");
      }
    }
  }

  /**
   * Método de compatibilidade (mantém interface antiga)
   */
  async chat(userMessage: string, lojistaId: string, contextData?: any): Promise<string> {
    return this.generateResponse(userMessage, lojistaId, contextData);
  }
}

/**
 * Singleton do serviço
 */
let vertexAgentInstance: VertexAgent | null = null;

/**
 * Obtém instância do serviço Vertex Agent
 */
export function getVertexAgent(): VertexAgent {
  if (!vertexAgentInstance) {
    vertexAgentInstance = new VertexAgent();
  }
  return vertexAgentInstance;
}
