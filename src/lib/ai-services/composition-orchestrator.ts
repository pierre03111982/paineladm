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
    gerarNovoLook?: boolean; // PHASE 14: Flag para ativar mudança de pose (Regra de Postura Condicional)
    smartContext?: string; // PHASE 15: Contexto inteligente (Beach/Office/Studio)
    smartFraming?: string; // PHASE 14: Framing inteligente (Full Body/Portrait/Medium)
    forbiddenScenarios?: string[]; // PHASE 15: Cenários proibidos para negative prompt
    productsData?: any[]; // PHASE 20: Dados completos dos produtos para lógica de "Complete the Look" e acessórios
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

        // PHASE 14 FIX: Detectar se é remix (tem scenePrompts customizado)
        // Detectar remix por palavras-chave específicas do prompt de remix
        const remixPromptText = params.scenePrompts && params.scenePrompts.length > 0 ? params.scenePrompts[0].toLowerCase() : "";
        const isRemix = params.scenePrompts && params.scenePrompts.length > 0 && 
                       (remixPromptText.includes("harmonious outfit combination") || 
                        remixPromptText.includes("critical remix instruction") ||
                        remixPromptText.includes("remix generation") ||
                        remixPromptText.includes("dramatically different") ||
                        remixPromptText.includes("completely new photoshoot") ||
                        remixPromptText.includes("walking") || 
                        remixPromptText.includes("sitting") ||
                        remixPromptText.includes("leaning") ||
                        remixPromptText.includes("beach") ||
                        remixPromptText.includes("hotel") ||
                        remixPromptText.includes("city street") ||
                        remixPromptText.includes("vibrant sunny") ||
                        remixPromptText.includes("luxury") ||
                        remixPromptText.includes("rooftop"));
        
        // PHASE 14: Prompt Builder v2.1 - Smart Context Engine
        // Usar valores do Smart Context Engine se fornecidos, senão detectar automaticamente
        const smartContext = params.options?.smartContext || "Clean Studio or Urban Street";
        const smartFraming = params.options?.smartFraming || "medium-full shot";
        const productCategory = (params.options?.productCategory || "").toLowerCase();
        const gerarNovoLook = params.options?.gerarNovoLook === true || isRemix; // PHASE 14: Flag para ativar mudança de pose (sempre ativo em remix)
        
        // PHASE 20: Detectar produtos para lógica de "Complete the Look" e acessórios
        const productsData = params.options?.productsData || [];
        const allText = productsData.map(p => `${p?.categoria || ""} ${p?.nome || ""}`).join(" ").toLowerCase();
        const hasGlasses = allText.match(/óculos|oculos|glasses|sunglasses/i);
        const hasTop = allText.match(/camisa|blusa|blouse|shirt|top|jaqueta|jacket|moletom|hoodie/i);
        const hasBottom = allText.match(/calça|pants|jeans|saia|skirt|shorts|vestido|dress/i);
        const hasShoes = allText.match(/calçado|calcado|sapato|tênis|tenis|sneaker|shoe|footwear/i);
        // PHASE 21 FIX: Detecção melhorada de roupas de banho
        const hasBeach = allText.match(/biqu|bikini|maiô|maio|sunga|praia|beachwear|saída de praia|swimwear|moda praia|banho|nado|piscina|swim|beach/i);
        const isBeachContext = smartContext.toLowerCase().includes("beach") || smartContext.toLowerCase().includes("pool") || smartContext.toLowerCase().includes("ocean") || smartContext.toLowerCase().includes("waterfall") || smartContext.toLowerCase().includes("cachoeira");
        
        // PHASE 21 FIX: Sempre usar smartContext do backend (aplica Bikini Law e outras regras)
        // Mesmo em remix, o smartContext já foi calculado corretamente pelo backend usando getSmartScenario
        let categorySpecificPrompt = `, ${smartFraming}`;
        let framingRule = `FORCE CONTEXT: ${smartFraming.toUpperCase()}.`;
        // PHASE 21 FIX: SEMPRE usar smartContext do backend (não substituir por scenePrompts)
        let contextRule = `⚠️ CRITICAL SCENE CONTEXT (MANDATORY): ${smartContext}. THE BACKGROUND MUST MATCH THIS EXACT CONTEXT. DO NOT USE ANY OTHER BACKGROUND.`;
        
        // PHASE 21 FIX: Se for remix e tiver scenePrompts, adicionar instruções de pose mas MANTER o smartContext
        let remixPoseInstructions = "";
        if (isRemix && params.scenePrompts && params.scenePrompts.length > 0) {
          const remixPromptText = params.scenePrompts[0];
          // PHASE 21 FIX: Extrair apenas instruções de pose do remixPrompt, mas MANTER o smartContext
          remixPoseInstructions = `\n\n🎨 REMIX MODE: ${remixPromptText}`;
          framingRule = `⚠️ CRITICAL: DRAMATIC SCENE AND POSE CHANGE REQUIRED. The background, lighting, camera angle, and person's pose must be COMPLETELY DIFFERENT from the original photo. This is a REMIX generation - create a NEW PHOTOSHOOT in a NEW LOCATION with a NEW POSE.`;
          console.log("[Orchestrator] 🎨 PHASE 21 FIX: REMIX DETECTADO - Usando smartContext do backend + instruções de pose do remix:", {
            isRemix: true,
            smartContext: smartContext,
            remixPromptLength: remixPromptText.length,
            remixPromptPreview: remixPromptText.substring(0, 200) + "...",
          });
        } else {
          console.log("[Orchestrator] 📸 Modo Normal (não é remix):", {
            hasScenePrompts: !!params.scenePrompts,
            scenePromptsLength: params.scenePrompts?.length || 0,
            smartContext: smartContext,
          });
        }
        
        // Adicionar detalhes específicos baseados no framing
        if (smartFraming.includes("Full body") || smartFraming.includes("feet")) {
          categorySpecificPrompt += ", wide angle, camera low angle, feet fully visible, standing on floor, showing complete shoes, ground visible";
          console.log("[Orchestrator] 🦶 PHASE 14: Smart Framing = FULL BODY SHOT");
        } else if (smartFraming.includes("close-up") || smartFraming.includes("portrait")) {
          categorySpecificPrompt += ", focus on face and neck, high detail accessory, shallow depth of field";
          console.log("[Orchestrator] 👓 PHASE 14: Smart Framing = CLOSE-UP PORTRAIT");
        } else {
          categorySpecificPrompt += ", detailed fabric texture, professional fashion photography, perfect fit";
          console.log("[Orchestrator] 👕 PHASE 14: Smart Framing = MEDIUM-FULL SHOT");
        }
        
        console.log("[Orchestrator] 🎨 PHASE 14: Smart Context Engine:", {
          smartContext,
          smartFraming,
          productCategory,
        });
        
        // PHASE 14: Injetar flag "GERAR NOVO LOOK" se ativado (Regra de Postura Condicional)
        // PHASE 21 FIX: Adicionar regra para evitar fotos de costas (máximo um pouco de lado)
        const posturaRule = gerarNovoLook 
          ? "⚠️ GERAR NOVO LOOK: ATIVADO. A IA PODE MUDAR A POSE DA PESSOA COMPLETAMENTE (postura e ângulo corporal) mantendo a P1 (proporções físicas inalteradas) e a P2 (visibilidade dos produtos). A nova pose DEVE ser natural, fotorrealista e otimizar a exibição de todos os produtos selecionados. IMPORTANTE: A pessoa DEVE estar em pé (standing), caminhando (walking) ou apoiada em parede (leaning against wall). NUNCA sentada, ajoelhada ou em cadeira. ⚠️ CRITICAL POSE RULE: A pessoa DEVE estar de FRENTE para a câmera ou no MÁXIMO um pouco de lado (3/4 view). NUNCA de costas (back view). O rosto e o corpo frontal DEVEM estar visíveis."
          : "POSTURA PRESERVADA (Padrão): A postura da IMAGEM_PESSOA DEVE ser preservada, com ajustes gentis apenas para integrar Calçados ou Relógios. IMPORTANTE: A pessoa DEVE estar em pé (standing), caminhando (walking) ou apoiada em parede (leaning against wall). NUNCA sentada, ajoelhada ou em cadeira. ⚠️ CRITICAL POSE RULE: A pessoa DEVE estar de FRENTE para a câmera ou no MÁXIMO um pouco de lado (3/4 view). NUNCA de costas (back view). O rosto e o corpo frontal DEVEM estar visíveis.";
        
        if (gerarNovoLook) {
          console.log("[Orchestrator] 🎨 PHASE 14: Flag 'GERAR NOVO LOOK' ATIVADA - Permitindo mudança de pose");
        }
        
        // PHASE 20: "Complete the Look" (Auto-Jeans) - Se tem Top mas não tem Bottom, adicionar jeans
        let completeTheLookPrompt = "";
        if (hasTop && !hasBottom) {
          completeTheLookPrompt = " wearing neutral blue denim jeans";
          console.log("[Orchestrator] 👖 PHASE 20: Complete the Look ativado - Adicionando jeans automático");
        }
        
        // PHASE 21 FIX: Roupas de banho - chinelo ou sem calçado nos pés
        let beachFootwearPrompt = "";
        if (hasBeach || isBeachContext) {
          // Se não tem sapatos selecionados, forçar chinelo ou pés descalços
          if (!hasShoes) {
            beachFootwearPrompt = " barefoot or wearing simple flip-flops/sandals, NO boots, NO sneakers, NO closed shoes";
            console.log("[Orchestrator] 🏖️ PHASE 21 FIX: Roupas de banho detectadas - Forçando chinelo ou pés descalços");
          }
        }
        
        // PHASE 20: Smart Accessory Placement - Óculos no rosto
        let accessoryPrompt = "";
        if (hasGlasses) {
          accessoryPrompt = " wearing sunglasses ON EYES, wearing glasses ON FACE";
          console.log("[Orchestrator] 👓 PHASE 20: Óculos detectado - Forçando no rosto");
        }

        // PHASE 11-B: Strong Negative Prompt para reduzir erros de anatomia e cortes
        // Conforme especificação: (feet cut off:1.5), (head cut off:1.5)
        // PHASE 11-B: Reforçar negative prompt quando há calçados para prevenir "cut legs"
        // PHASE 16: Adicionar instruções sobre sombras no negative prompt
        // PHASE 20: Banir poses sentadas e mannequin body
        // PHASE 21: Reforçar termos mannequin no negative prompt
        // PHASE 21 FIX: Adicionar banimento de fotos de costas
        const baseNegativePrompt = "(deformed, distorted, disfigured:1.3), poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, (mutated hands and fingers:1.4), disconnected limbs, mutation, mutated, ugly, blurry, amputation, (head cut off:1.5), text, watermark, bad composition, duplicate, (original clothes visible:1.6), (two layers of clothing:1.6), (multiple outfits:1.6), (old outfit:1.4), (no shadows:1.8), (person without shadow:1.8), (floating person:1.6), (unrealistic lighting:1.5), (flat lighting:1.5), (no depth:1.4), (sitting:1.5), (seated:1.5), (chair:1.5), (bench:1.5), (kneeling:1.5), (mannequin body:1.8), (plastic skin:1.6), (artificial pose:1.6), (stiff pose:1.5), (artificial body shape:1.6), (wrong proportions:1.5), (mismatched body:1.5), (back view:1.8), (person facing away:1.8), (back turned:1.8), (rear view:1.8)";
        
        // PHASE 11-B: Se detectar calçados, reforçar negative prompt para pés
        const feetNegativePrompt = productCategory.includes("calçado") || productCategory.includes("calcado") || 
                                   productCategory.includes("sapato") || productCategory.includes("tênis") || 
                                   productCategory.includes("tenis") || productCategory.includes("shoe") || 
                                   productCategory.includes("footwear")
          ? `${baseNegativePrompt}, (feet cut off:1.8), (cropped legs:1.6), (legs cut off:1.6), close up portrait, portrait shot, upper body only`
          : `${baseNegativePrompt}, (feet cut off:1.5)`;
        
        // PHASE 20: Phantom Boots Fix - Se contexto é Beach e não tem sapatos, banir boots/sneakers
        let phantomBootsNegative = "";
        if (isBeachContext && !hasShoes) {
          phantomBootsNegative = ", (boots:2.0), (shoes:1.5), (sneakers:1.5)";
          console.log("[Orchestrator] 🏖️ PHASE 20: Phantom Boots Fix - Beach sem sapatos, banindo boots/sneakers");
        }
        
        // PHASE 20: Glasses Placement Fix - Banir óculos no chão ou na mão
        let glassesNegative = "";
        if (hasGlasses) {
          glassesNegative = ", (glasses on floor:2.0), (glasses in hand:2.0)";
          console.log("[Orchestrator] 👓 PHASE 20: Glasses Placement Fix - Banindo óculos no chão/mão");
        }
        
        // PHASE 15: Adicionar cenários proibidos ao negative prompt (FORÇAR com peso alto)
        const forbiddenScenarios = params.options?.forbiddenScenarios || [];
        const forbiddenPrompt = forbiddenScenarios.length > 0
          ? `, ${forbiddenScenarios.map(s => `(${s}:2.0)`).join(", ")}` // Aumentado peso de 1.5 para 2.0
          : "";
        
        // PHASE 15: Adicionar reforço adicional se houver cenários proibidos relacionados a praia/piscina
        // Só adicionar se os forbiddenScenarios incluírem palavras relacionadas a praia/piscina
        const hasBeachForbidden = forbiddenScenarios.some(s => 
          /beach|pool|ocean|sand|tropical|summer|seaside|palm/i.test(s)
        );
        const additionalForbiddenReinforcement = hasBeachForbidden
          ? `, (beach scene:2.5), (ocean background:2.5), (sand:2.5), (palm trees:2.5), (tropical:2.5), (summer beach:2.5), (swimming pool:2.5), (beach resort:2.5), (seaside:2.5), (paradise beach:2.5), (sunny beach:2.5)`
          : "";
        
        const strongNegativePrompt = `${feetNegativePrompt}${phantomBootsNegative}${glassesNegative}${forbiddenPrompt}${additionalForbiddenReinforcement}`;
        
        if (forbiddenScenarios.length > 0) {
          console.log("[Orchestrator] 🚫 PHASE 15: Cenários proibidos FORÇADOS no negative prompt (peso 2.0):", {
            forbiddenScenarios,
            totalForbidden: forbiddenScenarios.length,
            additionalReinforcement: additionalForbiddenReinforcement.length > 0
          });
        }
        
        if (productCategory.includes("calçado") || productCategory.includes("calcado") || 
            productCategory.includes("sapato") || productCategory.includes("tênis") || 
            productCategory.includes("tenis") || productCategory.includes("shoe") || 
            productCategory.includes("footwear")) {
          console.log("[Orchestrator] 🦶 PHASE 11-B: Negative prompt reforçado para prevenir 'cut legs'");
        }

        // PHASE 14: Prompt Mestre Definitivo v2.0 - Estrutura Base
        // 📝 DOCUMENTAÇÃO: Baseado no "Prompt Mestre Definitivo.txt"
        // Versão 2.2 (Phase 14 - Master Fix Protocol) - Data de Compilação: 28 de Novembro de 2025
        // 
        // ESTRUTURA DO PROMPT:
        // - IMAGEM_PESSOA: Primeira imagem (personImageUrl) - DNA VISUAL INTOCÁVEL
        // - IMAGEM_PRODUTO_1, IMAGEM_PRODUTO_2, IMAGEM_PRODUTO_3: Produtos selecionados (máximo 3)
        // - Framing Rules: Aplicadas via categorySpecificPrompt e framingRule
        // - Postura Rule: Aplicada via posturaRule (GERAR NOVO LOOK ou POSTURA PRESERVADA)
        //
        const creativePrompt = `⚠️ INSTRUÇÃO CRÍTICA ABSOLUTA E IMPLACÁVEL: COMPOSIÇÃO "VIRTUAL TRY-ON" COM FIDELIDADE EXTREMA E REALISMO FOTOGRÁFICO INALTERÁVEL${categorySpecificPrompt}.

${contextRule}${remixPoseInstructions}

${framingRule}

${posturaRule}

META: Gerar uma FOTOGRAFIA PROFISSIONAL ULTRA-REALISTA da pessoa da IMAGEM_PESSOA que é ABSOLUTAMENTE A MESMA PESSOA (100% IDÊNTICA, RECONHECÍVEL E ORIGINAL), integrando de forma IMPECÁVEL, FOTORREALISTA E NATURAL ATÉ O MÁXIMO DE 3 PRODUTOS${completeTheLookPrompt}${accessoryPrompt}${beachFootwearPrompt}. O resultado final DEVE parecer uma FOTO REAL, não gerada.

⚠️ CRITICAL PRODUCT TRANSFER RULE (PHASE 21 - CLONE THE CLOTHES):
The clothing item(s) in the [IMAGEM_PRODUTO_X] inputs must be CLONED EXACTLY as they appear (fabric texture, print, color, cut, embroidery, patterns, details). DO NOT replace, modify, or create new garments. Your task is to TRANSFER the exact item from the product image onto the person's body, maintaining 100% fidelity to the original product design. The garment must look IDENTICAL to the product photo, only adapted to fit the user's body proportions.

⚠️ CRITICAL BODY STRUCTURE RULE (PHASE 21 - IGNORE MANNEQUIN BODY):
Use ONLY the body shape, pose, and proportions from the [IMAGEM_PESSOA] (User Upload). COMPLETELY IGNORE the body shape of the mannequin or model in the product image. The clothes must drape and fit according to the user's body, not the mannequin's. The person's body proportions MUST come exclusively from the IMAGEM_PESSOA. The mannequin's body shape, pose, and proportions are IRRELEVANT and must be completely disregarded.

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

    * PHASE 14: A IA DEVE ANALISAR CADA IMAGEM_PRODUTO_X (Máximo 3 produtos: IMAGEM_PRODUTO_1, IMAGEM_PRODUTO_2, IMAGEM_PRODUTO_3) para inferir sua categoria.
    * PHASE 14: TODOS os produtos fornecidos DEVEM ser integrados na composição final. Nenhum produto pode ser ignorado ou omitido.

    * SUBSTITUIÇÃO DE VESTUÁRIO: Se um produto da categoria 'ROUPA' for fornecido: A roupa original DEVE ser **INTEIRAMENTE SUBSTITUÍDA**. O caimento fotorrealista e físico do tecido **(Caimento, Forma, Cor, Tamanho, Proporção)** DEVE ser meticulosamente replicado.
    
    * **⚠️ PHASE 21: CLONE THE CLOTHES RULE (CRÍTICO):**
        * A roupa na IMAGEM_PRODUTO_X DEVE ser CLONADA EXATAMENTE como aparece (textura do tecido, estampa, cor, corte, bordado, padrões, detalhes).
        * NÃO substitua, modifique ou crie novas peças. Sua tarefa é TRANSFERIR a peça exata da imagem do produto para o corpo da pessoa.
        * A peça DEVE parecer IDÊNTICA à foto do produto, apenas adaptada para caber nas proporções corporais do usuário.
        * Mantenha 100% de fidelidade ao design original do produto.
    
    * **⚠️ PHASE 21: IGNORE MANNEQUIN BODY RULE (CRÍTICO):**
        * Use APENAS a forma do corpo, pose e proporções da IMAGEM_PESSOA (Upload do Usuário).
        * IGNORE COMPLETAMENTE a forma do corpo do manequim ou modelo na imagem do produto.
        * As roupas devem cair e se ajustar de acordo com o corpo do usuário, NÃO com o corpo do manequim.
        * As proporções corporais da pessoa DEVEM vir EXCLUSIVAMENTE da IMAGEM_PESSOA.
        * A forma do corpo, pose e proporções do manequim são IRRELEVANTES e devem ser completamente desconsideradas.

    * Outros Acessórios/Itens (Adição e Substituição Condicional):
        * SE a categoria for JOIAS, RELÓGIOS ou ÓCULOS: A composição fotográfica DEVE priorizar um CLOSE-UP, **A MENOS QUE** a Regra Mestra de Enquadramento (Seção 3) exija um Cenário de Contexto.
        * SE a categoria for COSMÉTICOS: O produto fornecido deve ser aplicado na pessoa com **MÁXIMA FIDELIDADE TÉCNICA** e aplicação SUAVE, NATURAL E FOTORREALISTA, **SUBSTITUINDO** a maquiagem original.

3. CENÁRIO E ILUMINAÇÃO DINÂMICOS (Adaptação Contextual e Coesa - OBRIGATÓRIO):

    **⚠️ REGRA MESTRA DE ENQUADRAMENTO (PRIORIDADE CRÍTICA DE CENA):**
    * O ENQUADRAMENTO FINAL DA CENA DEVE SER SEMPRE DINÂMICO E DETERMINADO PELOS PRODUTOS SELECIONADOS.
    * **CENÁRIO DE DETALHE (Close-up/Plano Médio):** SE a lista de produtos for composta **EXCLUSIVAMENTE** por itens que exigem close-up (Óculos, Joias, Relógios, Cosméticos, Tintura (Cabelo)) E o número total de produtos for 1 ou 2, o enquadramento DEVE se aproximar para focar no detalhe e realce.
    * **CENÁRIO DE CONTEXTO (Corpo Inteiro/Plano Americano):** SE a lista de produtos incluir qualquer item de GRANDE VOLUME (Roupas, Calçados, Bolsas), OU o número de produtos for 3, o enquadramento DEVE se afastar para garantir que TODOS os itens sejam exibidos de forma COESA.

    * **MUDANÇA DE AMBIENTE:** O cenário e a iluminação DEVEM ser AUTOMATICAMENTE ADAPTADOS para complementar o look. **MUDANÇAS SUTIS NO AMBIENTE** (ex: alteração de objetos de fundo, cor da parede, luz ambiente) são permitidas para criar uma sensação de "Novo Look" ao lado da nova pose.

4. QUALIDADE FOTOGRÁFICA PROFISSIONAL (ULTRA-REALISTA E SEM ARTIFICIALIDADE DE IA):

    * Estilo: Fotografia de moda ou lifestyle.
    * Iluminação: Natural ou de estúdio, cinematográfica, REFLITANDO O CENÁRIO ADAPTADO E COM SOMBRAS/REFLEXOS FISICAMENTE CORRETOS.
    * **⚠️ SOMBRAS REALISTAS OBRIGATÓRIAS (CRÍTICO):**
        * A pessoa DEVE projetar sombras NATURAIS E FISICAMENTE CORRETAS no chão/superfície abaixo dela, baseadas na direção da luz do cenário.
        * As sombras DEVEM ser suaves, graduais e com bordas difusas (soft shadows), não duras ou cortadas.
        * A intensidade e direção das sombras DEVEM corresponder à iluminação do ambiente (ex: luz solar = sombra definida, luz suave = sombra suave).
        * **CRÍTICO**: A ausência de sombras torna a imagem claramente artificial. SEMPRE inclua sombras realistas da pessoa no chão.
        * As sombras DEVEM seguir a forma e postura da pessoa, criando profundidade e ancorando a pessoa no ambiente de forma realista.
        * Se houver múltiplas fontes de luz, as sombras podem ser múltiplas, mas sempre suaves e naturalmente sobrepostas.
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

        // PHASE 14 FIX: Aumentar temperatura para remix (mais variação)
        const temperature = isRemix ? 0.75 : 0.4; // Remix: 0.75 (mais variação), Normal: 0.4 (mais consistência)
        
        console.log("[Orchestrator] 🎨 PHASE 14 FIX: Configuração de geração:", {
          isRemix,
          temperature,
          promptLength: creativePrompt.length,
        });
        
        const geminiResult = await this.geminiFlashImageService.generateImage({
          prompt: creativePrompt,
          imageUrls: imageUrls,
          negativePrompt: strongNegativePrompt, // PHASE 11: Negative prompt para reduzir erros
          temperature: temperature, // PHASE 14 FIX: Temperatura aumentada para remix
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








