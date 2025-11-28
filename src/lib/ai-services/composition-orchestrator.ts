/**
 * Orquestrador de Composições
 * Gerencia o fluxo completo de geração de composições:
 * 1. Try-On (Vertex AI) OU Stability.ai (para acessórios)
 * 2. Refinamento com Stability.ai (opcional)
 * 3. Geração de cenários (Google Imagen OU Stability.ai)
 * 4. Upscale com Stability.ai (opcional)
 * 5. Aplicação de watermark
 * 6. Logging de custos
 */

import { getVertexTryOnService } from "./vertex-tryon";
import { getImagenService } from "./nano-banana";
import { getStabilityAIService } from "./stability-ai"; // Stability.ai
import { getGeminiFlashImageService } from "./gemini-flash-image"; // Gemini 2.5 Flash Image
import { getWatermarkService } from "./watermark";
import { logAPICost } from "./cost-logger";
import {
  CompositionProcessingStatus,
  ProcessingStatus,
  TryOnParams,
  WatermarkConfig,
} from "./types";

/**
 * Parâmetros para criação de composição completa
 */
export interface CreateCompositionParams {
  personImageUrl: string;
  productId: string;
  productImageUrl: string;
  lojistaId: string;
  customerId?: string;
  productName?: string;
  productPrice?: string;
  storeName: string;
  logoUrl?: string;
  scenePrompts?: string[];
  options?: {
    skipWatermark?: boolean;
    quality?: "low" | "medium" | "high";
    productUrl?: string; // URL do produto (link) para usar Imagen diretamente
    isClothing?: boolean; // Se o produto é roupa (usa Try-On) ou acessório
    lookType?: "natural" | "creative"; // Tipo de look a gerar
    baseImageUrl?: string; // Imagem base para Look Criativo (resultado do Look Natural)
    allProductImageUrls?: string[]; // Todas as imagens de produtos para Look Criativo (incluindo roupas)
    productCategory?: string; // Categoria do produto para prompts específicos
  };
}

/**
 * Status estendido de processamento (usado internamente)
 */
interface ExtendedCompositionStatus extends CompositionProcessingStatus {
  status?: "processing" | "completed" | "failed";
  startedAt?: Date;
  completedAt?: Date;
  totalCost?: number;
  steps?: {
    tryon?: ProcessingStatus & { provider?: string };
    stability?: ProcessingStatus & { provider?: string };
    stabilityCreative?: ProcessingStatus & { provider?: string };
    watermark?: ProcessingStatus;
  };
}

/**
 * Resultado da criação de composição
 */
export interface CompositionResult {
  compositionId: string;
  tryonImageUrl: string;
  sceneImageUrls: string[];
  totalCost: number;
  processingTime: number;
  status: CompositionProcessingStatus;
}

/**
 * Orquestrador de Composições
 */
export class CompositionOrchestrator {
  private vertexService = getVertexTryOnService();
  private imagenService = getImagenService(); // Google Imagen 3.0
  private stabilityService = getStabilityAIService(); // Stability.ai
  private geminiFlashImageService = getGeminiFlashImageService(); // Gemini 2.5 Flash Image
  private watermarkService = getWatermarkService();

  /**
   * Cria uma composição completa (Try-On + Cenários + Watermark)
   */
  async createComposition(
    params: CreateCompositionParams
  ): Promise<CompositionResult> {
    const startTime = Date.now();
    const compositionId = `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log("[Orchestrator] Iniciando criação de composição", {
      compositionId,
      lojistaId: params.lojistaId,
      productId: params.productId,
      personImageUrl: params.personImageUrl ? params.personImageUrl.substring(0, 100) + "..." : "❌ NÃO FORNECIDA",
      productImageUrl: params.productImageUrl ? params.productImageUrl.substring(0, 100) + "..." : "❌ NÃO FORNECIDA",
      lookType: params.options?.lookType || "natural",
    });

    // Status de processamento
    const status: ExtendedCompositionStatus = {
      tryon: { status: "pending" },
      scenes: { status: "pending" },
      watermark: { status: "pending" },
      status: "processing",
      startedAt: new Date(),
      steps: {},
    };

    let totalCost = 0;
    let tryonImageUrl = "";
    const sceneImageUrls: string[] = [];

    const isProductUrl = !!params.options?.productUrl;
    const isClothing = params.options?.isClothing ?? false; // Default: não é roupa
    const lookType = params.options?.lookType || "natural"; // "natural" ou "creative"
    const baseImageUrl = params.options?.baseImageUrl; // Para Look Criativo
    
    try {
      // ========================================
      // LOOK CRIATIVO: Gemini 2.5 Flash Image
      // ========================================
      if (lookType === "creative") {
        console.log("[Orchestrator] 🎨 Gerando Look Criativo com Gemini 2.5 Flash Image...");
        
        // Validar que personImageUrl foi fornecida
        if (!params.personImageUrl || !params.personImageUrl.startsWith("http")) {
          throw new Error(`❌ personImageUrl inválida para Look Criativo: ${params.personImageUrl}`);
        }
        
        // Obter todas as imagens de produtos (incluindo roupas)
        const allProductImageUrls = params.options?.allProductImageUrls || [];
        
        if (allProductImageUrls.length === 0) {
          throw new Error("❌ Nenhuma imagem de produto fornecida para Look Criativo");
        }
        
        console.log("[Orchestrator] 📸 Imagens recebidas para Look Criativo:", {
          totalImagens: allProductImageUrls.length + 1, // +1 para a pessoa
          pessoa: {
            url: params.personImageUrl.substring(0, 100) + "...",
            tipo: "IMAGEM_PESSOA",
          },
          produtos: allProductImageUrls.map((url, index) => ({
            indice: index + 1,
            tipo: `IMAGEM_PRODUTO_${index + 1}`,
            url: url.substring(0, 80) + "...",
          })),
        });
        
        console.log("[Orchestrator] ✅ Todas as imagens de produtos serão incluídas no Look Criativo:", {
          totalProdutos: allProductImageUrls.length,
          produtos: allProductImageUrls.map((url, index) => `IMAGEM_PRODUTO_${index + 1}`),
        });
        
        if (!status.steps) status.steps = {};
        status.steps.stabilityCreative = {
          status: "processing",
          startedAt: new Date(),
          provider: "gemini-flash-image",
        };

        // PHASE 11: Category-Specific Prompt Modifiers
        const productCategory = (params.options?.productCategory || "").toLowerCase();
        let categorySpecificPrompt = "";
        
        // Detectar categoria e adicionar prompts específicos (PHASE 11 - Append modifiers)
        if (productCategory.includes("calçado") || productCategory.includes("calcado") || productCategory.includes("sapato") || productCategory.includes("tênis") || productCategory.includes("tenis") || productCategory.includes("shoe") || productCategory.includes("footwear")) {
          // Calçados: Forçar corpo inteiro com pés visíveis (conforme MD)
          categorySpecificPrompt = ", full body shot, wide angle, camera low angle, feet fully visible, standing on floor, showing complete shoes, ground visible";
          console.log("[Orchestrator] 🦶 Categoria detectada: CALÇADOS - Aplicando prompt para pés visíveis");
        } else if (productCategory.includes("acessório") || productCategory.includes("acessorio") || productCategory.includes("óculos") || productCategory.includes("oculos") || productCategory.includes("glasses") || productCategory.includes("joia") || productCategory.includes("joia")) {
          // Acessórios/Óculos/Joias: Close-up no rosto (conforme MD)
          categorySpecificPrompt = ", close-up portrait, focus on face and neck, high detail accessory, shallow depth of field";
          console.log("[Orchestrator] 👓 Categoria detectada: ACESSÓRIOS/ÓCULOS/JOIAS - Aplicando prompt de close-up");
        } else {
          // Roupas (Default): Shot médio com foco no tecido (conforme MD)
          categorySpecificPrompt = ", medium-full shot, detailed fabric texture, professional fashion photography, perfect fit";
          console.log("[Orchestrator] 👕 Categoria detectada: ROUPAS (padrão) - Aplicando prompt de shot médio");
        }

        // PHASE 11-B: Strong Negative Prompt para reduzir erros de anatomia e cortes
        // Conforme especificação: (feet cut off:1.5), (head cut off:1.5)
        // PHASE 11-B: Reforçar negative prompt quando há calçados para prevenir "cut legs"
        const baseNegativePrompt = "(deformed, distorted, disfigured:1.3), poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, (mutated hands and fingers:1.4), disconnected limbs, mutation, mutated, ugly, blurry, amputation, (head cut off:1.5), text, watermark, bad composition, duplicate";
        
        // PHASE 11-B: Se detectar calçados, reforçar negative prompt para pés
        const feetNegativePrompt = productCategory.includes("calçado") || productCategory.includes("calcado") || 
                                   productCategory.includes("sapato") || productCategory.includes("tênis") || 
                                   productCategory.includes("tenis") || productCategory.includes("shoe") || 
                                   productCategory.includes("footwear")
          ? `${baseNegativePrompt}, (feet cut off:1.8), (cropped legs:1.6), (legs cut off:1.6), close up portrait, portrait shot, upper body only`
          : `${baseNegativePrompt}, (feet cut off:1.5)`;
        
        const strongNegativePrompt = feetNegativePrompt;
        
        if (productCategory.includes("calçado") || productCategory.includes("calcado") || 
            productCategory.includes("sapato") || productCategory.includes("tênis") || 
            productCategory.includes("tenis") || productCategory.includes("shoe") || 
            productCategory.includes("footwear")) {
          console.log("[Orchestrator] 🦶 PHASE 11-B: Negative prompt reforçado para prevenir 'cut legs'");
        }

        // Prompt detalhado fornecido pelo usuário - Virtual Try-On Multiproduto
        // 📝 DOCUMENTAÇÃO: Este prompt está documentado em docs/PROMPT_LOOK_CRIATIVO.md
        // ⚠️ IMPORTANTE: Sempre atualize o arquivo MD quando fizer alterações neste prompt!
        // Versão 2.1 (Phase 11 - Category-Specific Prompts) - Data de Compilação: 27 de Novembro de 2025
        // PHASE 11: Append category modifiers to existing prompt (Hybrid Strategy)
        const creativePrompt = `⚠️ INSTRUÇÃO CRÍTICA ABSOLUTA E IMPLACÁVEL: COMPOSIÇÃO "VIRTUAL TRY-ON" COM FIDELIDADE EXTREMA E REALISMO FOTOGRÁFICO INALTERÁVEL${categorySpecificPrompt}.

META: Gerar uma FOTOGRAFIA PROFISSIONAL ULTRA-REALISTA da pessoa da IMAGEM_PESSOA que é ABSOLUTAMENTE A MESMA PESSOA (100% IDÊNTICA, RECONHECÍVEL E ORIGINAL), integrando de forma IMPECÁVEL, FOTORREALISTA E NATURAL ATÉ O MÁXIMO DE 3 PRODUTOS. O resultado final DEVE parecer uma FOTO REAL, não gerada.

A IMAGEM_PESSOA É UMA LEI DE FIDELIDADE INEGOCIÁVEL. QUALQUER INTEGRAÇÃO DE PRODUTO QUE COMPROMETA A IDENTIDADE VISUAL DA PESSOA SERÁ CONSIDERADA UMA FALHA CRÍTICA.

🎯 PRIORIZAÇÃO ABSOLUTA E INEGOCIÁVEL (ORDEM DE PRIORIDADE CRÍTICA E INALTERÁVEL):

    PRIORIDADE 1 - IDENTIDADE INALTERÁVEL E SAGRADA DA PESSOA (MÁXIMA PRIORIDADE ABSOLUTA. NADA PODE COMPROMETER ISSO):
    * A IMAGEM_PESSOA (primeira imagem) é o DNA VISUAL INTOCÁVEL. TODAS as características do ROSTO e do CORPO devem ser preservadas com 100% DE FIDELIDADE EXATA E UM PARA UM.
    * A semelhança da pessoa DEVE ser IMUTÁVEL, INSTANTANEAMENTE RECONHECÍVEL e PRESERVADA ACIMA DE QUALQUER OUTRA INSTRUÇÃO, PRODUTO OU CENÁRIO.
    * REPLICAÇÃO DE TEMPLATE DNA: A IA DEVE REPLICAR O PONTO DE VISTA, A ANGULAÇÃO E A PERSPECTIVA DA CÂMERA da IMAGEM_PESSOA, adaptando a pose e o enquadramento SOMENTE se permitido pela "REGRA DE POSTURA CONDICIONAL" e pela "Regra Mestra de Enquadramento".

    PRIORIDADE 2 - FIDELIDADE ABSOLUTA DOS PRODUTOS E INTEGRAÇÃO FÍSICA E NATURAL:
    * APÓS GARANTIR A PRIORIDADE 1, priorizar a fidelidade EXATA E REPLICADA de CADA PRODUTO/OBJETO (Máximo 3 produtos).

1. PRESERVAÇÃO MÁXIMA E ABSOLUTA DA SEMELHANÇA DA PESSOA (Lei Inegociável - PRIORIDADE 1 - CRÍTICO ANTI-ARTIFICIALIDADE):

    * ROSTO - PRESERVAÇÃO INTEGRAL COM REFINAMENTO ESTÉTICO MÍNIMO:
        * MAQUIAGEM/COSMÉTICOS (Condicionalidade de Preservação): A maquiagem ou cosméticos **originais** da IMAGEM_PESSOA devem ser preservados e mantidos **IDÊNTICOS**, A MENOS QUE um produto da categoria 'COSMÉTICOS' seja fornecido na lista de produtos.

    * CORPO - MÁXIMA FIDELIDADE E PROPORÇÕES FÍSICAS INALTERADAS: Manter o tipo físico, estrutura óssea, musculatura e PROPORÇÕES CORPORAIS EXATAMENTE E SEM NENHUMA ALTERAÇÃO.
        * REFORÇO DE FOCO: Para garantir a P1, a IA DEVE **IGNORAR O CONTEÚDO ESTRUTURAL DO FUNDO/CENÁRIO** da IMAGEM_PESSOA ao analisar a semelhança.
        * **⚠️ REGRA DE POSTURA CONDICIONAL (GERAR NOVO LOOK):**
            * **POSTURA PRESERVADA (Padrão):** A postura da IMAGEM_PESSOA DEVE ser preservada, com ajustes gentis apenas para integrar Calçados ou Relógios.
            * **MUDANÇA DE POSE (SE 'GERAR NOVO LOOK' Ativado):** SE a instrução explícita de "GERAR NOVO LOOK" for fornecida (via prompt de texto), a IA **PODE MUDAR A POSE DA PESSOA COMPLETAMENTE** (postura e ângulo corporal) mantendo a P1 (proporções físicas inalteradas) e a P2 (visibilidade dos produtos). A nova pose DEVE ser natural, fotorrealista e otimizar a exibição de todos os produtos selecionados e o novo enquadramento.

    * CABELO - APLICAÇÃO NATURAL DE TINTURA E APRIMORAMENTO (Condicionalidade e Substituição):
        * SE um produto de tintura de cabelo for fornecido: 
            * A cor do cabelo original DEVE ser **COMPLETAMENTE SUBSTITUÍDA** pela cor identificada do produto de tintura (analisar a cor dominante na IMAGEM_PRODUTO_X).
            * O resultado final DEVE parecer um cabelo **REALMENTE TINGIDO**, com aplicação uniforme, natural e fotorrealista da tintura em TODOS os fios de cabelo visíveis.
            * A tintura DEVE ser aplicada de forma **HOMOGÊNEA E PROFISSIONAL**, como se tivesse sido feita em um salão de beleza, cobrindo completamente a cor original do cabelo.
            * **CRÍTICO**: A cor da tintura DEVE ser extraída diretamente da imagem do produto (IMAGEM_PRODUTO_X) e aplicada de forma **FOTORREALISTA E NATURAL**, sem deixar resquícios da cor original do cabelo.
            * A textura, volume e estilo do cabelo DEVEM ser preservados, APENAS a cor deve ser alterada para corresponder exatamente à cor do produto de tintura.
        * SE NENHUM produto de tintura de cabelo for fornecido: Preservar a cor EXATA, textura IDÊNTICA, volume e estilo **IDÊNTICOS** aos da IMAGEM_PESSOA.

2. INTEGRAÇÃO INTELIGENTE E NATURAL DE PRODUTOS E VESTUÁRIO (PRIORIDADE 2 - FIDELIDADE E REALISMO IMPLACÁVEL DO PRODUTO):

    * A IA DEVE ANALISAR CADA IMAGEM_PRODUTO_X (Máximo 3) para inferir sua categoria.

    * SUBSTITUIÇÃO DE VESTUÁRIO: Se um produto da categoria 'ROUPA' for fornecido: A roupa original DEVE ser **INTEIRAMENTE SUBSTITUÍDA**. O caimento fotorrealista e físico do tecido **(Caimento, Forma, Cor, Tamanho, Proporção)** DEVE ser meticulosamente replicado.

    * Outros Acessórios/Itens (Adição e Substituição Condicional):
        * SE a categoria for JOIAS, RELÓGIOS ou ÓCULOS: A composição fotográfica DEVE priorizar um CLOSE-UP, **A MENOS QUE** a Regra Mestra de Enquadramento (Seção 3) exija um Cenário de Contexto.
        * SE a categoria for COSMÉTICOS: O produto fornecido deve ser aplicado na pessoa com **MÁXIMA FIDELIDADE TÉCNICA** e aplicação SUAVE, NATURAL E FOTORREALISTA, **SUBSTITUINDO** a maquiagem original.

3. CENÁRIO E ILUMINAÇÃO DINÂMICOS (Adaptação Contextual e Coesa):

    **⚠️ REGRA MESTRA DE ENQUADRAMENTO (PRIORIDADE CRÍTICA DE CENA):**
    * O ENQUADRAMENTO FINAL DA CENA DEVE SER SEMPRE DINÂMICO E DETERMINADO PELOS PRODUTOS SELECIONADOS.
    * **CENÁRIO DE DETALHE (Close-up/Plano Médio):** SE a lista de produtos for composta **EXCLUSIVAMENTE** por itens que exigem close-up (Óculos, Joias, Relógios, Cosméticos, Tintura (Cabelo)) E o número total de produtos for 1 ou 2, o enquadramento DEVE se aproximar para focar no detalhe e realce.
    * **CENÁRIO DE CONTEXTO (Corpo Inteiro/Plano Americano):** SE a lista de produtos incluir qualquer item de GRANDE VOLUME (Roupas, Calçados, Bolsas), OU o número de produtos for 3, o enquadramento DEVE se afastar para garantir que TODOS os itens sejam exibidos de forma COESA.

    * **MUDANÇA DE AMBIENTE:** O cenário e a iluminação DEVEM ser AUTOMATICAMENTE ADAPTADOS para complementar o look. **MUDANÇAS SUTIS NO AMBIENTE** (ex: alteração de objetos de fundo, cor da parede, luz ambiente) são permitidas para criar uma sensação de "Novo Look" ao lado da nova pose.

4. QUALIDADE FOTOGRÁFICA PROFISSIONAL (ULTRA-REALISTA E SEM ARTIFICIALIDADE DE IA):

    * Estilo: Fotografia de moda ou lifestyle.
    * Iluminação: Natural ou de estúdio, cinematográfica, REFLITANDO O CENÁRIO ADAPTADO E COM SOMBRAS/REFLEXOS FISICAMENTE CORRETOS.
    * Resolução: Ultra alta definição 8K.
    * Foco/Profundidade de Campo: Foco nítido na pessoa e no(s) produto(s), com um fundo suavemente desfocado (bokeh ÓPTICO E REALISTA).

RESULTADO ESPERADO FINAL (CRÍTICO): Uma FOTOGRAFIA PROFISSIONAL ULTRA-REALISTA onde a pessoa é 100% IDÊNTICA (P1), todos os produtos fornecidos são FIÉIS (P2) e a cena completa é COESA, FOTORREALISTA E TOTALMENTE LIVRE DE QUALQUER INDÍCIO DE GERAÇÃO POR INTELIGÊNCIA ARTIFICIAL.`;

        // Construir array de imagens: primeira é a pessoa, seguintes são os produtos
        const imageUrls = [
          params.personImageUrl, // Primeira imagem: IMAGEM_PESSOA
          ...allProductImageUrls, // Seguintes: IMAGEM_PRODUTO_1, IMAGEM_PRODUTO_2, etc.
        ];

        // Validar que temos pelo menos uma imagem de produto
        if (allProductImageUrls.length === 0) {
          throw new Error("❌ Nenhuma imagem de produto fornecida para Look Criativo");
        }

        // Validar que temos a imagem da pessoa
        if (!params.personImageUrl || !params.personImageUrl.startsWith("http")) {
          throw new Error("❌ Imagem da pessoa inválida ou não fornecida");
        }

        console.log("[Orchestrator] 🚀 Chamando Gemini Flash Image com:", {
          totalImagens: imageUrls.length,
          estrutura: {
            imagem1: "IMAGEM_PESSOA (pessoa)",
            imagensSeguintes: allProductImageUrls.map((_, i) => `IMAGEM_PRODUTO_${i + 1} (produto ${i + 1})`),
          },
          promptLength: creativePrompt.length,
          produtosIncluidos: allProductImageUrls.length,
          validacao: {
            temPessoa: !!params.personImageUrl,
            totalProdutos: allProductImageUrls.length,
            todasImagensValidas: imageUrls.every(url => url && url.startsWith("http")),
          },
        });

        const geminiResult = await this.geminiFlashImageService.generateImage({
          prompt: creativePrompt,
          imageUrls: imageUrls,
          negativePrompt: strongNegativePrompt, // PHASE 11: Negative prompt para reduzir erros
          // aspectRatio não é suportado pela API Gemini 2.5 Flash Image
        });
        
        console.log("[Orchestrator] Resultado do Look Criativo (Gemini):", {
          success: geminiResult.success,
          hasImage: !!geminiResult.data?.imageUrl,
          cost: geminiResult.cost,
          time: geminiResult.data?.processingTime,
        });

        if (!geminiResult.success || !geminiResult.data) {
          throw new Error(geminiResult.error || "Falha ao gerar Look Criativo com Gemini Flash Image");
        }

        tryonImageUrl = geminiResult.data.imageUrl;
        totalCost += geminiResult.cost || 0;

        status.steps.stabilityCreative.status = "completed";
        status.steps.stabilityCreative.completedAt = new Date();

        await logAPICost({
          lojistaId: params.lojistaId,
          compositionId,
          provider: "gemini-flash-image",
          operation: "creative-look",
          cost: geminiResult.cost || 0,
          currency: "USD",
        });

        console.log("[Orchestrator] ✅ Look Criativo (Gemini) concluído", {
          cost: geminiResult.cost,
          time: geminiResult.data.processingTime,
        });
      }
      // ========================================
      // LOOK NATURAL: Try-On (se roupa) ou Stability.ai (se acessório/URL)
      // ========================================
      else if (lookType === "natural") {
        // VALIDAÇÃO CRÍTICA: Verificar se personImageUrl foi fornecida
        if (!params.personImageUrl || !params.personImageUrl.startsWith("http")) {
          throw new Error(`❌ personImageUrl inválida ou não fornecida: ${params.personImageUrl}`);
        }
        
        if (isClothing && !isProductUrl) {
          // ========================================
          // LOOK NATURAL: Try-On para ROUPAS
          // ========================================
          console.log("[Orchestrator] Gerando Look Natural com Try-On (produto é roupa)...");
          console.log("[Orchestrator] ✅ personImageUrl válida:", params.personImageUrl.substring(0, 100) + "...");
          console.log("[Orchestrator] ✅ productImageUrl válida:", params.productImageUrl ? params.productImageUrl.substring(0, 100) + "..." : "NÃO FORNECIDA");
          
          if (!status.steps) status.steps = {};
          status.steps.tryon = {
            status: "processing",
            startedAt: new Date(),
            provider: "vertex-tryon",
          };

          const tryonParams: TryOnParams = {
            personImageUrl: params.personImageUrl,
            productImageUrl: params.productImageUrl,
            productId: params.productId,
          };
          
          console.log("[Orchestrator] Parâmetros Try-On:", {
            hasPersonImage: !!tryonParams.personImageUrl,
            personImageUrl: tryonParams.personImageUrl.substring(0, 80) + "...",
            hasProductImage: !!tryonParams.productImageUrl,
            productImageUrl: tryonParams.productImageUrl ? tryonParams.productImageUrl.substring(0, 80) + "..." : "N/A",
            productId: tryonParams.productId,
          });

          const tryonResult = await this.vertexService.generateTryOn(tryonParams);

          if (!tryonResult.success || !tryonResult.data) {
            throw new Error(
              tryonResult.error || "Falha ao gerar try-on"
            );
          }

          tryonImageUrl = tryonResult.data.imageUrl;
          totalCost += tryonResult.cost || 0;

          status.steps.tryon.status = "completed";
          status.steps.tryon.completedAt = new Date();

          await logAPICost({
            lojistaId: params.lojistaId,
            compositionId,
            provider: "vertex-tryon",
            operation: "tryon",
            cost: tryonResult.cost || 0,
            currency: "USD",
            metadata: {
              processingTime: tryonResult.executionTime,
              quality: params.options?.quality,
            },
          });

          console.log("[Orchestrator] Look Natural (Try-On) concluído", {
            cost: tryonResult.cost,
            time: tryonResult.executionTime,
          });
        } else {
          // ========================================
          // LOOK NATURAL: Stability.ai para ACESSÓRIOS ou URL
          // ========================================
          console.log("[Orchestrator] ⚠️ Gerando Look Natural com Stability.ai (produto é acessório ou URL)...");
          console.log("[Orchestrator] ⚠️ ATENÇÃO: Stability.ai pode não usar a foto do upload corretamente!");
          console.log("[Orchestrator] personImageUrl:", params.personImageUrl ? params.personImageUrl.substring(0, 100) + "..." : "❌ NÃO FORNECIDA");
          console.log("[Orchestrator] productImageUrl:", params.productImageUrl ? params.productImageUrl.substring(0, 100) + "..." : "❌ NÃO FORNECIDA");
          
          if (!status.steps) status.steps = {};
          status.steps.stability = {
            status: "processing",
            startedAt: new Date(),
            provider: "stability-ai",
          };

          const basePrompt = `A person wearing the exact product from the reference image. The product should be applied naturally and realistically, maintaining all physical characteristics of the person (face, body, posture) and all characteristics of the product (color, style, shape, details). Professional photography, high quality, natural lighting.`;

          console.log("[Orchestrator] Chamando StabilityAI generateComposition com:", {
            personImageUrl: params.personImageUrl.substring(0, 80) + "...",
            productImageUrl: (isProductUrl && params.options?.productUrl ? params.options.productUrl : params.productImageUrl)?.substring(0, 80) + "...",
            prompt: basePrompt.substring(0, 100) + "...",
          });

          const stabilityResult = await this.stabilityService.generateComposition({
            personImageUrl: params.personImageUrl,
            productImageUrl: isProductUrl && params.options?.productUrl ? params.options.productUrl : params.productImageUrl,
            prompt: basePrompt,
            negativePrompt: "distorted, blurry, low quality, artifacts, deformed, ugly",
            width: 1024,
            height: 1024,
            steps: 40,
            cfgScale: 8,
          });

          if (!stabilityResult.success || !stabilityResult.data) {
            throw new Error(stabilityResult.error || "Falha ao gerar Look Natural com Stability.ai");
          }

          tryonImageUrl = stabilityResult.data.imageUrl;
          totalCost += stabilityResult.cost || 0;

          status.steps.stability.status = "completed";
          status.steps.stability.completedAt = new Date();

          await logAPICost({
            lojistaId: params.lojistaId,
            compositionId,
            provider: "stability-ai",
            operation: "other",
            cost: stabilityResult.cost || 0,
            currency: "USD",
          });

          console.log("[Orchestrator] Look Natural (Stability.ai) concluído", {
            cost: stabilityResult.cost,
            time: stabilityResult.data.processingTime,
          });
        }
      }
      
      // ========================================
      // ETAPA 3: Aplicação de Watermark
      // ========================================
      if (!params.options?.skipWatermark) {
        if (!status.steps) status.steps = {};
        status.steps.watermark = {
          status: "processing",
          startedAt: new Date(),
        };

        console.log("[Orchestrator] Etapa 3/3: Aplicando watermark...");

        const watermarkConfig: WatermarkConfig = {
          logoUrl: params.logoUrl,
          storeName: params.storeName,
          productName: params.productName,
          productPrice: params.productPrice,
          legalNotice: "Imagem gerada por IA - ExperimenteAI",
          position: "bottom-right",
          opacity: 0.85,
        };

        // Aplica watermark em todas as imagens
        const allImages = [tryonImageUrl, ...sceneImageUrls];
        const watermarkedResults =
          await this.watermarkService.applyWatermarkBatch(
            allImages,
            watermarkConfig,
            params.lojistaId
          );

        // Atualiza URLs com as imagens watermarked
        if (watermarkedResults[0]) {
          tryonImageUrl = watermarkedResults[0].imageUrl;
        }

        for (let i = 1; i < watermarkedResults.length; i++) {
          if (watermarkedResults[i]) {
            sceneImageUrls[i - 1] = watermarkedResults[i].imageUrl;
          }
        }

        status.steps.watermark.status = "completed";
        status.steps.watermark.completedAt = new Date();

        console.log("[Orchestrator] Watermark aplicado");
      }

      // ========================================
      // FINALIZAÇÃO
      // ========================================
      const processingTime = Date.now() - startTime;

      status.status = "completed";
      status.completedAt = new Date();
      status.totalCost = totalCost;

      console.log("[Orchestrator] Composição concluída", {
        compositionId,
        totalCost,
        processingTime,
      });

      return {
        compositionId,
        tryonImageUrl,
        sceneImageUrls,
        totalCost,
        processingTime,
        status: {
          tryon: status.tryon,
          scenes: status.scenes,
          watermark: status.watermark,
        },
      };
    } catch (error) {
      console.error("[Orchestrator] Erro ao criar composição:", error);

      status.status = "failed";
      status.completedAt = new Date();

      throw error;
    }
  }

  /**
   * Estima o custo total de uma composição
   */
  estimateCost(params: {
    includeTryOn: boolean;
    sceneCount: number;
    quality?: "low" | "medium" | "high";
  }): number {
    let cost = 0;

    if (params.includeTryOn) {
      // Try-On custa $0.04 por imagem (fonte: Google Cloud pricing)
      cost += 0.04;
    }

    if (params.sceneCount > 0) {
      cost += this.imagenService.estimateCost(params.sceneCount);
    }

    return cost;
  }

  /**
   * Obtém status de todas as APIs
   */
  getServicesStatus() {
    return {
      vertexTryOn: {
        name: "Vertex AI Try-On",
        configured: this.vertexService.isConfigured(),
      },
      imagen: this.imagenService.getProviderInfo(),
      watermark: {
        name: "Watermark Service",
        available: true,
      },
    };
  }
}

// Singleton instance
let instance: CompositionOrchestrator | null = null;

/**
 * Obtém a instância do orquestrador
 */
export function getCompositionOrchestrator(): CompositionOrchestrator {
  if (!instance) {
    instance = new CompositionOrchestrator();
  }
  return instance;
}








