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
  compositionId?: string; // ID pré-gerado para evitar duplicação
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
    forceNewPose?: boolean; // MASTER PROMPT: Flag para Remix agressivo (forçar nova pose)
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
    // Usar compositionId fornecido ou gerar um novo
    const compositionId = params.compositionId || `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log("[Orchestrator] Iniciando criação de composição", {
      compositionId,
      isPreGenerated: !!params.compositionId,
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
      steps: {}, // Sempre inicializar steps como objeto vazio
    };

    let totalCost = 0;
    let tryonImageUrl = "";
    const sceneImageUrls: string[] = [];

    const isProductUrl = !!params.options?.productUrl;
    const isClothing = params.options?.isClothing ?? false; // Default: não é roupa
    // REFINAMENTO VISUAL: SEMPRE usar "creative" (Gemini Flash Image) para garantir:
    // - Uso da foto original
    // - Preservação de identidade
    // - Cenários do Firestore
    // - Proporção 9:16
    // - Mesma qualidade em todos os caminhos
    const lookType = "creative"; // FORÇAR creative para todos os looks (mesma lógica do REMIX que funciona)
    const baseImageUrl = params.options?.baseImageUrl; // Para Look Criativo
    
    try {
      // ========================================
      // LOOK CRIATIVO: Gemini 2.5 Flash Image
      // REFINAMENTO VISUAL: SEMPRE usar este caminho (único caminho válido)
      // ========================================
      // FORÇAR creative para todos os looks (lookType já foi forçado acima)
      if (lookType === "creative" || true) { // Sempre true para garantir que sempre use este caminho
        console.log("[Orchestrator] 🎨 Gerando Look Criativo com Gemini 2.5 Flash Image (único caminho válido)...");
        
        // REFINAMENTO VISUAL: Validar que personImageUrl foi fornecida (FOTO ORIGINAL OBRIGATÓRIA)
        if (!params.personImageUrl) {
          throw new Error(`❌ personImageUrl é OBRIGATÓRIA - deve ser a foto original do upload`);
        }
        
        // Converter data URL para HTTP se necessário (para garantir que a foto original seja usada)
        let finalPersonImageUrl = params.personImageUrl;
        if (finalPersonImageUrl.startsWith("data:image/")) {
          console.warn("[Orchestrator] ⚠️ personImageUrl é data URL - pode causar problemas. Recomendado: converter para HTTP antes de chamar orchestrator.");
        }
        
        if (!finalPersonImageUrl.startsWith("http") && !finalPersonImageUrl.startsWith("data:image/")) {
          throw new Error(`❌ personImageUrl inválida (deve ser HTTP URL ou data URL): ${params.personImageUrl?.substring(0, 100)}`);
        }
        
        console.log("[Orchestrator] ✅ Usando FOTO ORIGINAL do upload:", {
          url: finalPersonImageUrl.substring(0, 100) + "...",
          isDataUrl: finalPersonImageUrl.startsWith("data:image/"),
          isHttp: finalPersonImageUrl.startsWith("http"),
        });
        
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
        
        // PHASE 26: Construir array de imagens: primeira é a pessoa, seguintes são os produtos, última é o cenário (se fornecido)
        const scenarioImageUrl = params.options?.scenarioImageUrl;
        const scenarioInstructions = params.options?.scenarioInstructions;
        const scenarioLightingPrompt = params.options?.scenarioLightingPrompt;
        const scenarioCategory = params.options?.scenarioCategory;
        
        // MASTER PROMPT PIVOT: Sempre usar smartContext (nunca usar scenarioImageUrl como imagem)
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
        
        // PHASE 31: Detectar se são apenas acessórios (para permitir close-up)
        const hasOnlyAccessories = productsData.length > 0 && 
          !hasTop && !hasBottom && !hasShoes && 
          (hasGlasses || allText.match(/relógio|relogio|watch|joia|jewelry|joias|cosmético|cosmetico/i));
        
        // PHASE 21 FIX: Sempre usar smartContext do backend (aplica Bikini Law e outras regras)
        // Mesmo em remix, o smartContext já foi calculado corretamente pelo backend usando getSmartScenario
        // PHASE 31: QUALIDADE REMIX PARA TODOS OS MODOS
        // Forçar Full Body Shot para evitar cortes (exceto para apenas acessórios)
        // Usar as mesmas configurações do Remix para garantir qualidade consistente
        let finalFraming = smartFraming;
        
        // Se não for apenas acessórios, SEMPRE forçar Full Body Shot para evitar cortes
        if (!hasOnlyAccessories && !smartFraming.includes("Full body")) {
          finalFraming = "Full body shot, feet fully visible, standing on floor";
          console.log("[Orchestrator] 🎯 PHASE 31: Forçando Full Body Shot para evitar cortes:", {
            originalFraming: smartFraming,
            newFraming: finalFraming,
            reason: "Garantir corpo completo visível (qualidade Remix)",
          });
        }
        
        let categorySpecificPrompt = `, ${finalFraming}`;
        let framingRule = `FRAMING: ${finalFraming}.`;
        
        // MASTER PROMPT PIVOT: Sempre adicionar contextRule (cenário será gerado via prompt)
        // IMPORTANTE: O bloco PRO PHOTOGRAPHY STANDARDS tem prioridade sobre instruções genéricas de cenário
        let contextRule = `SCENARIO: ${smartContext}.`;
        if (scenarioCategory || scenarioLightingPrompt) {
          contextRule = scenarioCategory 
            ? `SCENARIO: Professional ${scenarioCategory} environment.`
            : `SCENARIO: ${smartContext}.`;
          if (scenarioLightingPrompt) {
            contextRule += ` Lighting: ${scenarioLightingPrompt}.`;
          }
        }
        // Adicionar nota de que PRO PHOTOGRAPHY STANDARDS tem prioridade
        contextRule += `\n\n⚠️ NOTE: The PRO PHOTOGRAPHY STANDARDS block (above) defines the lighting and optical settings. This scenario description provides context only.`;
        
        // PHASE 31: Aplicar instruções de pose do Remix para TODOS os modos
        let poseInstructions = "";
        if (params.scenePrompts && params.scenePrompts.length > 0) {
          // Se tiver scenePrompts (Remix), usar as instruções específicas
          const remixPromptText = params.scenePrompts[0];
          poseInstructions = `\n\n🎨 QUALIDADE REMIX - DRAMATIC VARIATION:
${remixPromptText}

⚠️ CRITICAL REQUIREMENTS:
- The scene MUST be DRAMATICALLY DIFFERENT from any previous generation
- The pose MUST be DIFFERENT from the original photo
- Maintain exact facial identity but CHANGE pose and scene`;
          framingRule = `REMIX: Dramatic scene and pose change. New location, new pose. Different from original.`;
        }
        
        // Adicionar detalhes específicos baseados no framing FINAL
        if (finalFraming.includes("Full body") || finalFraming.includes("feet")) {
          categorySpecificPrompt += ", wide angle, camera low angle, feet fully visible, standing on floor, showing complete shoes, ground visible, full body visible from head to feet";
          console.log("[Orchestrator] 🦶 PHASE 31: Framing = FULL BODY SHOT (qualidade Remix)");
        } else if (finalFraming.includes("close-up") || finalFraming.includes("portrait")) {
          categorySpecificPrompt += ", focus on face and neck, high detail accessory, shallow depth of field";
          console.log("[Orchestrator] 👓 PHASE 31: Framing = CLOSE-UP PORTRAIT");
        } else {
          // Para medium-full, também garantir corpo completo
          categorySpecificPrompt += ", detailed fabric texture, professional fashion photography, perfect fit, full body visible from head to knees at minimum";
          console.log("[Orchestrator] 👕 PHASE 31: Framing = MEDIUM-FULL SHOT (com corpo completo)");
        }
        
        console.log("[Orchestrator] 🎨 PHASE 14: Smart Context Engine:", {
          smartContext: smartContext || "N/A (usando imagem de cenário)",
          smartFraming,
          productCategory,
          hasScenarioImage: !!(scenarioImageUrl && scenarioImageUrl.startsWith("http")),
          contextRule: contextRule || "N/A (usando imagem de cenário)",
          totalProdutos: allProductImageUrls.length,
          produtos: allProductImageUrls.map((url, i) => ({
            indice: i + 1,
            tipo: `IMAGEM_PRODUTO_${i + 1}`,
            produto: productsData[i]?.nome || "N/A",
            categoria: productsData[i]?.categoria || "N/A",
          })),
        });
        
        // PHASE 31: QUALIDADE REMIX - Aplicar mesmas regras de postura para TODOS os modos
        // Isso garante que o corpo completo seja sempre visível e evita cortes
        const posturaRule = `⚠️⚠️⚠️ CRITICAL POSE & FRAMING RULES (QUALIDADE REMIX - APLICADO A TODOS OS MODOS):

1. FULL BODY VISIBILITY (CRITICAL):
   - The person's COMPLETE BODY must be visible from HEAD to FEET (or at minimum HEAD to KNEES)
   - NEVER crop, cut, or hide any part of the person's body
   - Always include space above the person's head (at least 10% of image height)
   - The person's face must be fully visible and centered in the upper portion of the image
   - If showing full body, ensure head is at the top with adequate space above

🕴️ POSE DIRECTIVE (ELEGANTE E ESTÁTICA):
   - Generate a STYLISH, STATIC, and CONFIDENT pose.
   - **NO WALKING or RUNNING.** The person should be standing firmly or leaning slightly.
   - Posture: Straight back, relaxed shoulders, 'High Fashion Editorial' vibe.
   - Hands: Natural placement (in pockets, folded, or relaxing at sides). Avoid awkward floating hands.
   - The person MUST be facing the camera or at MOST slightly to the side (3/4 view)
   - NEVER from behind (back view) - the face and frontal body MUST be visible
   - NEVER sitting, kneeling, or on a chair - always standing elegantly or leaning against wall
   - Maintain natural body posture and positioning with elegant, confident stance

3. FRAMING REQUIREMENTS:
   - Full body shot: Show complete person from head to feet
   - Medium-full shot: Show person from head to knees at minimum
   - Close-up portrait: Only for accessories (glasses, jewelry) - show head and neck
   - Always ensure adequate space around the person (no tight cropping)

4. IDENTITY PRESERVATION:
   - Maintain exact facial identity and body shape
   - Keep natural body proportions and curves
   - Preserve skin tone and texture exactly
   - No AI "beautification" or generic model replacement

CRITICAL: These rules apply to ALL generation modes (experimentar, refino, trocar produto, remix) to ensure consistent high-quality results.`;
        
        console.log("[Orchestrator] 🎯 PHASE 31: Regras de postura e framing (qualidade Remix) aplicadas a TODOS os modos");
        
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

        // MASTER PROMPT: Negative Prompt Reforçado - Prevenção Crítica de Pessoas Sem Cabeça
        // PHASE 11-B: Strong Negative Prompt para reduzir erros de anatomia e cortes
        // MASTER PROMPT: Reforço máximo para prevenir decapitação (peso 3.0 nos termos críticos)
        // PHASE 16: Adicionar instruções sobre sombras no negative prompt
        // PHASE 20: Banir poses sentadas e mannequin body
        // PHASE 21: Reforçar termos mannequin no negative prompt
        // PHASE 21 FIX: Adicionar banimento de fotos de costas
        // PHASE 22: Adicionar banimento de alterações na aparência facial e corporal
        // PHASE 23: Reforçar termos anti-manequim com peso 2.0
        // PHASE 24: Adicionar termos para forçar realismo bruto (sem filtros)
        // MASTER PROMPT: REFINAMENTO DE ESTILO - Adicionar termos para proibir poses de movimento
        const baseNegativePrompt = "(deformed, distorted, disfigured:1.3), poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, (mutated hands and fingers:1.4), disconnected limbs, mutation, mutated, ugly, blurry, amputation, (head cut off:3.0), (headless:3.0), (no head:3.0), (missing head:3.0), (cropped head:3.0), (head cropped:3.0), (face cut off:3.0), (face missing:3.0), (headless person:3.0), (person without head:3.0), (decapitated:3.0), (head removed:3.0), (head obscured:3.0), (head hidden:3.0), (face obscured:3.0), (face hidden:3.0), (partial head:2.5), (head partially visible:2.5), (head out of frame:2.5), text, watermark, bad composition, duplicate, (original clothes visible:1.6), (two layers of clothing:1.6), (multiple outfits:1.6), (old outfit:1.4), (no shadows:2.0), (person without shadow:2.0), (floating person:1.6), (unrealistic lighting:2.0), (flat lighting:2.0), (no depth:1.4), (harsh shadows:1.5), (unnatural shadows:1.5), (wrong shadow direction:1.5), (sitting:1.5), (seated:1.5), (chair:1.5), (bench:1.5), (kneeling:1.5), (walking:2.0), (running:2.0), (dynamic movement:2.0), (person walking:2.0), (person running:2.0), (mid-stride:2.0), (in motion:2.0), (artificial walking:2.0), (awkward movement:2.0), (mannequin body:2.0), (plastic skin:2.0), (rigid clothing:1.8), (stiff pose:1.8), (neck stand:2.0), (ghost mannequin:2.0), (artificial pose:1.6), (artificial body shape:1.6), (wrong proportions:1.5), (mismatched body:1.5), (back view:1.8), (person facing away:1.8), (back turned:1.8), (rear view:1.8), (different face:2.0), (different person:2.0), (face changed:2.0), (altered facial features:2.0), (different eye color:2.0), (different nose shape:2.0), (different mouth shape:2.0), (different face shape:2.0), (different skin tone:2.0), (different body shape:2.0), (different body proportions:2.0), (altered body:2.0), (face swap:2.0), (different person's face:2.0), (face replacement:2.0), (cgi face:1.5), (filter:1.5), (smooth skin:1.5), (instagram face:1.5), (product not visible:1.5), (product missing:1.5), (product not applied:1.5), (cropped:2.0), (cut off:2.0), (out of frame:2.0), (partially visible:2.0), (letterboxing:2.0), (pillarboxing:2.0), (blurred borders:2.0), (extra background filler:2.0)";
        
        // PHASE 31: QUALIDADE REMIX - Reforçar negative prompt para evitar TODOS os tipos de cortes
        // Aplicar para TODOS os modos (não apenas calçados)
        const bodyCutNegative = "(body cut off:2.5), (torso cut off:2.5), (legs cut off:2.5), (arms cut off:2.5), (cropped body:2.5), (cropped torso:2.5), (cropped legs:2.5), (partial body:2.5), (body partially visible:2.5), (body out of frame:2.5), (tight crop:2.0), (close crop:2.0)";
        
        // PHASE 11-B: Se detectar calçados, reforçar negative prompt para pés
        const feetNegativePrompt = productCategory.includes("calçado") || productCategory.includes("calcado") || 
                                   productCategory.includes("sapato") || productCategory.includes("tênis") || 
                                   productCategory.includes("tenis") || productCategory.includes("shoe") || 
                                   productCategory.includes("footwear")
          ? `${baseNegativePrompt}, ${bodyCutNegative}, (feet cut off:2.0), (cropped legs:2.0), (legs cut off:2.0), close up portrait, portrait shot, upper body only`
          : `${baseNegativePrompt}, ${bodyCutNegative}, (feet cut off:1.8), (cropped legs:1.8), (legs cut off:1.8)`;
        
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
        
        // PHASE 29: Adicionar termos críticos de Virtual Try-On ao negative prompt
        const virtualTryOnNegative = ", (double clothing:2.0), (multiple shirts:2.0), (clothing overlap:2.0), (ghosting:2.0), (visible original clothes:2.0), (bad fit:2.0), (floating clothes:2.0), (sticker effect:2.0), (unnatural fabric folds:2.0), (distorted body:2.0), (wrong anatomy:2.0), (clothing on top of clothes:2.0), (overlay clothing:2.0), (transparent clothing:2.0)";
        
        // REFINAMENTO VISUAL: Proibir cenários noturnos e melhorar sombras
        const nightSceneNegative = ", (night scene:2.5), (dark background:2.5), (evening:2.5), (sunset:2.5), (dusk:2.5), (nighttime:2.5), (neon lights:2.5), (cyberpunk:2.5), (artificial night lighting:2.5), (night street:2.5), (dark alley:2.5), (nightclub:2.5), (bad shadows:2.0), (wrong lighting:2.0), (floating person:2.0), (no shadows:2.0), (unnatural shadows:2.0)";
        
        const strongNegativePrompt = `${feetNegativePrompt}${phantomBootsNegative}${glassesNegative}${forbiddenPrompt}${additionalForbiddenReinforcement}${virtualTryOnNegative}${nightSceneNegative}`;
        
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

        // MASTER PROMPT: CORREÇÃO VISUAL CRÍTICA (ANATOMIA & REALISMO)
        // Data: 28 de Novembro de 2025
        // 5 BLOCOS DE SEGURANÇA OBRIGATÓRIOS (ORDEM CRÍTICA)
        
        // ROLE: World's Best AI Fashion Photographer
        const roleBlock = `ROLE: You are the world's best AI Fashion Photographer and Retoucher.

TASK: Create a Hyper-Realistic Virtual Try-On composition with GENERATIVE BACKGROUND.

INPUTS:
- Image 1: PERSON (The reference identity).
- Image 2..N: PRODUCTS (The clothes to wear).
- NO BACKGROUND IMAGE: You must GENERATE the background based on product context.`;

        // 1. BLOCO DE INTEGRIDADE ANATÔMICA (Anti-Decapitação) - PRIORIDADE MÁXIMA
        const anatomicalSafetyBlock = `
⚠️ ANATOMICAL SAFETY RULES (CRITICAL - HIGHEST PRIORITY):

- PROTECT THE HEAD: You must NEVER crop, remove, or obscure the person's head. The face must remain visible and unchanged.
- FRAMING: Ensure the composition includes the full head and body down to the knees/feet.
- If the clothing is a 'Top/Shirt', applied ONLY from the neck down. DO NOT touch the neck or face pixels.
- The person's COMPLETE HEAD must ALWAYS be fully visible from top of hair to chin.
- NEVER crop, cut, or hide the person's head, face, or hair.
- Always include space above the person's head (at least 10% of image height).
- The person's face must be fully visible and centered in the upper portion of the image.
- If the original photo shows the person's head, the output MUST show the complete head.`;

        // 2. BLOCO DE IDENTIDADE (Clonagem Visual) - PRIORIDADE #1
        // MASTER PROMPT: TRAVAS DE SEGURANÇA - Identity Shield reforçado para 100% de semelhança
        const identityLockBlock = `
🔒 IDENTITY LOCK (PRIORITY #1 - 100% SEMELHANÇA OBRIGATÓRIA):

⚠️⚠️⚠️ REGRA CRÍTICA: O ROSTO E CORPO DEVEM SER 100% IDÊNTICOS AO INPUT ⚠️⚠️⚠️

- The output person MUST be a PIXEL-PERFECT, 100% IDENTICAL clone of the input person in [Image 1].
- Maintain EXACT: Ethnicity, Age, Body Shape (Weight/Musculature/Proportions), Skin Texture, Skin Tone, and ALL Facial Features.
- Do NOT 'beautify', idealize, or change the person into a generic model.
- The person MUST be INSTANTLY RECOGNIZABLE as the EXACT SAME PERSON - not similar, not approximate, but IDENTICAL.
- If the face is clear in input, it MUST be pixel-perfect identical in output.
- Keep it 100% authentic - NO AI "beautification", NO generic model replacement, NO idealization.

👤 FACE PRESERVATION PROTOCOL (NON-NEGOTIABLE - 100% IDENTITY):
- You MUST treat the face area from [Image 1] as a 'Sacred Zone' - ABSOLUTELY NO CHANGES ALLOWED.
- PRESERVE ALL MICRO-DETAILS: Moles, scars, freckles, asymmetry, exact eye shape, eye color, nose width, nose shape, lip volume, lip shape, jawline, cheekbones, forehead, eyebrows.
- PRESERVE FACIAL STRUCTURE: Distance between eyes, eye size, nose position, mouth position, facial proportions - ALL must be IDENTICAL.
- PRESERVE SKIN TEXTURE: Pores, wrinkles, skin imperfections, skin tone variations - ALL must be IDENTICAL.
- NO BEAUTIFICATION: Do NOT apply 'beauty filters', smoothing, or make the person look like a generic model. Keep them 100% real.
- IF THE POSE CHANGES: The head angle may adjust slightly to look natural, BUT ALL facial features must remain 100% IDENTICAL and recognizable as the input person.
- The face MUST be IDENTICAL in every micro-detail - no smoothing, no idealization, no generic model replacement, no changes whatsoever.

🏃 BODY PRESERVATION PROTOCOL (NON-NEGOTIABLE - 100% IDENTITY):
- The body MUST be EXACTLY the same: same height, same weight, same proportions, same body shape.
- PRESERVE BODY STRUCTURE: Shoulder width, waist size, hip width, arm length, leg length, torso length - ALL proportions must be IDENTICAL.
- PRESERVE MUSCLE DEFINITION: Same muscle tone, same body fat distribution, same physical build.
- PRESERVE SKIN TONE: Exact skin color throughout the entire body - no color shifts, no lighting changes that alter skin tone.
- PRESERVE BODY DETAILS: Scars, birthmarks, skin texture, hair on body - ALL must be IDENTICAL.
- The body shape, proportions, and physical characteristics MUST remain 100% IDENTICAL - no changes allowed.
- If the input person has a specific body type, the output MUST have the EXACT same body type.

⚠️ FINAL CHECK - IDENTITY VERIFICATION:
Before finalizing, verify:
1. Is the face 100% identical? Same eyes, nose, mouth, facial structure, skin texture? If NO → FAILURE.
2. Is the body 100% identical? Same height, proportions, body shape, skin tone? If NO → FAILURE.
3. Would someone instantly recognize this as the EXACT SAME PERSON? If NO → FAILURE.
4. Any deviation from 100% identity match is a CRITICAL FAILURE and must be rejected.`;

        // 3. BLOCO DE FIDELIDADE DO PRODUTO (Texture & Logo Lock) - NOVO
        // MASTER PROMPT: TRAVAS DE SEGURANÇA - Product Texture Lock reforçado
        const productFidelityBlock = `
🛡️ PRODUCT FIDELITY (CRITICAL):

- VISUAL CLONING: The clothing worn by the person MUST match the Product Image inputs 100%.
- TEXTURE & PATTERNS: Preserve exact fabric texture (denim, silk, cotton), prints, and patterns. Do not simplify or alter them.
- LOGOS & DETAILS: If the product has a logo, text, or buttons, they MUST be visible and unchanged. Do not hallucinate new logos or remove existing ones.
- COLOR ACCURACY: Maintain the exact hue/saturation of the product photo. Do not apply strong filters that change the clothing color.
- The new products must REPLACE (not overlay) the original garments entirely.
- CRITICAL: If the original clothes are bright (like orange/red/yellow), you must cover them COMPLETELY. No color bleeding.

🧶 PRODUCT TEXTURE LOCK (NON-NEGOTIABLE):
- The clothes from [Image 2..N] are NOT generic references. They are EXACT products.
- LOGOS & PRINTS: If there is text, a logo, or a pattern on the shirt/pants, it must be VISIBLE and LEGIBLE. Do not hallucinate new text or remove existing text/logos.
- MATERIAL PHYSICS: If the product looks like heavy denim, render heavy denim wrinkles. If it looks like silk, render silk drapes. Do not change the fabric weight or texture.
- PATTERN FIDELITY: If the product has stripes, polka dots, or any pattern, preserve it EXACTLY. Do not simplify or alter patterns.
- COLOR MATCHING: The color of the clothing must match the product image EXACTLY - no color shifts, no filters, no artistic interpretation.`;

        // 4. BLOCO DE FÍSICA E CAIMENTO (Naturalidade)
        const clothingPhysicsBlock = `
👕 CLOTHING PHYSICS:

- GRAVITY & TENSION: The clothes must pull and fold according to the person's pose (e.g., tension at shoulders, folds at the waist).
- VOLUME: The clothes must wrap AROUND the 3D volume of the body. Avoid the 'flat sticker' look.
- TUCK/UNTUCK: If it's a shirt + pants, create a natural waistline interaction (tucked in or hanging naturally).
- FIT: The clothes must drape naturally over the person's specific body curves.
- GRAVITY: Fabric must hang correctly. No "floating" clothes.
- LAYERING: If multiple products (e.g., Shirt + Jacket), layer them logically.
- IDENTIFY the garments the person is currently wearing in Image 1.
- DELETE/MASK them mentally. Imagine the person is in neutral underwear.
- GENERATE the new products onto the body.

⚙️ BODY MORPHING PROTECTION (NON-NEGOTIABLE):
physics_engine: {
  'body_volume': 'MATCH_INPUT',     // Do not make the person thinner or more muscular than input
  'skin_tone': 'EXACT_MATCH',       // Do not change lighting so much that skin color changes
  'height_ratio': 'PRESERVE',       // Keep leg/torso proportions identical to input
  'body_shape': 'LOCK',             // Maintain exact body shape (weight distribution, muscle definition)
  'proportions': 'FIXED'            // Do not alter head-to-body ratio or limb lengths
}
- CRITICAL: Even if the pose changes slightly, the body dimensions and proportions must remain EXACTLY as in [Image 1].
- NO IDEALIZATION: Do not make the person taller, thinner, or more "model-like". Keep their authentic body shape.
- SKIN TONE PRESERVATION: The skin color must match the input EXACTLY - no color shifts from lighting changes.`;

        // 6. BLOCO DE FOTOGRAFIA PROFISSIONAL (LIGHTING & LENS ENGINE) - PRIORIDADE MÁXIMA
        // Este bloco tem PRIORIDADE sobre quaisquer instruções de cenário genéricas
        // Detectar se é cenário indoor ou outdoor
        const isIndoorContext = smartContext.toLowerCase().includes("office") || 
                                smartContext.toLowerCase().includes("bedroom") || 
                                smartContext.toLowerCase().includes("apartment") || 
                                smartContext.toLowerCase().includes("studio") || 
                                smartContext.toLowerCase().includes("lobby") || 
                                smartContext.toLowerCase().includes("restaurant") || 
                                smartContext.toLowerCase().includes("library") || 
                                smartContext.toLowerCase().includes("conference") || 
                                smartContext.toLowerCase().includes("gallery") ||
                                smartContext.toLowerCase().includes("bathroom") ||
                                smartContext.toLowerCase().includes("indoor");
        
        const lightingIntegrationBlock = `
📸 PRO PHOTOGRAPHY STANDARDS (MANDATORY - HIGHEST PRIORITY):

⚠️⚠️⚠️ THIS BLOCK HAS PRIORITY OVER ANY GENERIC SCENARIO INSTRUCTIONS ⚠️⚠️⚠️

${isIndoorContext ? `
1. TIME OF DAY (INDOOR - SOFT WINDOW LIGHT):
- For INDOOR scenarios (Office, Bedroom, Studio, etc.), you MUST simulate soft, natural window light coming from the side.
- Light Source: Large window or soft daylight from one side (left or right).
- Color Temperature: Natural daylight (approx. 5500K-6500K), slightly warm.
- NO harsh artificial lighting. NO fluorescent lights. NO direct overhead lights.
- Soft, diffused light that wraps around the subject naturally.
` : `
1. TIME OF DAY (THE GOLDEN HOUR RULE):
- For ALL outdoor/external scenarios (Beach, City, Nature, Street, etc.), you MUST simulate the lighting of 'Golden Hour' (approx. 5:00 PM or 7:00 AM).
- Sun Position: Low angle sun, roughly 45 degrees relative to the subject.
- Color Temperature: Warm, golden tones (approx. 3500K-4500K). NO harsh white noon light. NO blue overcast light.
- The entire scene must have this warm, cinematic golden hour atmosphere.
`}

2. ADVANCED LIGHTING TECHNIQUE (RIM LIGHTING):
- Apply a subtle RIM LIGHT (Backlight) on the subject's hair and shoulders to separate them from the background.
- This creates depth and makes the person "pop" from the background.
- Key Light: Soft, diffused sunlight (outdoor) or window light (indoor) hitting the face gently.
- Use a 'virtual reflector' logic to fill shadows naturally - no harsh dark shadows on the face.
- Shadows: ${isIndoorContext ? 'Soft, subtle shadows on the ground from window light.' : 'Long, soft shadows on the ground, consistent with the low sun angle (45 degrees).'}
- The rim light should create a beautiful edge glow on the subject's outline.

3. OPTICAL PHYSICS (THE 85MM LOOK):
- Simulate a Professional Portrait Lens (85mm at f/1.8 aperture).
- Depth of Field: The subject MUST be razor-sharp and in perfect focus.
- The background MUST have a creamy, optical BOKEH (blur) - smooth, dreamy background blur.
- Distance compression: The background should appear closer and compressed, typical of telephoto fashion lenses.
- This creates that professional fashion photography look with subject separation.

4. SCENE COMPOSITION:
- Clean Backgrounds: Avoid visual clutter behind the head. Use leading lines (roads, paths, architecture, furniture) to draw focus to the outfit.
- Color Harmony: Apply a subtle 'Teal and Orange' or 'Warm Cinema' color grading to unify the subject and environment.
- The color grading should enhance the golden hour warmth (outdoor) or natural window light (indoor).
- Background elements should complement, not compete with, the subject.

5. SHADOW INTEGRATION:
- CAST SHADOWS: The person MUST cast a realistic shadow on the floor/ground matching the light direction.
- Shadow Quality: ${isIndoorContext ? 'Soft, subtle shadows from window light.' : 'Long, soft shadows consistent with 45-degree sun angle.'}
- Shadows must connect naturally to the person's feet (no floating).
- Shadow edges must be soft (not harsh black lines).
- Shadow direction must match the light source exactly.

6. COLOR GRADING & ATMOSPHERE:
- ${isIndoorContext ? 'Natural daylight color temperature with slight warmth from window light.' : 'Warm, golden color temperature (3500K-4500K) throughout the entire scene.'}
- Eliminate the "cut-and-paste" look by matching ambient light color and intensity.
- The person must look like they are physically present in the scene, not pasted on top.
- The lighting on the person's FACE must be natural, flattering, and match the scene's light source perfectly.

💡 ATMOSPHERE & LIGHTING (REFORÇADO):
- LIGHT SOURCE: Soft, natural sunlight (Golden Hour or Mid-Morning) for outdoor scenarios.
- TEMPERATURE: Slightly WARM tone (creates healthy skin and inviting vibe).
- INTEGRATION: The light on the person MUST match the background direction exactly.
- AVOID: Cold/Blue industrial light or harsh noon shadows.
- For indoor scenarios: Soft window light with natural daylight temperature, slightly warm.

CRITICAL: These photography standards MUST be applied to ALL images, regardless of scenario type. This creates consistent, professional fashion photography quality.`;

        // PHASE 31: FORMAT & COMPOSITION - QUALIDADE REMIX PARA TODOS OS MODOS
        // REFORÇADO PARA EVITAR CORTES NO CORPO
        const formatCompositionBlock = `
📱 FORMAT RULE (MANDATORY - CRITICAL - QUALIDADE REMIX):
- The output image MUST be Vertical (Aspect Ratio 2:3, aspect ratio 2:3 vertical).
- EXTEND the background vertically above and below the person. Do NOT stretch the person.
- Generate the background in vertical format from the start - do NOT crop or distort.
- Perfectly framed, subject fills the frame entirely, no borders, no padding, edge to edge composition.

⚠️⚠️⚠️ CRITICAL FRAMING RULES (QUALIDADE REMIX - APLICADO A TODOS OS MODOS):
- FULL BODY VISIBILITY: The person's COMPLETE BODY must be visible from HEAD to FEET (or at minimum HEAD to KNEES)
- NEVER crop, cut, or hide ANY part of the person's body (head, torso, legs, feet)
- The person's COMPLETE HEAD must be visible from top of hair to chin
- Always include space above the person's head (at least 10% of image height)
- The person's face must be fully visible and centered in the upper portion of the image
- If showing full body, ensure head is at the top with adequate space above
- If showing medium-full, ensure head to knees are visible at minimum
- NEVER crop legs, feet, or any body parts
- The person must be positioned in the center of the frame with adequate space around

- POSE (QUALIDADE REMIX - ELEGANTE E ESTÁTICA):
  - The person MUST be facing the camera or at MOST slightly to the side (3/4 view)
  - NEVER from behind (back view) - the face and frontal body MUST be visible
  - **NO WALKING or RUNNING** - always standing elegantly or leaning slightly against wall
  - NEVER sitting, kneeling, or on a chair
  - STYLISH, STATIC, and CONFIDENT pose with straight back and relaxed shoulders
  - Hands: Natural placement (in pockets, folded, or relaxing at sides)
  - High Fashion Editorial vibe with elegant, confident stance
  - Maintain natural body positioning and proportions`;

        // NEGATIVE CONSTRAINTS
        const negativeConstraintsBlock = `
🚫 NEGATIVE CONSTRAINTS:
- No ghosting (old clothes visible under new ones).
- No horizontal/landscape output.
- No bad anatomy (extra fingers, distorted limbs).
- No night scenes (Keep it daytime/bright unless specified).
- No cropped, cut off, out of frame, partially visible, letterboxing, pillarboxing, blurred borders, extra background filler.`;

        // PHASE 24: Leg Extension Logic (if photo is cropped and has shoes)
        // CRÍTICO: Manter SEMELHANÇA FÍSICA COMPLETA ao estender pernas
        // Ativar sempre que houver calçados, independente da categoria do produto principal
        let legExtensionInstruction = "";
        if (hasShoes) {
          legExtensionInstruction = `\n\n⚠️⚠️⚠️ CRITICAL BODY EXTENSION (PHASE 24 - SEMELHANÇA FÍSICA COMPLETA):
If the original photo [IMAGEM_PESSOA] is cropped (knee-up, upper body only, or missing legs), you MUST EXTEND THE BODY NATURALLY while maintaining 100% PHYSICAL RESEMBLANCE:

1. ANATOMY MATCHING:
   - Analyze the visible body parts in [IMAGEM_PESSOA] (torso, arms, proportions)
   - Generate missing legs and feet that MATCH EXACTLY:
     * Same body proportions (if person has wide shoulders, legs should match that build)
     * Same skin tone (EXACT color match - analyze skin color from visible parts)
     * Same skin texture (smooth, rough, freckles, hair, etc.)
     * Same body structure (muscle definition, body fat distribution, bone structure)

2. PHYSICAL CONTINUITY:
   - The extended legs must look like they belong to the SAME person
   - No color mismatch between upper and lower body
   - No proportion mismatch (legs too thin/thick compared to torso)
   - Maintain natural body curves and contours

3. REALISTIC INTEGRATION:
   - Legs must connect naturally to the visible torso
   - Feet must be properly proportioned to the body
   - Maintain natural standing posture
   - Keep the same lighting and shadow patterns

4. QUALITY REQUIREMENTS:
   - Skin texture must match (smoothness, pores, hair, etc.)
   - Skin color must be IDENTICAL (no color grading differences)
   - Body shape must be CONSISTENT (same build type throughout)
   - Natural body imperfections must be maintained

CRITICAL: The extended body parts must be INDISTINGUISHABLE from the original - it should look like the photo was never cropped.`;
          console.log("[Orchestrator] 🦵 PHASE 24: Leg Extension ativado - Mantendo SEMELHANÇA FÍSICA COMPLETA ao estender pernas");
        }

        // MASTER PROMPT: PIVOT - Usar cenário como TEXTO, não como imagem
        // NÃO incluir scenarioImageUrl no array de imagens - usar apenas descrições textuais
        let scenarioBackgroundInstruction = "";
        
        // Construir instrução de background baseada em categoria e lighting prompt
        if (scenarioCategory || scenarioLightingPrompt) {
          const categoryDescription = scenarioCategory 
            ? `Generate a high-end ${scenarioCategory} environment.`
            : "Generate a professional fashion photography environment.";
          
          const lightingDescription = scenarioLightingPrompt 
            ? `Lighting: ${scenarioLightingPrompt}`
            : "Natural daylight, bright and well-lit.";
          
          scenarioBackgroundInstruction = `\n\n🎬 BACKGROUND CONTEXT (GENERATIVE):
${categoryDescription}
${lightingDescription}

⚠️ IMPORTANT: The PRO PHOTOGRAPHY STANDARDS block (above) has PRIORITY over these generic background instructions.
Apply the Golden Hour Rule (outdoor) or Soft Window Light (indoor) as specified in the PRO PHOTOGRAPHY STANDARDS block.

CRITICAL BACKGROUND GENERATION RULES:
- Generate the background FIRST based on the product vibe and category above.
- The background must be vertical (9:16) from the start - extend it above and below the person.
- Create a cohesive, professional fashion photography environment.
- Ensure the background complements the products and person naturally.
- NO pixelated images, NO "cut-and-paste" look - everything must be generated together.
- Apply the lighting rules from PRO PHOTOGRAPHY STANDARDS (Golden Hour for outdoor, Window Light for indoor).`;
        } else if (smartContext) {
          // Fallback para smartContext se não tiver cenário do Firestore
          scenarioBackgroundInstruction = `\n\n🎬 BACKGROUND CONTEXT (GENERATIVE):
Generate a professional fashion photography environment: ${smartContext}.

⚠️ IMPORTANT: The PRO PHOTOGRAPHY STANDARDS block (above) has PRIORITY over these generic background instructions.
Apply the Golden Hour Rule (outdoor) or Soft Window Light (indoor) as specified in the PRO PHOTOGRAPHY STANDARDS block.

CRITICAL BACKGROUND GENERATION RULES:
- Generate the background FIRST based on the context above.
- The background must be vertical (9:16) from the start.
- Create a cohesive, professional environment.
- Ensure natural integration with the person and products.
- Apply the lighting rules from PRO PHOTOGRAPHY STANDARDS (Golden Hour for outdoor, Window Light for indoor).`;
        } else {
          // Fallback genérico
          scenarioBackgroundInstruction = `\n\n🎬 BACKGROUND CONTEXT (GENERATIVE):
Generate a professional fashion photography environment that complements the products.

⚠️ IMPORTANT: The PRO PHOTOGRAPHY STANDARDS block (above) has PRIORITY over these generic background instructions.
Apply the Golden Hour Rule (outdoor) or Soft Window Light (indoor) as specified in the PRO PHOTOGRAPHY STANDARDS block.

CRITICAL BACKGROUND GENERATION RULES:
- Generate the background FIRST based on the product vibe.
- The background must be vertical (9:16) from the start.
- Create a cohesive, professional environment.
- Ensure natural integration with the person and products.
- Apply the lighting rules from PRO PHOTOGRAPHY STANDARDS (Golden Hour for outdoor, Window Light for indoor).`;
        }

        // PHASE 31: MASTER PROMPT - Construir prompt unificado com QUALIDADE REMIX para TODOS os modos
        // ORDEM CRÍTICA: 1. Anatomical Safety, 2. Identity Lock, 3. Product Fidelity, 4. Clothing Physics, 5. Pro Photography Standards (Lighting & Lens), 6. Format & Composition
        // O bloco PRO PHOTOGRAPHY STANDARDS tem PRIORIDADE sobre instruções genéricas de cenário
        const creativePrompt = `${roleBlock}${anatomicalSafetyBlock}${identityLockBlock}${productFidelityBlock}${clothingPhysicsBlock}${lightingIntegrationBlock}${formatCompositionBlock}${negativeConstraintsBlock}

${scenarioBackgroundInstruction}

${contextRule}${poseInstructions}

${framingRule}

${posturaRule}

PRODUCT CHECKLIST - ALL PRODUCTS MUST BE VISIBLE:
${productsData.map((product, i) => {
  const productName = product?.nome || `Product ${i + 1}`;
  const productCategory = product?.categoria || "unknown category";
  return `${i + 1}. [IMAGEM_PRODUTO_${i + 1}]: ${productName} (${productCategory})`;
}).join("\n")}

CRITICAL: ALL ${allProductImageUrls.length} product(s) listed above MUST be visible in the final image.${legExtensionInstruction}

👗 OUTFIT COMPLETION LOGIC (AUTO-STYLING - FASHION INTELLIGENCE):
${(() => {
  // Detectar o que foi fornecido
  const onlyTop = hasTop && !hasBottom && !hasShoes;
  const onlyBottom = hasBottom && !hasTop && !hasShoes;
  const onlyShoes = hasShoes && !hasTop && !hasBottom;
  const hasSwimwear = hasBeach;
  
  let completionInstructions = "";
  
  if (onlyTop) {
    completionInstructions = `
- IF only a TOP is provided: You MUST generate a matching BOTTOM and SHOES that fit the style.
  - E.g., Floral Shirt -> Chino shorts or Linen pants (Beach vibe) OR Jeans (City vibe).
  - NEVER leave the person in underwear or the original bottom if it clashes.
  - Choose complementary colors and styles that create a complete, coherent outfit.
  - The bottom and shoes should match the formality and style of the top.`;
  } else if (onlyBottom) {
    completionInstructions = `
- IF only a BOTTOM is provided: Generate a matching neutral T-shirt or Shirt.
  - Choose a top that complements the style and color of the bottom.
  - Create a complete, coherent outfit that looks intentional and stylish.
  - Avoid clashing colors or styles.`;
  } else if (onlyShoes) {
    completionInstructions = `
- IF only SHOES are provided: Generate appropriate matching TOP and BOTTOM.
  - Match the formality level: Sneakers -> Casual outfit, Dress shoes -> Formal outfit.
  - Create a complete, coherent outfit that showcases the shoes properly.`;
  }
  
  if (hasSwimwear) {
    completionInstructions += `
- IF SWIMWEAR (Bikini/Trunks) is provided:
  - If the input photo is NOT at a beach, DO NOT keep the original street clothes (jeans/jacket).
  - REPLACE the rest of the outfit with bare skin (appropriate for beach) or beach accessories (Sarong/Cover-up).
  - The goal is a complete, coherent beach outfit, not a mix-match of street clothes and swimwear.
  - Ensure the person looks naturally dressed for a beach/pool environment.`;
  }
  
  if (!completionInstructions) {
    completionInstructions = `
- If multiple products are provided, ensure they create a complete, coherent outfit.
- All pieces should complement each other in style, color, and formality level.
- The goal is a complete, intentional look, not a random mix of items.`;
  }
  
  return completionInstructions;
})()}

FINAL QUALITY CHECK (CRITICAL):
- The person must look IDENTICAL to Image 1 (face, body, skin tone)
- The person's COMPLETE HEAD and FACE must be fully visible (never cropped or cut)
- All products must be visible and properly fitted on the person
- Lighting and shadows must match the background scenario perfectly:
  * Natural light direction matching the scene
  * Realistic contact shadows on the ground
  * Proper light falloff on the person's body
  * Face must be well-lit and natural
- Output must be 9:16 vertical format
- No artifacts, ghosting, or "cut-and-paste" look
- Professional fashion photography quality
- The person must look like they are physically present in the scene, not pasted

${gerarNovoLook ? `
⚠️⚠️⚠️ FORCE REALISM PROTOCOL (ACTIVATED - gerarNovoLook: true):
- Regardless of input pose, adjust the subject's stance slightly to look natural in the environment.
- RELIGHT the subject completely to match the background atmosphere - recalculate all lighting from scratch.
- NO 'cutout' effect - the person must be fully integrated into the scene with proper lighting, shadows, and depth.
- Allow micro-adjustments in pose (slight arm position, natural weight distribution) so the clothing drapes better.
- BUT MAINTAIN: Exact face, exact body proportions, exact skin tone - only lighting and subtle pose adjustments are allowed.
- The goal is natural integration while preserving 100% identity and product fidelity.
` : ''}`;
        
        // MASTER PROMPT: PIVOT - NÃO incluir scenarioImageUrl no array de imagens
        // Array deve conter APENAS: [FOTO_PESSOA, ...FOTOS_PRODUTOS]
        // Isso força a IA a focar 100% em vestir a pessoa e gerar o fundo via prompt
        const imageUrls = [
          finalPersonImageUrl, // Primeira imagem: FOTO ORIGINAL (Source of Truth - nunca alterar)
          ...allProductImageUrls, // Seguintes: IMAGEM_PRODUTO_1, IMAGEM_PRODUTO_2, etc.
        ];
        
        // NÃO adicionar scenarioImageUrl - usar apenas descrições textuais no prompt
        // MASTER PROMPT: GARANTIR que cenário fixo NÃO está sendo usado
        if (scenarioImageUrl) {
          console.warn("[Orchestrator] ⚠️ MASTER PROMPT: scenarioImageUrl foi fornecido mas NÃO será usado no array de imagens. Cenário será GERADO via prompt.");
        }
        console.log("[Orchestrator] 🎯 MASTER PROMPT PIVOT: Array de imagens (SEM cenário visual):", {
          totalImagens: imageUrls.length,
          primeiraImagem: "FOTO ORIGINAL (Source of Truth)",
          produtos: allProductImageUrls.length,
          temCenarioTexto: !!(scenarioCategory || scenarioLightingPrompt || smartContext),
          scenarioCategory: scenarioCategory || "N/A",
          scenarioImageUrlFornecido: !!scenarioImageUrl,
          scenarioImageUrlUsado: false, // SEMPRE false - nunca usar cenário fixo
          nota: "Cenário será GERADO via prompt, não usado como imagem de input",
        });

        // Validar que temos pelo menos uma imagem de produto
        if (allProductImageUrls.length === 0) {
          throw new Error("❌ Nenhuma imagem de produto fornecida para Look Criativo");
        }

        // Validar que temos a imagem da pessoa (aceita HTTP URL ou data URL)
        if (!params.personImageUrl || (!params.personImageUrl.startsWith("http") && !params.personImageUrl.startsWith("data:image/"))) {
          throw new Error(`❌ Imagem da pessoa inválida ou não fornecida (deve ser HTTP URL ou data URL): ${params.personImageUrl?.substring(0, 100) || "N/A"}`);
        }

        console.log("[Orchestrator] 🚀 Chamando Gemini Flash Image com:", {
          totalImagens: imageUrls.length,
          estrutura: {
            imagem1: "IMAGEM_PESSOA (pessoa)",
            imagensSeguintes: allProductImageUrls.map((_, i) => `IMAGEM_PRODUTO_${i + 1} (${productsData[i]?.nome || `produto ${i + 1}`})`),
            background: "GERADO VIA PROMPT (não há imagem de input)",
          },
          promptLength: creativePrompt.length,
          produtosIncluidos: allProductImageUrls.length,
          produtosDetalhes: allProductImageUrls.map((url, i) => ({
            indice: i + 1,
            nome: productsData[i]?.nome || "N/A",
            categoria: productsData[i]?.categoria || "N/A",
            url: url.substring(0, 60) + "...",
          })),
          temCenarioTexto: !!(scenarioCategory || scenarioLightingPrompt),
          scenarioCategory: scenarioCategory || "N/A",
          scenarioLightingPrompt: scenarioLightingPrompt?.substring(0, 50) || "N/A",
          usandoPromptCenario: !!(smartContext && smartContext.length > 0),
          nota: "MASTER PROMPT PIVOT: Cenário será GERADO via prompt, não usado como input visual",
          validacao: {
            temPessoa: !!params.personImageUrl,
            totalProdutos: allProductImageUrls.length,
            temCenarioTexto: !!(scenarioCategory || scenarioLightingPrompt),
            todasImagensValidas: imageUrls.every(url => url && url.startsWith("http")),
            todosProdutosTemImagem: allProductImageUrls.length === productsData.length,
          },
        });

        // PHASE 30: Usar temperatura alta (0.75) para TODOS os modos - mesma qualidade do Remix
        // Isso garante que experimentar, refino e trocar produto tenham a mesma qualidade visual
        const temperature = 0.75; // SEMPRE 0.75 para todos os modos (mesma qualidade do Remix)
        
        console.log("[Orchestrator] 🎨 PHASE 30: Configuração de geração (QUALIDADE REMIX PARA TODOS):", {
          isRemix,
          temperature: 0.75, // SEMPRE 0.75 para todos os modos
          promptLength: creativePrompt.length,
          apiUsada: "Gemini 2.5 Flash Image (gemini-2.5-flash-image)",
          modelo: "gemini-2.5-flash-image",
          endpoint: "Vertex AI generateContent",
          note: "Temperatura 0.75 aplicada a TODOS os modos (experimentar, refino, trocar produto, remix)",
        });
        
        // VALIDAÇÃO: Confirmar que está usando a API correta do Gemini
        if (!this.geminiFlashImageService.isConfigured()) {
          console.error("[Orchestrator] ❌ ERRO CRÍTICO: Gemini Flash Image Service não está configurado!");
          console.error("[Orchestrator] Verifique GOOGLE_CLOUD_PROJECT_ID e GOOGLE_CLOUD_LOCATION");
          throw new Error("Gemini Flash Image Service não está configurado. Verifique as variáveis de ambiente.");
        }
        
        console.log("[Orchestrator] ✅ Gemini Flash Image Service configurado corretamente:", {
          isConfigured: this.geminiFlashImageService.isConfigured(),
          api: "Gemini 2.5 Flash Image",
          modelo: "gemini-2.5-flash-image",
          isRemix,
          temperature: 0.75, // PHASE 30: Sempre 0.75 para todos os modos
          note: "Qualidade Remix aplicada a todos os modos",
        });
        
        // PHASE 28: Forçar proporção 9:16 (Mobile First)
        // PHASE 30: Temperatura 0.75 para TODOS os modos (mesma qualidade do Remix)
        console.log("[Orchestrator] 🚀 Chamando Gemini 2.5 Flash Image API:", {
          isRemix,
          temperature: 0.75, // PHASE 30: Sempre 0.75 para todos os modos
          totalImagens: imageUrls.length,
          aspectRatio: "9:16",
          api: "Gemini 2.5 Flash Image",
          modelo: "gemini-2.5-flash-image",
          note: "Qualidade Remix (0.75) aplicada a todos os modos",
        });
        
        const geminiResult = await this.geminiFlashImageService.generateImage({
          prompt: creativePrompt,
          imageUrls: imageUrls,
          negativePrompt: strongNegativePrompt, // PHASE 11: Negative prompt para reduzir erros
          temperature: 0.75, // PHASE 30: SEMPRE 0.75 para todos os modos (mesma qualidade do Remix)
          aspectRatio: "9:16", // PHASE 28: Sempre vertical para mobile (instrução também está no prompt)
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

        // VALIDAÇÃO: Garantir que imageUrl foi retornado
        if (!geminiResult.data.imageUrl || geminiResult.data.imageUrl.trim() === "") {
          console.error("[Orchestrator] ❌ Gemini retornou sucesso mas sem imageUrl:", {
            success: geminiResult.success,
            hasData: !!geminiResult.data,
            dataKeys: geminiResult.data ? Object.keys(geminiResult.data) : [],
            error: geminiResult.error,
          });
          throw new Error("Gemini Flash Image retornou sucesso mas sem imageUrl. Verifique os logs para mais detalhes.");
        }

        tryonImageUrl = geminiResult.data.imageUrl;
        console.log("[Orchestrator] ✅ Imagem gerada pelo Gemini:", {
          imageUrl: tryonImageUrl.substring(0, 100) + "...",
          imageUrlLength: tryonImageUrl.length,
        });
        totalCost += geminiResult.cost || 0;

        if (status.steps?.stabilityCreative) {
          status.steps.stabilityCreative.status = "completed";
          status.steps.stabilityCreative.completedAt = new Date();
        }

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
      // LOOK NATURAL: DESABILITADO - REFINAMENTO VISUAL
      // SEMPRE usar Look Criativo (Gemini Flash Image) para garantir:
      // - Uso da foto original
      // - Preservação de identidade
      // - Cenários do Firestore
      // - Proporção 9:16
      // - Mesma qualidade em todos os caminhos
      // ========================================
      // NOTA: Este bloco nunca será executado pois lookType é sempre "creative"
      // Mantido apenas para compatibilidade de código
      else {
        // REFINAMENTO VISUAL: Look Natural foi desabilitado - sempre usar Look Criativo
        throw new Error(`❌ Look Natural foi desabilitado. Sempre use Look Criativo (Gemini Flash Image) para garantir qualidade consistente. lookType foi forçado para "creative" mas ainda chegou aqui - verificar lógica.`);
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
          
          // Garantir que steps existe (já inicializado, mas TypeScript precisa de garantia)
          if (!status.steps) {
            status.steps = {};
          }
          // TypeScript: após verificação, steps está garantido
          const steps = status.steps!;
          steps.tryon = {
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

          const tryonData = tryonResult.data;
          if (tryonData?.imageUrl) {
            // TypeScript: tryonData está garantido dentro do if
            tryonImageUrl = tryonData!.imageUrl;
          } else if (tryonData) {
            // Se tryonData existe mas não tem imageUrl, usar fallback
            console.warn("[Orchestrator] tryonData sem imageUrl");
          }
          totalCost += tryonResult.cost || 0;

          // Atualizar status usando a variável local steps
          if (steps?.tryon) {
            // TypeScript: dentro do if, steps.tryon está garantido
            const tryonStep = steps.tryon!;
            tryonStep.status = "completed";
            tryonStep.completedAt = new Date();
          }

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
          // Garantir que steps não é undefined após verificação
          const stepsForStability = status.steps!;
          stepsForStability.stability = {
            status: "processing",
            startedAt: new Date(),
            provider: "stability-ai",
          };

          const basePrompt = `A person wearing the exact product from the reference image. The product should be applied naturally and realistically, maintaining all physical characteristics of the person (face, body, posture) and all characteristics of the product (color, style, shape, details). Professional photography, high quality, natural lighting.`;

          const options = params.options;
          const productImageUrlForStability = (isProductUrl && options?.productUrl) 
            ? (options!.productUrl || "") 
            : (params.productImageUrl || "");
          
          console.log("[Orchestrator] Chamando StabilityAI generateComposition com:", {
            personImageUrl: params.personImageUrl.substring(0, 80) + "...",
            productImageUrl: productImageUrlForStability.substring(0, 80) + "...",
            prompt: basePrompt.substring(0, 100) + "...",
          });

          const stabilityResult = await this.stabilityService.generateComposition({
            personImageUrl: params.personImageUrl,
            productImageUrl: productImageUrlForStability || "",
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

          const stabilityData = stabilityResult.data;
          if (stabilityData?.imageUrl) {
            tryonImageUrl = stabilityData!.imageUrl;
          }
          totalCost += stabilityResult.cost || 0;

          // Atualizar status usando a variável local stepsForStability
          if (stepsForStability?.stability) {
            // TypeScript: dentro do if, stepsForStability.stability está garantido
            const stabilityStep = stepsForStability.stability!;
            stabilityStep.status = "completed";
            stabilityStep.completedAt = new Date();
          }

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
            time: stabilityResult.data?.processingTime,
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

      // VALIDAÇÃO CRÍTICA: Garantir que tryonImageUrl foi gerado
      if (!tryonImageUrl || tryonImageUrl.trim() === "") {
        const errorMsg = "Nenhum Look foi gerado - tryonImageUrl está vazio após processamento";
        console.error(`[Orchestrator] ❌ ${errorMsg}`);
        console.error("[Orchestrator] Estado do processamento:", {
          compositionId,
          hasTryonImageUrl: !!tryonImageUrl,
          tryonImageUrlLength: tryonImageUrl?.length || 0,
          sceneImageUrlsCount: sceneImageUrls.length,
          totalCost,
          processingTime,
          status: status.status,
        });
        throw new Error(errorMsg);
      }

      status.status = "completed";
      status.completedAt = new Date();
      status.totalCost = totalCost;

      console.log("[Orchestrator] ✅ Composição concluída com sucesso", {
        compositionId,
        tryonImageUrl: tryonImageUrl.substring(0, 100) + "...",
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








