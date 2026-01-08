/**
 * PHASE 28: Serviço de Análise de Produto com IA
 * Usa Gemini Vision para analisar imagem do produto e gerar metadados automáticos
 */

import { APIResponse } from "./types";

/**
 * Configuração do Gemini para análise de produtos
 */
const GEMINI_ANALYZER_CONFIG = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || "",
  location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
  modelId: "gemini-2.5-flash", // Modelo GA (estável) recomendado pelo Google - suporta análise com visão
};

/**
 * Cor predominante detectada
 */
export interface DominantColor {
  hex: string; // Código hexadecimal (ex: "#FF5733")
  name: string; // Nome da cor (ex: "Vermelho Coral")
}

/**
 * Resultado da análise de produto
 */
export interface ProductAnalysisResult {
  nome_sugerido: string;
  descricao_seo: string;
  suggested_category: string; // Categoria sugerida (mapear para dropdown)
  product_type: string; // Tipo específico do produto (ex: Blazer, Vestido, Tênis)
  detected_fabric: string; // Tecido detectado (ex: Linho, Algodão, Couro sintético)
  dominant_colors: DominantColor[]; // Array de cores predominantes com hex e nome
  tags?: string[]; // Tags mantidas apenas internamente (não exibidas na UI)
  cor_predominante?: string; // Mantido para compatibilidade
  tecido_estimado?: string; // Mantido para compatibilidade
  detalhes?: string[]; // Mantido para compatibilidade
}

/**
 * Cliente para análise de produtos com Gemini Vision
 */
export class ProductAnalyzerService {
  private projectId: string;
  private location: string;
  private endpoint: string;

  constructor() {
    this.projectId = GEMINI_ANALYZER_CONFIG.projectId;
    this.location = GEMINI_ANALYZER_CONFIG.location;
    
    // Endpoint do Gemini para análise de texto com visão
    this.endpoint = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${GEMINI_ANALYZER_CONFIG.modelId}:generateContent`;

    if (!this.projectId) {
      console.warn(
        "[ProductAnalyzer] GOOGLE_CLOUD_PROJECT_ID não configurado. Serviço em modo mock."
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
      console.error("[ProductAnalyzer] Erro ao obter access token:", error);
      throw new Error("Falha na autenticação. Configure GOOGLE_APPLICATION_CREDENTIALS ou use Service Account do Firebase.");
    }
  }

  /**
   * Converte URL de imagem para base64
   */
  private async imageUrlToBase64(imageUrl: string): Promise<string> {
    try {
      console.log("[ProductAnalyzer] 📥 Baixando imagem de:", imageUrl.substring(0, 100) + "...");
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        throw new Error(`Falha ao baixar imagem: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      
      // Detectar tipo MIME
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const mimeType = contentType.split(';')[0].trim();
      
      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      console.error("[ProductAnalyzer] Erro ao converter imagem para base64:", error);
      throw error;
    }
  }

  /**
   * Analisa imagem do produto e retorna metadados estruturados
   */
  async analyzeProductImage(imageUrl: string): Promise<APIResponse<ProductAnalysisResult>> {
    const startTime = Date.now();

    if (!this.isConfigured()) {
      return {
        success: false,
        error: "Serviço não configurado. Configure GOOGLE_CLOUD_PROJECT_ID.",
      };
    }

    try {
      console.log("[ProductAnalyzer] 🔍 Iniciando análise de produto:", imageUrl.substring(0, 100) + "...");

      // Obter token de acesso
      const accessToken = await this.getAccessToken();

      // Converter imagem para base64
      const imageBase64 = await this.imageUrlToBase64(imageUrl);

      // Extrair apenas o base64 (sem o prefixo data:)
      const base64Data = imageBase64.split(',')[1];

      // Lógica de retry: tentar até 2 vezes em caso de erro de parsing JSON
      const MAX_RETRIES = 2;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(`[ProductAnalyzer] 🔄 Tentativa ${attempt}/${MAX_RETRIES}`);
          
          return await this.performAnalysis(accessToken, base64Data);
        } catch (error: any) {
          lastError = error;
          
          // Se for erro de parsing JSON e ainda há tentativas, retry
          if (error.message.includes("Unterminated string") || error.message.includes("Erro ao processar resposta")) {
            console.warn(`[ProductAnalyzer] ⚠️ Tentativa ${attempt} falhou com erro de parsing. Tentando novamente...`);
            
            // Se não é a última tentativa, aguardar 1 segundo antes de tentar novamente
            if (attempt < MAX_RETRIES) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }
          }
          
          // Se não é erro de parsing ou é a última tentativa, lançar o erro
          throw error;
        }
      }

      // Se chegou aqui, todas as tentativas falharam
      throw lastError || new Error("Falha ao analisar imagem após múltiplas tentativas");
    } catch (error: any) {
      console.error("[ProductAnalyzer] ❌ Erro geral:", error);
      const duration = Date.now() - startTime;

      return {
        success: false,
        error: `Erro ao analisar imagem: ${error.message}`,
        metadata: { duration, timestamp: new Date().toISOString() },
      };
    }
  }

  /**
   * Realiza a análise do produto (extraído para permitir retry)
   */
  private async performAnalysis(accessToken: string, base64Data: string): Promise<APIResponse<ProductAnalysisResult>> {
    const startTime = Date.now();

    // Prompt do sistema para análise de produto
      const systemPrompt = `Você é um especialista em E-commerce de Moda e SEO. Analise a imagem fornecida e retorne APENAS um JSON válido e COMPLETO (sem markdown, sem código, sem explicações, SEM strings não terminadas).

🚨 REGRA CRÍTICA DE JSON VÁLIDO:
- TODAS as strings devem estar entre aspas duplas (")
- TODAS as aspas dentro das strings devem ser escapadas com \\"
- TODAS as strings devem ser FECHADAS com aspas duplas
- O JSON deve começar com { e terminar com }
- NUNCA deixe strings não terminadas (unterminated strings)

Retorne APENAS o JSON válido com a seguinte estrutura exata:

{
  "nome_sugerido": "Título curto e comercial (ex: Vestido Longo Floral de Verão)",
  "descricao_seo": "Descrição persuasiva, criativa e inteligente sobre o produto analisado na imagem. 
  
  🚨 LIMITE OBRIGATÓRIO - LEIA COM ATENÇÃO 🚨
  
  MÁXIMO: 470 caracteres (incluindo espaços e pontuação)
  
  ⚠️ REGRAS ABSOLUTAS PARA EVITAR CORTE NO TEXTO E JSON INVÁLIDO:
  
  1) MONITORE O COMPRIMENTO durante a escrita:
     - Primeira frase: ~150 caracteres (apresentação)
     - Segunda frase: ~150 caracteres (detalhes)
     - Terceira frase: ~120 caracteres (benefícios)
     - Frase final: ~50 caracteres CURTA (conclusão com ponto final)
  
  2) SEMPRE termine com uma frase COMPLETA e um PONTO FINAL (.)
  
  3) SE você perceber que está próximo de 450 caracteres:
     ➜ PARE de adicionar detalhes
     ➜ ENCERRE com uma frase final CURTA e IMPACTANTE
     ➜ Exemplos: 'Perfeito para qualquer ocasião.' | 'Uma peça única e especial.' | 'Estilo e conforto em um só look.'
  
  4) NUNCA deixe o texto incompleto ou cortado no meio de uma palavra
  
  5) PRIORIZE qualidade sobre quantidade - melhor um texto de 450 caracteres BEM CONCLUÍDO do que 480 cortado
  
  6) 🚨 CRÍTICO - ASPAS NO TEXTO:
     - Se usar aspas dentro do texto, ESCAPE com \\" (ex: Ele disse \\"perfeito\\")
     - NÃO use aspas simples, use aspas duplas escapadas
     - Garanta que a string termine com aspas duplas FECHADAS
  
  📝 CONTEÚDO:
  - Descreva cores, padrões, texturas e detalhes únicos visíveis
  - Conecte características visuais com benefícios práticos
  - Use linguagem persuasiva e keywords de SEO naturalmente
  - Seja específico e criativo (evite frases genéricas)
  
  ✅ ANTES DE FINALIZAR, VERIFIQUE:
  - [ ] Texto tem entre 400-470 caracteres?
  - [ ] Última frase está COMPLETA?
  - [ ] Termina com ponto final (.)?
  - [ ] O raciocínio foi CONCLUÍDO?
  - [ ] NÃO há palavras cortadas?
  - [ ] TODAS as aspas estão escapadas (\\")?
  - [ ] A string está FECHADA com aspas duplas?",
  "suggested_category": "Uma das categorias padrão: Vestidos, Calças, Blusas, Fitness, Praia, Acessórios, Calçados, Jaquetas, Shorts, Saias, Roupas",
  "product_type": "Tipo específico e detalhado do produto analisado na imagem. OBRIGATÓRIO: Deve ser preenchido com o tipo exato (ex: 'Blazer', 'Vestido Midi', 'Tênis Esportivo', 'Bermuda', 'Camisa Social', 'Legging', 'Biquíni', 'Bolsa Tote', 'Jaqueta Jeans', 'Calça Skinny'). NÃO deixe vazio.",
  "detected_fabric": "Tecido/material detectado na imagem. OBRIGATÓRIO: Deve ser preenchido com o tecido principal identificado (ex: 'Algodão', 'Linho', 'Poliéster', 'Seda', 'Couro', 'Jeans', 'Sarja', 'Malha', 'Viscose', 'Elastano', 'Algodão com Elastano'). NÃO deixe vazio.",
  "dominant_colors": [
    {"hex": "#000000", "name": "Preto"},
    {"hex": "#FFFFFF", "name": "Branco"}
  ],
  "tags": ["array de strings com 5-8 tags. IMPORTANTE: Inclua tags de contexto como 'praia', 'inverno', 'fitness', 'festa', 'casual', 'social', 'swimwear', 'gym', 'winter', 'couro' para ativar os cenários corretos no sistema"]
}

IMPORTANTE SOBRE OS CAMPOS OBRIGATÓRIOS:
- "product_type": DEVE ser preenchido. Analise a imagem e identifique o tipo específico do produto (ex: se for uma camisa, diga "Camisa" ou "Camisa Social", não deixe vazio).
- "detected_fabric": DEVE ser preenchido. Analise a textura e aparência do tecido na imagem e identifique o material principal (ex: "Algodão", "Poliéster", "Jeans"). Se não conseguir identificar com certeza, use uma estimativa baseada na aparência visual.
- "dominant_colors": DEVE conter pelo menos 1 cor. Analise as cores predominantes na imagem e retorne um array com objetos contendo "hex" (código hexadecimal da cor) e "name" (nome da cor em português). Exemplos de hex: Preto="#000000", Branco="#FFFFFF", Vermelho="#FF0000", Azul="#0000FF", Verde="#008000", etc.

INSTRUÇÃO CRÍTICA - FOCO APENAS NA ROUPA:
- Se a imagem contiver acessórios (bolsas, sapatos, joias, óculos, relógios, cintos, etc.) junto com a roupa, IGNORE completamente os acessórios.
- Analise SOMENTE a peça de roupa principal (vestido, blusa, calça, etc.).
- Não mencione acessórios na descrição, tags ou detalhes.
- Foque exclusivamente nas características da roupa: tecido, cor, corte, estilo, detalhes da peça.
- Se houver múltiplas peças de roupa, analise apenas a peça principal (a mais visível ou destacada).

REGRAS CRÍTICAS PARA TAGS:
- Se for roupa de banho (biquíni, maiô, sunga) -> DEVE incluir tag "praia" ou "swimwear" (Ativa Bikini Law)
- Se for roupa de frio/couro (casaco, sobretudo, bota, cachecol) -> DEVE incluir tag "inverno" ou "winter" (Ativa Winter Rule)
- Se for roupa de ginástica (legging, top, tênis esportivo) -> DEVE incluir tag "fitness" ou "gym" (Ativa Gym Integrity)
- Se for roupa social (terno, blazer, vestido longo) -> DEVE incluir tag "social" ou "office"
- Se for roupa de festa (vestido de festa, paetê, salto alto) -> DEVE incluir tag "festa" ou "party"

INSTRUÇÃO CRÍTICA - FOCO APENAS NA ROUPA:
- Se a imagem contiver acessórios (bolsas, sapatos, joias, óculos, relógios, cintos, etc.) junto com a roupa, IGNORE completamente os acessórios.
- Analise SOMENTE a peça de roupa principal (vestido, blusa, calça, etc.).
- Não mencione acessórios na descrição, tags ou detalhes.
- Foque exclusivamente nas características da roupa: tecido, cor, corte, estilo, detalhes da peça.
- Se houver múltiplas peças de roupa, analise apenas a peça principal (a mais visível ou destacada).

🚨 ÚLTIMA VERIFICAÇÃO ANTES DE ENVIAR:
Releia a "descricao_seo" que você escreveu:
1. Conte os caracteres - está entre 400-470?
2. A última frase está COMPLETA?
3. Termina com ponto final?
4. O raciocínio foi CONCLUÍDO de forma lógica?
5. TODAS as aspas dentro do texto estão escapadas (\\")?
6. A string descricao_seo está FECHADA com aspas duplas?

🔍 VERIFICAÇÃO FINAL DO JSON:
Antes de enviar, verifique mentalmente:
- O JSON começa com { e termina com }
- TODAS as strings estão entre aspas duplas e FECHADAS
- TODAS as aspas dentro das strings estão escapadas (\\")
- NÃO há strings não terminadas (unterminated strings)
- Todos os campos obrigatórios estão preenchidos

Se alguma resposta for NÃO, REESCREVA o JSON completo antes de enviar.

Retorne APENAS o JSON válido e completo, sem markdown, sem código, sem explicações, sem strings não terminadas.`;

      // Construir payload
      const requestBody = {
        contents: [
          {
            role: "user",
            parts: [
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Data,
                },
              },
              {
                text: systemPrompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3, // Reduzido para respostas mais consistentes e controladas
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 2000, // Aumentado para garantir que o JSON completo seja retornado sem cortes
          responseMimeType: "application/json", // PHASE 28: Forçar resposta JSON
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
        ],
      };

      console.log("[ProductAnalyzer] 📤 Enviando requisição para Gemini...");

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
        console.error("[ProductAnalyzer] ❌ Erro da API:", errorText);
        throw new Error(`Gemini API error: ${response.status} ${errorText}`);
      }

      const responseData = await response.json();
      console.log("[ProductAnalyzer] ✅ Resposta recebida");

      // Extrair texto da resposta
      const textContent = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!textContent) {
        throw new Error("Resposta vazia do Gemini");
      }

      // Parsear JSON (pode vir com markdown code blocks)
      let jsonText = textContent.trim();
      
      // Remover markdown code blocks se existirem
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/```\n?/g, "");
      }

      // Sanitizar JSON: remover caracteres de controle
      jsonText = jsonText
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove caracteres de controle
        .trim();

      // Função para corrigir strings JSON não terminadas
      const fixUnterminatedStrings = (text: string): string => {
        let fixed = text;
        let depth = 0;
        let inString = false;
        let escapeNext = false;
        let lastValidPos = -1;
        
        for (let i = 0; i < fixed.length; i++) {
          const char = fixed[i];
          
          if (escapeNext) {
            escapeNext = false;
            continue;
          }
          
          if (char === '\\') {
            escapeNext = true;
            continue;
          }
          
          if (char === '"') {
            inString = !inString;
          }
          
          if (!inString) {
            if (char === '{') {
              depth++;
              lastValidPos = i;
            } else if (char === '}') {
              depth--;
              if (depth === 0) {
                lastValidPos = i;
              }
            }
          }
        }
        
        // Se ainda está dentro de uma string no final, tentar fechar
        if (inString) {
          // Procurar o início da string não fechada
          let stringStart = -1;
          let foundStringStart = false;
          
          for (let i = fixed.length - 1; i >= 0; i--) {
            if (fixed[i] === '"' && (i === 0 || fixed[i - 1] !== '\\')) {
              if (!foundStringStart) {
                stringStart = i;
                foundStringStart = true;
              } else {
                // Encontrou o início da string, fechar aqui
                fixed = fixed.substring(0, i + 1) + '"' + fixed.substring(i + 1);
                break;
              }
            }
          }
          
          // Se não encontrou início, adicionar aspas de fechamento no final
          if (!foundStringStart) {
            // Procurar último ":" antes do problema
            const lastColon = fixed.lastIndexOf(':');
            if (lastColon !== -1) {
              // Tentar fechar a string após o último ":"
              const afterColon = fixed.substring(lastColon + 1).trim();
              if (afterColon.startsWith('"') && !afterColon.endsWith('"')) {
                // String não fechada, fechar e adicionar vírgula se necessário
                fixed = fixed.substring(0, fixed.lastIndexOf('"') + 1) + '"';
              }
            } else {
              // Último recurso: adicionar aspas de fechamento
              fixed += '"';
            }
          }
        }
        
        // Se não terminou com }, tentar truncar até o último } válido
        if (!fixed.trim().endsWith('}')) {
          const lastBraceIndex = fixed.lastIndexOf('}');
          if (lastBraceIndex !== -1 && lastBraceIndex > fixed.length / 2) {
            // Só truncar se o } estiver na segunda metade do texto (provavelmente válido)
            fixed = fixed.substring(0, lastBraceIndex + 1);
            console.log("[ProductAnalyzer] ⚠️ JSON foi truncado até o último }");
          } else {
            // Último recurso: adicionar } de fechamento
            fixed = fixed.trim();
            if (!fixed.endsWith('}')) {
              fixed += '}';
              console.log("[ProductAnalyzer] ⚠️ Adicionado } de fechamento");
            }
          }
        }
        
        return fixed;
      };

      // Aplicar correção de strings não terminadas
      jsonText = fixUnterminatedStrings(jsonText);

      let analysisResult: ProductAnalysisResult;
      try {
        analysisResult = JSON.parse(jsonText);
      } catch (parseError: any) {
        console.error("[ProductAnalyzer] ❌ Erro ao fazer parse do JSON:", parseError);
        console.error("[ProductAnalyzer] 📄 JSON recebido (primeiros 500 chars):", jsonText.substring(0, 500));
        console.error("[ProductAnalyzer] 📄 JSON recebido (últimos 200 chars):", jsonText.substring(Math.max(0, jsonText.length - 200)));
        
        // Tentar reparação mais agressiva se o erro for "Unterminated string"
        if (parseError.message.includes("Unterminated string") || parseError.message.includes("position")) {
          console.log("[ProductAnalyzer] 🔧 Tentando reparação agressiva do JSON...");
          
          try {
            // Estratégia 1: Remover a descricao_seo problemática e tentar parsear
            const jsonWithoutDesc = jsonText.replace(/"descricao_seo"\s*:\s*"[^"]*(?:"|$)/g, (match) => {
              // Se a string não termina com ", fechar ela
              if (!match.endsWith('"')) {
                return match + '"';
              }
              return match;
            });
            
            if (jsonWithoutDesc !== jsonText) {
              analysisResult = JSON.parse(jsonWithoutDesc);
              // Adicionar descricao_seo vazia se não existir
              if (!analysisResult.descricao_seo) {
                analysisResult.descricao_seo = analysisResult.nome_sugerido || "Produto de qualidade.";
              }
              console.log("[ProductAnalyzer] ✅ JSON reparado com sucesso (descricao_seo corrigida)");
            } else {
              throw new Error("Reparação não conseguiu corrigir");
            }
          } catch (repairError) {
            // Estratégia 2: Tentar extrair apenas os campos essenciais
            console.log("[ProductAnalyzer] 🔧 Tentando extração manual dos campos...");
            
            const nomeMatch = jsonText.match(/"nome_sugerido"\s*:\s*"([^"]+)"/);
            const categoriaMatch = jsonText.match(/"suggested_category"\s*:\s*"([^"]+)"/);
            const tipoMatch = jsonText.match(/"product_type"\s*:\s*"([^"]+)"/);
            const tecidoMatch = jsonText.match(/"detected_fabric"\s*:\s*"([^"]+)"/);
            
            if (nomeMatch && categoriaMatch) {
              analysisResult = {
                nome_sugerido: nomeMatch[1],
                descricao_seo: nomeMatch[1] + ". Produto de qualidade e estilo.",
                suggested_category: categoriaMatch[1],
                product_type: tipoMatch ? tipoMatch[1] : categoriaMatch[1],
                detected_fabric: tecidoMatch ? tecidoMatch[1] : "Não especificado",
                dominant_colors: [],
                tags: [],
              };
              
              // Tentar extrair cores
              const coresMatch = jsonText.match(/"dominant_colors"\s*:\s*\[([^\]]*)\]/);
              if (coresMatch) {
                try {
                  const coresArray = JSON.parse(`[${coresMatch[1]}]`);
                  if (Array.isArray(coresArray)) {
                    analysisResult.dominant_colors = coresArray;
                  }
                } catch {
                  // Se não conseguir parsear cores, usar array vazio
                }
              }
              
              console.log("[ProductAnalyzer] ✅ JSON reconstruído manualmente");
            } else {
              throw parseError;
            }
          }
        } else {
          throw parseError;
        }
      }

      console.log("[ProductAnalyzer] 📊 Dados parseados:", {
        product_type: analysisResult.product_type,
        detected_fabric: analysisResult.detected_fabric,
        dominant_colors: analysisResult.dominant_colors,
        hasProductType: !!analysisResult.product_type,
        hasDetectedFabric: !!analysisResult.detected_fabric,
        hasDominantColors: !!analysisResult.dominant_colors && Array.isArray(analysisResult.dominant_colors),
      });

      // Compatibilidade: mapear campos antigos para novos se necessário
      if (analysisResult.categoria_sugerida && !analysisResult.suggested_category) {
        analysisResult.suggested_category = analysisResult.categoria_sugerida;
      }
      if (analysisResult.tecido_estimado && !analysisResult.detected_fabric) {
        analysisResult.detected_fabric = analysisResult.tecido_estimado;
      }
      if (analysisResult.cor_predominante && (!analysisResult.dominant_colors || analysisResult.dominant_colors.length === 0)) {
        // Converter cor_predominante para dominant_colors se não existir
        analysisResult.dominant_colors = [{
          hex: "#000000", // Placeholder - a IA deve retornar hex correto
          name: analysisResult.cor_predominante
        }];
      }

      // Validar estrutura mínima
      if (!analysisResult.nome_sugerido || !analysisResult.suggested_category) {
        throw new Error("Resposta do Gemini não contém estrutura esperada (nome_sugerido e suggested_category são obrigatórios)");
      }

      // Garantir que dominant_colors seja um array válido
      if (!Array.isArray(analysisResult.dominant_colors) || analysisResult.dominant_colors.length === 0) {
        // Fallback: criar array com cor padrão se não houver cores detectadas
        if (analysisResult.cor_predominante) {
          // Tentar converter cor_predominante para hex aproximado
          const colorMap: Record<string, string> = {
            "preto": "#000000", "branco": "#FFFFFF", "cinza": "#808080",
            "vermelho": "#FF0000", "azul": "#0000FF", "verde": "#008000",
            "amarelo": "#FFFF00", "rosa": "#FFC0CB", "roxo": "#800080",
            "laranja": "#FFA500", "marrom": "#A52A2A", "bege": "#F5F5DC",
            "azul marinho": "#000080", "verde musgo": "#8A9A5B"
          };
          const corLower = analysisResult.cor_predominante.toLowerCase().trim();
          const hex = colorMap[corLower] || "#808080";
          analysisResult.dominant_colors = [{
            hex: hex,
            name: analysisResult.cor_predominante
          }];
        } else {
          analysisResult.dominant_colors = [{
            hex: "#808080",
            name: "Não especificado"
          }];
        }
      }
      
      // Garantir que product_type tenha um valor
      if (!analysisResult.product_type || analysisResult.product_type.trim() === "") {
        // Tentar inferir do nome ou categoria
        const nomeLower = (analysisResult.nome_sugerido || "").toLowerCase();
        const categoriaLower = (analysisResult.suggested_category || "").toLowerCase();
        
        if (nomeLower.includes("vestido")) {
          analysisResult.product_type = "Vestido";
        } else if (nomeLower.includes("blusa") || nomeLower.includes("camisa")) {
          analysisResult.product_type = "Blusa";
        } else if (nomeLower.includes("calça")) {
          analysisResult.product_type = "Calça";
        } else if (nomeLower.includes("short") || nomeLower.includes("bermuda")) {
          analysisResult.product_type = "Short";
        } else if (categoriaLower) {
          analysisResult.product_type = categoriaLower.charAt(0).toUpperCase() + categoriaLower.slice(1);
        } else {
          analysisResult.product_type = "Produto";
        }
      }
      
      // Garantir que detected_fabric tenha um valor
      if (!analysisResult.detected_fabric || analysisResult.detected_fabric.trim() === "") {
        if (analysisResult.tecido_estimado && analysisResult.tecido_estimado.trim() !== "") {
          analysisResult.detected_fabric = analysisResult.tecido_estimado;
        } else {
          analysisResult.detected_fabric = "Não especificado";
        }
      }

      // Garantir que descricao_seo não exceda 500 caracteres
      if (analysisResult.descricao_seo && analysisResult.descricao_seo.length > 500) {
        console.warn("[ProductAnalyzer] ⚠️ Descrição SEO excedeu 500 caracteres, truncando...");
        analysisResult.descricao_seo = analysisResult.descricao_seo.slice(0, 500).trim();
      }

    const executionTime = Date.now() - startTime;
    console.log("[ProductAnalyzer] ✅ Análise concluída em", executionTime, "ms");

    return {
      success: true,
      data: analysisResult,
      executionTime,
    };
  }
}

// Singleton
export const productAnalyzerService = new ProductAnalyzerService();

