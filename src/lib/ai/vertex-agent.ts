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
  private model: any;
  private projectId: string;
  private location: string;

  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || "";
    this.location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

    if (!this.projectId) {
      throw new Error("GOOGLE_CLOUD_PROJECT_ID não configurado. Configure a variável de ambiente.");
    }

    // Configurar autenticação para Vertex AI
    // No Vercel, usa GCP_SERVICE_ACCOUNT_KEY (JSON string)
    // Localmente, usa Application Default Credentials (gcloud auth) ou GCP_SERVICE_ACCOUNT_KEY
    let credentials: any = undefined;
    
    if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
      try {
        credentials = JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY);
        console.log("[VertexAgent] ✅ Service Account detectada do GCP_SERVICE_ACCOUNT_KEY");
      } catch (error: any) {
        console.error("[VertexAgent] ❌ Erro ao parsear GCP_SERVICE_ACCOUNT_KEY:", error?.message);
        throw new Error(`Erro ao parsear GCP_SERVICE_ACCOUNT_KEY: ${error?.message}`);
      }
    }

    // Inicializar Vertex AI com credenciais explícitas se disponíveis
    // Caso contrário, usa Application Default Credentials (ADC)
    const vertexAIOptions: any = {
      project: this.projectId,
      location: this.location,
    };

    // Se temos credenciais, passar explicitamente
    if (credentials) {
      vertexAIOptions.googleAuthOptions = {
        credentials: credentials,
      };
      console.log("[VertexAgent] 🔐 Usando autenticação com Service Account explícita");
    } else {
      console.log("[VertexAgent] 🔐 Usando Application Default Credentials (ADC)");
    }

    this.vertexAI = new VertexAI(vertexAIOptions);

    // Configurar modelo Gemini 1.5 Pro
    // Usar versão estável mais recente
    this.model = this.vertexAI.preview.getGenerativeModel({
      model: "gemini-1.5-pro",
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

    console.log("[VertexAgent] ✅ Agente Ana inicializado com Vertex AI", {
      project: this.projectId,
      location: this.location,
      model: "gemini-1.5-pro",
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
   * Chat com Function Calling - Orquestra a conversa e executa funções quando necessário
   */
  async chat(userMessage: string, lojistaId: string, contextData?: any): Promise<string> {
    try {
      // Construir contexto inicial
      const contextPrompt = contextData 
        ? `\n\nCONTEXTO DA LOJA:
- Nome: ${contextData.store?.name || "Sua loja"}
- Produtos cadastrados: ${contextData.store?.produtosCount || 0}
- Display conectado: ${contextData.store?.displayConnected ? "Sim" : "Não"}
- Sales configurado: ${contextData.store?.salesConfigured ? "Sim" : "Não"}
`
        : "";

      // Iniciar chat
      const chat = this.model.startChat({
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

      // Enviar mensagem do usuário
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
            console.log(`[VertexAgent] 📊 Executando ${functionName} com args:`, args);
            
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
      console.log("[VertexAgent] 💬 Resposta direta (sem function calls)");
      return response.text();
    } catch (error: any) {
      console.error("[VertexAgent] ❌ Erro no chat:", error);
      throw new Error(`Erro ao processar mensagem: ${error.message || "Erro desconhecido"}`);
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

