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
    // PHASE 26: Dados do cenário para usar como input visual
    scenarioImageUrl?: string; // URL da imagem do cenário (será enviada como 3ª imagem para Gemini)
    scenarioLightingPrompt?: string; // Prompt de iluminação do cenário
    scenarioCategory?: string; // Categoria do cenário
    scenarioInstructions?: string; // Instruções específicas para usar a imagem do cenário
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
        // PHASE 24: Simplified context and framing rules (50% reduction)
        let categorySpecificPrompt = `, ${smartFraming}`;
        let framingRule = `FRAMING: ${smartFraming}.`;
        // PHASE 24: Simplified context rule
        let contextRule = `SCENARIO: ${smartContext}.`;
        
        // PHASE 21 FIX: Se for remix e tiver scenePrompts, adicionar instruções de pose mas MANTER o smartContext
        let remixPoseInstructions = "";
        if (isRemix && params.scenePrompts && params.scenePrompts.length > 0) {
          const remixPromptText = params.scenePrompts[0];
          // PHASE 21 FIX: Extrair apenas instruções de pose do remixPrompt, mas MANTER o smartContext
          // PHASE 24: Simplified remix instructions
          remixPoseInstructions = `\n\nREMIX: ${remixPromptText}`;
          framingRule = `REMIX: Dramatic scene and pose change. New location, new pose.`;
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
        
        // PHASE 23: Spatial Instructions for Multi-Product (explicit body part assignment)
        let spatialProductInstructions = "";
        if (productsData.length > 1) {
          const productAssignments: string[] = [];
          productsData.forEach((product, index) => {
            const category = (product?.categoria || "").toLowerCase();
            const name = (product?.nome || "").toLowerCase();
            const productName = product?.nome || `Product ${index + 1}`;
            
            // Verificar se ESTE produto específico é um top
            const isThisProductTop = category.includes("camisa") || category.includes("blusa") || category.includes("blouse") || category.includes("shirt") || category.includes("top") || category.includes("jaqueta") || category.includes("jacket") || category.includes("moletom") || category.includes("hoodie") || name.match(/camisa|blusa|blouse|shirt|top|jaqueta|jacket|moletom|hoodie/i);
            // Verificar se ESTE produto específico é um bottom
            const isThisProductBottom = category.includes("calça") || category.includes("pants") || category.includes("jeans") || category.includes("saia") || category.includes("skirt") || category.includes("shorts") || category.includes("vestido") || category.includes("dress") || name.match(/calça|pants|jeans|saia|skirt|shorts|vestido|dress/i);
            // Verificar se ESTE produto específico é um calçado
            const isThisProductShoes = category.includes("calçado") || category.includes("calcado") || category.includes("sapato") || category.includes("tênis") || category.includes("tenis") || category.includes("sneaker") || category.includes("shoe") || category.includes("footwear") || name.match(/calçado|calcado|sapato|tênis|tenis|sneaker|shoe|footwear/i);
            // Verificar se ESTE produto específico é óculos
            const isThisProductGlasses = category.includes("óculos") || category.includes("oculos") || category.includes("glasses") || category.includes("sunglasses") || name.match(/óculos|oculos|glasses|sunglasses/i);
            
            if (isThisProductTop) {
              productAssignments.push(`[${productName}] on torso/upper body`);
            } else if (isThisProductBottom) {
              productAssignments.push(`[${productName}] on legs/lower body`);
            } else if (isThisProductShoes) {
              productAssignments.push(`[${productName}] on feet`);
            } else if (isThisProductGlasses) {
              productAssignments.push(`[${productName}] on face/head`);
            } else {
              productAssignments.push(`[${productName}] integrated naturally`);
            }
          });
          
          if (productAssignments.length > 0) {
            spatialProductInstructions = `\n\n⚠️ PHASE 23: SPATIAL PRODUCT ASSIGNMENT: The user is wearing ${productAssignments.join(" AND ")}. Each product must be placed on its correct body part without blending into a mutant outfit.`;
            console.log("[Orchestrator] 📍 PHASE 23: Instruções espaciais para multi-produto:", productAssignments);
          }
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
        // PHASE 22: Adicionar banimento de alterações na aparência facial e corporal
        // PHASE 23: Reforçar termos anti-manequim com peso 2.0
        // PHASE 24: Adicionar termos para forçar realismo bruto (sem filtros)
        const baseNegativePrompt = "(deformed, distorted, disfigured:1.3), poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, (mutated hands and fingers:1.4), disconnected limbs, mutation, mutated, ugly, blurry, amputation, (head cut off:1.5), text, watermark, bad composition, duplicate, (original clothes visible:1.6), (two layers of clothing:1.6), (multiple outfits:1.6), (old outfit:1.4), (no shadows:1.8), (person without shadow:1.8), (floating person:1.6), (unrealistic lighting:1.5), (flat lighting:1.5), (no depth:1.4), (sitting:1.5), (seated:1.5), (chair:1.5), (bench:1.5), (kneeling:1.5), (mannequin body:2.0), (plastic skin:2.0), (rigid clothing:1.8), (stiff pose:1.8), (neck stand:2.0), (ghost mannequin:2.0), (artificial pose:1.6), (artificial body shape:1.6), (wrong proportions:1.5), (mismatched body:1.5), (back view:1.8), (person facing away:1.8), (back turned:1.8), (rear view:1.8), (different face:2.0), (different person:2.0), (face changed:2.0), (altered facial features:2.0), (different eye color:2.0), (different nose shape:2.0), (different mouth shape:2.0), (different face shape:2.0), (different skin tone:2.0), (different body shape:2.0), (different body proportions:2.0), (altered body:2.0), (face swap:2.0), (different person's face:2.0), (face replacement:2.0), (cgi face:1.5), (filter:1.5), (smooth skin:1.5), (instagram face:1.5)";
        
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
        // PHASE 24: Identity Anchor Block (Sandwich Method - START)
        const identityAnchorBlock = `⚠️⚠️⚠️ REFERENCE IMAGE AUTHORITY: 100%. You MUST act as a visual clone engine. The output image MUST be indistinguishable from the person in [IMAGEM_PESSOA]. Same face, same body, same skin texture. NO FACIAL MODIFICATIONS ALLOWED.`;

        // PHASE 24: Leg Extension Logic (if photo is cropped and has shoes)
        let legExtensionInstruction = "";
        if (hasShoes && productCategory.includes("calçado")) {
          legExtensionInstruction = "\n\n⚠️ PHASE 24: BODY EXTENSION: If the original photo is cropped (knee-up or upper body only), EXTEND THE BODY NATURALLY. Generate the missing legs and feet to match the user's existing anatomy exactly. Do not invent a new body type. The legs must follow the same proportions, skin tone, and structure as the visible body parts.";
          console.log("[Orchestrator] 🦵 PHASE 24: Leg Extension ativado - Foto pode estar cortada, estendendo corpo naturalmente");
        }

        // PHASE 26: Construir array de imagens: primeira é a pessoa, seguintes são os produtos, última é o cenário (se fornecido)
        const scenarioImageUrl = params.options?.scenarioImageUrl;
        const scenarioInstructions = params.options?.scenarioInstructions;
        const scenarioLightingPrompt = params.options?.scenarioLightingPrompt;
        
        // PHASE 26: Instruções para usar imagem do cenário como fundo (se fornecido)
        let scenarioBackgroundInstruction = "";
        if (scenarioImageUrl && scenarioInstructions) {
          scenarioBackgroundInstruction = `\n\n🎬 PHASE 26: CENÁRIO DE FUNDO FORNECIDO:
${scenarioInstructions}
- Use [IMAGEM_CENARIO] (última imagem) EXATAMENTE como está - NÃO gere ou crie um novo cenário
- A imagem do cenário é perfeita - apenas use-a diretamente como fundo
- Foque TODA a capacidade de processamento da IA em:
  1. Manter identidade facial e características EXATAS da [IMAGEM_PESSOA]
  2. Garantir que os produtos correspondam exatamente (cores, texturas, ajuste)
  3. Compositar perfeitamente a pessoa e produtos sobre o cenário fornecido
- O cenário já está pronto - apenas use-o como está`;
        } else if (scenarioImageUrl) {
          scenarioBackgroundInstruction = `\n\n🎬 PHASE 26: CENÁRIO DE FUNDO FORNECIDO:
- Use [IMAGEM_CENARIO] (última imagem) EXATAMENTE como está - NÃO gere ou crie um novo cenário
- A imagem do cenário é perfeita - apenas use-a diretamente como fundo
- Foque TODA a capacidade de processamento da IA em manter identidade facial e produtos exatos
${scenarioLightingPrompt ? `- Iluminação e contexto do cenário: ${scenarioLightingPrompt}` : ""}`;
        }

        const creativePrompt = `${identityAnchorBlock}

⚠️ INSTRUÇÃO CRÍTICA ABSOLUTA E IMPLACÁVEL: COMPOSIÇÃO "VIRTUAL TRY-ON" COM FIDELIDADE EXTREMA E REALISMO FOTOGRÁFICO INALTERÁVEL${categorySpecificPrompt}.

${scenarioBackgroundInstruction}

${contextRule}${remixPoseInstructions}

${framingRule}

${posturaRule}

PRODUCT INTEGRATION: Apply ALL products provided in the input images${completeTheLookPrompt}${accessoryPrompt}${beachFootwearPrompt}${spatialProductInstructions}. You have ${allProductImageUrls.length} product image(s): ${allProductImageUrls.map((_, i) => `[IMAGEM_PRODUTO_${i + 1}]`).join(", ")}. Extract fabric pattern, texture, color, and style from EACH product image. Apply ALL products onto [IMAGEM_PESSOA]'s body simultaneously. Adapt clothing to user's natural curves. Fabric must drape naturally with realistic folds and shadows. Use ONLY body shape from [IMAGEM_PESSOA]. IGNORE mannequin's body shape.${legExtensionInstruction}

${contextRule}${remixPoseInstructions}

${framingRule}

PHOTOGRAPHY: Professional fashion photography. Natural lighting. Realistic shadows. 8K resolution. Sharp focus on person and products.

⚠️⚠️⚠️ FINAL CHECK (PHASE 24 - IDENTITY ANCHOR - SANDWICH METHOD END):
${identityAnchorBlock}
The face and body MUST MATCH the [IMAGEM_PESSOA] 100%. If the clothing changes the body shape (e.g., makes it look like a plastic mannequin), it is a FAILURE. Keep the human skin texture and imperfections. The person should look like they are WEARING the clothes, not like the clothes are replacing their body. The fabric must drape naturally over the user's actual body shape, following gravity and creating realistic folds and shadows.`;
        
        const imageUrls = [
          params.personImageUrl, // Primeira imagem: IMAGEM_PESSOA
          ...allProductImageUrls, // Seguintes: IMAGEM_PRODUTO_1, IMAGEM_PRODUTO_2, etc.
        ];
        
        // PHASE 26: Adicionar imagem do cenário como última imagem (se fornecido)
        if (scenarioImageUrl && scenarioImageUrl.startsWith("http")) {
          imageUrls.push(scenarioImageUrl); // Última imagem: IMAGEM_CENARIO
          console.log("[Orchestrator] 🎬 PHASE 26: Imagem do cenário adicionada como input visual:", {
            url: scenarioImageUrl.substring(0, 100) + "...",
            indice: imageUrls.length,
            tipo: "IMAGEM_CENARIO",
          });
        } else {
          console.log("[Orchestrator] ⚠️ PHASE 26: Nenhuma imagem de cenário fornecida - Gemini criará cenário do zero");
        }

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
            ...(scenarioImageUrl && {
              ultimaImagem: `IMAGEM_CENARIO (cenário de fundo)`,
            }),
          },
          promptLength: creativePrompt.length,
          produtosIncluidos: allProductImageUrls.length,
          temCenario: !!scenarioImageUrl,
          validacao: {
            temPessoa: !!params.personImageUrl,
            totalProdutos: allProductImageUrls.length,
            temCenario: !!scenarioImageUrl,
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








