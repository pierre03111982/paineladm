/**
 * Agente Ana - Serviço de IA usando Vertex AI SDK
 * Arquitetura Simplificada: Contexto Injetado + Google Search 2.0
 * 
 * FIX FINAL: Remove function calling complexo que causava erros
 * - Contexto injetado diretamente no system prompt
 * - Google Search nativo para informações externas
 * - Tratamento robusto de respostas (evita "No content")
 */

import { VertexAI } from "@google-cloud/vertexai";
import { GoogleAuth } from "google-auth-library";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

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
 * Modelo: Gemini 2.0 Flash
 * Arquitetura: Contexto Injetado + Google Search Nativo
 */
export class VertexAgent {
  private vertexAI: VertexAI;
  private project: string;
  private location: string;
  private modelName = "gemini-2.0-flash-001";

  constructor() {
    // ID CONFIRMADO PELOS PRINTS DO USUÁRIO
    this.project = process.env.GOOGLE_CLOUD_PROJECT_ID || 
                   process.env.FIREBASE_PROJECT_ID || 
                   "paineladmexperimenteai";
    this.location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

    console.log(`[VertexAgent] Inicializando Ana 2.0 no projeto: ${this.project}`);

    // Configurar autenticação para Vertex AI
    let credentials: any = undefined;
    
    if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
      try {
        const gcpKeyStr = process.env.GCP_SERVICE_ACCOUNT_KEY;
        console.log("[VertexAgent] 📝 Parseando GCP_SERVICE_ACCOUNT_KEY...");
        
        credentials = JSON.parse(gcpKeyStr);
        
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
      if (credentials) {
        console.log("[VertexAgent] 🔐 Configurando Vertex AI com Service Account explícita");
        
        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, `vertex-ai-credentials-${this.project}-${Date.now()}.json`);
        
        try {
          fs.writeFileSync(tempFilePath, JSON.stringify(credentials, null, 2));
          console.log("[VertexAgent] 📁 Arquivo temporário criado:", tempFilePath);
          
          process.env.GOOGLE_APPLICATION_CREDENTIALS = tempFilePath;
          
          this.vertexAI = new VertexAI({
            project: this.project,
            location: this.location,
          });
          
          console.log("[VertexAgent] ✅ Vertex AI inicializado com Service Account");
        } catch (fileError: any) {
          console.error("[VertexAgent] ❌ Erro ao criar arquivo temporário:", fileError?.message);
          this.vertexAI = new VertexAI({
            project: this.project,
            location: this.location,
          });
          console.log("[VertexAgent] ⚠️ Vertex AI inicializado sem arquivo de credenciais");
        }
      } else {
        console.log("[VertexAgent] 🔐 Configurando Vertex AI com Application Default Credentials (ADC)");
        
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
   * Gera resposta usando Gemini 2.0 Flash com contexto injetado e Google Search
   */
  async sendMessage(
    userMessage: string, 
    context: string, 
    lojistaId?: string, 
    history: any[] = []
  ): Promise<ChatResponse> {
    // Se o context já contém um systemPrompt completo (começa com "ROLE:"), use-o diretamente
    const isFullSystemPrompt = context.trim().startsWith('ROLE:');
    
    const systemPrompt = isFullSystemPrompt
      ? context
      : `
      VOCÊ É A ANA, A GERENTE COMERCIAL E SUPORTE TÉCNICO DA LOJA.

      === SEUS DADOS INTERNOS (A VERDADE ABSOLUTA) ===
      ${context}

      === SUAS CAPACIDADES ===
      1. **BUSCA DE PRODUTOS**: Você tem acesso completo ao catálogo de produtos no contexto acima.
         - Quando o usuário perguntar "quantos X tenho?", "quais produtos de Y?", "tenho Z?", 
           PROCURE NO CONTEXTO ACIMA e responda com os dados reais.
         - Exemplo: "quantos vestidos tenho?" → Procure "vestido" ou "vestidos" no catálogo e conte.
      
      2. **SUPORTE TÉCNICO**: Você pode ajudar com:
         - Cadastros: Como cadastrar produtos, clientes, etc. → Use links: [[Cadastrar Produto]](/produtos/novo)
         - Pesquisas: Como buscar produtos, clientes, composições → Use links: [[Ver Produtos]](/produtos), [[Ver Clientes]](/clientes)
         - Problemas: Se o usuário relatar erro, oriente sobre onde verificar
         - Navegação: Ajude a encontrar funcionalidades do painel
      
      3. **GOOGLE SEARCH**: Disponível automaticamente para:
         - Tendências de moda, clima, notícias, preços de concorrentes
         - Informações externas que não estão no contexto da loja

      === REGRAS DE RESPOSTA ===
      1. **PRIORIDADE**: Sempre use o CONTEXTO ACIMA primeiro. Se não encontrar, use Google Search.
      2. **PESQUISAS INTERNAS**: Para perguntas sobre produtos, clientes, composições da loja:
         - SEMPRE procure no contexto acima ANTES de responder
         - NUNCA diga "não sei" sem procurar primeiro
         - Se encontrar, liste os resultados com detalhes
         - Use links para ações: [[Ver Produtos]](/produtos), [[Cadastrar Produto]](/produtos/novo)
      
      3. **SUPORTE TÉCNICO**: Quando o usuário pedir ajuda:
         - Seja didático e passo a passo
         - Use links diretos para as páginas: [[Nome da Página]](/caminho)
         - Exemplos práticos sempre que possível
      
      4. **FORMATO DE RESPOSTAS**:
         - Se encontrar produtos: {{CARD:PRODUCT|Nome|Preço|UrlImagem|/produtos/ID}}
         - Use botões de navegação: [[Nome do Botão]](/caminho)
         - Seja curta, humana e vendedora
         - Use emojis moderadamente 🚀
         - Sempre em português do Brasil
    `;

    try {
      console.log(`[VertexAgent] 📤 Enviando mensagem para Gemini 2.0 Flash...`);

      // Habilitar Google Search (grounding) explicitamente
      const model = this.vertexAI.preview.getGenerativeModel({ 
        model: this.modelName,
        systemInstruction: systemPrompt,
        tools: [{ googleSearch: {} }],
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
        },
      });

      // Converter histórico para formato Vertex AI
      // Aceita múltiplos formatos para compatibilidade
      console.log(`[VertexAgent] 🔍 Processando histórico: ${history.length} mensagens recebidas`);
      
      if (history.length > 0) {
        console.log(`[VertexAgent] 🔍 Exemplo de mensagem recebida:`, JSON.stringify({
          hasRole: !!history[0]?.role,
          hasParts: !!history[0]?.parts,
          hasContent: !!history[0]?.content,
          hasText: !!history[0]?.text,
          role: history[0]?.role,
          partsCount: Array.isArray(history[0]?.parts) ? history[0].parts.length : 0,
        }, null, 2));
      }
      
      const chatHistory: Array<{ role: string; parts: Array<{ text: string }> }> = [];
      
      for (let i = 0; i < history.length; i++) {
        const msg = history[i];
        if (!msg) {
          console.log(`[VertexAgent] ⚠️ Mensagem ${i} está vazia/null, pulando...`);
          continue;
        }
        
        let text = '';
        let role = '';
        
        // Verificar se já está formatado com parts
        if (msg.parts && Array.isArray(msg.parts) && msg.parts.length > 0) {
          // Extrair texto das parts
          const textParts = msg.parts
            .map((part: any) => {
              if (typeof part === 'string') return part.trim();
              return (part.text || '').trim();
            })
            .filter((t: string) => t.length > 0);
          
          if (textParts.length === 0) {
            console.log(`[VertexAgent] ⚠️ Mensagem ${i} tem parts mas sem texto válido, pulando...`);
            continue;
          }
          
          text = textParts[0]; // Usar primeiro texto encontrado
          role = msg.role === 'user' ? 'user' : 'model';
        } else if (msg.content || msg.text) {
          // Formato antigo - extrair de content ou text
          text = (msg.content || msg.text || '').trim();
          if (!text) {
            console.log(`[VertexAgent] ⚠️ Mensagem ${i} tem content/text mas está vazio, pulando...`);
            continue;
          }
          
          role = msg.role === 'user' ? 'user' : 'model';
        } else {
          console.log(`[VertexAgent] ⚠️ Mensagem ${i} não tem formato reconhecido, pulando...`, {
            keys: Object.keys(msg),
          });
          continue;
        }
        
        if (text && role) {
          chatHistory.push({
            role,
            parts: [{ text }],
          });
        } else {
          console.log(`[VertexAgent] ⚠️ Mensagem ${i} não foi convertida - text: "${text}", role: "${role}"`);
        }
      }

      console.log(`[VertexAgent] 📚 Histórico convertido: ${chatHistory.length} mensagens (de ${history.length} originais)`);
      
      if (chatHistory.length === 0 && history.length > 0) {
        console.error(`[VertexAgent] ❌ ERRO CRÍTICO: Nenhuma mensagem foi convertida!`);
        console.error(`[VertexAgent] 🔍 Primeira mensagem original:`, JSON.stringify(history[0], null, 2));
        console.error(`[VertexAgent] 🔍 Última mensagem original:`, JSON.stringify(history[history.length - 1], null, 2));
      }
      
      if (chatHistory.length > 0) {
        console.log(`[VertexAgent] 📝 Preview do histórico convertido (primeira e última):`, {
          primeira: `${chatHistory[0]?.role}: ${chatHistory[0]?.parts?.[0]?.text?.substring(0, 50)}...`,
          ultima: `${chatHistory[chatHistory.length - 1]?.role}: ${chatHistory[chatHistory.length - 1]?.parts?.[0]?.text?.substring(0, 50)}...`,
        });
      }

      // Iniciar chat com histórico
      const chat = model.startChat({
        history: chatHistory,
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
        },
      });

      console.log("[VertexAgent] 💬 Chat iniciado com memória conversacional");

      // Enviar mensagem
      const result = await chat.sendMessage(userMessage);
      const response = result.response;

      console.log(`[VertexAgent] 📥 Resposta recebida de ${this.modelName}`);

      // Tratamento seguro de resposta (evita erro "No content")
      if (!response.candidates || response.candidates.length === 0) {
        console.warn("[VertexAgent] ⚠️ Resposta sem candidates");
        return { text: "Não consegui formular uma resposta agora. Tente novamente." };
      }

      const candidate = response.candidates[0];
      if (!candidate) {
        console.warn("[VertexAgent] ⚠️ Resposta sem candidate");
        return { text: "Não consegui formular uma resposta agora. Tente novamente." };
      }

      // Extrair texto de forma segura
      let text = "";
      
      if (candidate.content?.parts) {
        const textParts = candidate.content.parts
          .filter((part: any) => part.text)
          .map((part: any) => part.text);
        text = textParts.join("\n").trim();
      } else if ((candidate.content as any)?.text) {
        text = (candidate.content as any).text.trim();
      } else if ((candidate as any)?.text) {
        text = (candidate as any).text.trim();
      }

      if (!text) {
        console.warn("[VertexAgent] ⚠️ Resposta sem texto após tentar todos os formatos");
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
          console.log(`[VertexAgent] 🌍 Ana acessou a Web!`);
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
      
      // Diagnóstico de erros comuns
      if (error.message?.includes("404") || error.message?.includes("Not Found")) {
        return { text: `ERRO DE CONFIGURAÇÃO (404): O modelo '${this.modelName}' não foi encontrado no projeto '${this.project}'. Verifique se a API Vertex AI está ativada.` };
      }
      if (error.message?.includes("PermissionDenied") || error.message?.includes("403")) {
        return { text: `ERRO DE PERMISSÃO (403): A credencial atual não tem acesso ao projeto '${this.project}'. Verifique as permissões da Service Account.` };
      }
      if (error.message?.includes("Unable to authenticate")) {
        return { text: `ERRO DE AUTENTICAÇÃO: Não foi possível autenticar com o projeto '${this.project}'. Verifique as credenciais.` };
      }
      
      return { text: `Erro técnico: ${error.message || "Erro desconhecido"}` };
    }
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

      // Habilitar Google Search (grounding) explicitamente
      const model = this.vertexAI.preview.getGenerativeModel({ 
        model: this.modelName,
        systemInstruction: systemPrompt,
        tools: [{ googleSearch: {} }],
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
        },
      });

      // Preparar conteúdo multimodal: texto + imagem
      const parts: any[] = [
        { text: userMessage },
      ];

      // Adicionar imagem
      if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
        parts.push({
          fileData: {
            fileUri: imageUrl,
            mimeType: "image/jpeg",
          },
        });
        console.log("[VertexAgent] 📤 Usando URL pública da imagem");
      } else if (imageUrl.startsWith("data:image/")) {
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

      const result = await model.generateContent({
        contents: [{
          role: "user",
          parts: parts,
        }],
      } as any);
      
      const response = result.response;
      
      console.log(`[VertexAgent] 📥 Resposta recebida de ${this.modelName} (com imagem)`);
      
      // Tratamento seguro da resposta
      if (!response.candidates || response.candidates.length === 0) {
        console.warn("[VertexAgent] ⚠️ Resposta sem candidates");
        return { text: "Não consegui formular uma resposta agora." };
      }

      const candidate = response.candidates[0];
      const text = candidate.content.parts[0]?.text;
      
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
      
      // Diagnóstico de erros comuns
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
   * Método de compatibilidade (mantém interface antiga)
   */
  async generateResponse(
    userMessage: string, 
    lojistaId: string, 
    contextData?: any, 
    history: any[] = [], 
    systemPromptOverride?: string
  ): Promise<ChatResponse> {
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
