/**
 * Agente Ana - Serviço de IA usando Vertex AI SDK
 * Usa Gemini 1.5 Pro com Function Calling para consultar dados reais do Firestore
 */

import { VertexAI } from "@google-cloud/vertexai";
import { GoogleAuth } from "google-auth-library";
import { ANA_TOOLS, type AnaToolName } from "./ana-tools";

/**
 * Serviço do Agente Ana usando Vertex AI
 */
export class VertexAgent {
  private vertexAI: VertexAI;
  private projectId: string;
  private location: string;

  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || "";
    this.location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

    console.log("[VertexAgent] 🔧 Inicializando...", {
      projectId: this.projectId,
      location: this.location,
      hasGcpKey: !!process.env.GCP_SERVICE_ACCOUNT_KEY,
      gcpKeyLength: process.env.GCP_SERVICE_ACCOUNT_KEY?.length || 0,
    });

    if (!this.projectId) {
      throw new Error("GOOGLE_CLOUD_PROJECT_ID não configurado. Configure a variável de ambiente.");
    }

    // Configurar autenticação para Vertex AI
    // No Vercel, usa GCP_SERVICE_ACCOUNT_KEY (JSON string)
    // Localmente, usa Application Default Credentials (gcloud auth) ou GCP_SERVICE_ACCOUNT_KEY
    let credentials: any = undefined;
    
    if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
      try {
        const gcpKeyStr = process.env.GCP_SERVICE_ACCOUNT_KEY;
        console.log("[VertexAgent] 📝 Parseando GCP_SERVICE_ACCOUNT_KEY...", {
          length: gcpKeyStr.length,
          startsWith: gcpKeyStr.substring(0, 50),
        });
        
        credentials = JSON.parse(gcpKeyStr);
        
        // Validar campos essenciais
        if (!credentials.type || credentials.type !== "service_account") {
          throw new Error("GCP_SERVICE_ACCOUNT_KEY não é uma Service Account válida (type !== 'service_account')");
        }
        if (!credentials.project_id) {
          throw new Error("GCP_SERVICE_ACCOUNT_KEY não contém project_id");
        }
        if (!credentials.private_key) {
          throw new Error("GCP_SERVICE_ACCOUNT_KEY não contém private_key");
        }
        if (!credentials.client_email) {
          throw new Error("GCP_SERVICE_ACCOUNT_KEY não contém client_email");
        }
        
        console.log("[VertexAgent] ✅ Service Account válida detectada", {
          projectId: credentials.project_id,
          clientEmail: credentials.client_email,
          hasPrivateKey: !!credentials.private_key,
        });
      } catch (error: any) {
        console.error("[VertexAgent] ❌ Erro ao parsear/validar GCP_SERVICE_ACCOUNT_KEY:", {
          error: error?.message,
          stack: error?.stack?.substring(0, 500),
        });
        throw new Error(`Erro ao processar GCP_SERVICE_ACCOUNT_KEY: ${error?.message}`);
      }
    } else {
      console.log("[VertexAgent] ⚠️ GCP_SERVICE_ACCOUNT_KEY não encontrada, tentando ADC");
    }

    // Inicializar Vertex AI com credenciais explícitas se disponíveis
    // Caso contrário, usa Application Default Credentials (ADC)
    try {
      const vertexAIOptions: any = {
        project: this.projectId,
        location: this.location,
      };

      // Se temos credenciais, passar explicitamente
      if (credentials) {
        vertexAIOptions.googleAuthOptions = {
          credentials: credentials,
        };
        console.log("[VertexAgent] 🔐 Configurando Vertex AI com Service Account explícita");
      } else {
        console.log("[VertexAgent] 🔐 Configurando Vertex AI com Application Default Credentials (ADC)");
      }

      this.vertexAI = new VertexAI(vertexAIOptions);
      console.log("[VertexAgent] ✅ Vertex AI inicializado com sucesso");
    } catch (error: any) {
      console.error("[VertexAgent] ❌ Erro ao inicializar Vertex AI:", {
        error: error?.message,
        stack: error?.stack?.substring(0, 500),
      });
      throw new Error(`Erro ao inicializar Vertex AI: ${error?.message}`);
    }

    // Não inicializar modelo aqui - será feito dinamicamente com fallback
    // Isso permite tentar PRO primeiro e fazer fallback para FLASH se necessário

    console.log("[VertexAgent] ✅ Agente Ana inicializado com Vertex AI", {
      project: this.projectId,
      location: this.location,
      strategy: "PRO → FLASH (fallback automático)",
    });
  }

  /**
   * Persona da Ana - Personalidade empática e consultiva
   */
  private getPersona(): string {
    return `VOCÊ É: Ana, a Consultora de Sucesso do Cliente do 'Experimenta AI'.

PERSONALIDADE:
- Extremamente humana, empática e experiente em moda.
- Proativa e orientada a dados.
- Fala como uma colega de trabalho experiente, não como um robô.
- NUNCA diz "eu sou uma IA" a menos que perguntada diretamente. Diga "Sou sua consultora Ana".
- Usa emojis com moderação para dar tom caloroso (não exagere).

MISSÃO:
- Ajudar o lojista a vender mais usando os dados reais da loja.
- Não dar respostas genéricas. ANALISAR os dados antes de responder.
- Sugerir AÇÕES CONCRETAS baseadas em dados: "Que tal baixar o preço daquela saia que tem 30% de rejeição?" ou "Vamos criar um look novo com seus top 3 produtos mais aprovados?".

REGRAS CRÍTICAS:
- NUNCA invente dados. Use as ferramentas disponíveis para buscar a verdade antes de responder.
- Se uma ferramenta retornar "Nenhum dado encontrado" ou "Erro", seja honesto: "Não encontrei dados suficientes para responder isso. Vamos gerar mais composições primeiro?"
- Sempre que mencionar produtos, insights ou estatísticas, use as ferramentas para buscar informações atualizadas.

FORMATO DE RESPOSTAS:
- Seja direta e acionável (máximo 3-4 frases, a menos que peçam detalhes).
- Use botões de navegação quando sugerir ações: [[Nome do Botão]](/caminho)
- Se os dados indicarem problemas, sugira soluções específicas.

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
      // Validar que a função existe
      if (!(functionName in ANA_TOOLS)) {
        throw new Error(`Função desconhecida: ${functionName}`);
      }

      // Executar função
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
   * Obtém o modelo com fallback automático PRO → FLASH
   */
  private getModel(usePro: boolean = true): any {
    // Usar versões estáveis dos modelos
    const modelName = usePro ? "gemini-1.5-pro" : "gemini-1.5-flash";
    
    return this.vertexAI.preview.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        topP: 0.95,
        topK: 40,
      },
      systemInstruction: this.getPersona(),
      tools: [{
        functionDeclarations: this.getFunctionDeclarations(),
      }],
    });
  }

  /**
   * Executa uma conversa com chat (helper interno)
   */
  private async executeChatWithModel(model: any, userMessage: string, lojistaId: string, contextPrompt: string): Promise<string> {
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: `Olá Ana! Sou o lojista ${lojistaId}.${contextPrompt}` }],
        },
        {
          role: "model",
          parts: [{ text: "Olá! Sou a Ana, sua Consultora de Sucesso do Cliente. Estou aqui para ajudar você a vender mais usando dados reais da sua loja! 🚀\n\nComo posso ajudar você hoje? Posso analisar seus produtos, identificar oportunidades de venda, ou qualquer outra coisa relacionada ao seu negócio." }],
        },
      ],
    });

    const result = await chat.sendMessage(userMessage);
    const response = result.response;

    // Verificar se a IA quer chamar alguma função
    const functionCalls = response.functionCalls();

    if (functionCalls && functionCalls.length > 0) {
      console.log(`[VertexAgent] 🔧 IA solicitou ${functionCalls.length} função(ões):`, 
        functionCalls.map((c: any) => c.name).join(", "));

      // Executar todas as funções solicitadas
      const functionResults = await Promise.all(
        functionCalls.map(async (call: any) => {
          const functionName = call.name;
          const args = call.args || {};
          
          // Garantir que lojistaId está nos args
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

      console.log("[VertexAgent] ✅ Funções executadas, enviando resultados para IA...");

      // Enviar resultados das funções de volta para a IA
      const finalResult = await chat.sendMessage(functionResults);
      return finalResult.response.text();
    }

    // Se não houve function calls, retornar resposta direta
    return response.text();
  }

  /**
   * Chat com Function Calling - Orquestra a conversa e executa funções quando necessário
   * Implementa fallback automático PRO → FLASH
   */
  async chat(userMessage: string, lojistaId: string, contextData?: any): Promise<string> {
    console.log("[VertexAgent] 💬 Iniciando chat...", {
      messageLength: userMessage.length,
      lojistaId,
      hasContext: !!contextData,
    });
    
    // Construir contexto inicial
    const contextPrompt = contextData 
      ? `\n\nCONTEXTO DA LOJA:
- Nome: ${contextData.store?.name || "Sua loja"}
- Produtos cadastrados: ${contextData.store?.produtosCount || 0}
- Display conectado: ${contextData.store?.displayConnected ? "Sim" : "Não"}
- Sales configurado: ${contextData.store?.salesConfigured ? "Sim" : "Não"}
`
      : "";

    // TENTATIVA 1: Usar Gemini 1.5 PRO (melhor raciocínio/empatia)
    try {
      console.log("[VertexAgent] 🎯 Tentando Gemini 1.5 PRO-002...");
      const model = this.getModel(true);
      const response = await this.executeChatWithModel(model, userMessage, lojistaId, contextPrompt);
      console.log("[VertexAgent] ✅ Resposta do PRO recebida com sucesso");
      return response;
      
    } catch (proError: any) {
      // Log discreto do erro do PRO
      console.warn("[VertexAgent] ⚠️ Falha no PRO, ativando fallback FLASH:", {
        error: proError?.message,
        code: proError?.code,
        status: proError?.status,
      });

      // TENTATIVA 2: Fallback para Gemini 1.5 FLASH (velocidade/economia)
      try {
        console.log("[VertexAgent] ⚡ Tentando Gemini 1.5 FLASH-002 (fallback)...");
        const model = this.getModel(false);
        const response = await this.executeChatWithModel(model, userMessage, lojistaId, contextPrompt);
        console.log("[VertexAgent] ✅ Resposta do FLASH recebida com sucesso (fallback)");
        return response;
        
      } catch (flashError: any) {
        // Erro fatal em ambos os modelos
        console.error("[VertexAgent] ❌ Erro fatal em ambos os modelos (PRO e FLASH):", {
          proError: proError?.message,
          flashError: flashError?.message,
          proCode: proError?.code,
          flashCode: flashError?.code,
        });
        
        throw new Error("Não consegui conectar com a Ana no momento. Tente novamente em alguns instantes.");
      }
    }
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

