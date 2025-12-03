/**
 * Agente Ana - Serviço de IA com Function Calling
 * Usa Gemini 1.5 Pro para consultar dados reais do Firestore e dar respostas inteligentes
 */

import { GoogleGenerativeAI, FunctionDeclarationSchemaType } from "@google/generative-ai";
import { getTopSellingProducts, getLowPerformingProducts, getCustomerInsights, getStoreStats } from "./tools/store-tools";

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || 
  process.env.GOOGLE_API_KEY || 
  ""
);

/**
 * Serviço do Agente Ana com Function Calling
 */
export class GeminiAgentService {
  private model: any;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
    
    if (!this.apiKey) {
      console.warn("[GeminiAgent] ⚠️ API Key não configurada. Serviço em modo limitado.");
    }

    // Usa Gemini 1.5 Pro para ter raciocínio "humano" e empático
    // Nota: Function Calling pode não estar disponível em todos os modelos
    // Se falhar, tentaremos fallback para gemini-1.5-flash sem function calling
    try {
      this.model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-pro",
        systemInstruction: this.getPersona(),
        tools: [{
          functionDeclarations: this.getFunctionDeclarations(),
        }],
      });
      console.log("[GeminiAgent] ✅ Modelo gemini-1.5-pro configurado com Function Calling");
    } catch (error) {
      console.warn("[GeminiAgent] ⚠️ Erro ao configurar Function Calling, usando modelo sem tools:", error);
      // Fallback: modelo sem function calling
      this.model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction: this.getPersona(),
      });
    }
  }

  /**
   * Persona da Ana - Personalidade empática e consultiva
   */
  private getPersona(): string {
    return `VOCÊ É: Ana, a Gerente de Sucesso do Cliente da 'Experimenta AI'.

SUA PERSONALIDADE:
- Extremamente humana, empática e entusiasta.
- Usa emojis com moderação para dar tom caloroso (não exagere).
- Fala como uma colega de trabalho experiente, não como um robô.
- NUNCA diz "eu sou uma IA" a menos que perguntada diretamente. Diga "Sou sua assistente virtual Ana".
- Seja proativa: não espere o usuário perguntar, sugira ações baseadas nos dados.

SEU SUPER-PODER (VENDAS):
- Você não dá respostas genéricas. Você ANALISA os dados reais da loja.
- Se o cliente reclama de vendas baixas, você investiga os produtos com rejeição usando as ferramentas disponíveis.
- Você sugere AÇÕES CONCRETAS baseadas em dados: "Que tal baixar o preço daquela saia que tem 30% de rejeição?" ou "Vamos criar um look novo com seus top 3 produtos mais aprovados?".
- Sempre que possível, use as ferramentas para buscar dados reais antes de responder.

FORMATO DE RESPOSTAS:
- Seja direta e acionável (máximo 3-4 frases, a menos que peçam detalhes).
- Use botões de navegação quando sugerir ações: [[Nome do Botão]](/caminho)
- Sempre que mencionar dados (produtos, insights, estatísticas), use as ferramentas para buscar informações atualizadas.

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
        name: "getTopSellingProducts",
        description: "Busca os produtos mais vendidos/curtidos da loja. Use quando o usuário perguntar sobre produtos que vendem bem, top produtos, ou quiser saber quais produtos são mais aprovados pelos clientes.",
        parameters: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            lojistaId: {
              type: FunctionDeclarationSchemaType.STRING,
              description: "ID do lojista",
            },
            limit: {
              type: FunctionDeclarationSchemaType.NUMBER,
              description: "Número máximo de produtos a retornar (padrão: 5)",
            },
          },
          required: ["lojistaId"],
        },
      },
      {
        name: "getLowPerformingProducts",
        description: "Busca produtos com baixa performance (muitos dislikes/rejeições). Use quando o usuário perguntar sobre produtos que não vendem, produtos com problemas, ou quiser identificar produtos que precisam de atenção.",
        parameters: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            lojistaId: {
              type: FunctionDeclarationSchemaType.STRING,
              description: "ID do lojista",
            },
            limit: {
              type: FunctionDeclarationSchemaType.NUMBER,
              description: "Número máximo de produtos a retornar (padrão: 5)",
            },
          },
          required: ["lojistaId"],
        },
      },
      {
        name: "getCustomerInsights",
        description: "Busca insights recentes gerados pela IA sobre a loja (oportunidades, riscos, tendências). Use quando o usuário perguntar sobre insights, oportunidades de venda, ou quiser saber o que a IA identificou sobre o negócio.",
        parameters: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            lojistaId: {
              type: FunctionDeclarationSchemaType.STRING,
              description: "ID do lojista",
            },
            limit: {
              type: FunctionDeclarationSchemaType.NUMBER,
              description: "Número máximo de insights a retornar (padrão: 5)",
            },
          },
          required: ["lojistaId"],
        },
      },
      {
        name: "getStoreStats",
        description: "Busca estatísticas gerais da loja (total de produtos, composições, taxa de aprovação). Use quando o usuário perguntar sobre estatísticas, métricas gerais, ou quiser um resumo do desempenho da loja.",
        parameters: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            lojistaId: {
              type: FunctionDeclarationSchemaType.STRING,
              description: "ID do lojista",
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
    console.log(`[GeminiAgent] 🔧 Executando função: ${functionName}`, { args });

    try {
      switch (functionName) {
        case "getTopSellingProducts":
          return await getTopSellingProducts(lojistaId, args.limit || 5);
        
        case "getLowPerformingProducts":
          return await getLowPerformingProducts(lojistaId, args.limit || 5);
        
        case "getCustomerInsights":
          return await getCustomerInsights(lojistaId, args.limit || 5);
        
        case "getStoreStats":
          return await getStoreStats(lojistaId);
        
        default:
          throw new Error(`Função desconhecida: ${functionName}`);
      }
    } catch (error: any) {
      console.error(`[GeminiAgent] ❌ Erro ao executar função ${functionName}:`, error);
      return {
        error: error.message || "Erro ao executar função",
      };
    }
  }

  /**
   * Chat com Function Calling - Orquestra a conversa e executa funções quando necessário
   */
  async chatWithTools(userMessage: string, lojistaId: string, contextData?: any): Promise<string> {
    if (!this.apiKey) {
      throw new Error("API Key do Gemini não configurada. Configure GEMINI_API_KEY ou GOOGLE_API_KEY.");
    }

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
            parts: [{ text: "Olá! Sou a Ana, sua Gerente de Sucesso do Cliente. Estou aqui para ajudar você a vender mais! 🚀\n\nComo posso ajudar você hoje? Posso analisar seus produtos, insights de vendas, ou qualquer outra coisa relacionada ao seu negócio." }],
          },
        ],
      });

      // Enviar mensagem do usuário
      const result = await chat.sendMessage(userMessage);
      const response = result.response;

      // Verificar se a IA quer chamar alguma função
      // O SDK retorna functionCalls() como método (pode retornar undefined se não houver)
      let functionCalls: any[] = [];
      try {
        // Verificar se o método functionCalls existe e retorna algo
        if (response.functionCalls && typeof response.functionCalls === 'function') {
          const calls = response.functionCalls();
          if (calls && Array.isArray(calls) && calls.length > 0) {
            functionCalls = calls;
          }
        }
      } catch (e: any) {
        // Se não houver function calls ou método não disponível, continuar normalmente
        console.log("[GeminiAgent] ℹ️ Nenhuma função chamada pela IA ou Function Calling não disponível:", e?.message);
      }

      if (functionCalls && functionCalls.length > 0) {
        console.log(`[GeminiAgent] 🔧 IA solicitou ${functionCalls.length} função(ões):`, 
          functionCalls.map((c: any) => c.name).join(", "));

        // Executar todas as funções solicitadas
        const functionResults = await Promise.all(
          functionCalls.map(async (call: any) => {
            const functionName = call.name;
            const args = call.args || {};
            console.log(`[GeminiAgent] 📊 Executando ${functionName} com args:`, args);
            const result = await this.executeFunction(functionName, args, lojistaId);
            
            return {
              functionResponse: {
                name: functionName,
                response: result,
              },
            };
          })
        );

        console.log("[GeminiAgent] ✅ Funções executadas, enviando resultados para IA...");

        // Enviar resultados das funções de volta para a IA
        const finalResult = await chat.sendMessage(functionResults);
        return finalResult.response.text();
      }

      // Se não houve function calls, retornar resposta direta
      console.log("[GeminiAgent] 💬 Resposta direta (sem function calls)");
      return response.text();
    } catch (error: any) {
      console.error("[GeminiAgent] ❌ Erro no chat:", error);
      throw new Error(`Erro ao processar mensagem: ${error.message || "Erro desconhecido"}`);
    }
  }
}

/**
 * Singleton do serviço
 */
let geminiAgentServiceInstance: GeminiAgentService | null = null;

/**
 * Obtém instância do serviço Gemini Agent
 */
export function getGeminiAgentService(): GeminiAgentService {
  if (!geminiAgentServiceInstance) {
    geminiAgentServiceInstance = new GeminiAgentService();
  }
  return geminiAgentServiceInstance;
}

