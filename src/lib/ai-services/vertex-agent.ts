/**
 * Agente Ana - Serviço de IA usando Vertex AI SDK
 * Implementação Blindada: Gemini 1.5 Flash ONLY
 */

import { VertexAI } from "@google-cloud/vertexai";
import { GoogleAuth } from "google-auth-library";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { ANA_TOOLS, type AnaToolName } from "@/lib/ai/ana-tools";

/**
 * Interface para metadados de grounding (Google Search)
 */
export interface GroundingMetadata {
  webSearchQueries?: string[];
  groundingChunks?: Array<{
    web?: {
      uri?: string;
      title?: string;
    };
  }>;
}

/**
 * Interface para resposta do chat com metadados de grounding
 */
export interface ChatResponse {
  text: string;
  groundingMetadata?: GroundingMetadata;
}

/**
 * Serviço do Agente Ana usando Vertex AI
 * Modelo: Gemini 2.0 Flash (versão estável e vigente)
 * Documentação: 
 * - https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference?hl=pt-br
 * - https://docs.cloud.google.com/vertex-ai/generative-ai/docs/migrate?hl=pt-br
 * - https://docs.cloud.google.com/vertex-ai/generative-ai/docs/grounding/grounding-with-google-search
 * 
 * NOTA: Gemini 1.5 foi marcado como "Deprecated" e "Retired"
 * Gemini 2.0 Flash é o modelo atual recomendado para produção
 */
export class VertexAgent {
  private vertexAI: VertexAI;
  private project: string;
  private location: string;
  // Modelo vigente: Gemini 2.0 Flash (versão estável)
  // Gemini 1.5 foi descontinuado - usar 2.0 para produção
  private modelName = "gemini-2.0-flash-001";

  constructor() {
    // Prioridade para o ID que sabemos que tem a API ativa
    // FIX: ID correto do projeto onde a API Vertex AI está ativa
    this.project = process.env.GOOGLE_CLOUD_PROJECT_ID || 
                   process.env.FIREBASE_PROJECT_ID || 
                   "paineladmexperimenteai"; // <--- ID CORRETO (projeto com Vertex AI ativo)
    this.location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

    console.log(`[VertexAgent] Inicializando:`);
    console.log(`- Projeto: ${this.project}`);
    console.log(`- Modelo: ${this.modelName}`);
    console.log(`- Região: ${this.location}`);

    if (!this.project) {
      throw new Error("FATAL: Project ID não definido.");
    }

    // Configurar autenticação para Vertex AI
    // No Vercel, usa GCP_SERVICE_ACCOUNT_KEY (JSON string)
    // Localmente, usa Application Default Credentials (gcloud auth) ou GCP_SERVICE_ACCOUNT_KEY
    let credentials: any = undefined;
    
    if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
      try {
        const gcpKeyStr = process.env.GCP_SERVICE_ACCOUNT_KEY;
        console.log("[VertexAgent] 📝 Parseando GCP_SERVICE_ACCOUNT_KEY...");
        
        credentials = JSON.parse(gcpKeyStr);
        
        // Validar campos essenciais
        if (!credentials.type || credentials.type !== "service_account") {
          throw new Error("GCP_SERVICE_ACCOUNT_KEY não é uma Service Account válida");
        }
        if (!credentials.project_id) {
          throw new Error("GCP_SERVICE_ACCOUNT_KEY não contém project_id");
        }
        
        console.log("[VertexAgent] ✅ Service Account válida detectada");
      } catch (error: any) {
        console.error("[VertexAgent] ❌ Erro ao parsear GCP_SERVICE_ACCOUNT_KEY:", error?.message);
        throw new Error(`Erro ao processar GCP_SERVICE_ACCOUNT_KEY: ${error?.message}`);
      }
    }

    // Inicializar Vertex AI com credenciais explícitas se disponíveis
    try {
      // Se temos credenciais, criar arquivo temporário para o SDK detectar
      if (credentials) {
        console.log("[VertexAgent] 🔐 Configurando Vertex AI com Service Account explícita");
        
        // Salvar credenciais em arquivo temporário
        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, `vertex-ai-credentials-${this.project}-${Date.now()}.json`);
        
        try {
          // Salvar JSON no arquivo temporário
          fs.writeFileSync(tempFilePath, JSON.stringify(credentials, null, 2));
          console.log("[VertexAgent] 📁 Arquivo temporário criado:", tempFilePath);
          
          // Configurar variável de ambiente para o SDK detectar
          process.env.GOOGLE_APPLICATION_CREDENTIALS = tempFilePath;
          
          // Inicializar VertexAI - ele detectará automaticamente o arquivo via GOOGLE_APPLICATION_CREDENTIALS
          this.vertexAI = new VertexAI({
            project: this.project,
            location: this.location,
          });
          
          console.log("[VertexAgent] ✅ Vertex AI inicializado com Service Account");
        } catch (fileError: any) {
          console.error("[VertexAgent] ❌ Erro ao criar arquivo temporário:", fileError?.message);
          // Fallback: tentar sem arquivo
          this.vertexAI = new VertexAI({
            project: this.project,
            location: this.location,
          });
          console.log("[VertexAgent] ⚠️ Vertex AI inicializado sem arquivo de credenciais");
        }
      } else {
        console.log("[VertexAgent] 🔐 Configurando Vertex AI com Application Default Credentials (ADC)");
        
        // Sem credenciais explícitas, usa ADC (gcloud auth ou GOOGLE_APPLICATION_CREDENTIALS)
        this.vertexAI = new VertexAI({
      project: this.project,
      location: this.location,
    });
        
        console.log("[VertexAgent] ✅ Vertex AI inicializado com ADC");
      }
    } catch (error: any) {
      console.error("[VertexAgent] ❌ Erro ao inicializar Vertex AI:", {
        error: error?.message,
        code: error?.code,
        status: error?.status,
      });
      throw new Error(`Erro ao inicializar Vertex AI: ${error?.message}`);
    }
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
   * Gera resposta usando Gemini 2.0 Flash com suporte a imagem (multimodal)
   */
  async sendMessageWithImage(
    userMessage: string,
    context: string,
    imageUrl: string
  ): Promise<ChatResponse> {
    const systemPrompt = `
      VOCÊ É: Ana, a Inteligência do Painel.
      SUA MISSÃO: Ajudar o lojista a vender mais.
      CONTEXTO ATUAL:
      ${context}
      
      REGRAS:
      1. Responda de forma curta, animada e humana.
      2. Use emojis moderadamente.
      3. Se o contexto tiver dados de vendas, use-os.
      4. Se uma imagem for fornecida, você pode VER e analisar visualmente.
      5. COPYWRITER: Se pedirem legenda, crie texto vendedor com emojis e hashtags.
      6. CRÍTICA VISUAL: Se pedirem opinião, analise cores, estilo e adequação ao cenário.
    `;

    try {
      console.log(`[VertexAgent] 📸 Enviando mensagem com imagem para ${this.modelName}...`);
      console.log(`[VertexAgent] 🖼️ URL da imagem: ${imageUrl.substring(0, 100)}...`);

      const model = this.vertexAI.preview.getGenerativeModel({ 
        model: this.modelName,
        systemInstruction: systemPrompt,
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
        },
      });

      // Preparar conteúdo multimodal: texto + imagem
      // O SDK do Vertex AI espera um objeto com 'contents' contendo 'parts'
      const parts: any[] = [
        { text: userMessage },
      ];

      // Adicionar imagem - tentar URL pública primeiro
      if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
        // URL pública - Gemini pode acessar diretamente via fileData
        parts.push({
          fileData: {
            fileUri: imageUrl,
            mimeType: "image/jpeg", // Assumir JPEG, pode ser ajustado
          },
        });
        console.log("[VertexAgent] 📤 Usando URL pública da imagem");
      } else if (imageUrl.startsWith("data:image/")) {
        // Data URL - converter para base64
        const base64Match = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
        if (base64Match) {
          const mimeType = base64Match[1];
          const base64Data = base64Match[2];
          parts.push({
            inlineData: {
              data: base64Data,
              mimeType: `image/${mimeType}`,
            },
          });
          console.log("[VertexAgent] 📤 Usando data URL (base64) da imagem");
        }
      } else {
        console.warn("[VertexAgent] ⚠️ Formato de imagem não suportado, usando apenas texto");
      }

      // O SDK do Vertex AI espera um objeto GenerateContentRequest
      // Habilitar Grounding com Google Search
      const result = await model.generateContent({
        contents: [{
          role: "user",
          parts: parts,
        }],
        // Configurar Grounding com Google Search (usando as any temporariamente até SDK atualizar tipos)
        groundingConfig: {
          googleSearchRetrieval: {
            disableAttribution: false, // Manter atribuição das fontes
          },
        } as any,
      } as any);
      const response = result.response;
      
      console.log(`[VertexAgent] 📥 Resposta recebida de ${this.modelName} (com imagem)`);
      
      // Tratamento seguro da resposta
      if (!response.candidates || response.candidates.length === 0) {
        console.warn("[VertexAgent] ⚠️ Resposta sem candidates");
        return { text: "Não consegui formular uma resposta agora." };
      }

      const candidate = response.candidates[0];
      const text = candidate.content.parts[0].text;
      
      if (!text) {
        console.warn("[VertexAgent] ⚠️ Resposta sem texto");
        return { text: "Resposta vazia da IA." };
      }

      // Extrair metadados de grounding (Google Search)
      let groundingMetadata: GroundingMetadata | undefined;
      if (candidate.groundingMetadata) {
        groundingMetadata = {
          webSearchQueries: candidate.groundingMetadata.webSearchQueries || [],
          groundingChunks: candidate.groundingMetadata.groundingChunks || [],
        };
        
        if (groundingMetadata.webSearchQueries && groundingMetadata.webSearchQueries.length > 0) {
          console.log(`[VertexAgent] 🔍 Grounding detectado: ${groundingMetadata.webSearchQueries.length} search queries`);
        }
      }

      console.log(`[VertexAgent] ✅ Texto extraído (com imagem): ${text.length} caracteres`);
      return { text, groundingMetadata };

    } catch (error: any) {
      console.error("[VertexAgent] ❌ Erro Crítico (com imagem):", {
        error: error?.message,
        code: error?.code,
        status: error?.status,
        model: this.modelName,
        project: this.project,
      });
      
      // Diagnóstico de erros comuns da Vertex
      if (error.message?.includes("404") || error.message?.includes("Not Found")) {
        return { text: `ERRO DE CONFIGURAÇÃO (404): O modelo '${this.modelName}' não foi encontrado no projeto '${this.project}'. Verifique se a API Vertex AI está ativada.` };
      }
      if (error.message?.includes("PermissionDenied") || error.message?.includes("403")) {
        return { text: `ERRO DE PERMISSÃO (403): A credencial atual não tem acesso ao projeto '${this.project}'. Verifique as permissões da Service Account.` };
      }
      if (error.message?.includes("Unable to authenticate")) {
        return { text: `ERRO DE AUTENTICAÇÃO: Não foi possível autenticar com o projeto '${this.project}'. Verifique as credenciais.` };
      }
      
      // Fallback: tentar sem imagem
      console.log("[VertexAgent] 🔄 Tentando resposta sem imagem como fallback...");
      return this.sendMessage(userMessage, context);
    }
  }

  /**
   * Obtém declarações de funções para Function Calling
   */
  private getFunctionDeclarations() {
    return [
      {
        name: "getStoreVitalStats",
        description: "🚨 FERRAMENTA OBRIGATÓRIA para perguntas sobre valores totais, somas, cálculos financeiros e estatísticas gerais! Busca estatísticas vitais da loja: total de produtos, composições, taxa de aprovação, vendas recentes, VALOR TOTAL DO ESTOQUE (soma de todos os preços dos produtos). Use SEMPRE quando o usuário perguntar: 'qual valor total dos produtos?', 'quanto vale meu estoque?', 'qual a soma dos preços?', 'valor total da loja?', 'quantos produtos tenho no total?', 'quantas composições?', 'qual a taxa de aprovação?'. Esta função CALCULA automaticamente o valor total do estoque somando todos os preços dos produtos. NUNCA responda sobre valores totais sem usar esta ferramenta!",
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
        name: "getProductsByCategory",
        description: "OBRIGATÓRIO: Use esta ferramenta quando o usuário perguntar sobre produtos de uma categoria. Exemplos: 'quais tênis tenho?', 'quantos calçados temos?', 'quais vestidos tenho?', 'quantos tênis tem na minha loja?'. Esta ferramenta busca produtos reais do banco de dados da loja. NUNCA responda sem usar esta ferramenta primeiro quando a pergunta for sobre produtos de uma categoria!",
        parameters: {
          type: "object",
          properties: {
            lojistaId: {
              type: "string",
              description: "ID do lojista (sempre use o lojistaId fornecido)",
            },
            categoria: {
              type: "string",
              description: "Categoria do produto a buscar. Exemplos: 'tênis', 'calçados', 'sapatos', 'roupas', 'vestidos', 'acessórios'. Use o termo exato que o usuário mencionou ou um termo relacionado.",
            },
          },
          required: ["lojistaId", "categoria"],
        },
      },
      {
        name: "getTopOpportunities",
        description: "Busca oportunidades de venda identificadas pelo sistema. Use quando o usuário perguntar sobre oportunidades ou sugestões de ações.",
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
        description: "Busca produtos com baixa performance (alto índice de rejeição). Use quando o usuário perguntar sobre produtos problemáticos ou com baixa aprovação.",
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
      {
        name: "getProductsByName",
        description: "🚨 FERRAMENTA OBRIGATÓRIA para TODAS as perguntas sobre produtos! Use SEMPRE que o usuário perguntar: 'quais tênis tenho?', 'quantos tênis tem?', 'tenho tênis?', 'quantos produtos tenho?', 'o que tem na minha loja?', 'quais produtos?', 'preço de X', 'quanto custa X?'. Esta ferramenta consulta o banco de dados REAL da loja usando busca inteligente por similaridade e palavras-chave. NUNCA responda 'não encontrei' ou 'não tenho acesso' SEM usar esta ferramenta primeiro! IMPORTANTE: Esta ferramenta busca de forma FLEXÍVEL - encontra produtos mesmo com pequenas variações no nome (ex: 'tenis' encontra 'tênis', 'TÊNIS', 'Tenis Nike', etc). Sempre use o termo exato que o usuário mencionou (ex: se ele disse 'tenis', use 'tenis'; se disse 'calçados', use 'calçados'). Você DEVE chamar esta função ANTES de qualquer resposta sobre produtos.",
        parameters: {
          type: "object",
          properties: {
            lojistaId: {
              type: "string",
              description: "ID do lojista (sempre use o lojistaId fornecido)",
            },
            nomeProduto: {
              type: "string",
              description: "Nome ou termo do produto a buscar. Use o termo que o usuário mencionou (ex: 'tênis', 'calçados', 'sapatos', 'tênis nike', 'vestido azul'). Para perguntas genéricas como 'quais tênis tenho?', use 'tênis'. Para 'quantos tênis tem?', use 'tênis'.",
            },
          },
          required: ["lojistaId", "nomeProduto"],
        },
      },
      {
        name: "getClientByName",
        description: "OBRIGATÓRIO: Use esta ferramenta quando o usuário perguntar sobre clientes, informações de cliente, ou mencionar um nome de cliente. Exemplos: 'cliente charles', 'informações do cliente X', 'dados do cliente Y', 'quem é o cliente Z?'. Esta ferramenta busca clientes reais do banco de dados da loja. NUNCA responda sobre clientes sem usar esta ferramenta primeiro!",
        parameters: {
          type: "object",
          properties: {
            lojistaId: {
              type: "string",
              description: "ID do lojista",
            },
            nomeCliente: {
              type: "string",
              description: "Nome ou termo do cliente a buscar. Use o nome que o usuário mencionou (ex: 'charles', 'maria', 'joão').",
            },
          },
          required: ["lojistaId", "nomeCliente"],
        },
      },
      {
        name: "getCompositions",
        description: "OBRIGATÓRIO: Use esta ferramenta quando o usuário perguntar sobre composições, looks gerados, ou histórico de composições. Exemplos: 'quais composições foram geradas?', 'últimas composições', 'composições recentes', 'quantas composições foram criadas?'. Esta ferramenta busca composições reais do banco de dados da loja.",
        parameters: {
          type: "object",
          properties: {
            lojistaId: {
              type: "string",
              description: "ID do lojista",
            },
            limit: {
              type: "number",
              description: "Número máximo de composições a retornar (padrão: 10)",
            },
          },
          required: ["lojistaId"],
        },
      },
      {
        name: "getFinancialAnalysis",
        description: "OBRIGATÓRIO: Use esta ferramenta quando o usuário perguntar sobre situação financeira, créditos, saldo, gastos, plano, ou qualquer questão financeira. Exemplos: 'qual meu saldo?', 'quantos créditos tenho?', 'quanto gastei?', 'qual meu plano?', 'análise financeira', 'situação financeira'. Esta ferramenta busca dados financeiros reais da loja.",
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
        name: "getSalesAnalysis",
        description: "OBRIGATÓRIO: Use esta ferramenta quando o usuário perguntar sobre vendas, checkouts, conversões, compartilhamentos, receita, ticket médio, ou análise de vendas. Exemplos: 'quantas vendas?', 'qual a taxa de conversão?', 'quantos checkouts?', 'análise de vendas', 'receita', 'ticket médio'. Esta ferramenta busca dados de vendas reais da loja.",
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
        name: "getCRMAnalysis",
        description: "OBRIGATÓRIO: Use esta ferramenta quando o usuário perguntar sobre CRM, clientes ativos, oportunidades, segmentação, ou análise de clientes. Exemplos: 'quantos clientes ativos?', 'análise de CRM', 'oportunidades', 'clientes novos', 'radar de oportunidades'. Esta ferramenta busca dados de CRM reais da loja.",
        parameters: {
          type: "object",
          properties: {
            lojistaId: {
              type: "string",
              description: "ID do lojista",
            },
            days: {
              type: "number",
              description: "Número de dias para análise (padrão: 7)",
            },
          },
          required: ["lojistaId"],
        },
      },
      {
        name: "getCustomerFullProfile",
        description: "OBRIGATÓRIO: Use esta ferramenta quando o usuário perguntar sobre perfil completo de um cliente, preferências, estilo, cores favoritas, ou análise profunda de cliente. Exemplos: 'perfil do cliente X', 'análise do cliente Y', 'preferências do cliente Z', 'estilo do cliente'. Esta ferramenta busca análise profunda do cliente.",
        parameters: {
          type: "object",
          properties: {
            lojistaId: {
              type: "string",
              description: "ID do lojista",
            },
            customerId: {
              type: "string",
              description: "ID do cliente",
            },
          },
          required: ["lojistaId", "customerId"],
        },
      },
    ];
  }

  /**
   * Executa uma função baseado no nome
   */
  private async executeFunction(functionName: string, args: any, lojistaId: string): Promise<any> {
    console.log(`[VertexAgent] 🔧 Executando função: ${functionName}`, args);
    
    if (!(functionName in ANA_TOOLS)) {
      throw new Error(`Função ${functionName} não encontrada`);
    }

    try {
      // Mapear argumentos para a função específica
      if (functionName === "getStoreVitalStats") {
        const tool = ANA_TOOLS.getStoreVitalStats;
        return await tool(lojistaId);
      } else if (functionName === "getProductsByCategory") {
        const tool = ANA_TOOLS.getProductsByCategory;
        return await tool(lojistaId, args.categoria || "");
      } else if (functionName === "getTopOpportunities") {
        const tool = ANA_TOOLS.getTopOpportunities;
        return await tool(lojistaId, args.limit || 5);
      } else if (functionName === "getProductPerformance") {
        const tool = ANA_TOOLS.getProductPerformance;
        return await tool(lojistaId, args.limit || 5);
      } else if (functionName === "getProductsByName") {
        const tool = ANA_TOOLS.getProductsByName;
        return await tool(lojistaId, args.nomeProduto || "");
      } else if (functionName === "getClientByName") {
        const tool = ANA_TOOLS.getClientByName;
        return await tool(lojistaId, args.nomeCliente || "");
      } else if (functionName === "getCompositions") {
        const tool = ANA_TOOLS.getCompositions;
        return await tool(lojistaId, args.limit || 10);
      } else if (functionName === "getFinancialAnalysis") {
        const tool = ANA_TOOLS.getFinancialAnalysis;
        return await tool(lojistaId);
      } else if (functionName === "getSalesAnalysis") {
        const tool = ANA_TOOLS.getSalesAnalysis;
        return await tool(lojistaId);
      } else if (functionName === "getCRMAnalysis") {
        const tool = ANA_TOOLS.getCRMAnalysis;
        return await tool(lojistaId, args.days || 7);
      } else if (functionName === "getCustomerFullProfile") {
        const tool = ANA_TOOLS.getCustomerFullProfile;
        return await tool(lojistaId, args.customerId || "");
      }
      
      throw new Error(`Função ${functionName} não implementada`);
    } catch (error: any) {
      console.error(`[VertexAgent] ❌ Erro ao executar ${functionName}:`, error);
      return { error: error.message || "Erro ao executar função" };
    }
  }

  /**
   * Gera resposta usando Gemini 2.0 Flash com Function Calling e Chat History (apenas texto)
   */
  async sendMessage(userMessage: string, context: string, lojistaId?: string, history: any[] = []): Promise<ChatResponse> {
    // Se o context já contém um systemPrompt completo (começa com "ROLE:"), use-o diretamente
    // Caso contrário, construa um systemPrompt básico
    const isFullSystemPrompt = context.trim().startsWith('ROLE:');
    console.log(`[VertexAgent] 📝 SystemPrompt completo: ${isFullSystemPrompt ? 'SIM' : 'NÃO'}`);
    
    // Construir systemPrompt com instruções explícitas sobre histórico
    const historyInstructions = history && history.length > 0 
      ? `
      
🚨🚨🚨 INSTRUÇÃO CRÍTICA E OBRIGATÓRIA SOBRE MEMÓRIA CONVERSACIONAL 🚨🚨🚨

VOCÊ ESTÁ RECEBENDO ${history.length} MENSAGENS ANTERIORES NO HISTÓRICO DA CONVERSA.

REGRA DE OURO: SEMPRE LEIA O HISTÓRICO ANTES DE RESPONDER QUALQUER PERGUNTA!

PROCESSO OBRIGATÓRIO (FAÇA ISSO AGORA ANTES DE CONTINUAR):
1. LEIA TODO O HISTÓRICO de cima para baixo - TODAS AS ${history.length} MENSAGENS
2. PROCURE informações mencionadas: nome do usuário, preferências, contexto, fatos mencionados
3. SE o usuário perguntar algo que foi mencionado antes, USE A INFORMAÇÃO DO HISTÓRICO
4. **VERIFIQUE SE VOCÊ FEZ ALGUMA PERGUNTA ANTERIORMENTE** - Se sim, e o usuário respondeu positivamente (ex: "sim", "ok", "claro", "quero"), você DEVE dar seguimento com ações concretas

EXEMPLO CONCRETO E OBRIGATÓRIO:
Se no histórico você vir:
- Mensagem do usuário: "meu nome é pierre"
- E depois o usuário perguntar: "qual o meu nome?"

VOCÊ DEVE RESPONDER EXATAMENTE: "Seu nome é pierre! 😊"

EXEMPLO DE CONTINUIDADE OBRIGATÓRIA:
Se no histórico você vir:
- Sua mensagem: "Vi que sua taxa de aprovação está em 0% Vamos melhorar isso?"
- Resposta do usuário: "sim" ou "ok" ou "claro"

VOCÊ DEVE RESPONDER COM AÇÕES CONCRETAS, como:
"Ótimo! Vamos começar! Aqui estão as primeiras ações:
1. Verifique quais produtos têm maior taxa de aprovação
2. Analise os feedbacks dos clientes
3. Ajuste os produtos com baixa aprovação
Quer que eu te mostre seus produtos mais aprovados agora? [[Ver Produtos]](/produtos)"

NUNCA, JAMAIS, SOB NENHUMA CIRCUNSTÂNCIA diga "não sei" ou "eu não sei seu nome" se essa informação estiver no histórico!

NUNCA, JAMAIS, SOB NENHUMA CIRCUNSTÂNCIA deixe uma pergunta que você mesmo fez sem dar seguimento quando o usuário responder positivamente!

VERIFICAÇÃO OBRIGATÓRIA ANTES DE CADA RESPOSTA:
1. ✅ Li o histórico completo? (${history.length} mensagens)
2. ✅ Procurei informações relevantes na pergunta do usuário?
3. ✅ Usei as informações do histórico na minha resposta?
4. ✅ Verifiquei se eu fiz alguma pergunta anteriormente? Se sim, o usuário respondeu? Se respondeu positivamente, estou dando seguimento?

SE A RESPOSTA FOR "não sei" E A INFORMAÇÃO ESTIVER NO HISTÓRICO, VOCÊ ESTÁ ERRANDO!
SE VOCÊ FEZ UMA PERGUNTA E O USUÁRIO RESPONDEU POSITIVAMENTE MAS VOCÊ NÃO DEU SEGUIMENTO, VOCÊ ESTÁ ERRANDO!

O HISTÓRICO ESTÁ DISPONÍVEL - USE-O!
`
      : '';

    const systemPrompt = isFullSystemPrompt
      ? context + historyInstructions // Adicionar instruções de histórico mesmo no prompt completo
      : `
      VOCÊ É: Ana, a Inteligência do Painel.
      SUA MISSÃO: Ajudar o lojista a vender mais.
      CONTEXTO ATUAL:
      ${context}
      ${historyInstructions}
      
      🚨🚨🚨 REGRA FUNDAMENTAL CRÍTICA: USE AS FERRAMENTAS ANTES DE RESPONDER! 🚨🚨🚨
      
      **QUANDO USAR FERRAMENTAS (APENAS PARA PERGUNTAS SOBRE DADOS DA LOJA):**
      - Use ferramentas APENAS quando o usuário perguntar sobre: produtos, estatísticas, dados da loja, preços, categorias
      - NÃO use ferramentas para: cumprimentos, perguntas pessoais, conversas gerais, perguntas sobre o nome do usuário
      
      **QUANDO O USUÁRIO PERGUNTAR SOBRE PRODUTOS, ESTATÍSTICAS OU DADOS DA LOJA:**
      - Você TEM ACESSO a ferramentas que consultam o banco de dados REAL da loja
      - Você DEVE OBRIGATORIAMENTE usar essas ferramentas ANTES de responder
      - NUNCA, JAMAIS diga "não encontrei" ou "não tenho acesso" sem usar as ferramentas primeiro
      - Se não usar as ferramentas, você estará inventando dados - isso é CRÍTICO!
      
      **MAPEAMENTO OBRIGATÓRIO (SIGA EXATAMENTE):**
      - "quais tênis tenho?", "quantos tênis tem?", "tenho tênis?" → **OBRIGATÓRIO:** getProductsByName(lojistaId, "tênis")
      - "quantos produtos tenho?", "o que tem na loja?" → **OBRIGATÓRIO:** getProductsByName(lojistaId, "produtos") OU getStoreVitalStats(lojistaId)
      - "quais calçados tenho?" → **OBRIGATÓRIO:** getProductsByName(lojistaId, "calçados")
      - "quanto custa X?", "preço de X" → **OBRIGATÓRIO:** getProductsByName(lojistaId, "X")
      - "X está caro?", "comparar preço" → **OBRIGATÓRIO:** getProductsByName(lojistaId, "X") + Grounding (busca web)
      - "estatísticas", "métricas", "taxa de aprovação" → **OBRIGATÓRIO:** getStoreVitalStats(lojistaId)
      - "cliente X", "informações do cliente X", "dados do cliente X" → **OBRIGATÓRIO:** getClientByName(lojistaId, "X")
      - "composições", "looks gerados", "últimas composições" → **OBRIGATÓRIO:** getCompositions(lojistaId)
      - "saldo", "créditos", "situação financeira", "análise financeira", "quanto gastei", "qual meu plano" → **OBRIGATÓRIO:** getFinancialAnalysis(lojistaId)
      - "vendas", "checkouts", "conversão", "receita", "ticket médio", "análise de vendas" → **OBRIGATÓRIO:** getSalesAnalysis(lojistaId)
      - "CRM", "clientes ativos", "oportunidades", "radar", "análise de CRM" → **OBRIGATÓRIO:** getCRMAnalysis(lojistaId)
      - "perfil do cliente X", "análise do cliente Y", "preferências do cliente" → **OBRIGATÓRIO:** getCustomerFullProfile(lojistaId, customerId)
      
      **QUANDO NÃO USAR FERRAMENTAS (PERGUNTAS CONVERSACIONAIS):**
      - "meu nome é X" → NÃO use ferramentas, apenas confirme e guarde no histórico
      - "qual o meu nome?" → NÃO use ferramentas, procure no histórico da conversa
      - "olá", "oi", "bom dia" → NÃO use ferramentas, apenas cumprimente
      - Perguntas pessoais ou conversacionais → NÃO use ferramentas, responda diretamente usando o histórico
      
      **PROCESSO:** 1) Identifique se é pergunta sobre dados (use ferramenta) ou conversacional (não use), 2) Se for sobre dados, USE a ferramenta, 3) Aguarde resultado, 4) Responda com os dados ou diretamente
      
      REGRAS CRÍTICAS:
      1. **RESPONDA DIRETAMENTE** a pergunta do usuário PRIMEIRO. Não ignore a pergunta para fazer sugestões.
      2. **LEIA O HISTÓRICO PRIMEIRO** antes de responder qualquer pergunta.
      3. **USE O HISTÓRICO** para lembrar informações mencionadas (nome do usuário, preferências).
      4. Se o usuário perguntar algo pessoal (ex: "qual o meu nome?"), PROCURE NO HISTÓRICO.
      5. **CONTINUIDADE DE CONVERSA**: Se você fez uma pergunta anteriormente e o usuário respondeu positivamente (ex: "sim", "ok", "claro"), você DEVE:
         - Reconhecer a resposta
         - Dar seguimento imediato com ações concretas
         - NUNCA deixar a conversa sem continuação
         - Oferecer soluções práticas ou próximos passos
      6. Responda de forma curta, animada e humana.
      7. Use emojis moderadamente.
      8. NUNCA invente números ou dados. Sempre use as funções.
      9. NUNCA diga "não consigo informar" - sempre use as funções primeiro.
      10. **NÃO** confunda o nome da loja com o nome do usuário.
      11. **NUNCA** deixe perguntas que você mesmo fez sem dar seguimento quando o usuário responder.
    `;

    try {
      console.log(`[VertexAgent] 📤 Conectando ao Gemini 2.0 Flash...`);
      console.log(`[VertexAgent] 📤 Enviando mensagem para ${this.modelName}...`);

      // Detectar se precisa forçar uso de ferramentas ANTES de criar o modelo
      const userMsgLower = userMessage.toLowerCase();
      const keywordsProdutos = ['tênis', 'tenis', 'calçado', 'calçados', 'sapato', 'sapatos', 'produto', 'produtos', 'quantos', 'quais', 'preço', 'preco', 'custa', 'caro', 'barato', 'loja', 'estatística', 'estatisticas'];
      const keywordsClientes = ['cliente', 'clientes', 'informações do cliente', 'dados do cliente', 'quem é o cliente', 'perfil do cliente', 'análise do cliente'];
      const keywordsComposicoes = ['composição', 'composições', 'looks', 'look gerado', 'última composição', 'composições recentes'];
      const keywordsFinanceiro = ['saldo', 'créditos', 'crédito', 'financeiro', 'financeira', 'gastei', 'gastos', 'plano', 'situação financeira', 'análise financeira'];
      const keywordsVendas = ['vendas', 'venda', 'checkout', 'checkouts', 'conversão', 'conversões', 'receita', 'ticket médio', 'análise de vendas', 'compartilhamento', 'compartilhamentos'];
      const keywordsCRM = ['crm', 'clientes ativos', 'oportunidades', 'radar', 'análise de crm', 'segmentação', 'clientes novos'];
      const keywordsConversacionais = ['meu nome', 'me chamo', 'sou o', 'qual o meu nome', 'ola', 'olá', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'obrigado', 'obrigada', 'tchau', 'até logo'];
      const isPerguntaSobreProdutos = keywordsProdutos.some(keyword => userMsgLower.includes(keyword)) && 
                                     !keywordsConversacionais.some(keyword => userMsgLower.includes(keyword));
      const isPerguntaSobreClientes = keywordsClientes.some(keyword => userMsgLower.includes(keyword)) && 
                                     !keywordsConversacionais.some(keyword => userMsgLower.includes(keyword));
      const isPerguntaSobreComposicoes = keywordsComposicoes.some(keyword => userMsgLower.includes(keyword)) && 
                                        !keywordsConversacionais.some(keyword => userMsgLower.includes(keyword));
      const isPerguntaSobreFinanceiro = keywordsFinanceiro.some(keyword => userMsgLower.includes(keyword)) && 
                                        !keywordsConversacionais.some(keyword => userMsgLower.includes(keyword));
      const isPerguntaSobreVendas = keywordsVendas.some(keyword => userMsgLower.includes(keyword)) && 
                                    !keywordsConversacionais.some(keyword => userMsgLower.includes(keyword));
      const isPerguntaSobreCRM = keywordsCRM.some(keyword => userMsgLower.includes(keyword)) && 
                                 !keywordsConversacionais.some(keyword => userMsgLower.includes(keyword));
      
      // Se for pergunta sobre qualquer área do painel, precisa usar ferramentas
      const precisaFerramentas = isPerguntaSobreProdutos || isPerguntaSobreClientes || isPerguntaSobreComposicoes || 
                                 isPerguntaSobreFinanceiro || isPerguntaSobreVendas || isPerguntaSobreCRM;
      
      // Criar modelo com configuração apropriada baseada no tipo de pergunta
      // Se for pergunta sobre produtos, clientes ou composições, usar ANY para forçar uso de ferramentas
      // Se for conversacional, usar AUTO para evitar uso desnecessário
      const functionCallingMode = precisaFerramentas ? 'ANY' : 'AUTO';
      
      console.log(`[VertexAgent] 🔧 Configurando modelo com mode: ${functionCallingMode} (precisa ferramentas: ${precisaFerramentas}, produtos: ${isPerguntaSobreProdutos}, clientes: ${isPerguntaSobreClientes}, composições: ${isPerguntaSobreComposicoes}, financeiro: ${isPerguntaSobreFinanceiro}, vendas: ${isPerguntaSobreVendas}, CRM: ${isPerguntaSobreCRM})`);
      
      const modelConfig: any = {
        model: this.modelName,
        systemInstruction: systemPrompt,
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
        },
        tools: [{
          functionDeclarations: this.getFunctionDeclarations(),
        }] as any,
        toolConfig: {
          functionCallingConfig: {
            mode: functionCallingMode,
            ...(functionCallingMode === 'ANY' ? {
              allowedFunctionNames: this.getFunctionDeclarations().map(f => f.name),
            } : {}),
          },
        } as any,
      };
      
      const model = this.vertexAI.preview.getGenerativeModel(modelConfig);
      
      // 2. Converter histórico do frontend para formato Vertex AI
      // Pode chegar em dois formatos:
      // 1. { role: 'user' | 'ai' | 'model', content: string } (do frontend)
      // 2. { role: 'user' | 'model', parts: [{ text: string }] } (já formatado pela API)
      console.log(`[VertexAgent] 🔍 DEBUG: Histórico recebido (${history.length} mensagens)`);
      if (history.length > 0) {
        console.log(`[VertexAgent] 🔍 Primeira mensagem (exemplo):`, JSON.stringify(history[0]));
        console.log(`[VertexAgent] 🔍 Última mensagem (exemplo):`, JSON.stringify(history[history.length - 1]));
      }
      
      const chatHistory = history
        .map((msg: any, index: number) => {
          // Se já está no formato Vertex AI (tem parts), usar diretamente
          if (msg.parts && Array.isArray(msg.parts) && msg.parts.length > 0 && msg.parts[0]?.text) {
            const role = msg.role === 'user' ? 'user' : 'model';
            return {
              role,
              parts: msg.parts,
            };
          }
          
          // Converter do formato frontend/API
          const text = (msg.content || msg.text || '').trim();
          if (!text) {
            console.log(`[VertexAgent] ⚠️ Mensagem ${index} sem conteúdo:`, JSON.stringify(msg));
            return null;
          }
          
          const role = msg.role === 'user' ? 'user' : 'model';
          
          return {
            role,
            parts: [{ text }],
          };
        })
        .filter((msg: any): msg is { role: string; parts: Array<{ text: string }> } => 
          msg !== null && msg !== undefined && msg.parts?.[0]?.text?.length > 0
        );

      console.log(`[VertexAgent] 📚 Histórico convertido: ${chatHistory.length} mensagens (de ${history.length} originais)`);
      if (chatHistory.length > 0 && chatHistory[0]) {
        const primeiraMsg = chatHistory[0];
        const ultimaMsg = chatHistory[chatHistory.length - 1];
        if (ultimaMsg) {
          console.log(`[VertexAgent] 📝 Primeira mensagem convertida:`, primeiraMsg.role, primeiraMsg.parts?.[0]?.text?.substring(0, 50) || 'sem texto');
          console.log(`[VertexAgent] 📝 Última mensagem convertida:`, ultimaMsg.role, ultimaMsg.parts?.[0]?.text?.substring(0, 50) || 'sem texto');
        }
      } else {
        console.error(`[VertexAgent] ❌ ERRO CRÍTICO: Nenhuma mensagem foi convertida! Histórico original:`, JSON.stringify(history.slice(0, 3)));
      }
      if (chatHistory.length > 0) {
        console.log(`[VertexAgent] 📝 Preview do histórico enviado (últimas 5):`, chatHistory.slice(-5).map((h: any) => `${h.role}: ${h.parts[0]?.text?.substring(0, 80)}...`));
        console.log(`[VertexAgent] 🔍 Procurando por informações no histórico...`);
        // Verificar se há menção de nome no histórico
        const nameMentions = chatHistory.filter((h: any) => {
          const text = h.parts[0]?.text?.toLowerCase() || '';
          return text.includes('meu nome é') || text.includes('me chamo') || text.includes('sou o');
        });
        if (nameMentions.length > 0 && nameMentions[0]) {
          const primeiraMencao = nameMentions[0];
          console.log(`[VertexAgent] ✅ Nome mencionado no histórico encontrado!`, primeiraMencao.parts?.[0]?.text || 'sem texto');
        }
      }

      // Detectar se precisa de grounding (pesquisa web)
      // SEMPRE habilitar grounding para perguntas que requerem informações da web
      const needsWebSearch = userMsgLower.includes('compar') || 
                            userMsgLower.includes('preço') ||
                            userMsgLower.includes('preco') ||
                            userMsgLower.includes('caro') ||
                            userMsgLower.includes('barato') ||
                            userMsgLower.includes('centauro') ||
                            userMsgLower.includes('magazine') ||
                            userMsgLower.includes('amazon') ||
                            userMsgLower.includes('web') ||
                            userMsgLower.includes('internet') ||
                            userMsgLower.includes('tempo') ||
                            userMsgLower.includes('clima') ||
                            userMsgLower.includes('previsão') ||
                            userMsgLower.includes('previsao') ||
                            userMsgLower.includes('cotação') ||
                            userMsgLower.includes('cotacao') ||
                            userMsgLower.includes('dólar') ||
                            userMsgLower.includes('dolar') ||
                            userMsgLower.includes('tendência') ||
                            userMsgLower.includes('tendencia') ||
                            userMsgLower.includes('pesquisa') ||
                            userMsgLower.includes('buscar') ||
                            userMsgLower.includes('quanto custa') ||
                            userMsgLower.includes('qual o valor') ||
                            userMsgLower.includes('quanto vale') ||
                            userMsgLower.includes('informação') ||
                            userMsgLower.includes('informacao') ||
                            userMsgLower.includes('notícia') ||
                            userMsgLower.includes('noticia') ||
                            userMsgLower.includes('atual') ||
                            userMsgLower.includes('hoje') ||
                            userMsgLower.includes('agora') ||
                            !precisaFerramentas; // Se não precisa de ferramentas de dados, provavelmente precisa de web

      // 3. Iniciar Chat com Histórico usando startChat()
      // Configurar grounding se necessário para pesquisas web
      const chatConfig: any = {
        history: chatHistory,
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
        },
      };
      
      // SEMPRE habilitar grounding para pesquisas web (expansivo para cobrir mais casos)
      // Se não precisa de ferramentas específicas da loja, provavelmente precisa de informações da web
      chatConfig.groundingConfig = {
        googleSearchRetrieval: {
          disableAttribution: false,
        },
      };
      console.log(`[VertexAgent] 🌐 Grounding (Google Search) SEMPRE habilitado para permitir pesquisas web quando necessário`);
      
      const chat = model.startChat(chatConfig);

      console.log("[VertexAgent] 💬 Chat iniciado com memória conversacional");
      console.log(`[VertexAgent] ⚠️ CRÍTICO: A IA recebeu ${chatHistory.length} mensagens de histórico. Ela DEVE ler e usar essas informações para responder perguntas sobre informações mencionadas anteriormente.`);
      
      // Verificar se há menção de nome no histórico e incluir na mensagem do usuário
      const nameInHistory = chatHistory.find((h: any) => {
        const text = h.parts[0]?.text?.toLowerCase() || '';
        return (h.role === 'user' && (text.includes('meu nome é') || text.includes('me chamo') || text.includes('sou o')));
      });
      
      // Detectar tipo de pergunta e reforçar instruções apropriadas
      let enhancedMessage = userMessage;
      
      // Detectar perguntas conversacionais (NÃO devem usar ferramentas) - usando a mesma variável definida anteriormente
      const isPerguntaConversacional = keywordsConversacionais.some(keyword => userMsgLower.includes(keyword));
      
      if (isPerguntaConversacional) {
        enhancedMessage = `${userMessage}\n\n[INSTRUÇÃO CRÍTICA: Esta é uma pergunta conversacional ou pessoal. NÃO use ferramentas. Responda diretamente usando o histórico da conversa. Se o usuário mencionou seu nome antes, use essa informação do histórico.]`;
        console.log(`[VertexAgent] 💬 Pergunta conversacional detectada, instruindo a NÃO usar ferramentas`);
      } else if (isPerguntaSobreProdutos) {
        enhancedMessage = `${userMessage}\n\n[INSTRUÇÃO CRÍTICA: Esta pergunta é sobre produtos ou dados da loja. Você DEVE usar as ferramentas disponíveis (getProductsByName ou getProductsByCategory) ANTES de responder. NUNCA diga "não encontrei" sem usar as ferramentas primeiro!]`;
        console.log(`[VertexAgent] 🔧 Reforço de instrução: Pergunta sobre produtos detectada, forçando uso de ferramentas`);
      } else if (isPerguntaSobreClientes) {
        enhancedMessage = `${userMessage}\n\n[INSTRUÇÃO CRÍTICA: Esta pergunta é sobre clientes. Você DEVE usar a ferramenta getClientByName ANTES de responder. NUNCA diga "não encontrei" sem usar a ferramenta primeiro!]`;
        console.log(`[VertexAgent] 👤 Reforço de instrução: Pergunta sobre clientes detectada, forçando uso de ferramentas`);
      } else if (isPerguntaSobreComposicoes) {
        enhancedMessage = `${userMessage}\n\n[INSTRUÇÃO CRÍTICA: Esta pergunta é sobre composições. Você DEVE usar a ferramenta getCompositions ANTES de responder. NUNCA diga "não encontrei" sem usar a ferramenta primeiro!]`;
        console.log(`[VertexAgent] 🎨 Reforço de instrução: Pergunta sobre composições detectada, forçando uso de ferramentas`);
      }
      
      // Detectar se é pergunta que requer informações da web (não conversacional e não sobre dados da loja)
      const isPerguntaQueRequerWeb = !isPerguntaConversacional && !precisaFerramentas && (
        needsWebSearch || 
        userMsgLower.includes('tempo') ||
        userMsgLower.includes('clima') ||
        userMsgLower.includes('previsão') ||
        userMsgLower.includes('previsao') ||
        userMsgLower.includes('cotação') ||
        userMsgLower.includes('cotacao') ||
        userMsgLower.includes('dólar') ||
        userMsgLower.includes('dolar') ||
        userMsgLower.includes('tendência') ||
        userMsgLower.includes('tendencia')
      );
      
      if (isPerguntaQueRequerWeb) {
        enhancedMessage = `${enhancedMessage}\n\n[INSTRUÇÃO CRÍTICA: Esta pergunta requer informações da internet/web. Você DEVE usar o Grounding (Google Search) que está ATIVO e DISPONÍVEL. NUNCA diga "não consigo informar" ou "não tenho acesso" - o Google Search está disponível através do Grounding! Pesquise na web e responda com as informações encontradas.]`;
        console.log(`[VertexAgent] 🌐 Pergunta que requer informações da web detectada, instruindo a usar Grounding`);
      }
      
      // Se o usuário perguntar sobre o nome e houver no histórico, reforçar na mensagem
      if (nameInHistory && (userMessage.toLowerCase().includes('meu nome') || userMessage.toLowerCase().includes('qual o meu nome'))) {
        const nameText = nameInHistory.parts[0]?.text || '';
        const nameMatch = nameText.match(/(?:meu nome é|me chamo|sou o)\s+([^\s,.!?]+)/i);
        if (nameMatch && nameMatch[1]) {
          enhancedMessage = `${enhancedMessage}\n\n[CONTEXTO DO HISTÓRICO: No histórico da conversa, você mencionou: "${nameText}". Use essa informação para responder.]`;
          console.log(`[VertexAgent] 🔍 Reforço de contexto: Nome encontrado no histórico - ${nameMatch[1]}`);
        }
      }

      let maxIterations = 5; // Limitar iterações para evitar loops
      let iteration = 0;
      let finalResponse: any = null;

      // Loop para processar function calls
      while (iteration < maxIterations) {
        let result: any;
        
        // Para perguntas que não precisam de ferramentas da loja, usar generateContent com grounding
        // Isso garante que perguntas sobre tempo, clima, etc. sempre usem Google Search
        if (iteration === 0 && !precisaFerramentas) {
          try {
            console.log(`[VertexAgent] 🌐 Usando generateContent com Grounding para pergunta que requer informações da web`);
            const groundingResult = await model.generateContent({
              contents: [
                ...chatHistory.map((h: any) => ({
                  role: h.role,
                  parts: h.parts,
                })),
                {
                  role: "user",
                  parts: [{ text: enhancedMessage }],
                },
              ],
              generationConfig: {
                maxOutputTokens: 1000,
                temperature: 0.7,
                topP: 0.95,
                topK: 40,
              },
              groundingConfig: {
                googleSearchRetrieval: {
                  disableAttribution: false,
                },
              } as any,
            } as any);
            
            result = {
              response: groundingResult.response,
            };
            console.log(`[VertexAgent] ✅ Resposta com Grounding recebida`);
          } catch (error: any) {
            console.warn(`[VertexAgent] ⚠️ Erro ao usar generateContent com grounding:`, error?.message);
            // Fallback para chat normal
            try {
              result = await chat.sendMessage(enhancedMessage);
            } catch (error2: any) {
              throw error2;
            }
          }
        } else if (iteration === 0) {
            // Usar chat normal (grounding não necessário)
            try {
              result = await chat.sendMessage(enhancedMessage);
            } catch (error: any) {
              // Se der erro na primeira mensagem, verificar se é erro conversacional
              const errorMsg = String(error?.message || '').toLowerCase();
              const isNoContent = errorMsg.includes('no content is provided') || errorMsg.includes('no content');
              
              if (isNoContent) {
                // Para perguntas conversacionais sem necessidade de função, tentar resposta contextual
                const userMsgLower = userMessage.toLowerCase();
                const isConversational = userMsgLower.includes('meu nome') || 
                                       userMsgLower.includes('me chamo') || 
                                       userMsgLower.includes('sou o') ||
                                       userMsgLower.includes('qual o meu nome') ||
                                       userMsgLower.includes('ola') ||
                                       userMsgLower.includes('olá') ||
                                       userMsgLower.includes('oi');
                
                if (isConversational && nameInHistory && (userMsgLower.includes('meu nome') || userMsgLower.includes('qual o meu nome'))) {
                  const nameText = nameInHistory.parts[0]?.text || '';
                  const nameMatch = nameText.match(/(?:meu nome é|me chamo|sou o)\s+([^\s,.!?]+)/i);
                  if (nameMatch && nameMatch[1]) {
                    const nome = nameMatch[1];
                    const respostaManual = `Seu nome é ${nome}! 😊 Como posso ajudar você hoje?`;
                    console.log(`[VertexAgent] ✅ Resposta contextual direta do histórico: ${respostaManual}`);
                    finalResponse = {
                      candidates: [{
                        content: {
                          parts: [{ text: respostaManual }]
                        }
                      }]
                    } as any;
                    // Não usar break aqui - verificar depois do try-catch
                  }
                }
                
                if (!finalResponse && isConversational && (userMsgLower.includes('ola') || userMsgLower.includes('olá') || userMsgLower.includes('oi'))) {
                  const respostaManual = `Olá! Sou a Ana, sua assistente virtual. Como posso ajudar você hoje? 😊`;
                  console.log(`[VertexAgent] ✅ Resposta contextual direta para cumprimento`);
                  finalResponse = {
                    candidates: [{
                      content: {
                        parts: [{ text: respostaManual }]
                      }
                    }]
                  } as any;
                  // Não usar break aqui - verificar depois do try-catch
                }
              }
              
              // Se não conseguiu resposta contextual, lançar erro para ser tratado abaixo
              if (!finalResponse) {
                throw error;
              }
            }
          } else {
            // Nas iterações subsequentes, após enviar function responses,
            // precisamos obter a resposta do modelo novamente
            // Enviar uma mensagem vazia ou usar o método correto para obter a resposta
            try {
              result = await chat.sendMessage("");
            } catch (error: any) {
              // Se enviar mensagem vazia falhar, tentar obter a última resposta do histórico
              console.warn(`[VertexAgent] ⚠️ Erro ao enviar mensagem vazia:`, error?.message);
              // Continuar com a última resposta conhecida
              if (finalResponse) {
                result = { response: finalResponse };
              } else {
                throw error;
              }
            }
          }
          
          // Se já temos resposta final do contexto conversacional, sair do loop
          if (finalResponse) {
            break;
          }
        
        // Verificar se temos resultado válido antes de processar
        if (!result || !result.response) {
          console.warn(`[VertexAgent] ⚠️ Sem resultado válido, encerrando loop`);
          break;
        }
        
        const response = result.response;
        finalResponse = response;
        
        const candidate = response.candidates?.[0];
        if (!candidate) {
          console.warn(`[VertexAgent] ⚠️ Resposta sem candidates, encerrando loop`);
          break;
        }

        // Verificar se há function calls
        const functionCalls = candidate.content?.parts?.filter((part: any) => part.functionCall) || [];
        
        if (functionCalls.length === 0) {
          // Sem function calls - retornar resposta final
          console.log(`[VertexAgent] ✅ Sem function calls, resposta final obtida`);
          break;
        }

        console.log(`[VertexAgent] 🔧 Function calls detectados: ${functionCalls.length}`);
        
        // Executar todas as funções
        const functionResults = await Promise.all(
          functionCalls.map(async (part: any) => {
            const functionCall = part.functionCall;
            const functionName = functionCall.name;
            const args = functionCall.args || {};
            
            if (!lojistaId) {
              console.warn("[VertexAgent] ⚠️ lojistaId não fornecido, pulando function call");
              return {
                name: functionName,
                response: { error: "lojistaId não disponível" },
              };
            }

            try {
            const result = await this.executeFunction(functionName, args, lojistaId);
              console.log(`[VertexAgent] ✅ Função ${functionName} executada com sucesso`);
            return {
              name: functionName,
              response: result,
            };
            } catch (error: any) {
              console.error(`[VertexAgent] ❌ Erro ao executar função ${functionName}:`, error?.message);
              return {
                name: functionName,
                response: { error: error?.message || "Erro ao executar função" },
              };
            }
          })
        );

        // Enviar resultados das funções de volta para o chat
        // Formato correto para function responses no Vertex AI SDK
        // O sendMessage espera um objeto com 'parts' contendo functionResponse
        const functionResponseParts = functionResults.map((fr: any) => {
          // Garantir que o response seja um objeto válido
          const response = fr.response || {};
          
          return {
            functionResponse: {
              name: fr.name,
              response: response,
            },
          };
        });
        
        console.log(`[VertexAgent] 📤 Enviando ${functionResponseParts.length} resultado(s) de função de volta para o chat`);
        console.log(`[VertexAgent] 📋 Preview dos resultados:`, functionResults.map((fr: any) => ({
          name: fr.name,
          hasResponse: !!fr.response,
          responseType: typeof fr.response,
          responseKeys: fr.response && typeof fr.response === 'object' ? Object.keys(fr.response) : 'not an object',
        })));
        
        try {
          // Formato correto: enviar um objeto com 'parts' contendo os functionResponses
          // O Vertex AI SDK espera: { parts: [{ functionResponse: { name, response } }] }
          const messageToSend = {
            parts: functionResponseParts,
          };
          
          console.log(`[VertexAgent] 📨 Formato da mensagem:`, JSON.stringify({
            partsCount: messageToSend.parts.length,
            firstPartKeys: messageToSend.parts[0] ? Object.keys(messageToSend.parts[0]) : [],
            firstFunctionName: messageToSend.parts[0]?.functionResponse?.name,
          }));
          
          const functionResponseResult = await chat.sendMessage(messageToSend as any);
          console.log(`[VertexAgent] ✅ Function responses enviados com sucesso`);
          console.log(`[VertexAgent] 📋 Resultado do sendMessage:`, {
            hasResponse: !!functionResponseResult?.response,
            hasCandidates: !!(functionResponseResult?.response?.candidates?.length),
            candidatesCount: functionResponseResult?.response?.candidates?.length || 0,
          });
          
          // Obter a resposta do modelo após enviar function responses
          // O resultado do sendMessage já contém a resposta do modelo
          if (functionResponseResult?.response) {
            finalResponse = functionResponseResult.response;
            result = functionResponseResult;
            
            // Verificar se a resposta tem conteúdo válido
            const candidate = finalResponse.candidates?.[0];
            if (candidate?.content?.parts) {
              const textParts = candidate.content.parts.filter((part: any) => part.text);
              if (textParts.length > 0) {
                console.log(`[VertexAgent] ✅ Resposta após function responses tem conteúdo de texto`);
                // Processar esta resposta normalmente
                const functionCallsAfterResponse = candidate.content.parts.filter((part: any) => part.functionCall) || [];
                if (functionCallsAfterResponse.length === 0) {
                  // Sem mais function calls - resposta final
                  console.log(`[VertexAgent] ✅ Resposta final obtida após function responses`);
                  break;
                } else {
                  // Mais function calls - continuar loop
                  console.log(`[VertexAgent] 🔧 Mais ${functionCallsAfterResponse.length} function call(s) detectado(s) após function responses`);
                  continue;
                }
              } else {
                console.warn(`[VertexAgent] ⚠️ Resposta após function responses não tem texto, continuando loop`);
                continue;
              }
            } else {
              console.warn(`[VertexAgent] ⚠️ Resposta após function responses não tem candidates válidos`);
              continue;
            }
          } else {
            console.warn(`[VertexAgent] ⚠️ FunctionResponseResult não tem response, continuando loop`);
            continue;
          }
        } catch (error: any) {
          console.error(`[VertexAgent] ❌ Erro ao enviar function response:`, {
            error: error?.message,
            code: error?.code,
            status: error?.status,
          });
          
          // Se houver erro 429 ou "No content", construir resposta manualmente IMEDIATAMENTE
          // Verificar múltiplos formatos possíveis do erro 429
          const errorMessage = String(error?.message || '').toLowerCase();
          const is429Error = errorMessage.includes('429') || 
                            errorMessage.includes('resource_exhausted') || 
                            errorMessage.includes('too many requests') ||
                            error?.status === 429 ||
                            error?.code === 429;
          const isNoContentError = errorMessage.includes('no content is provided') ||
                                  errorMessage.includes('no content');
          
          console.log(`[VertexAgent] 🔍 Diagnóstico de erro:`, {
            errorMessage: error?.message,
            status: error?.status,
            code: error?.code,
            is429Error,
            isNoContentError,
          });
          
          if (is429Error || isNoContentError) {
            console.log(`[VertexAgent] ⚡ Erro crítico detectado (${is429Error ? '429' : 'No content'}), construindo resposta contextual`);
            
            // Primeiro, verificar se a pergunta requer função ou é conversacional
            const userMsgLower = userMessage.toLowerCase();
            const isConversational = userMsgLower.includes('meu nome') || 
                                   userMsgLower.includes('me chamo') || 
                                   userMsgLower.includes('sou o') ||
                                   userMsgLower.includes('qual o meu nome') ||
                                   userMsgLower.includes('ola') ||
                                   userMsgLower.includes('olá') ||
                                   userMsgLower.includes('oi') ||
                                   userMsgLower.includes('bom dia') ||
                                   userMsgLower.includes('boa tarde') ||
                                   userMsgLower.includes('boa noite');
            
            // Se é conversacional e não há functionResults relevantes, tentar resposta contextual
            if (isConversational && functionResults.length === 0) {
              console.log(`[VertexAgent] 💬 Pergunta conversacional detectada, construindo resposta contextual do histórico`);
              
              // Verificar histórico para nome
              if (nameInHistory && (userMsgLower.includes('meu nome') || userMsgLower.includes('qual o meu nome'))) {
                const nameText = nameInHistory.parts[0]?.text || '';
                const nameMatch = nameText.match(/(?:meu nome é|me chamo|sou o)\s+([^\s,.!?]+)/i);
                if (nameMatch && nameMatch[1]) {
                  const nome = nameMatch[1];
                  const respostaManual = `Olá ${nome}! 😊 Como posso ajudar você hoje?`;
                  console.log(`[VertexAgent] ✅ Resposta contextual construída usando histórico: ${respostaManual}`);
                  finalResponse = {
                    candidates: [{
                      content: {
                        parts: [{ text: respostaManual }]
                      }
                    }]
                  } as any;
                  break;
                }
              }
              
              // Resposta genérica para cumprimentos
              if (userMsgLower.includes('ola') || userMsgLower.includes('olá') || userMsgLower.includes('oi')) {
                const respostaManual = `Olá! Sou a Ana, sua assistente virtual. Como posso ajudar você hoje? 😊`;
                console.log(`[VertexAgent] ✅ Resposta contextual para cumprimento`);
                finalResponse = {
                  candidates: [{
                    content: {
                      parts: [{ text: respostaManual }]
                    }
                  }]
                } as any;
                break;
              }
            }
            
            // Se é conversacional, IGNORAR functionResults e usar histórico
            if (isConversational) {
              console.log(`[VertexAgent] 💬 Pergunta conversacional detectada no fallback, ignorando functionResults e usando histórico`);
              
              // Verificar histórico para nome
              if (nameInHistory) {
                const nameText = nameInHistory.parts[0]?.text || '';
                if (userMsgLower.includes('meu nome é') || userMsgLower.includes('me chamo') || userMsgLower.includes('sou o')) {
                  // Usuário está informando o nome
                  const nameMatch = nameText.match(/(?:meu nome é|me chamo|sou o)\s+([^\s,.!?]+)/i);
                  if (nameMatch && nameMatch[1]) {
                    const nome = nameMatch[1];
                    const respostaManual = `Prazer em conhecê-lo, ${nome}! 😊 Como posso ajudar você hoje?`;
                    console.log(`[VertexAgent] ✅ Resposta contextual para apresentação: ${respostaManual}`);
                    finalResponse = {
                      candidates: [{
                        content: {
                          parts: [{ text: respostaManual }]
                        }
                      }]
                    } as any;
                    break;
                  }
                } else if (userMsgLower.includes('qual o meu nome') || userMsgLower.includes('meu nome')) {
                  // Usuário está perguntando o nome
                  const nameMatch = nameText.match(/(?:meu nome é|me chamo|sou o)\s+([^\s,.!?]+)/i);
                  if (nameMatch && nameMatch[1]) {
                    const nome = nameMatch[1];
                    const respostaManual = `Seu nome é ${nome}! 😊 Como posso ajudar você hoje?`;
                    console.log(`[VertexAgent] ✅ Resposta contextual para pergunta sobre nome: ${respostaManual}`);
                    finalResponse = {
                      candidates: [{
                        content: {
                          parts: [{ text: respostaManual }]
                        }
                      }]
                    } as any;
                    break;
                  }
                }
              }
              
              // Resposta genérica para cumprimentos
              if (userMsgLower.includes('ola') || userMsgLower.includes('olá') || userMsgLower.includes('oi')) {
                const respostaManual = `Olá! Sou a Ana, sua assistente virtual. Como posso ajudar você hoje? 😊`;
                console.log(`[VertexAgent] ✅ Resposta contextual para cumprimento`);
                finalResponse = {
                  candidates: [{
                    content: {
                      parts: [{ text: respostaManual }]
                    }
                  }]
                } as any;
                break;
              }
            }
            
            // Se há functionResults E não é conversacional, usar eles para construir resposta
            if (functionResults.length > 0 && !isConversational) {
            let respostaManual = "";
            for (const fr of functionResults) {
              if (fr.name === 'getProductsByName' || fr.name === 'getProductsByCategory') {
                const dados = fr.response;
                if (dados?.total !== undefined) {
                  if (dados.total > 0) {
                    const produtosLista = dados.produtos?.slice(0, 5).map((p: any) => 
                      `- ${p.nome}${p.preco ? ` (R$ ${p.preco.toFixed(2).replace('.', ',')})` : ''}`
                    ).join('\n') || '';
                    respostaManual = `Encontrei ${dados.total} produto(s)${dados.categoria ? ` na categoria "${dados.categoria}"` : dados.termoBusca ? ` para "${dados.termoBusca}"` : ''}:\n\n${produtosLista}`;
                    if (dados.total > 5) {
                      respostaManual += `\n\nE mais ${dados.total - 5} produto(s). Quer ver todos? [[Ver Produtos]](/produtos)`;
                    } else {
                      respostaManual += `\n\nQuer ver todos? [[Ver Produtos]](/produtos)`;
                    }
                    break; // Usar primeiro resultado relevante
                  } else {
                    respostaManual = `Não encontrei produtos${dados.categoria ? ` na categoria "${dados.categoria}"` : dados.termoBusca ? ` para "${dados.termoBusca}"` : ''}. Que tal cadastrar alguns? [[Cadastrar Produto]](/produtos/novo) 🚀`;
                    break;
                  }
                } else if (dados?.resumo) {
                  respostaManual = dados.resumo;
                  break;
                }
              } else if (fr.name === 'getClientByName') {
                const dados = fr.response;
                if (dados?.total !== undefined && dados.total > 0) {
                  const primeiroCliente = dados.clientes?.[0];
                  respostaManual = dados.resumo || `Encontrei ${dados.total} cliente(s) para "${dados.termoBusca}": ${dados.clientes?.map((c: any) => c.nome).join(", ") || ""}. ${primeiroCliente ? `Cliente principal: ${primeiroCliente.nome} - ${primeiroCliente.totalComposicoes || 0} composições, ${primeiroCliente.totalLikes || 0} likes.` : ""}`;
                } else {
                  respostaManual = dados.resumo || `Nenhum cliente encontrado para "${dados.termoBusca}". Verifique se o nome está correto.`;
                }
                break;
              } else if (fr.name === 'getCompositions') {
                const dados = fr.response;
                if (dados?.total !== undefined && dados.total > 0) {
                  respostaManual = dados.resumo || `Encontrei ${dados.total} composição(ões) recente(s). ${dados.composicoes?.slice(0, 3).map((c: any) => `${c.produtoNome}${c.clienteNome ? ` para ${c.clienteNome}` : ''} em ${c.createdAt}`).join(", ") || ""}.`;
                } else {
                  respostaManual = dados.resumo || "Nenhuma composição encontrada ainda. Que tal gerar a primeira? [[Provador Virtual]](/simulador)";
                }
                break;
              } else if (fr.name === 'getStoreVitalStats') {
                const dados = fr.response;
                if (dados?.valorTotalEstoque !== undefined && dados.valorTotalEstoque > 0) {
                  respostaManual = dados?.resumo || `Você tem ${dados?.totalProdutos || 0} produtos cadastrados, ${dados?.totalComposicoes || 0} composições geradas. Taxa de aprovação: ${dados?.taxaAprovacao || 0}%. Valor total do estoque: R$ ${dados.valorTotalEstoque.toFixed(2).replace('.', ',')}.`;
                } else {
                  respostaManual = dados?.resumo || `Você tem ${dados?.totalProdutos || 0} produtos cadastrados, ${dados?.totalComposicoes || 0} composições geradas. Taxa de aprovação: ${dados?.taxaAprovacao || 0}%.`;
                }
                break;
              } else if (fr.name === 'getFinancialAnalysis') {
                const dados = fr.response;
                respostaManual = dados?.resumo || `Situação financeira: Saldo disponível R$ ${dados?.saldoDisponivel || 0}. Plano: ${dados?.planoTier || 'N/A'}.`;
                break;
              } else if (fr.name === 'getSalesAnalysis') {
                const dados = fr.response;
                respostaManual = dados?.resumo || `Análise de vendas: ${dados?.totalCheckouts || 0} checkouts, taxa de conversão ${dados?.taxaConversao || 0}%.`;
                break;
              } else if (fr.name === 'getCRMAnalysis') {
                const dados = fr.response;
                respostaManual = dados?.resumo || `Análise de CRM: ${dados?.totalClientes || 0} clientes, ${dados?.clientesAtivos || 0} ativos.`;
                break;
              } else if (fr.name === 'getCustomerFullProfile') {
                const dados = fr.response;
                respostaManual = dados?.resumo || `Perfil do cliente: ${dados?.perfil?.nome || 'Cliente'}.`;
                break;
              } else if (fr.response?.resumo) {
                respostaManual = fr.response.resumo;
                break;
              }
            }
              
              if (respostaManual) {
                console.log(`[VertexAgent] ✅ Resposta manual construída IMEDIATAMENTE: ${respostaManual.substring(0, 100)}...`);
                finalResponse = {
                  candidates: [{
                    content: {
                      parts: [{ text: respostaManual }]
                    }
                  }]
                } as any;
                break; // Sair do loop imediatamente com a resposta manual
              }
            }
            
            // Se chegou aqui e não construiu resposta, usar mensagem genérica
            if (!finalResponse) {
              const respostaManual = "Desculpe, tive uma dificuldade técnica. Pode reformular sua pergunta?";
              console.log(`[VertexAgent] ⚠️ Resposta genérica de fallback`);
              finalResponse = {
                candidates: [{
                  content: {
                    parts: [{ text: respostaManual }]
                  }
                }]
              } as any;
              break;
            }
          }
          
          // Tentar formato alternativo apenas se não for erro 429/no content
          if (!is429Error && !isNoContentError) {
            try {
              console.log(`[VertexAgent] 🔄 Tentando formato alternativo...`);
              const altResult = await chat.sendMessage(functionResponseParts as any);
              console.log(`[VertexAgent] ✅ Formato alternativo funcionou`);
              
              // Obter resposta do formato alternativo
              if (altResult?.response) {
                finalResponse = altResult.response;
                result = altResult;
                
                // Verificar se há function calls na resposta
                const candidate = finalResponse.candidates?.[0];
                if (candidate?.content?.parts) {
                  const functionCallsAfterResponse = candidate.content.parts.filter((part: any) => part.functionCall) || [];
                  if (functionCallsAfterResponse.length === 0) {
                    // Sem mais function calls - resposta final
                    console.log(`[VertexAgent] ✅ Resposta final obtida via formato alternativo`);
                    // Sair do try para continuar no loop e processar a resposta
                  } else {
                    // Mais function calls - continuar processando
                    console.log(`[VertexAgent] 🔧 Mais ${functionCallsAfterResponse.length} function call(s) detectado(s) após formato alternativo`);
                    // Sair do try para continuar no loop e processar function calls
                  }
                }
              }
            } catch (error2: any) {
            // Verificar se erro2 também é 429
            const error2Message = String(error2?.message || '').toLowerCase();
            const isError2_429 = error2Message.includes('429') || 
                                 error2Message.includes('resource_exhausted') || 
                                 error2Message.includes('too many requests') ||
                                 error2?.status === 429;
            
            console.error(`[VertexAgent] ❌ Formato alternativo também falhou:`, error2?.message);
            
            // Se ambos falharem, construir resposta IMEDIATAMENTE (não tentar generateContent que pode causar mais 429)
            console.log(`[VertexAgent] ⚡ Ambos formatos falharam, construindo resposta manual IMEDIATAMENTE...`);
            
            // Construir resposta manualmente baseada nos resultados - SEM tentar generateContent
            let respostaManual = "";
            for (const fr of functionResults) {
              if (fr.name === 'getProductsByName' || fr.name === 'getProductsByCategory') {
                const dados = fr.response;
                if (dados?.total !== undefined) {
                  if (dados.total > 0) {
                    const produtosLista = dados.produtos?.slice(0, 5).map((p: any) => 
                      `- ${p.nome}${p.preco ? ` (R$ ${p.preco.toFixed(2).replace('.', ',')})` : ''}`
                    ).join('\n') || '';
                    respostaManual = `Encontrei ${dados.total} produto(s)${dados.categoria ? ` na categoria "${dados.categoria}"` : dados.termoBusca ? ` para "${dados.termoBusca}"` : ''}:\n\n${produtosLista}`;
                    if (dados.total > 5) {
                      respostaManual += `\n\nE mais ${dados.total - 5} produto(s). Quer ver todos? [[Ver Produtos]](/produtos)`;
                    } else {
                      respostaManual += `\n\nQuer ver todos? [[Ver Produtos]](/produtos)`;
                    }
                    break; // Usar primeiro resultado válido
                  } else {
                    respostaManual = `Não encontrei produtos${dados.categoria ? ` na categoria "${dados.categoria}"` : dados.termoBusca ? ` para "${dados.termoBusca}"` : ''}. Que tal cadastrar alguns? [[Cadastrar Produto]](/produtos/novo) 🚀`;
                    break;
                  }
                } else if (dados?.resumo) {
                  respostaManual = dados.resumo;
                  break;
                }
              } else if (fr.name === 'getStoreVitalStats') {
                const dados = fr.response;
                if (dados?.valorTotalEstoque !== undefined && dados.valorTotalEstoque > 0) {
                  respostaManual = dados?.resumo || `Você tem ${dados?.totalProdutos || 0} produtos cadastrados, ${dados?.totalComposicoes || 0} composições geradas. Taxa de aprovação: ${dados?.taxaAprovacao || 0}%. Valor total do estoque: R$ ${dados.valorTotalEstoque.toFixed(2).replace('.', ',')}.`;
                } else {
                  respostaManual = dados?.resumo || `Você tem ${dados?.totalProdutos || 0} produtos cadastrados, ${dados?.totalComposicoes || 0} composições geradas. Taxa de aprovação: ${dados?.taxaAprovacao || 0}%.`;
                }
                break;
              } else if (fr.response?.resumo) {
                respostaManual = fr.response.resumo;
                break;
              }
            }
            
            if (respostaManual) {
              console.log(`[VertexAgent] ✅ Resposta manual construída IMEDIATAMENTE: ${respostaManual.substring(0, 100)}...`);
              finalResponse = {
                candidates: [{
                  content: {
                    parts: [{ text: respostaManual }]
                  }
                }]
              } as any;
            }
            
            // Se ainda não tem resposta e há erro 429, retornar mensagem de erro amigável
            if (!finalResponse && (isError2_429 || is429Error)) {
              console.log(`[VertexAgent] ⚠️ Erro 429 detectado, retornando mensagem amigável`);
              finalResponse = {
                candidates: [{
                  content: {
                    parts: [{ text: "O sistema está processando muitas solicitações no momento. Tente novamente em alguns segundos." }]
                  }
                }]
              } as any;
            }
            
            // NÃO tentar generateContent - causa erro 429 e demora desnecessária
            // Se não conseguiu construir resposta manual, retornar mensagem genérica e sair
            if (!respostaManual) {
              console.log(`[VertexAgent] ⚠️ Não foi possível construir resposta manual, retornando mensagem genérica`);
              finalResponse = {
                candidates: [{
                  content: {
                    parts: [{ text: "Não consegui processar sua solicitação no momento. Por favor, tente novamente." }]
                  }
                }]
              } as any;
            }
            } // Fecha o catch (error2: any)
          } // Fecha o if (!is429Error && !isNoContentError)
          
          // Se chegou aqui e tem resposta final, sair do loop
          if (finalResponse) {
            break;
          }
        } // Fecha o catch (error: any) da linha 875
        
        iteration++;
      }
      
      const response = finalResponse;
      
      console.log(`[VertexAgent] 📥 Resposta recebida de ${this.modelName}`);
      
      // Tratamento seguro da resposta final
      if (!response.candidates || response.candidates.length === 0) {
        console.warn("[VertexAgent] ⚠️ Resposta sem candidates");
        return { text: "Não consegui formular uma resposta agora." };
      }

      const candidate = response.candidates[0];
      
      if (!candidate) {
        console.warn("[VertexAgent] ⚠️ Resposta sem candidates");
        return { text: "Não consegui formular uma resposta agora." };
      }
      
      // Tentar extrair texto de diferentes formatos possíveis
      let text = "";
      
      // Formato 1: parts com text
      if (candidate.content?.parts) {
        const textParts = candidate.content.parts.filter((part: any) => part.text);
        if (textParts.length > 0) {
          text = textParts.map((part: any) => part.text).join("\n");
        }
      }
      
      // Formato 2: text direto
      if (!text && candidate.content?.text) {
        text = candidate.content.text;
      }
      
      // Formato 3: text no candidate
      if (!text && candidate.text) {
        text = candidate.text;
      }
      
      if (!text) {
        console.warn("[VertexAgent] ⚠️ Resposta sem texto após tentar todos os formatos");
        console.warn("[VertexAgent] 📋 Estrutura da resposta:", JSON.stringify({
          hasCandidates: !!response.candidates,
          candidatesCount: response.candidates?.length,
          firstCandidateKeys: candidate ? Object.keys(candidate) : [],
          hasContent: !!candidate?.content,
          contentKeys: candidate?.content ? Object.keys(candidate.content) : [],
          hasParts: !!candidate?.content?.parts,
          partsCount: candidate?.content?.parts?.length,
        }, null, 2));
        return { text: "Não consegui formular uma resposta agora. Tente novamente em alguns segundos." };
      }

      // Extrair metadados de grounding (Google Search)
      let groundingMetadata: GroundingMetadata | undefined;
      if (candidate.groundingMetadata) {
        groundingMetadata = {
          webSearchQueries: candidate.groundingMetadata.webSearchQueries || [],
          groundingChunks: candidate.groundingMetadata.groundingChunks || [],
        };
        
        if (groundingMetadata.webSearchQueries && groundingMetadata.webSearchQueries.length > 0) {
          console.log(`[VertexAgent] 🔍 Grounding detectado: ${groundingMetadata.webSearchQueries.length} search queries`);
        }
      }

      console.log(`[VertexAgent] ✅ Texto extraído: ${text.length} caracteres`);
      return { text, groundingMetadata };

    } catch (error: any) {
      console.error("[VertexAgent] ❌ Erro Crítico:", {
        error: error?.message,
        code: error?.code,
        status: error?.status,
        model: this.modelName,
        project: this.project,
      });
      
      const errorMsg = String(error?.message || '').toLowerCase();
      
      // Diagnóstico de erros comuns da Vertex
      if (error.message?.includes("404") || error.message?.includes("Not Found")) {
        return { text: `ERRO DE CONFIGURAÇÃO (404): O modelo '${this.modelName}' não foi encontrado no projeto '${this.project}'. Verifique se a API Vertex AI está ativada.` };
      }
      if (error.message?.includes("PermissionDenied") || error.message?.includes("403")) {
        return { text: `ERRO DE PERMISSÃO (403): A credencial atual não tem acesso ao projeto '${this.project}'. Verifique as permissões da Service Account.` };
      }
      if (error.message?.includes("Unable to authenticate")) {
        return { text: `ERRO DE AUTENTICAÇÃO: Não foi possível autenticar com o projeto '${this.project}'. Verifique as credenciais.` };
      }
      
      // Se for erro 400 (Bad Request) de configuração, tentar resposta contextual antes de retornar erro genérico
      if (errorMsg.includes('400') || errorMsg.includes('bad request') || errorMsg.includes('invalid_argument')) {
        console.log(`[VertexAgent] 🔍 Erro 400 detectado, tentando resposta contextual como fallback`);
        
        // Verificar se é pergunta conversacional e tentar responder do histórico
        const userMsgLower = userMessage.toLowerCase();
        const isConversational = userMsgLower.includes('meu nome') || 
                               userMsgLower.includes('me chamo') || 
                               userMsgLower.includes('sou o') ||
                               userMsgLower.includes('qual o meu nome') ||
                               userMsgLower.includes('ola') ||
                               userMsgLower.includes('olá') ||
                               userMsgLower.includes('oi');
        
        if (isConversational) {
          // Buscar nome no histórico que foi passado
          if (history && history.length > 0) {
            const nameInHistory = history.find((h: any) => {
              const text = (h.parts?.[0]?.text || h.content || h.text || '').toLowerCase();
              return (h.role === 'user' && (text.includes('meu nome é') || text.includes('me chamo') || text.includes('sou o')));
            });
            
            if (nameInHistory) {
              const nameText = nameInHistory.parts?.[0]?.text || nameInHistory.content || nameInHistory.text || '';
              const nameMatch = nameText.match(/(?:meu nome é|me chamo|sou o)\s+([^\s,.!?]+)/i);
              if (nameMatch && nameMatch[1]) {
                const nome = nameMatch[1];
                if (userMsgLower.includes('meu nome é') || userMsgLower.includes('me chamo') || userMsgLower.includes('sou o')) {
                  return { text: `Prazer em conhecê-lo, ${nome}! 😊 Como posso ajudar você hoje?` };
                } else if (userMsgLower.includes('qual o meu nome') || userMsgLower.includes('meu nome')) {
                  return { text: `Seu nome é ${nome}! 😊 Como posso ajudar você hoje?` };
                }
              }
            }
          }
          
          // Resposta para cumprimentos
          if (userMsgLower.includes('ola') || userMsgLower.includes('olá') || userMsgLower.includes('oi')) {
            return { text: `Olá! Sou a Ana, sua assistente virtual. Como posso ajudar você hoje? 😊` };
          }
        }
        
        // Se não conseguiu resposta contextual, retornar erro específico
        return { text: `Erro de configuração detectado. Por favor, verifique as configurações do sistema. (Erro: ${error.message?.substring(0, 100)})` };
      }
      
      return { text: "Estou com dificuldade de conexão. Tente novamente em alguns segundos." };
    }
  }

  /**
   * Método de compatibilidade (mantém interface antiga)
   */
  async generateResponse(userMessage: string, lojistaId: string, contextData?: any, history: any[] = [], systemPromptOverride?: string): Promise<ChatResponse> {
    console.log(`[VertexAgent] 📥 generateResponse chamado com ${history.length} mensagens de histórico`);
    // Se um systemPrompt completo foi fornecido, use-o diretamente
    if (systemPromptOverride) {
      return this.sendMessage(userMessage, systemPromptOverride, lojistaId, history);
    }

    // Caso contrário, construa um contexto simples (fallback)
    const contextPrompt = contextData
      ? `\n\nCONTEXTO DA LOJA:
- Nome: ${contextData.store?.name || "Sua loja"}
- Produtos cadastrados: ${contextData.store?.produtosCount || 0}
- Display conectado: ${contextData.store?.displayConnected ? "Sim" : "Não"}
- Sales configurado: ${contextData.store?.salesConfigured ? "Sim" : "Não"}
${contextData.recentInsights?.length > 0 ? `\n- Últimos insights: ${contextData.recentInsights.map((i: any) => i.title).join(", ")}` : ""}
${contextData.lastComposition ? `\n- ÚLTIMA COMPOSIÇÃO: ${contextData.lastComposition.productName} (ID: ${contextData.lastComposition.id})` : ""}
`
      : "";

    return this.sendMessage(userMessage, contextPrompt, lojistaId, history);
  }

  /**
   * Método de compatibilidade (mantém interface antiga)
   */
  async chat(userMessage: string, lojistaId: string, contextData?: any): Promise<ChatResponse> {
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
