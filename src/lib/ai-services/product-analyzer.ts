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
 * Medidas padrão estimadas do produto (tamanho M)
 */
export interface StandardMeasurements {
  bust?: number; // Busto em cm (apenas para peças superiores e vestidos)
  waist?: number; // Cintura em cm
  hip?: number; // Quadril em cm (apenas para peças inferiores, vestidos e calças)
  length?: number; // Comprimento em cm (sempre presente)
  unit?: 'cm'; // Unidade de medida (sempre 'cm')
  calibration_method?: 'A4_REFERENCE' | 'HANGER' | 'AI_ESTIMATE'; // Método de calibração usado
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
  dominant_colors: DominantColor[]; // Array de cores predominantes com hex e nome (para produtos únicos)
  colors_by_item?: Array<{ item: string; colors: DominantColor[] }>; // Cores por item (para conjuntos)
  logistic_unit: string; // Unidade de medida provável: 'UN', 'PAR', 'CJ', 'KG', 'G', 'L', 'ML', 'M', 'M2'
  has_variations_likely: boolean; // Se produto provavelmente tem variações (tamanho, cor, voltagem, etc.)
  standard_measurements?: StandardMeasurements; // Medidas padrão estimadas (tamanho M) baseadas no tipo de produto
  detected_audience?: 'KIDS' | 'ADULT'; // Público alvo detectado
  tags?: string[]; // Tags mantidas apenas internamente (não exibidas na UI)
  cor_predominante?: string; // Mantido para compatibilidade
  tecido_estimado?: string; // Mantido para compatibilidade
  detalhes?: string[]; // Mantido para compatibilidade
}

/**
 * Contexto para análise de produto
 */
export interface AnalysisContext {
  audience?: 'KIDS' | 'ADULT';
  sizeSystem?: 'AGE_BASED' | 'LETTER_BASED' | 'NUMERIC';
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
  async analyzeProductImage(imageUrl: string, context?: AnalysisContext): Promise<APIResponse<ProductAnalysisResult>> {
    const startTime = Date.now();

    if (!this.isConfigured()) {
      return {
        success: false,
        error: "Serviço não configurado. Configure GOOGLE_CLOUD_PROJECT_ID.",
      };
    }

    try {
      console.log("[ProductAnalyzer] 🔍 Iniciando análise de produto:", imageUrl.substring(0, 100) + "...", "context:", context);

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
          
          const analysisResult = await this.performAnalysis(accessToken, base64Data, context);
          
          // Se chegou aqui, a análise foi bem-sucedida
          const executionTime = Date.now() - startTime;
          console.log("[ProductAnalyzer] ✅ Análise concluída em", executionTime, "ms");

          return {
            success: true,
            data: analysisResult,
            executionTime,
          };
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
      // Capturar TODOS os erros e retornar objeto válido
      let errorMessage = error?.message || "Erro desconhecido ao analisar produto";
      
      // Sanitizar a mensagem de erro para garantir que seja uma string válida
      if (typeof errorMessage !== 'string') {
        errorMessage = String(errorMessage);
      }
      
      // Remover caracteres problemáticos que podem quebrar JSON
      errorMessage = errorMessage
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove caracteres de controle
        .replace(/\r\n/g, ' ')
        .replace(/\r/g, ' ')
        .replace(/\n/g, ' ')
        .substring(0, 500); // Limitar tamanho
      
      console.error("[ProductAnalyzer] ❌ Erro capturado na análise:", errorMessage);
      console.error("[ProductAnalyzer] ❌ Stack trace:", error.stack);
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: false,
        error: errorMessage,
        executionTime,
      };
    }
  }

  /**
   * Realiza a análise do produto (extraído para permitir retry)
   * Retorna apenas os dados (ProductAnalysisResult), não APIResponse
   */
  private async performAnalysis(accessToken: string, base64Data: string, context?: AnalysisContext): Promise<ProductAnalysisResult> {
    const startTime = Date.now();

    try {
      // Construir instruções de contexto se fornecido
      let contextInstructions = "";
      if (context?.audience === 'KIDS') {
        contextInstructions += `\n\n👶 CONTEXTO: Este produto é para CRIANÇAS/INFANTIL.\n`;
        contextInstructions += `- Ajuste suas expectativas anatômicas: proporções infantis são menores e diferentes de adultos.\n`;
        contextInstructions += `- As medidas padrão devem refletir tamanhos infantis (ex: busto 30-40cm, comprimento 40-60cm para tops).\n`;
        contextInstructions += `- O nome e descrição devem ser apropriados para público infantil.\n`;
      } else if (context?.audience === 'ADULT') {
        contextInstructions += `\n\n👔 CONTEXTO: Este produto é para ADULTOS.\n`;
        contextInstructions += `- Use proporções anatômicas adultas padrão.\n`;
        contextInstructions += `- As medidas padrão devem refletir tamanhos adultos (ex: busto 42-48cm, comprimento 55-70cm para tops).\n`;
      }

      if (context?.sizeSystem === 'AGE_BASED') {
        contextInstructions += `- Sistema de tamanhos baseado em IDADE (ex: RN, 3m, 6m, 12m, 2 anos, 4 anos, etc.).\n`;
      } else if (context?.sizeSystem === 'LETTER_BASED') {
        contextInstructions += `- Sistema de tamanhos baseado em LETRAS (ex: P, M, G, GG, XG).\n`;
      } else if (context?.sizeSystem === 'NUMERIC') {
        contextInstructions += `- Sistema de tamanhos NUMÉRICO (ex: 36, 38, 40, 42, 44, 46, 48, 50, 52, 54).\n`;
      }

      // Instruções de calibração (buscar objetos de referência)
      contextInstructions += `\n\n📏 CALIBRAÇÃO DE MEDIDAS:\n`;
      contextInstructions += `- PRIORIDADE 1: Busque objetos de referência na imagem (Folha A4 = 210mm de largura, Cartão de Crédito = 85.6mm de largura).\n`;
      contextInstructions += `- PRIORIDADE 2: Se houver cabide visível, use como referência (largura média de cabide adulto = 42cm).\n`;
      contextInstructions += `- PRIORIDADE 3: Se não houver referência, estime baseado nas proporções visuais e no contexto (KIDS vs ADULT).\n`;
      contextInstructions += `- Sempre indique no campo "calibration_method" qual método foi usado: "A4_REFERENCE", "HANGER" ou "AI_ESTIMATE".\n`;

      // Prompt do sistema para análise de produto
      const systemPrompt = `Você é um especialista em E-commerce de Moda e SEO. Analise a imagem fornecida e retorne APENAS um JSON válido e COMPLETO (sem markdown, sem código, sem explicações, SEM strings não terminadas).

🚨 ATENÇÃO CRÍTICA - CAMPOS OBRIGATÓRIOS QUE NUNCA PODEM FICAR VAZIOS:
- "detected_fabric": SEMPRE deve ser preenchido. Analise a textura, brilho e aparência do tecido. Se não conseguir identificar, use uma estimativa baseada na aparência visual.
- "dominant_colors": SEMPRE deve conter pelo menos 1 cor. Analise as cores predominantes na imagem. Se não conseguir identificar, use a cor mais visível.
- "product_type": SEMPRE deve ser preenchido com o tipo específico do produto.
- "nome_sugerido": SEMPRE deve ser preenchido com um título comercial.

NUNCA retorne esses campos vazios ou como "Não especificado". Sempre preencha com valores reais ou estimativas baseadas na análise visual.${contextInstructions}

🚨 REGRA CRÍTICA DE JSON VÁLIDO:
- TODAS as strings devem estar entre aspas duplas (")
- TODAS as aspas dentro das strings devem ser escapadas com \\"
- TODAS as strings devem ser FECHADAS com aspas duplas
- O JSON deve começar com { e terminar com }
- NUNCA deixe strings não terminadas (unterminated strings)

Retorne APENAS o JSON válido com a seguinte estrutura exata:

{
  "nome_sugerido": "Título curto e comercial (ex: Vestido Longo Floral de Verão)",
  "descricao_seo": "Descrição comercial rica, persuasiva e otimizada para SEO sobre o produto analisado na imagem. 
  
  📝 ESTRUTURA OBRIGATÓRIA (mínimo 150-250 caracteres):
  
  1. ABERTURA IMPACTANTE (1-2 frases):
     - Comece destacando o tipo de produto e sua principal característica visual
     - Use adjetivos persuasivos (ex: \\"elegante\\", \\"moderno\\", \\"confortável\\", \\"versátil\\")
     - Exemplo: \\"Descubra a [tipo de produto] perfeita para [ocasião/estilo].\\"
  
  2. DETALHES TÉCNICOS E VISUAIS (2-3 frases):
     - Mencione o TECIDO detectado e suas características (ex: \\"Confeccionada em [tecido], oferece [benefício do tecido]\\")
     - Descreva as CORES predominantes de forma atrativa e específica (ex: \\"Na cor [cor], transmite [sensação/estilo]\\")
     - Destaque PADRÕES, TEXTURAS ou DETALHES únicos visíveis (ex: estampas, bordados, cortes especiais, babados, pregas, botões)
     - Para CONJUNTOS: descreva ambas as peças e como se complementam, mencionando características específicas de cada uma
     - Seja ESPECÍFICO: em vez de \\"tecido de qualidade\\", diga \\"malha de algodão\\" ou \\"viscose leve\\"
     - Em vez de \\"cor bonita\\", diga \\"azul sereno\\" ou \\"marrom elegante\\"
  
  3. BENEFÍCIOS E VERSATILIDADE (2-3 frases):
     - Conecte características visuais com benefícios práticos
     - Mencione ocasiões de uso (ex: \\"Ideal para [casual/festa/trabalho/praia]\\")
     - Destaque versatilidade e facilidade de combinação
     - Para roupas: mencione caimento, conforto ou estilo
  
  4. CALL TO ACTION SUTIL (1 frase final):
     - Encerre convidando à ação de forma natural
     - Exemplo: \\"Perfeita para compor looks únicos e cheios de personalidade.\\"
     - Ou: \\"Uma peça essencial para quem busca estilo e qualidade.\\"
  
  🎯 REGRAS DE QUALIDADE:
  
  ✅ USE:
  - Linguagem comercial e persuasiva (mas natural, não exagerada)
  - Keywords de SEO integradas naturalmente (tipo de produto, cor, tecido, estilo)
  - Descrições ESPECÍFICAS baseadas no que você VÊ na imagem (cores exatas, tecidos reais, detalhes visíveis)
  - Frases variadas e bem estruturadas
  - Mínimo de 150 caracteres, ideal 200-350 caracteres
  - Adjetivos descritivos e específicos (ex: \\"azul sereno\\", \\"malha macia\\", \\"corte moderno\\")
  - Mencione detalhes visíveis: babados, pregas, estampas, botões, golas, mangas, etc.
  
  ❌ EVITE:
  - Frases genéricas como \\"Produto de qualidade\\" ou \\"Perfeito para você\\"
  - Repetir informações do nome do produto
  - Descrições muito curtas (menos de 100 caracteres)
  - Linguagem robótica ou muito técnica
  - Mencionar acessórios que não fazem parte do produto
  
  📋 EXEMPLOS DE BOAS DESCRIÇÕES:
  
  Exemplo 1 (Camiseta):
  \\"Camiseta masculina confeccionada em malha de algodão, oferecendo máximo conforto e respirabilidade. Na cor marrom, transmite elegância casual e versatilidade para o dia a dia. Com estampa única, adiciona personalidade ao visual. Perfeita para looks despojados e cheios de estilo.\\"
  
  Exemplo 2 (Vestido):
  \\"Vestido feminino em tecido leve e fluido, ideal para momentos especiais. Na cor [cor], realça a feminilidade e sofisticação. Com corte [tipo de corte], valoriza a silhueta e oferece conforto. Perfeito para eventos, festas ou ocasiões que pedem um toque de elegância.\\"
  
  Exemplo 3 (Conjunto):
  \\"Conjunto completo composto por [peça 1] e [peça 2], criado para quem busca praticidade sem abrir mão do estilo. Confeccionado em [tecido], oferece conforto e durabilidade. As peças se complementam perfeitamente, permitindo looks coordenados e modernos. Ideal para o dia a dia ou momentos especiais.\\"
  
  ⚠️ REGRAS CRÍTICAS TÉCNICAS - COMPLETUDE ABSOLUTA:
  
  🚨 PRIORIDADE MÁXIMA: A DESCRIÇÃO DEVE SER 100% COMPLETA - NUNCA CORTADA:
  
  1) SEMPRE termine com uma frase COMPLETA e um PONTO FINAL (.)
     - A última palavra deve estar COMPLETA (não cortada)
     - A última frase deve fazer sentido completo
     - Exemplo CORRETO: \\"...oferece conforto e durabilidade. Ideal para o dia a dia.\\"
     - Exemplo ERRADO: \\"...oferece conforto e durabilidade. Ideal para o dia\\" (CORTADO!)
  
  2) 🚨 PROIBIÇÃO ABSOLUTA - NUNCA CORTE NO MEIO:
     - NUNCA deixe o texto incompleto ou cortado no meio de uma palavra
     - NUNCA termine com palavras incompletas como \\"algodão text\\" ou \\"confortável e\\"
     - NUNCA pare no meio de uma frase sem completar o pensamento
     - Se você começar a escrever sobre algo, DEVE terminar completamente
     - Exemplo ERRADO: \\"Confeccionado em algodão text\\" → CORRETO: \\"Confeccionado em algodão texturizado, oferece...\\"
  
  3) 🚨 ESTRUTURA OBRIGATÓRIA - TODAS AS PARTES DEVEM ESTAR COMPLETAS:
     - ABERTURA: Deve estar completa (1-2 frases)
     - DETALHES TÉCNICOS: Deve estar completo (2-3 frases, mencionando tecido E cor E detalhes)
     - BENEFÍCIOS: Deve estar completo (2-3 frases sobre versatilidade e ocasiões)
     - CALL TO ACTION: Deve estar completo (1 frase final completa com ponto)
     - Se você mencionar \\"Confeccionado em algodão\\", DEVE completar: \\"Confeccionado em algodão [tipo], oferece [benefício]\\"
  
  4) 🚨 CRÍTICO - ASPAS NO TEXTO:
     - Se usar aspas dentro do texto, ESCAPE com \\" (ex: Ele disse \\"perfeito\\")
     - NÃO use aspas simples, use aspas duplas escapadas
     - Garanta que a string termine com aspas duplas FECHADAS
  
  5) Use informações REAIS da análise:
     - Se detectou \\"Malha de Algodão\\" → mencione \\"malha de algodão\\" COMPLETO
     - Se detectou cor \\"Marrom\\" → mencione \\"marrom\\" COMPLETO
     - Se detectou \\"Camiseta\\" → mencione características de camiseta COMPLETO
     - NUNCA pare no meio: \\"algodão text\\" → COMPLETE: \\"algodão texturizado\\" ou \\"algodão de alta qualidade\\"
  
  ✅ CHECKLIST OBRIGATÓRIO - ANTES DE FINALIZAR, VERIFIQUE CADA ITEM:
  
  🚨 COMPLETUDE (CRÍTICO - VERIFICAR PRIMEIRO):
  - [ ] A descrição está 100% COMPLETA? (NÃO há palavras cortadas no final?)
  - [ ] A última palavra está COMPLETA? (não termina com \\"text\\", \\"algodão tex\\", \\"confortável e\\", etc.)
  - [ ] A última frase está COMPLETA e faz sentido?
  - [ ] Termina com ponto final (.)?
  - [ ] O raciocínio foi CONCLUÍDO de forma lógica?
  - [ ] NÃO há frases incompletas no meio do texto?
  
  📝 CONTEÚDO:
  - [ ] Descrição tem pelo menos 150 caracteres? (ideal 200-350)
  - [ ] Menciona o tecido/material detectado COMPLETO? (não apenas \\"algodão\\" mas \\"algodão [tipo]\\")
  - [ ] Menciona as cores predominantes?
  - [ ] Descreve características visuais específicas?
  - [ ] Conecta características com benefícios?
  - [ ] Tem call to action final completo?
  
  🔧 TÉCNICO:
  - [ ] TODAS as aspas estão escapadas (\\")?
  - [ ] A string está FECHADA com aspas duplas?
  
  🚨 SE QUALQUER ITEM DE COMPLETUDE ESTIVER FALTANDO, A DESCRIÇÃO ESTÁ INCORRETA E DEVE SER REGENERADA COMPLETA!",
  "suggested_category": "Uma das categorias consolidadas (obrigatório usar exatamente uma delas): Roupas, Calçados, Acessórios, Joias, Praia, Fitness, Cosméticos, Outros. IMPORTANTE: Agrupe produtos similares na mesma categoria (ex: Vestidos, Blusas, Calças, Saias, Shorts, Jaquetas -> Roupas; Tênis, Sapatos, Sandálias -> Calçados; Bolsas, Cintos, Óculos -> Acessórios; Brincos, Colares, Relógios -> Joias; Biquínis, Maiôs -> Praia; Leggings, Tops esportivos -> Fitness).",
  "product_type": "Tipo específico e detalhado do produto analisado na imagem. OBRIGATÓRIO: Deve ser preenchido com o tipo exato (ex: 'Blazer', 'Vestido Midi', 'Tênis Esportivo', 'Bermuda', 'Camisa Social', 'Legging', 'Biquíni', 'Bolsa Tote', 'Jaqueta Jeans', 'Calça Skinny', 'Conjunto Cropped e Shorts', 'Conjunto Blusa e Calça', 'Conjunto Top e Saia'). CRÍTICO: Se a imagem mostra MÚLTIPLAS PEÇAS vendidas juntas (ex: cropped + short, blusa + calça, top + saia), o product_type DEVE ser 'Conjunto [Nome da Peça 1] e [Nome da Peça 2]' (ex: 'Conjunto Cropped e Shorts', 'Conjunto Blusa e Calça'). NÃO identifique apenas uma das peças (ex: não diga apenas 'Short' se houver cropped + short). NÃO deixe vazio.",
  "detected_fabric": "Tecido/material detectado na imagem. 🚨 OBRIGATÓRIO E CRÍTICO: DEVE ser preenchido SEMPRE. Analise a textura, brilho, espessura e aparência do tecido na imagem. Se não conseguir identificar com 100% de certeza, use uma estimativa baseada na aparência visual (ex: se parecer leve e fluido → 'Viscose' ou 'Chiffon'; se parecer grosso e rústico → 'Algodão' ou 'Linho'; se parecer elástico → 'Malha' ou 'Algodão com Elastano'; se parecer jeans → 'Jeans' ou 'Sarja'). NUNCA deixe vazio. Se realmente não conseguir identificar, use 'Tecido não identificado' mas SEMPRE preencha este campo.",
  "dominant_colors": [
    {"hex": "#000000", "name": "Preto"},
    {"hex": "#FFFFFF", "name": "Branco"}
  ],
  "colors_by_item": [
    {"item": "Top", "colors": [{"hex": "#FFC0CB", "name": "Rosa"}]},
    {"item": "Saia", "colors": [{"hex": "#FFC0CB", "name": "Rosa"}]},
    {"item": "Cinto", "colors": [{"hex": "#FFD700", "name": "Dourado"}]}
  ],
  "tags": ["array de strings com 5-8 tags. IMPORTANTE: Inclua tags de contexto como 'praia', 'inverno', 'fitness', 'festa', 'casual', 'social', 'swimwear', 'gym', 'winter', 'couro' para ativar os cenários corretos no sistema"],
  "logistic_unit": "UN",
  "has_variations_likely": true,
  "standard_measurements": {
    "bust": 45,
    "waist": 40,
    "hip": 44,
    "length": 60,
    "unit": "cm",
    "calibration_method": "A4_REFERENCE"
  },
  "detected_audience": "ADULT"
}

🚨 CAMPOS OBRIGATÓRIOS - LOGÍSTICA E VARIAÇÕES:

1. "logistic_unit": Você DEVE escolher UMA e APENAS UMA opção da seguinte lista ESTRITA: ['UN', 'PAR', 'CJ', 'KG', 'G', 'L', 'ML', 'M', 'M2']

   REGRAS DE ESCOLHA:
   - 'UN' (Unidade): Para itens contáveis individuais (roupas, móveis, eletrônicos, joias, acessórios individuais como bolsas, óculos, relógios, livros, vasos, ferramentas, etc.)
   - 'PAR' (Par): Para itens vendidos em pares (calçados, luvas, meias, brincos, etc.)
   - 'CJ' (Conjunto): Para conjuntos/kit de múltiplos itens vendidos juntos (conjunto de roupas, kit de cosméticos, conjunto de talheres, etc.)
   - 'KG' (Quilograma): Para produtos vendidos por peso em quilogramas (carnes, grãos a granel, etc.)
   - 'G' (Grama): Para produtos vendidos por peso em gramas (carnes pequenas, temperos, etc.)
   - 'L' (Litro): Para líquidos vendidos por litro (óleos, sucos a granel, etc.)
   - 'ML' (Mililitro): Para líquidos vendidos por mililitro (cosméticos líquidos, perfumes, remédios líquidos, etc.)
   - 'M' (Metro): Para produtos vendidos por comprimento em metros (tecidos, fitas, cabos, cordas, etc.)
   - 'M2' (Metro quadrado): Para produtos vendidos por área em metros quadrados (azulejos, pisos, carpetes, tecidos por m², etc.)

   EXEMPLOS:
   - Vestido, Camisa, Calça, Bolsa, Óculos, Relógio → "UN"
   - Tênis, Sandália, Bota, Luva, Meia, Brinco → "PAR"
   - Conjunto de Roupas (short + camiseta vendidos juntos), Kit de Maquiagem → "CJ"
   - Tecido por metro → "M"
   - Tecido por m², Azulejo → "M2"
   - Perfume, Creme, Loção → "ML"
   - Óleo de cozinha a granel → "L"

2. "has_variations_likely": Boolean (true ou false). Indica se o produto PROVAVELMENTE tem variações de estoque.

   CONSIDERE TRUE (tem variações) SE:
   - É roupa ou peça de vestuário (geralmente tem tamanhos e/ou cores)
   - É calçado (geralmente tem tamanhos e cores)
   - É acessório como bolsa, cinto (pode ter cores)
   - É eletrônico que pode ter voltagens diferentes ou modelos
   - É produto de moda em geral
   
   CONSIDERE FALSE (não tem variações) SE:
   - É produto único/personalizado (ex: obra de arte, produto artesanal único)
   - É produto simples que geralmente não varia (ex: livro específico, CD, ferramenta básica, produto digital)
   - É produto que é sempre o mesmo (ex: ingrediente específico, produto industrial padrão)

   REGRA GERAL: Se for moda/vestuário/acessório → true. Se for produto simples/industrial básico → false.

   EXEMPLOS:
   - Vestido, Camisa, Calça, Tênis, Bolsa → true (geralmente tem tamanhos/cores)
   - Livro específico, CD, Ferramenta específica → false (geralmente não varia)

IMPORTANTE SOBRE OS CAMPOS OBRIGATÓRIOS:
- "product_type": DEVE ser preenchido. Analise a imagem e identifique o tipo específico do produto (ex: se for uma camisa, diga "Camisa" ou "Camisa Social", não deixe vazio).
- "detected_fabric": 🚨 OBRIGATÓRIO E CRÍTICO - DEVE ser preenchido SEMPRE. Analise cuidadosamente a textura, brilho, espessura, caimento e aparência geral do tecido na imagem. Use estas pistas visuais:
  * Textura lisa e brilhante → "Seda" ou "Cetim"
  * Textura áspera e natural → "Algodão" ou "Linho"
  * Textura elástica e justa → "Malha", "Algodão com Elastano" ou "Viscose com Elastano"
  * Textura grosseira e resistente → "Jeans", "Sarja" ou "Algodão grosso"
  * Textura leve e fluida → "Chiffon", "Viscose" ou "Georgette"
  * Textura sintética e brilhante → "Poliéster" ou "Nylon"
  * Se não conseguir identificar com certeza, use uma estimativa baseada na aparência visual. NUNCA deixe vazio. Se realmente não conseguir identificar, use "Tecido não identificado" mas SEMPRE preencha este campo.
  
- "dominant_colors": 🚨 OBRIGATÓRIO E CRÍTICO - DEVE conter pelo menos 1 cor, preferencialmente 2-3 cores. Analise cuidadosamente as cores predominantes na imagem e retorne um array com objetos contendo:
  * "hex": código hexadecimal da cor (ex: Preto="#000000", Branco="#FFFFFF", Vermelho="#FF0000", Azul="#0000FF", Verde="#008000", Azul Claro="#87CEEB", Rosa="#FFC0CB", Bege="#F5F5DC", etc.)
  * "name": nome da cor em português (ex: "Preto", "Branco", "Vermelho", "Azul", "Verde", "Azul Claro", "Rosa", "Bege", "Azul Sereno", "Azul Marinho", "Verde Oliva", etc.)
  * Analise a cor principal do produto e também cores secundárias se houver padrões, detalhes ou múltiplas peças.
  * Se o produto tiver múltiplas cores, inclua todas as cores predominantes (ex: se for um conjunto azul e branco, inclua ambas as cores).
  * NUNCA deixe o array vazio. SEMPRE retorne pelo menos 1 cor.

- "colors_by_item": 🎯 OBRIGATÓRIO PARA CONJUNTOS - Se o produto for um CONJUNTO (múltiplas peças vendidas juntas, ex: "Conjunto Top e Saia", "Conjunto Cropped e Shorts", "Conjunto Blusa e Calça"), DEVE preencher este campo com um array de objetos, cada um representando uma peça do conjunto:
  * "item": nome simplificado da peça (ex: "Top", "Saia", "Cropped", "Shorts", "Blusa", "Calça", "Cinto", "Bolsa", etc.). Use nomes curtos e diretos.
  * "colors": array de objetos com as cores predominantes dessa peça específica, seguindo o mesmo formato de "dominant_colors" (com "hex" e "name").
  * Exemplo para conjunto "Top e Saia": [{"item": "Top", "colors": [{"hex": "#FFC0CB", "name": "Rosa"}]}, {"item": "Saia", "colors": [{"hex": "#FFC0CB", "name": "Rosa"}]}, {"item": "Cinto", "colors": [{"hex": "#FFD700", "name": "Dourado"}]}]
  * Se for produto ÚNICO (não conjunto), pode deixar este campo vazio ou omitir.
  * CRÍTICO: Se o product_type contém "Conjunto" ou há múltiplas peças visíveis, SEMPRE preencha "colors_by_item" separando as cores por peça.
- "standard_measurements": OBRIGATÓRIO para produtos de moda. Retorne medidas estimadas padrão (tamanho M) baseadas no tipo de produto. Use valores realistas em centímetros:
  * **Para peças SUPERIORES (blusa, camisa, top, cropped, moletom, sweatshirt, hoodie):** 🚨 OBRIGATÓRIO: Inclua "bust" (busto) e "length" (comprimento). Para peças com cintura definida, inclua também "waist". NÃO inclua "hip". CRÍTICO: Para moletons, sweatshirts, hoodies e camisetas, SEMPRE retorne "bust" mesmo que a detecção visual seja difícil - use estimativas baseadas em padrões de mercado se necessário.
  * **Para peças INFERIORES (calça, short, bermuda, saia):** Inclua "waist" (cintura), "hip" (quadril) e "length" (comprimento). NÃO inclua "bust".
  * **Para VESTIDOS e MACACÕES:** Inclua "bust" (busto), "waist" (cintura), "hip" (quadril) e "length" (comprimento).
  * **Para ROUPA ÍNTIMA (sunga, cueca, calcinha):** Inclua "hip" (quadril) e "length" (comprimento). NÃO inclua "bust".
  * **Para PEÇAS DE BANHO (biquíni, maiô):** Inclua "bust" (busto), "waist" (cintura), "hip" (quadril) e "length" (comprimento).
  * **Para CONJUNTOS (conjunto de roupas com múltiplas peças):** Inclua medidas para AMBAS as peças. Se for conjunto top + bottom, inclua "bust" (para o top), "waist", "hip" (para o bottom) e "length" (para ambas as peças).
  
  Exemplos de valores realistas para tamanho M (Adulto) e tamanho 6 (Infantil):
  - Vestido (Adulto M): bust: 44-48, waist: 38-42, hip: 44-48, length: 80-120
  - Blusa (Adulto M): bust: 44-48, waist: 38-42, length: 55-70
  - Moletom/Sweatshirt (Adulto M): bust: 44-48, length: 60-70
  - Moletom/Sweatshirt (Infantil 6): bust: 32-34, length: 45-50
  - Moletom/Sweatshirt (Infantil 8): bust: 34-36, length: 48-52
  - Moletom/Sweatshirt (Infantil 10): bust: 36-38, length: 50-55
  - Calça: waist: 38-42, hip: 44-48, length: 95-110
  - Saia: waist: 38-42, hip: 44-48, length: 40-70
  - Sunga: hip: 42-46, length: 25-35
  
  IMPORTANTE: Apenas inclua as medidas que fazem sentido para o tipo de produto. Analise a imagem e determine quais medidas são relevantes baseado no tipo de roupa identificado.
  
  📏 CAMPOS OBRIGATÓRIOS EM "standard_measurements":
  - "unit": Sempre "cm" (centímetros)
  - "calibration_method": OBRIGATÓRIO. Indique qual método de calibração foi usado:
    * "A4_REFERENCE": Se você detectou uma folha A4 na imagem (210mm de largura) e usou como referência
    * "HANGER": Se você detectou um cabide na imagem e usou como referência (assumindo largura média de 42cm)
    * "AI_ESTIMATE": Se não houve objeto de referência e você estimou baseado apenas nas proporções visuais
  - "detected_audience": OBRIGATÓRIO. Indique o público alvo detectado: "KIDS" (crianças/infantil) ou "ADULT" (adultos)

INSTRUÇÃO CRÍTICA - FOCO APENAS NA ROUPA:
- Se a imagem contiver acessórios (bolsas, sapatos, joias, óculos, relógios, cintos, etc.) junto com a roupa, IGNORE completamente os acessórios.
- Analise SOMENTE as peças de roupa (vestido, blusa, calça, etc.).
- Não mencione acessórios na descrição, tags ou detalhes.
- Foque exclusivamente nas características da roupa: tecido, cor, corte, estilo, detalhes da peça.
- **CRÍTICO - CONJUNTOS**: Se houver MÚLTIPLAS PEÇAS DE ROUPA vendidas JUNTAS (ex: cropped + short, blusa + calça, top + saia), identifique como "Conjunto" no product_type e descreva AMBAS as peças no nome_sugerido e descricao_seo. NÃO analise apenas uma das peças - o produto é o CONJUNTO completo.

REGRAS CRÍTICAS PARA TAGS:
- Se for roupa de banho (biquíni, maiô, sunga) -> DEVE incluir tag "praia" ou "swimwear" (Ativa Bikini Law)
- Se for roupa de frio/couro (casaco, sobretudo, bota, cachecol) -> DEVE incluir tag "inverno" ou "winter" (Ativa Winter Rule)
- Se for roupa de ginástica (legging, top, tênis esportivo) -> DEVE incluir tag "fitness" ou "gym" (Ativa Gym Integrity)
- Se for roupa social (terno, blazer, vestido longo) -> DEVE incluir tag "social" ou "office"
- Se for roupa de festa (vestido de festa, paetê, salto alto) -> DEVE incluir tag "festa" ou "party"

INSTRUÇÃO CRÍTICA - FOCO APENAS NA ROUPA:
- Se a imagem contiver acessórios (bolsas, sapatos, joias, óculos, relógios, cintos, etc.) junto com a roupa, IGNORE completamente os acessórios.
- Analise SOMENTE as peças de roupa (vestido, blusa, calça, etc.).
- Não mencione acessórios na descrição, tags ou detalhes.
- Foque exclusivamente nas características da roupa: tecido, cor, corte, estilo, detalhes da peça.
- **CRÍTICO - CONJUNTOS**: Se houver MÚLTIPLAS PEÇAS DE ROUPA vendidas JUNTAS (ex: cropped + short, blusa + calça, top + saia, top + saia + cinto), identifique como "Conjunto" no product_type e descreva AMBAS as peças no nome_sugerido e descricao_seo. NÃO analise apenas uma das peças - o produto é o CONJUNTO completo.
- **CRÍTICO - CORES POR ITEM EM CONJUNTOS**: Se for um CONJUNTO, SEMPRE preencha "colors_by_item" separando as cores de cada peça. Analise cada peça individualmente e identifique suas cores predominantes. Exemplo: Se for "Conjunto Top e Saia" onde o Top é rosa e a Saia é rosa com cinto dourado, retorne: [{"item": "Top", "colors": [{"hex": "#FFC0CB", "name": "Rosa"}]}, {"item": "Saia", "colors": [{"hex": "#FFC0CB", "name": "Rosa"}]}, {"item": "Cinto", "colors": [{"hex": "#FFD700", "name": "Dourado"}]}]

🚨 ÚLTIMA VERIFICAÇÃO ANTES DE ENVIAR:
Releia a "descricao_seo" que você escreveu:
1. A última frase está COMPLETA?
2. Termina com ponto final?
3. O raciocínio foi CONCLUÍDO de forma lógica?
4. NÃO há palavras cortadas?
5. TODAS as aspas dentro do texto estão escapadas (\\")?
6. A string descricao_seo está FECHADA com aspas duplas?

🚨 VERIFICAÇÃO CRÍTICA DE CAMPOS OBRIGATÓRIOS:
Antes de enviar, verifique que TODOS estes campos estão preenchidos:
- [ ] "detected_fabric" está preenchido? (NÃO pode estar vazio)
- [ ] "dominant_colors" tem pelo menos 1 cor? (NÃO pode estar vazio)
- [ ] "product_type" está preenchido? (NÃO pode estar vazio)
- [ ] "nome_sugerido" está preenchido? (NÃO pode estar vazio)
- [ ] "descricao_seo" está completa e termina com ponto final?
- [ ] Se for CONJUNTO (product_type contém "Conjunto"), "colors_by_item" está preenchido? (NÃO pode estar vazio para conjuntos)

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
        
        // Detectar especificamente erro 429 e propagar de forma mais clara
        if (response.status === 429 || errorText.includes("429") || errorText.includes("Resource exhausted") || errorText.includes("RESOURCE_EXHAUSTED")) {
          throw new Error(`429 Resource exhausted. Please try again later. Please refer to https://cloud.google.com/vertex-ai/generative-ai/docs/error-code-429 for more details.`);
        }
        
        throw new Error(`Gemini API error: ${response.status} ${errorText}`);
      }

      // Tentar fazer parse do JSON com tratamento de erro melhorado
      let responseData: any;
      try {
        const responseText = await response.text();
        console.log("[ProductAnalyzer] 📄 Resposta bruta (primeiros 200 chars):", responseText.substring(0, 200));
        
        try {
          responseData = JSON.parse(responseText);
        } catch (jsonParseError: any) {
          console.error("[ProductAnalyzer] ❌ Erro ao fazer parse do JSON da resposta:", jsonParseError);
          console.error("[ProductAnalyzer] 📄 Resposta completa:", responseText);
          throw new Error(`Resposta da API não é um JSON válido: ${jsonParseError.message}. Resposta: ${responseText.substring(0, 200)}`);
        }
      } catch (error: any) {
        // Se falhar ao ler como texto, tentar como JSON diretamente
        if (error.message && error.message.includes("JSON válido")) {
          throw error;
        }
        try {
          responseData = await response.json();
        } catch (fallbackError: any) {
          console.error("[ProductAnalyzer] ❌ Erro ao processar resposta:", fallbackError);
          throw new Error(`Erro ao processar resposta da API: ${fallbackError.message}`);
        }
      }
      
      console.log("[ProductAnalyzer] ✅ Resposta recebida e parseada com sucesso");

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

      // Função robusta para corrigir strings JSON malformadas
      const fixUnterminatedStrings = (text: string): string => {
        let fixed = text;
        
        // Passo 1: Remover caracteres de controle e quebras de linha problemáticas
        fixed = fixed
          .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "") // Remove caracteres de controle (exceto \n, \r, \t)
          .replace(/\r\n/g, "\n") // Normalizar quebras de linha
          .replace(/\r/g, "\n");
        
        // Passo 2: Corrigir strings não fechadas especificamente no campo descricao_seo
        // Este é o campo mais problemático porque pode ter texto longo com aspas não escapadas
        // NOVO: Detectar padrão específico onde a string é fechada prematuramente e há texto após vírgula
        const descricaoSeoPattern = /"descricao_seo"\s*:\s*"([^"]*)/g;
        let match;
        const replacements: Array<{ start: number; end: number; replacement: string }> = [];
        
        while ((match = descricaoSeoPattern.exec(fixed)) !== null) {
          const fieldStart = match.index;
          const colonIndex = fixed.indexOf(':', fieldStart);
          const quoteAfterColon = fixed.indexOf('"', colonIndex);
          const valueStart = quoteAfterColon + 1;
          
          // Procurar onde a string REALMENTE deveria terminar
          // Padrão problemático: "texto", palavra_sem_aspas (string fechada prematuramente)
          let stringEnd = -1;
          let foundPrematureClose = false;
          
          // Primeiro, procurar por padrão de fechamento prematuro: ", palavra
          for (let i = valueStart; i < fixed.length - 10; i++) {
            const char = fixed[i];
            
            // Se encontrou ", seguido de espaço e letra (sem aspas), é fechamento prematuro
            if (char === '"' && i > valueStart + 20) { // Garantir que não é a primeira aspa
              const afterQuote = fixed.substring(i + 1, i + 5).trim();
              // Se após " há vírgula e depois texto sem aspas, é fechamento prematuro
              if (afterQuote.startsWith(',') && afterQuote.length > 1) {
                const textAfterComma = fixed.substring(i + 1 + afterQuote.indexOf(',') + 1, i + 20).trim();
                // Se o texto após vírgula começa com letra (não é " ou }), é problema
                if (textAfterComma && /^[a-záàâãéêíóôõúç]/i.test(textAfterComma) && !textAfterComma.startsWith('"')) {
                  foundPrematureClose = true;
                  // Continuar procurando o próximo campo ou }
                  for (let j = i + 1; j < fixed.length; j++) {
                    if (fixed[j] === '}' || (fixed[j] === '"' && fixed.substring(j + 1, j + 15).includes('"'))) {
                      stringEnd = j;
                      break;
                    }
                  }
                  break;
                }
              }
            }
          }
          
          // Se não encontrou fechamento prematuro, procurar fechamento normal
          if (!foundPrematureClose) {
            for (let i = valueStart; i < fixed.length; i++) {
              const char = fixed[i];
              
              if (char === '"' && i > valueStart + 10) {
                const nextChars = fixed.substring(i + 1, i + 5).trim();
                // Se após " há vírgula ou }, é fechamento válido
                if (nextChars.startsWith(',') || nextChars.startsWith('}')) {
                  stringEnd = i;
                  break;
                }
              }
            }
          }
          
          // Se não encontrou fechamento, procurar próximo delimitador válido
          if (stringEnd === -1) {
            const afterValue = fixed.substring(valueStart);
            const nextComma = afterValue.indexOf(',');
            const nextBrace = afterValue.indexOf('}');
            const nextQuote = afterValue.indexOf('"', 10); // Próxima aspa após início
            
            let potentialEnd = fixed.length;
            
            // Se há vírgula seguida de texto sem aspas, incluir esse texto na string
            if (nextComma !== -1) {
              const afterComma = afterValue.substring(nextComma + 1, nextComma + 50).trim();
              // Se após vírgula há texto que parece continuação (não começa com " ou })
              if (afterComma && /^[a-záàâãéêíóôõúç]/i.test(afterComma) && !afterComma.startsWith('"')) {
                // Procurar onde esse texto termina (próximo campo ou })
                for (let k = valueStart + nextComma + 1; k < fixed.length; k++) {
                  if (fixed[k] === '}' || (fixed[k] === '"' && fixed.substring(k + 1, k + 15).includes('":'))) {
                    potentialEnd = k;
                    break;
                  }
                }
              } else {
                potentialEnd = valueStart + nextComma;
              }
            } else if (nextBrace !== -1) {
              potentialEnd = valueStart + nextBrace;
            } else if (nextQuote !== -1 && nextQuote > 20) {
              potentialEnd = valueStart + nextQuote;
            }
            
            // Escapar aspas internas e fechar a string corretamente
            let stringContent = fixed.substring(valueStart, potentialEnd);
            // Remover vírgulas e aspas que não deveriam estar ali
            stringContent = stringContent
              .replace(/",\s*([a-záàâãéêíóôõúç])/gi, ' $1') // Remover ", seguido de letra
              .replace(/\s+/g, ' ') // Normalizar espaços
              .trim();
            
            const escapedContent = stringContent
              .replace(/\\/g, '\\\\') // Escapar barras invertidas primeiro
              .replace(/"/g, '\\"')   // Escapar aspas
              .replace(/\n/g, ' ')    // Substituir quebras de linha por espaços
              .trim();
            
            replacements.push({
              start: fieldStart,
              end: potentialEnd,
              replacement: `"descricao_seo": "${escapedContent}"`
            });
          } else if (foundPrematureClose) {
            // Corrigir fechamento prematuro: incluir o texto após a vírgula na string
            let stringContent = fixed.substring(valueStart, stringEnd);
            // Remover a vírgula e aspas problemáticas, incluindo texto após
            const problematicPart = fixed.substring(stringEnd, stringEnd + 100);
            const textAfterComma = problematicPart.match(/",\s*([^"}]+)/);
            if (textAfterComma && textAfterComma[1]) {
              stringContent += ' ' + textAfterComma[1].trim();
              // Atualizar stringEnd para incluir o texto corrigido
              stringEnd = stringEnd + problematicPart.indexOf('"', 1) + 1;
            }
            
            const escapedContent = stringContent
              .replace(/\\/g, '\\\\')
              .replace(/"/g, '\\"')
              .replace(/\n/g, ' ')
              .trim();
            
            replacements.push({
              start: fieldStart,
              end: stringEnd,
              replacement: `"descricao_seo": "${escapedContent}"`
            });
          }
        }
        
        // Aplicar substituições de trás para frente para não alterar índices
        for (let i = replacements.length - 1; i >= 0; i--) {
          const rep = replacements[i];
          fixed = fixed.substring(0, rep.start) + rep.replacement + fixed.substring(rep.end);
        }
        
        // Passo 3: Corrigir aspas não escapadas dentro de outras strings
        // Procura por padrões como: "texto "aspas" texto" e escapa as aspas internas
        fixed = fixed.replace(/"([^"\\]*)"/g, (match, content, offset) => {
          // Pular se for parte de um campo que já foi corrigido
          if (match.includes('descricao_seo')) {
            return match;
          }
          
          // Se há aspas não escapadas dentro do conteúdo, escapar
          if (content.includes('"') && !content.includes('\\"')) {
            return `"${content.replace(/"/g, '\\"')}"`;
          }
          return match;
        });
        
        // Passo 4: Detectar e corrigir strings não terminadas em outros campos
        let depth = 0;
        let inString = false;
        let escapeNext = false;
        let stringStartPos = -1;
        let lastValidBrace = -1;
        
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
            if (!inString) {
              inString = true;
              stringStartPos = i;
            } else {
              inString = false;
              stringStartPos = -1;
            }
          }
          
          if (!inString) {
            if (char === '{') {
              depth++;
              lastValidBrace = i;
            } else if (char === '}') {
              depth--;
              if (depth === 0) {
                lastValidBrace = i;
              }
            }
          }
        }
        
        // Passo 5: Se ainda está dentro de uma string, fechar ela
        if (inString && stringStartPos !== -1) {
          // Encontrar onde a string deveria terminar (antes de uma vírgula, } ou fim do texto)
          let endPos = fixed.length;
          
          // Procurar por padrões que indicam fim da string
          for (let i = stringStartPos + 1; i < fixed.length; i++) {
            const char = fixed[i];
            if (char === ',' || char === '}' || char === ']' || (char === '\n' && i > stringStartPos + 50)) {
              // Se encontrou um delimitador e não há outra " antes, fechar aqui
              const beforeDelimiter = fixed.substring(stringStartPos + 1, i);
              if (!beforeDelimiter.includes('"')) {
                endPos = i;
                break;
              }
            }
          }
          
          // Fechar a string antes do delimitador
          if (endPos < fixed.length) {
            fixed = fixed.substring(0, endPos) + '"' + fixed.substring(endPos);
            console.log("[ProductAnalyzer] ⚠️ String não terminada foi fechada na posição", endPos);
          } else {
            // Se não encontrou delimitador, fechar no final
            fixed += '"';
            console.log("[ProductAnalyzer] ⚠️ String não terminada foi fechada no final");
          }
        }
        
        // Passo 6: Corrigir vírgulas extras ou faltantes
        // Remove vírgulas antes de } ou ]
        fixed = fixed.replace(/,\s*([}\]])/g, '$1');
        // Remove múltiplas vírgulas consecutivas
        fixed = fixed.replace(/,+/g, ',');
        
        // Passo 7: Garantir que termina com }
        if (!fixed.trim().endsWith('}')) {
          const lastBraceIndex = fixed.lastIndexOf('}');
          if (lastBraceIndex !== -1 && lastBraceIndex > fixed.length / 2) {
            // Truncar até o último } válido
            fixed = fixed.substring(0, lastBraceIndex + 1);
            console.log("[ProductAnalyzer] ⚠️ JSON foi truncado até o último } válido");
          } else {
            // Adicionar } de fechamento se necessário
            fixed = fixed.trim();
            // Contar chaves abertas vs fechadas
            const openBraces = (fixed.match(/{/g) || []).length;
            const closeBraces = (fixed.match(/}/g) || []).length;
            if (openBraces > closeBraces) {
              fixed += '}';
              console.log("[ProductAnalyzer] ⚠️ Adicionado } de fechamento");
            }
          }
        }
        
        // Passo 8: Corrigir arrays não fechados
        const openBrackets = (fixed.match(/\[/g) || []).length;
        const closeBrackets = (fixed.match(/\]/g) || []).length;
        if (openBrackets > closeBrackets) {
          fixed += ']';
          console.log("[ProductAnalyzer] ⚠️ Adicionado ] de fechamento");
        }
        
        return fixed;
      };

      // Aplicar correção de strings não terminadas
      jsonText = fixUnterminatedStrings(jsonText);
      
      // CORREÇÃO ESPECÍFICA: Detectar e corrigir padrão onde descricao_seo é fechada prematuramente
      // Padrão problemático: "descricao_seo": "texto", palavra_sem_aspas
      // Exemplo: "descricao_seo": "azul bebê", perfeito para...
      const prematureClosePattern = /"descricao_seo"\s*:\s*"([^"]+)"\s*,\s*([a-záàâãéêíóôõúç][^"}]+)/gi;
      let prematureMatch;
      while ((prematureMatch = prematureClosePattern.exec(jsonText)) !== null) {
        const fullMatch = prematureMatch[0];
        const textBefore = prematureMatch[1];
        const textAfter = prematureMatch[2];
        
        // Se o texto após vírgula parece continuação (não é um campo JSON válido), corrigir
        if (textAfter && !textAfter.trim().startsWith('"') && !textAfter.trim().startsWith('}')) {
          // Encontrar onde esse texto problemático termina
          const matchIndex = prematureMatch.index;
          const afterProblematic = jsonText.substring(matchIndex + fullMatch.length);
          let endOfContinuation = afterProblematic.indexOf('"');
          if (endOfContinuation === -1) endOfContinuation = afterProblematic.indexOf('}');
          if (endOfContinuation === -1) endOfContinuation = afterProblematic.length;
          
          // Incluir o texto de continuação na string descricao_seo
          const continuationText = afterProblematic.substring(0, endOfContinuation).trim();
          // Remover vírgulas e caracteres problemáticos do início
          const cleanContinuation = continuationText.replace(/^[,:]\s*/, '').trim();
          
          if (cleanContinuation && cleanContinuation.length > 3) {
            const correctedValue = `${textBefore} ${cleanContinuation}`.trim();
            const escapedValue = correctedValue
              .replace(/\\/g, '\\\\')
              .replace(/"/g, '\\"')
              .replace(/\n/g, ' ');
            
            // Substituir o padrão problemático
            const beforeMatch = jsonText.substring(0, matchIndex);
            const afterContinuation = jsonText.substring(matchIndex + fullMatch.length + endOfContinuation);
            jsonText = `${beforeMatch}"descricao_seo": "${escapedValue}"${afterContinuation}`;
            
            console.log("[ProductAnalyzer] 🔧 Corrigido fechamento prematuro de descricao_seo");
            // Reiniciar busca (índices mudaram)
            prematureClosePattern.lastIndex = 0;
          }
        }
      }

      let analysisResult: ProductAnalysisResult | undefined;
      
      // Função para corrigir propriedades sem aspas duplas
      const fixUnquotedProperties = (text: string): string => {
        let fixed = text;
        
        // Primeiro, verificar se há strings não fechadas que podem causar esse erro
        // O erro "Expected double-quoted property name" geralmente acontece quando
        // uma string não foi fechada e o parser interpreta o texto seguinte como propriedade
        
        // Detectar TODAS as strings não fechadas antes de tentar corrigir propriedades
        let inString = false;
        let escapeNext = false;
        let stringStartPos = -1;
        const unclosedStrings: Array<{ start: number; end: number }> = [];
        
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
            if (!inString) {
              inString = true;
              stringStartPos = i;
            } else {
              // Verificar se é realmente o fechamento da string
              const nextChars = fixed.substring(i + 1, i + 5).trim();
              if (nextChars.startsWith(',') || nextChars.startsWith('}') || nextChars.startsWith(']') || nextChars.startsWith('"') || nextChars === '') {
                inString = false;
                stringStartPos = -1;
              }
              // Se não é fechamento, é uma aspa dentro da string (deve estar escapada)
            }
          }
        }
        
        // Se há string não fechada, fechar ela primeiro
        if (inString && stringStartPos !== -1) {
          // Procurar onde fechar (antes de vírgula, } ou fim, mas também antes de propriedades sem aspas)
          let endPos = fixed.length;
          for (let i = stringStartPos + 1; i < fixed.length; i++) {
            const char = fixed[i];
            // Se encontrou vírgula seguida de espaço e letra (propriedade sem aspas), fechar antes
            if (char === ',' && i + 1 < fixed.length) {
              const afterComma = fixed.substring(i + 1, i + 30).trim();
              // Se após vírgula há texto que parece nome de propriedade (letra seguida de :)
              if (/^[a-zA-Z_][a-zA-Z0-9_]*\s*:/.test(afterComma)) {
                endPos = i;
                break;
              }
            }
            if (char === '}' || char === ']') {
              endPos = i;
              break;
            }
          }
          
          // Fechar a string e escapar aspas internas
          const stringContent = fixed.substring(stringStartPos + 1, endPos);
          const escapedContent = stringContent
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, ' ')
            .trim();
          
          fixed = fixed.substring(0, stringStartPos + 1) + escapedContent + '"' + fixed.substring(endPos);
          console.log("[ProductAnalyzer] ⚠️ String não fechada detectada e corrigida na posição", stringStartPos, "antes de corrigir propriedades");
        }
        
        // Agora corrigir propriedades sem aspas
        // Padrão para encontrar propriedades sem aspas: identificador seguido de :
        // Exemplo: nome_sugerido: ao invés de "nome_sugerido":
        const propertyPattern = /([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g;
        fixed = fixed.replace(propertyPattern, (match, prefix, propertyName, offset) => {
          // Verificar se estamos dentro de uma string (não corrigir)
          let isInString = false;
          let escapeNext = false;
          
          for (let i = 0; i < offset; i++) {
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
              isInString = !isInString;
            }
          }
          
          // Se está dentro de uma string, não corrigir
          if (isInString) {
            return match;
          }
          
          // Se já tem aspas, não substituir
          if (match.includes('"')) {
            return match;
          }
          
          // Adicionar aspas ao nome da propriedade
          return `${prefix}"${propertyName}":`;
        });
        
        return fixed;
      };
      
      try {
        analysisResult = JSON.parse(jsonText);
      } catch (parseError: any) {
        console.error("[ProductAnalyzer] ❌ Erro ao fazer parse do JSON:", parseError.message);
        console.error("[ProductAnalyzer] 📄 JSON recebido (primeiros 500 chars):", jsonText.substring(0, 500));
        console.error("[ProductAnalyzer] 📄 JSON recebido (últimos 200 chars):", jsonText.substring(Math.max(0, jsonText.length - 200)));
        
        // Se o erro menciona uma posição específica, mostrar o contexto ao redor
        const positionMatch = parseError.message.match(/position (\d+)/);
        if (positionMatch) {
          const position = parseInt(positionMatch[1]);
          const start = Math.max(0, position - 100);
          const end = Math.min(jsonText.length, position + 100);
          const context = jsonText.substring(start, end);
          console.error("[ProductAnalyzer] 📍 Contexto ao redor da posição", position, ":", context);
          console.error("[ProductAnalyzer] 📍 Caractere problemático:", jsonText[position], "(" + jsonText.charCodeAt(position) + ")");
        }
        
        // Se for erro de "Expected double-quoted property name", tentar corrigir
        if (parseError.message.includes("Expected double-quoted property name")) {
          console.log("[ProductAnalyzer] 🔧 Tentando corrigir erro de propriedade sem aspas...");
          
          // Primeiro, aplicar correção de strings não fechadas (pode ser a causa raiz)
          let jsonFixed = fixUnterminatedStrings(jsonText);
          
          // CORREÇÃO ESPECÍFICA: Detectar padrão de fechamento prematuro em descricao_seo
          const prematureClosePattern = /"descricao_seo"\s*:\s*"([^"]+)"\s*,\s*([a-záàâãéêíóôõúç][^"}]+)/gi;
          let prematureMatch;
          while ((prematureMatch = prematureClosePattern.exec(jsonFixed)) !== null) {
            const fullMatch = prematureMatch[0];
            const textBefore = prematureMatch[1];
            const textAfter = prematureMatch[2];
            
            if (textAfter && !textAfter.trim().startsWith('"') && !textAfter.trim().startsWith('}')) {
              const matchIndex = prematureMatch.index;
              const afterProblematic = jsonFixed.substring(matchIndex + fullMatch.length);
              let endOfContinuation = afterProblematic.indexOf('"');
              if (endOfContinuation === -1) endOfContinuation = afterProblematic.indexOf('}');
              if (endOfContinuation === -1) endOfContinuation = Math.min(afterProblematic.length, 200);
              
              const continuationText = afterProblematic.substring(0, endOfContinuation).trim();
              const cleanContinuation = continuationText.replace(/^[,:]\s*/, '').trim();
              
              if (cleanContinuation && cleanContinuation.length > 3) {
                const correctedValue = `${textBefore} ${cleanContinuation}`.trim();
                const escapedValue = correctedValue
                  .replace(/\\/g, '\\\\')
                  .replace(/"/g, '\\"')
                  .replace(/\n/g, ' ');
                
                const beforeMatch = jsonFixed.substring(0, matchIndex);
                const afterContinuation = jsonFixed.substring(matchIndex + fullMatch.length + endOfContinuation);
                jsonFixed = `${beforeMatch}"descricao_seo": "${escapedValue}"${afterContinuation}`;
                
                console.log("[ProductAnalyzer] 🔧 Corrigido fechamento prematuro de descricao_seo (no tratamento de erro)");
                prematureClosePattern.lastIndex = 0;
              }
            }
          }
          
          // Depois, corrigir propriedades sem aspas
          jsonFixed = fixUnquotedProperties(jsonFixed);
          
          // Tentar parsear novamente
          try {
            analysisResult = JSON.parse(jsonFixed);
            console.log("[ProductAnalyzer] ✅ JSON corrigido com sucesso (strings não fechadas e propriedades sem aspas corrigidas)");
          } catch (correctionError: any) {
            console.error("[ProductAnalyzer] ❌ Correção automática falhou:", correctionError.message);
            
            // Se ainda falhou e há uma posição específica, tentar correção mais direcionada
            const positionMatch = correctionError.message.match(/position (\d+)/);
            if (positionMatch) {
              const position = parseInt(positionMatch[1]);
              console.log("[ProductAnalyzer] 🔧 Tentando correção direcionada na posição", position);
              
              // Analisar o contexto ao redor da posição (expandir contexto para melhor análise)
              const contextStart = Math.max(0, position - 200);
              const contextEnd = Math.min(jsonFixed.length, position + 100);
              const context = jsonFixed.substring(contextStart, contextEnd);
              const beforePos = jsonFixed.substring(0, position);
              const atPos = jsonFixed[position];
              const afterPos = jsonFixed.substring(position);
              
              console.log("[ProductAnalyzer] 🔍 Contexto ao redor da posição:", context.substring(0, 100) + "...");
              
              // Estratégia 1: Se o caractere na posição é uma letra, pode ser propriedade sem aspas OU string não fechada
              if (atPos && /[a-zA-Z_]/.test(atPos)) {
                // Procurar pela última string não fechada antes dessa posição
                let lastQuote = beforePos.lastIndexOf('"');
                if (lastQuote !== -1) {
                  // Verificar se a string foi fechada corretamente
                  const afterQuote = beforePos.substring(lastQuote + 1);
                  const quoteCount = (afterQuote.match(/"/g) || []).length;
                  
                  // Se número par de aspas (ou zero), a string não foi fechada
                  if (quoteCount % 2 === 0) {
                    // Procurar onde a string deveria terminar (antes de vírgula, } ou propriedade)
                    let stringEnd = position;
                    for (let i = lastQuote + 1; i < position; i++) {
                      if (jsonFixed[i] === ',' || jsonFixed[i] === '}') {
                        stringEnd = i;
                        break;
                      }
                      // Se encontrou padrão de propriedade (letra seguida de :), fechar antes
                      if (i + 1 < position && /[a-zA-Z_]\s*:/.test(jsonFixed.substring(i, i + 10))) {
                        stringEnd = i;
                        break;
                      }
                    }
                    
                    // Fechar a string e escapar conteúdo
                    const stringContent = jsonFixed.substring(lastQuote + 1, stringEnd);
                    const escapedContent = stringContent
                      .replace(/\\/g, '\\\\')
                      .replace(/"/g, '\\"')
                      .replace(/\n/g, ' ')
                      .trim();
                    
                    const fixedAtPos = jsonFixed.substring(0, lastQuote + 1) + escapedContent + '"' + jsonFixed.substring(stringEnd);
                    try {
                      analysisResult = JSON.parse(fixedAtPos);
                      console.log("[ProductAnalyzer] ✅ JSON corrigido fechando string não fechada antes da posição problemática");
                    } catch (retryError: any) {
                      console.log("[ProductAnalyzer] ⚠️ Correção direcionada falhou, tentando estratégia alternativa");
                      // Continuar para outras estratégias
                    }
                  } else {
                    // String está fechada, então o problema é propriedade sem aspas
                    // Procurar padrão: letra seguida de :
                    const propertyMatch = afterPos.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:/);
                    if (propertyMatch) {
                      const propertyName = propertyMatch[1];
                      const fixedAtPos = beforePos + '"' + propertyName + '":' + afterPos.substring(propertyMatch[0].length);
                      try {
                        analysisResult = JSON.parse(fixedAtPos);
                        console.log("[ProductAnalyzer] ✅ JSON corrigido adicionando aspas à propriedade sem aspas");
                      } catch {
                        // Continuar para outras estratégias
                      }
                    }
                  }
                }
              }
            }
            
            // Se ainda não foi corrigido, continuar para outras estratégias abaixo
          }
        }
        
        // Se ainda não foi corrigido, tentar reparação mais agressiva
        if (!analysisResult && (parseError.message.includes("Unterminated string") || parseError.message.includes("position") || parseError.message.includes("Unexpected") || parseError.message.includes("Expected"))) {
          console.log("[ProductAnalyzer] 🔧 Tentando reparação agressiva do JSON...");
          
          try {
            // Estratégia 1: Primeiro, aplicar correção de propriedades sem aspas (se ainda não foi aplicada)
            let jsonFixed = fixUnquotedProperties(jsonText);
            
            // Tentar parsear após correção de propriedades sem aspas
            try {
              analysisResult = JSON.parse(jsonFixed);
              console.log("[ProductAnalyzer] ✅ JSON reparado com sucesso (propriedades sem aspas corrigidas na reparação agressiva)");
            } catch (retryError) {
              // Se ainda falhou, continuar com outras estratégias
              
              // Estratégia 2: Corrigir strings problemáticas em todos os campos (não apenas descricao_seo)
              // Lista de campos que podem ter strings longas e problemáticas
              const stringFields = ['descricao_seo', 'nome_sugerido', 'suggested_category', 'product_type', 'detected_fabric'];
              
              const originalJsonFixed = jsonFixed;
              
              for (const field of stringFields) {
                // Padrão para encontrar o campo e sua string (pode estar quebrada)
                const fieldPattern = new RegExp(`"${field}"\\s*:\\s*"([^"]*(?:\\\\.[^"]*)*)"?`, 'g');
                jsonFixed = jsonFixed.replace(fieldPattern, (match, content) => {
                  // Se a string não está fechada corretamente, fechar ela
                  if (!match.endsWith('"') || match.endsWith('":')) {
                    // Encontrar onde a string deveria terminar
                    const colonIndex = match.indexOf(':');
                    const quoteAfterColon = match.indexOf('"', colonIndex);
                    if (quoteAfterColon !== -1) {
                      // String começa mas não termina, fechar antes da próxima vírgula ou }
                      const matchIndex = jsonFixed.indexOf(match);
                      if (matchIndex !== -1) {
                        const restOfText = jsonFixed.substring(matchIndex + match.length);
                        const nextComma = restOfText.indexOf(',');
                        const nextBrace = restOfText.indexOf('}');
                        const endPos = nextComma !== -1 && nextComma < nextBrace ? nextComma : (nextBrace !== -1 ? nextBrace : restOfText.length);
                        const stringContent = restOfText.substring(0, endPos).trim();
                        // Escapar aspas internas e fechar a string
                        const escapedContent = stringContent.replace(/"/g, '\\"').replace(/\n/g, ' ');
                        return `"${field}": "${escapedContent}"`;
                      }
                    }
                  }
                  return match;
                });
              }
              
              // Tentar parsear o JSON corrigido após correção de strings
              if (jsonFixed !== originalJsonFixed) {
                try {
                  analysisResult = JSON.parse(jsonFixed) as ProductAnalysisResult;
                  // Garantir que campos obrigatórios existam
                  if (analysisResult && !analysisResult.descricao_seo) {
                    analysisResult.descricao_seo = analysisResult.nome_sugerido || "Produto de qualidade.";
                  }
                  console.log("[ProductAnalyzer] ✅ JSON reparado com sucesso (strings corrigidas)");
                } catch (stringFixError) {
                  // Se ainda falhou, tentar outras estratégias (continuar abaixo)
                }
              }
              
              // Se ainda não foi corrigido, tentar outras estratégias
              if (!analysisResult) {
                // Estratégia 1.5: Se o erro menciona uma posição específica, tentar corrigir nessa posição
                if (positionMatch) {
                const position = parseInt(positionMatch[1]);
                console.log("[ProductAnalyzer] 🔧 Tentando corrigir JSON na posição específica", position);
                
                // Analisar o contexto ao redor da posição do erro
                const beforeError = jsonText.substring(0, position);
                const afterError = jsonText.substring(position);
                
                // Procurar por padrão de string não fechada antes da posição
                const lastQuoteBefore = beforeError.lastIndexOf('"');
                const lastColonBefore = beforeError.lastIndexOf(':');
                const lastOpenBrace = beforeError.lastIndexOf('{');
                
                // Se há uma string que começou mas não terminou
                if (lastQuoteBefore !== -1 && lastColonBefore !== -1 && lastQuoteBefore > lastColonBefore && lastQuoteBefore > lastOpenBrace) {
                  // Contar aspas entre a última " e a posição do erro
                  const quotesBetween = (beforeError.substring(lastQuoteBefore + 1).match(/"/g) || []).length;
                  
                  // Se número par de aspas (ou zero), a string não foi fechada
                  if (quotesBetween % 2 === 0) {
                    // Tentar fechar a string antes da posição do erro
                    const jsonFixedAtPosition = beforeError + '"' + afterError;
                    try {
                      analysisResult = JSON.parse(jsonFixedAtPosition);
                      console.log("[ProductAnalyzer] ✅ JSON reparado na posição específica");
                    } catch {
                      throw new Error("Reparação na posição não funcionou");
                    }
                  } else {
                    // Tentar outra abordagem: remover caracteres problemáticos na posição
                    const charAtPosition = jsonText[position];
                    if (charAtPosition && charAtPosition.charCodeAt(0) > 127) {
                      // Caractere não-ASCII problemático, remover
                      const jsonFixedAtPosition = jsonText.substring(0, position) + jsonText.substring(position + 1);
                      try {
                        analysisResult = JSON.parse(jsonFixedAtPosition);
                        console.log("[ProductAnalyzer] ✅ JSON reparado removendo caractere problemático");
                      } catch {
                        throw new Error("Reparação não conseguiu corrigir");
                      }
                    } else {
                      throw new Error("Reparação não conseguiu corrigir");
                    }
                  }
                } else {
                  // Tentar remover caracteres problemáticos na posição
                  const charAtPosition = jsonText[position];
                  if (charAtPosition && charAtPosition.charCodeAt(0) > 127) {
                    const jsonFixedAtPosition = jsonText.substring(0, position) + jsonText.substring(position + 1);
                    try {
                      analysisResult = JSON.parse(jsonFixedAtPosition);
                      console.log("[ProductAnalyzer] ✅ JSON reparado removendo caractere problemático");
                    } catch {
                      throw new Error("Reparação não conseguiu corrigir");
                    }
                  } else {
                    throw new Error("Reparação não conseguiu corrigir");
                  }
                }
              } else {
                throw new Error("Reparação não conseguiu corrigir");
              }
            }
            }
          } catch (repairError) {
            // Estratégia 2: Tentar extrair apenas os campos essenciais
            console.log("[ProductAnalyzer] 🔧 Tentando extração manual dos campos...");
            
            // Função auxiliar para extrair campo mesmo se a string estiver quebrada
            const extractField = (fieldName: string, text: string): string | null => {
              // Tentar padrão normal primeiro
              const normalPattern = new RegExp(`"${fieldName}"\\s*:\\s*"([^"]+)"`, 'g');
              let match = normalPattern.exec(text);
              if (match && match[1]) {
                return match[1];
              }
              
              // Se não encontrou, tentar padrão que aceita string quebrada (até vírgula ou })
              const brokenPattern = new RegExp(`"${fieldName}"\\s*:\\s*"([^"]*?)(?:",|"\\s*}|"\\s*\\n)`, 's');
              match = brokenPattern.exec(text);
              if (match && match[1]) {
                return match[1].trim();
              }
              
              // Última tentativa: procurar pelo campo e pegar tudo até a próxima vírgula ou }
              const fieldIndex = text.indexOf(`"${fieldName}"`);
              if (fieldIndex !== -1) {
                const afterField = text.substring(fieldIndex);
                const colonIndex = afterField.indexOf(':');
                if (colonIndex !== -1) {
                  const afterColon = afterField.substring(colonIndex + 1).trim();
                  if (afterColon.startsWith('"')) {
                    // Pegar tudo até a próxima vírgula ou } (ignorando aspas internas não escapadas)
                    let content = '';
                    let inString = false;
                    let escapeNext = false;
                    
                    for (let i = 1; i < afterColon.length; i++) {
                      const char = afterColon[i];
                      
                      if (escapeNext) {
                        content += char;
                        escapeNext = false;
                        continue;
                      }
                      
                      if (char === '\\') {
                        escapeNext = true;
                        content += char;
                        continue;
                      }
                      
                      if (char === '"') {
                        // Verificar se é fechamento (próximo char é vírgula ou })
                        const nextChar = afterColon[i + 1];
                        if (nextChar === ',' || nextChar === '}' || nextChar === ']' || nextChar === '\n' || nextChar === undefined) {
                          break;
                        }
                      }
                      
                      content += char;
                    }
                    
                    if (content) {
                      return content.trim();
                    }
                  }
                }
              }
              
              return null;
            };
            
            const nomeMatch = extractField('nome_sugerido', jsonText);
            const categoriaMatch = extractField('suggested_category', jsonText);
            const tipoMatch = extractField('product_type', jsonText);
            const tecidoMatch = extractField('detected_fabric', jsonText);
            const descricaoMatch = extractField('descricao_seo', jsonText);
            
            if (nomeMatch && categoriaMatch) {
              // Inferir unidade e variações do tipo de produto extraído
              const categoriaLower = categoriaMatch.toLowerCase();
              const tipoLower = (tipoMatch || categoriaMatch).toLowerCase();
              const nomeLower = nomeMatch.toLowerCase();
              
              // Inferir unidade de medida
              let logisticUnit = "UN"; // Padrão
              if (categoriaLower.includes("calçado") || tipoLower.includes("tênis") || tipoLower.includes("sapato") || tipoLower.includes("sandália") || tipoLower.includes("luva") || tipoLower.includes("meia")) {
                logisticUnit = "PAR";
              } else if (nomeLower.includes("conjunto") || nomeLower.includes("kit") || nomeLower.includes("set")) {
                logisticUnit = "CJ";
              } else if (nomeLower.includes("metro") || nomeLower.includes("tecido")) {
                logisticUnit = nomeLower.includes("m²") || nomeLower.includes("metro quadrado") ? "M2" : "M";
              } else if (categoriaLower.includes("cosmético") || tipoLower.includes("perfume") || tipoLower.includes("creme")) {
                logisticUnit = "ML";
              }
              
              // Inferir se tem variações (moda geralmente tem)
              const categoriasComVariacoes = ['roupas', 'calçados', 'acessórios', 'joias', 'praia', 'fitness'];
              const hasVariations = categoriasComVariacoes.some(cat => categoriaLower.includes(cat)) ||
                                   tipoLower.includes("vestido") || tipoLower.includes("camisa") || tipoLower.includes("calça") ||
                                   tipoLower.includes("bolsa") || tipoLower.includes("tênis") || tipoLower.includes("sapato");

              analysisResult = {
                nome_sugerido: nomeMatch,
                descricao_seo: descricaoMatch || (nomeMatch + ". Produto de qualidade e estilo."),
                suggested_category: categoriaMatch,
                product_type: tipoMatch || categoriaMatch,
                detected_fabric: tecidoMatch || "Não especificado",
                dominant_colors: [],
                logistic_unit: logisticUnit,
                has_variations_likely: hasVariations,
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
          // Se não conseguiu reparar, lançar erro com mais detalhes
          const errorMessage = parseError.message || "Erro desconhecido ao fazer parse do JSON";
          const errorDetails = `Erro ao analisar imagem: ${errorMessage}`;
          console.error("[ProductAnalyzer] ❌ Falha final ao processar JSON:", errorDetails);
          throw new Error(errorDetails);
        }
      }

      // Garantir que analysisResult foi definido
      if (!analysisResult) {
        throw new Error("Erro ao analisar imagem: Não foi possível parsear o JSON após todas as tentativas de correção");
      }

      console.log("[ProductAnalyzer] 📊 Dados parseados:", {
        product_type: analysisResult.product_type,
        detected_fabric: analysisResult.detected_fabric,
        dominant_colors: analysisResult.dominant_colors,
        hasProductType: !!analysisResult.product_type,
        hasDetectedFabric: !!analysisResult.detected_fabric,
        hasDominantColors: !!analysisResult.dominant_colors && Array.isArray(analysisResult.dominant_colors),
        logistic_unit: analysisResult.logistic_unit || "NÃO DEFINIDO - SERÁ INFERIDO",
        has_variations_likely: typeof analysisResult.has_variations_likely === 'boolean' ? analysisResult.has_variations_likely : "NÃO DEFINIDO - SERÁ INFERIDO",
      });

      // Compatibilidade: mapear campos antigos para novos se necessário
      if ('categoria_sugerida' in analysisResult && (analysisResult as any).categoria_sugerida && !analysisResult.suggested_category) {
        analysisResult.suggested_category = (analysisResult as any).categoria_sugerida;
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

      // Preencher campos obrigatórios com valores padrão se não existirem
      if (!analysisResult.nome_sugerido || analysisResult.nome_sugerido.trim() === '') {
        // Tentar inferir do product_type ou usar valor padrão
        if (analysisResult.product_type) {
          analysisResult.nome_sugerido = `${analysisResult.product_type.charAt(0).toUpperCase() + analysisResult.product_type.slice(1)} de Qualidade`;
        } else {
          analysisResult.nome_sugerido = "Produto de Moda";
        }
        console.warn("[ProductAnalyzer] ⚠️ nome_sugerido não encontrado, usando valor padrão:", analysisResult.nome_sugerido);
      }
      
      // CRÍTICO: Validar e corrigir descrição incompleta
      if (analysisResult.descricao_seo) {
        let descricao = analysisResult.descricao_seo.trim();
        
        // Detectar descrições incompletas (terminam sem ponto, com palavras cortadas, etc.)
        const endsWithoutPunctuation = !descricao.endsWith('.') && !descricao.endsWith('!') && !descricao.endsWith('?');
        const isTooShort = descricao.length < 100;
        const endsWithIncompleteWord = /(algodão|tecido|confeccionado|oferece|ideal|perfeito|versátil|estilo|qualidade|texturizado|respirável|confortável|moderno|elegante)\s+(text|tex|e|ou|com|para|de|da|do|em|na|no|um|uma|uns|umas|que|qual|quais)$/i.test(descricao);
        const endsWithIncompletePhrase = /(algodão|tecido)\s+(text|tex)$/i.test(descricao);
        
        const isIncomplete = endsWithoutPunctuation || isTooShort || endsWithIncompleteWord || endsWithIncompletePhrase;
        
        if (isIncomplete) {
          console.warn("[ProductAnalyzer] ⚠️ Descrição incompleta detectada:", {
            original: descricao.substring(0, 150),
            endsWithoutPunctuation,
            isTooShort,
            endsWithIncompleteWord,
            endsWithIncompletePhrase
          });
          
          // Remover palavras incompletas no final
          if (endsWithIncompletePhrase) {
            descricao = descricao.replace(/(algodão|tecido)\s+(text|tex)$/i, '$1 de alta qualidade');
          } else if (endsWithIncompleteWord) {
            // Remover palavras soltas no final que indicam incompletude
            descricao = descricao.replace(/\s+(text|tex|e|ou|com|para|de|da|do|em|na|no|um|uma|uns|umas|que|qual|quais)$/i, '');
          }
          
          // Se não termina com pontuação, adicionar frase de conclusão apropriada
          if (!descricao.endsWith('.') && !descricao.endsWith('!') && !descricao.endsWith('?')) {
            // Verificar se a descrição menciona tecido
            const mentionsFabric = /(confeccionado|feito|em|de)\s+(algodão|tecido|malha|viscose|linho|jeans)/i.test(descricao);
            const mentionsColor = analysisResult.dominant_colors && analysisResult.dominant_colors.length > 0;
            
            if (descricao.length < 150) {
              // Descrição muito curta, adicionar mais conteúdo completo
              const fabric = analysisResult.detected_fabric || 'tecido de qualidade';
              const color = analysisResult.dominant_colors?.[0]?.name || '';
              
              if (!mentionsFabric && fabric) {
                descricao += ` Confeccionado em ${fabric.toLowerCase()}, oferece conforto e durabilidade.`;
              }
              if (!mentionsColor && color) {
                descricao += ` Na cor ${color.toLowerCase()}, transmite elegância e versatilidade.`;
              }
              descricao += ` Ideal para compor looks modernos e cheios de estilo.`;
            } else {
              // Descrição tem conteúdo mas não termina, adicionar conclusão
              descricao += ` Ideal para quem busca qualidade e estilo.`;
            }
          }
          
          // Garantir que termina com ponto
          if (!descricao.endsWith('.') && !descricao.endsWith('!') && !descricao.endsWith('?')) {
            descricao += '.';
          }
          
          analysisResult.descricao_seo = descricao;
          console.log("[ProductAnalyzer] ✅ Descrição completada:", {
            originalLength: analysisResult.descricao_seo.length,
            completedLength: descricao.length,
            preview: descricao.substring(0, 150) + "..."
          });
        }
      }
      
      // CRÍTICO: Garantir que detected_fabric NUNCA fique vazio ou "Não especificado"
      if (!analysisResult.detected_fabric || 
          analysisResult.detected_fabric.trim() === '' || 
          analysisResult.detected_fabric.toLowerCase().includes('não especificado') ||
          analysisResult.detected_fabric.toLowerCase().includes('nao especificado')) {
        // Tentar usar tecido_estimado se existir
        if (analysisResult.tecido_estimado && 
            analysisResult.tecido_estimado.trim() !== '' &&
            !analysisResult.tecido_estimado.toLowerCase().includes('não especificado')) {
          analysisResult.detected_fabric = analysisResult.tecido_estimado;
        } else {
          // Se ainda estiver vazio, usar estimativa baseada no tipo de produto
          const productTypeLower = (analysisResult.product_type || '').toLowerCase();
          if (productTypeLower.includes('jeans') || productTypeLower.includes('calça')) {
            analysisResult.detected_fabric = 'Algodão com Elastano';
          } else if (productTypeLower.includes('vestido') || productTypeLower.includes('blusa')) {
            analysisResult.detected_fabric = 'Malha de Algodão';
          } else if (productTypeLower.includes('short') || productTypeLower.includes('bermuda')) {
            analysisResult.detected_fabric = 'Algodão';
          } else {
            analysisResult.detected_fabric = 'Tecido de Qualidade';
          }
          console.warn("[ProductAnalyzer] ⚠️ detected_fabric não encontrado, usando estimativa:", analysisResult.detected_fabric);
        }
      }
      
      // CRÍTICO: Garantir que dominant_colors NUNCA fique vazio
      if (!analysisResult.dominant_colors || 
          !Array.isArray(analysisResult.dominant_colors) || 
          analysisResult.dominant_colors.length === 0) {
        // Tentar usar cor_predominante se existir
        if (analysisResult.cor_predominante && analysisResult.cor_predominante.trim() !== '') {
          analysisResult.dominant_colors = [{
            hex: "#808080", // Cor padrão cinza se não houver hex
            name: analysisResult.cor_predominante
          }];
        } else {
          // Se ainda estiver vazio, tentar extrair da descrição
          const descLower = (analysisResult.descricao_seo || '').toLowerCase();
          const colorMap: Record<string, { hex: string; name: string }> = {
            'azul': { hex: '#0000FF', name: 'Azul' },
            'verde': { hex: '#008000', name: 'Verde' },
            'vermelho': { hex: '#FF0000', name: 'Vermelho' },
            'preto': { hex: '#000000', name: 'Preto' },
            'branco': { hex: '#FFFFFF', name: 'Branco' },
            'rosa': { hex: '#FFC0CB', name: 'Rosa' },
            'amarelo': { hex: '#FFFF00', name: 'Amarelo' },
            'laranja': { hex: '#FFA500', name: 'Laranja' },
            'marrom': { hex: '#8B4513', name: 'Marrom' },
            'cinza': { hex: '#808080', name: 'Cinza' },
            'bege': { hex: '#F5F5DC', name: 'Bege' },
          };
          
          let foundColor = null;
          for (const [key, value] of Object.entries(colorMap)) {
            if (descLower.includes(key)) {
              foundColor = value;
              break;
            }
          }
          
          if (foundColor) {
            analysisResult.dominant_colors = [foundColor];
          } else {
            // Último recurso: cor neutra
            analysisResult.dominant_colors = [{ hex: '#808080', name: 'Cinza' }];
          }
          console.warn("[ProductAnalyzer] ⚠️ dominant_colors não encontrado, usando estimativa:", analysisResult.dominant_colors);
        }
      }

      if (!analysisResult.suggested_category || analysisResult.suggested_category.trim() === '') {
        // Tentar inferir do product_type ou usar valor padrão
        if (analysisResult.product_type) {
          // Mapear product_type para categoria apropriada
          const productType = analysisResult.product_type.toLowerCase();
          if (productType.includes('vestido') || productType.includes('dress')) {
            analysisResult.suggested_category = 'Roupas';
          } else if (productType.includes('calça') || productType.includes('pants')) {
            analysisResult.suggested_category = 'Roupas';
          } else if (productType.includes('blusa') || productType.includes('shirt')) {
            analysisResult.suggested_category = 'Roupas';
          } else {
            analysisResult.suggested_category = 'Roupas'; // Valor padrão
          }
        } else {
          analysisResult.suggested_category = 'Roupas'; // Valor padrão
        }
        console.warn("[ProductAnalyzer] ⚠️ suggested_category não encontrado, usando valor padrão:", analysisResult.suggested_category);
      }

      // Validar que os novos campos existam (se não existirem, serão preenchidos na validação abaixo)
      // Não bloquear se não existirem - serão inferidos automaticamente

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
        const descLower = (analysisResult.descricao_seo || "").toLowerCase();
        const categoriaLower = (analysisResult.suggested_category || "").toLowerCase();
        const combined = `${nomeLower} ${descLower}`;
        
        // CRÍTICO: Verificar se é conjunto ANTES de inferir tipo individual
        if (combined.includes("conjunto") || combined.includes("set") || combined.includes("kit")) {
          // Detectar quais peças compõem o conjunto
          const hasTop = combined.includes("cropped") || combined.includes("top") || combined.includes("blusa") || combined.includes("camisa") || combined.includes("camiseta");
          const hasBottom = combined.includes("short") || combined.includes("shorts") || combined.includes("calça") || combined.includes("saia") || combined.includes("bermuda");
          
          if (hasTop && hasBottom) {
            // Construir nome do conjunto
            let topName = "";
            let bottomName = "";
            
            if (combined.includes("cropped")) topName = "Cropped";
            else if (combined.includes("top")) topName = "Top";
            else if (combined.includes("blusa")) topName = "Blusa";
            else if (combined.includes("camisa") || combined.includes("camiseta")) topName = "Camisa";
            
            if (combined.includes("short") || combined.includes("shorts")) bottomName = "Shorts";
            else if (combined.includes("calça")) bottomName = "Calça";
            else if (combined.includes("saia")) bottomName = "Saia";
            else if (combined.includes("bermuda")) bottomName = "Bermuda";
            
            if (topName && bottomName) {
              analysisResult.product_type = `Conjunto ${topName} e ${bottomName}`;
            } else {
              analysisResult.product_type = "Conjunto";
            }
          } else if (hasTop || hasBottom) {
            analysisResult.product_type = "Conjunto";
          }
        } else if (nomeLower.includes("vestido")) {
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
      } else {
        // CORREÇÃO PÓS-PROCESSAMENTO: Se product_type é "Short" mas nome/descrição mencionam conjunto
        const productTypeLower = analysisResult.product_type.toLowerCase();
        const nomeLower = (analysisResult.nome_sugerido || "").toLowerCase();
        const descLower = (analysisResult.descricao_seo || "").toLowerCase();
        const combined = `${nomeLower} ${descLower}`;
        
        // Se product_type é apenas "Short" mas há evidências de conjunto, corrigir
        if ((productTypeLower === "short" || productTypeLower === "shorts") && 
            (combined.includes("conjunto") || combined.includes("cropped") || combined.includes("top"))) {
          console.log("[ProductAnalyzer] 🔧 Corrigindo product_type: 'Short' → 'Conjunto' (evidências no nome/descrição)");
          
          // Detectar peças do conjunto
          const hasCropped = combined.includes("cropped");
          const hasTop = combined.includes("top") || combined.includes("blusa");
          const hasShort = combined.includes("short") || combined.includes("shorts");
          
          if (hasCropped && hasShort) {
            analysisResult.product_type = "Conjunto Cropped e Shorts";
          } else if (hasTop && hasShort) {
            analysisResult.product_type = "Conjunto Top e Shorts";
          } else {
            analysisResult.product_type = "Conjunto";
          }
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

      // Descricao_seo agora não tem limite de caracteres - permitir descrições completas

      // Validar e garantir logistic_unit (UN, PAR, CJ, KG, G, L, ML, M, M2)
      const validUnits = ['UN', 'PAR', 'CJ', 'KG', 'G', 'L', 'ML', 'M', 'M2'];
      if (!analysisResult.logistic_unit || !validUnits.includes(analysisResult.logistic_unit)) {
        console.warn("[ProductAnalyzer] ⚠️ logistic_unit inválido ou ausente, inferindo do tipo de produto...");
        
        // Inferir unidade baseado na categoria e tipo do produto
        const categoriaLower = (analysisResult.suggested_category || "").toLowerCase();
        const productTypeLower = (analysisResult.product_type || "").toLowerCase();
        const nomeLower = (analysisResult.nome_sugerido || "").toLowerCase();
        
        // Verificar se é calçado (PAR)
        if (categoriaLower.includes("calçado") || categoriaLower.includes("calçados") || 
            productTypeLower.includes("tênis") || productTypeLower.includes("sapato") || 
            productTypeLower.includes("sandália") || productTypeLower.includes("bota") ||
            productTypeLower.includes("luva") || productTypeLower.includes("meia") ||
            nomeLower.includes("tênis") || nomeLower.includes("sapato") || nomeLower.includes("sandália")) {
          analysisResult.logistic_unit = "PAR";
        }
        // Verificar se é conjunto (CJ)
        else if (nomeLower.includes("conjunto") || nomeLower.includes("kit") || nomeLower.includes("set") ||
                 categoriaLower.includes("conjunto") || productTypeLower.includes("conjunto")) {
          analysisResult.logistic_unit = "CJ";
        }
        // Verificar se é tecido por metro (M ou M2)
        else if (nomeLower.includes("metro") || nomeLower.includes("tecido") || categoriaLower.includes("tecido")) {
          // Se mencionar m² ou metro quadrado, usar M2, senão M
          if (nomeLower.includes("m²") || nomeLower.includes("metro quadrado") || nomeLower.includes("metro²")) {
            analysisResult.logistic_unit = "M2";
          } else {
            analysisResult.logistic_unit = "M";
          }
        }
        // Verificar se é líquido (ML ou L)
        else if (categoriaLower.includes("cosmético") || productTypeLower.includes("perfume") ||
                 productTypeLower.includes("creme") || productTypeLower.includes("loção") ||
                 nomeLower.includes("perfume") || nomeLower.includes("creme")) {
          analysisResult.logistic_unit = "ML";
        }
        // Padrão: UN (unidade) para produtos de moda/roupas
        else {
          analysisResult.logistic_unit = "UN";
        }
        
        console.log("[ProductAnalyzer] ✅ logistic_unit inferido:", analysisResult.logistic_unit);
      }

      // Validar e garantir has_variations_likely (boolean)
      if (typeof analysisResult.has_variations_likely !== 'boolean') {
        console.warn("[ProductAnalyzer] ⚠️ has_variations_likely inválido ou ausente, inferindo do tipo de produto...");
        
        // Inferir baseado na categoria e tipo
        const categoriaLower = (analysisResult.suggested_category || "").toLowerCase();
        const productTypeLower = (analysisResult.product_type || "").toLowerCase();
        
        // Produtos de moda geralmente têm variações
        const categoriasComVariacoes = ['roupas', 'calçados', 'acessórios', 'joias', 'praia', 'fitness'];
        const temVariacoes = categoriasComVariacoes.some(cat => categoriaLower.includes(cat)) ||
                            productTypeLower.includes("vestido") || productTypeLower.includes("camisa") ||
                            productTypeLower.includes("calça") || productTypeLower.includes("blusa") ||
                            productTypeLower.includes("short") || productTypeLower.includes("saia") ||
                            productTypeLower.includes("bolsa") || productTypeLower.includes("cinto") ||
                            productTypeLower.includes("tênis") || productTypeLower.includes("sapato");
        
        analysisResult.has_variations_likely = temVariacoes;
        console.log("[ProductAnalyzer] ✅ has_variations_likely inferido:", analysisResult.has_variations_likely);
      }

      console.log("[ProductAnalyzer] 📊 Campos logísticos validados:", {
        logistic_unit: analysisResult.logistic_unit,
        has_variations_likely: analysisResult.has_variations_likely,
      });

      const executionTime = Date.now() - startTime;
      console.log("[ProductAnalyzer] ✅ Análise concluída em", executionTime, "ms");

      return analysisResult;
    } catch (error: any) {
      // Capturar TODOS os erros e lançar exceção (será tratado na função chamadora)
      const errorMessage = error.message || "Erro desconhecido ao analisar produto";
      console.error("[ProductAnalyzer] ❌ Erro capturado em performAnalysis:", errorMessage);
      console.error("[ProductAnalyzer] ❌ Stack trace:", error.stack);
      
      throw error;
    }
  }
}

// Singleton
export const productAnalyzerService = new ProductAnalyzerService();

