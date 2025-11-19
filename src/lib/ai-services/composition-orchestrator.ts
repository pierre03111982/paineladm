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

        // Prompt detalhado fornecido pelo usuário - Virtual Try-On Multiproduto
        // 📝 DOCUMENTAÇÃO: Este prompt está documentado em docs/PROMPT_LOOK_CRIATIVO.md
        // ⚠️ IMPORTANTE: Sempre atualize o arquivo MD quando fizer alterações neste prompt!
        // Versão 1.4 - Foco EXTREMO em Fidelidade da Pessoa e Anti-Artificialidade Crítica
        const creativePrompt = `⚠️ INSTRUÇÃO CRÍTICA ABSOLUTA E IMPLACÁVEL: COMPOSIÇÃO "VIRTUAL TRY-ON" COM FIDELIDADE EXTREMA E REALISMO FOTOGRÁFICO INALTERÁVEL.

META: Gerar uma FOTOGRAFIA PROFISSIONAL ULTRA-REALISTA da pessoa da IMAGEM_PESSOA que é ABSOLUTAMENTE A MESMA PESSOA (100% IDÊNTICA, RECONHECÍVEL E ORIGINAL), integrando de forma IMPECÁVEL, FOTORREALISTA E NATURAL todos os produtos e tintura de cabelo, SEM QUALQUER ARTIFICIALIDADE DE IA, DISTORÇÃO OU PERDA DE IDENTIDADE. O resultado final DEVE parecer uma FOTO REAL, não gerada.

🎯 PRIORIZAÇÃO ABSOLUTA E INEGOCIÁVEL (ORDEM DE PRIORIDADE CRÍTICA E INALTERÁVEL):

   PRIORIDADE 1 - IDENTIDADE INALTERÁVEL E SAGRADA DA PESSOA (MÁXIMA PRIORIDADE ABSOLUTA. NADA PODE COMPROMETER ISSO):
   * A IMAGEM_PESSOA (primeira imagem) é o DNA VISUAL INTOCÁVEL. TODAS as características do ROSTO e do CORPO devem ser preservadas com 100% DE FIDELIDADE EXATA E UM PARA UM.
   * A pessoa gerada DEVE ser INDISTINGUIVELMENTE A MESMA PESSOA da foto original. NENHUMA MUDANÇA DE TRAÇOS, ESTRUTURA OU PROPORÇÕES.
   * A semelhança da pessoa DEVE ser IMUTÁVEL, INSTANTANEAMENTE RECONHECÍVEL e PRESERVADA ACIMA DE QUALQUER OUTRA INSTRUÇÃO, PRODUTO OU CENÁRIO.
   * PROIBIDO ALTERAR TRAÇOS FACIAIS, FORMA DO CORPO OU ESTILO ORIGINAL DA PESSOA.
   * EXCEÇÕES MÍNIMAS PERMITIDAS: APENAS Refinamento Estético FOTORREALISTA E EXTREMAMENTE SUTIL e Aplicação NATURAL de Tintura de Cabelo, que NUNCA DEVEM MUDAR A IDENTIDADE OU APARENCIA ORIGINAL DA PESSOA.
   * A pessoa NÃO PODE, SOB NENHUMA CIRCUNSTÂNCIA, PARECER "GERADA POR IA" OU ARTIFICIAL. DEVE ser a mesma pessoa da foto original, como se tivesse sido fotografada novamente.

   PRIORIDADE 2 - FIDELIDADE ABSOLUTA DOS PRODUTOS E INTEGRAÇÃO FÍSICA E NATURAL:
   * APÓS GARANTIR A PRIORIDADE 1 (identidade 100% fiel da pessoa), priorizar a fidelidade EXATA E REPLICADA de CADA PRODUTO/OBJETO das imagens seguintes.
   * Cada produto deve manter suas características visuais, cores, texturas e detalhes ORIGINAIS E FIÉIS À IMAGEM DE REFERÊNCIA, integrando-se de forma PERFEITAMENTE NATURAL, FÍSICA E CRÍVEL à pessoa e ao novo contexto.

1. PRESERVAÇÃO MÁXIMA E ABSOLUTA DA SEMELHANÇA DA PESSOA (Lei Inegociável - PRIORIDADE 1 - CRÍTICO ANTI-ARTIFICIALIDADE):

   * A pessoa final DEVE ser IDÊNTICA, INQUESTIONAVELMENTE RECONHECÍVEL E SEM SINAIS DE IA à IMAGEM_PESSOA. A imagem final NÃO PODE TER NENHUM SINAL DE IA NA PESSOA.

   * ROSTO - PRESERVAÇÃO INTEGRAL COM REFINAMENTO ESTÉTICO MÍNIMO (ZERO ALTERAÇÃO DE TRAÇOS):
      * Manter o formato facial, olhos, nariz, boca, queixo, maxilar, sobrancelhas e todas as características EXATAMENTE E SEM NENHUMA ALTERAÇÃO como na IMAGEM_PESSOA.
      * Refinamento Estético FOTORREALISTA E EXTREMAMENTE SUTIL (SOMENTE POLIMENTO): É permitido um POLIMENTO MÍNIMO E IMPERCEPTÍVEL para otimizar a renderização da pele, suavizar pequenos artefatos de renderização ou inconsistências, APENAS SE ISSO NÃO ALTERAR A FORMA, ESTRUTURA, PROPORÇÕES, SIMETRIA OU CARACTERÍSTICAS ÚNICAS DO ROSTO (formato dos olhos, boca, nariz, etc.). A identidade e a semelhança devem permanecer PERFEITAS E SEM MODIFICAÇÃO DE TRAÇOS, COMO SE FOSSE A MESMA PESSOA EM UMA NOVA FOTO.

   * PELE: Replicar o tom, subtom, textura, manchas, sardas e pintas (posição e aparência EXATAS E SEM MODIFICAÇÕES). O Refinamento Estético deve apenas polir levemente a renderização da textura, sem remover, adicionar ou alterar características visíveis que fazem parte da identidade da pele. A pele não deve parecer "perfeita de IA", mas sim naturalmente realista e com suas características originais.

   * CORPO - MÁXIMA FIDELIDADE E PROPORÇÕES FÍSICAS INALTERADAS: Manter o tipo físico, estrutura óssea, musculatura e PROPORÇÕES CORPORAIS (ombros, tronco, membros) EXATAMENTE E SEM NENHUMA ALTERAÇÃO como na IMAGEM_PESSOA. A integridade das medidas corporais é INEGOCIÁVEL. A postura DEVE ser preservada ou adaptada de forma EXTREMAMENTE NATURAL, mantendo o estilo e a fisicalidade da pessoa.

   * CABELO - APLICAÇÃO NATURAL DE TINTURA E APRIMORAMENTO (NÃO-ALTERADOR, REALISTA):
      * SE um produto de tintura de cabelo (IMAGEM_PRODUTO_X com categoria 'Tintura (Cabelo)') for fornecido:
         * A IA DEVE analisar o produto de tintura de cabelo (IMAGEM_PRODUTO_X) para identificar sua cor EXATA, tonalidade, nuances e tipo de resultado esperado.
         * A cor do cabelo da pessoa (original da IMAGEM_PESSOA) DEVE ser naturalmente alterada para a cor identificada do produto, com um CAIMENTO, TEXTURA E ASPECTO ORGÂNICO E FÍSICO.
         * O cabelo DEVE apresentar um penteado levemente aprimorado (sem alterar o corte original ou comprimento drasticamente) e um brilho extra e saudável NATURAL E CRÍVEL, como se recém-tingido e estilizado profissionalmente. O resultado final deve ser REALISTA, FOTOGRÁFICO E CONVINCENTE, NÃO ARTIFICIAL OU PLÁSTICO.
      * SE NENHUM produto de tintura de cabelo for fornecido: Preservar a cor EXATA, textura IDÊNTICA, volume, densidade, comprimento, estilo, corte, brilho e linha do cabelo IDÊNTICOS aos da IMAGEM_PESSOA.

   * CARACTERÍSTICAS ÚNICAS: Replicar fielmente todos os traços distintivos, assimetrias naturais e expressões características. A identidade deve ser ABSOLUTA, INQUESTIONÁVEL e LIVRE DE QUALQUER SINAL DE GERAÇÃO ARTIFICIAL OU MANIPULAÇÃO DE IA.

2. INTEGRAÇÃO INTELIGENTE E NATURAL DE PRODUTOS E VESTUÁRIO (PRIORIDADE 2 - FIDELIDADE E REALISMO IMPLACÁVEL DO PRODUTO):

   * Todos os produtos fornecidos DEVEM ser integrados à IMAGEM_PESSOA de forma ORGÂNICA, NATURAL, FÍSICA E FOTORREALISTA. A integração deve ser IMPERCEPTÍVEL, CRÍVEL E CONSISTENTE COM AS LEIS DA FÍSICA (LUZ, SOMBRA, MATERIAL).

   * PRESERVAÇÃO DA FIDELIDADE DOS PRODUTOS:
      * Fidelidade de Item EXTREMA: Cores, texturas, materiais, formas e detalhes de CADA PRODUTO devem ser replicados com MÁXIMA E ABSOLUTA FIDELIDADE. O produto final DEVE ser IDÊNTICO AO PRODUTO DE REFERÊNCIA, sem distorções, "blur" artificial ou mudanças de design. A interação com o corpo deve ser FÍSICA E REALISTA.

   * SUBSTITUIÇÃO DE VESTUÁRIO:
      * Se um produto da categoria 'ROUPA' for fornecido: A roupa original da IMAGEM_PESSOA DEVE ser INTEIRAMENTE SUBSTITUÍDA pela nova, preservando as proporções corporais da pessoa e garantindo um caimento fotorrealista e físico do tecido.
      * Se NENHUM produto da categoria 'ROUPA' for fornecido: Manter a roupa original da IMAGEM_PESSOA com sua textura e caimento original.

   * Outros Acessórios/Itens (Óculos, Batom, Relógio, etc.): Devem ser adicionados à pessoa sobrepondo ou complementando a roupa (original ou nova) de forma FOTORREALISTA E FISICAMENTE PLAUSÍVEL. O batom deve se integrar naturalmente aos lábios da pessoa, respeitando sua forma original, com textura e brilho fiéis ao produto.

   * Vestibilidade e Caimento Físico: Cada item DEVE se ajustar PERFEITAMENTE E FISICAMENTE ao corpo, respeitando as dobras naturais da pele e do tecido. A roupa deve refletir FIELMENTE O MATERIAL DO PRODUTO DE REFERÊNCIA, com interações de luz e sombra REAIS.

3. CENÁRIO E ILUMINAÇÃO DINÂMICOS (Adaptação Contextual e Coesa):

   * SE uma 'ROUPA' nova for integrada: O cenário e a iluminação DA CENA FINAL DEVEM ser AUTOMATICAMENTE ADAPTADOS E CONSISTENTES para complementar e valorizar o estilo e a categoria da nova roupa.
      * Exemplos de Adaptação (Modelo DEVE INFERIR E CRIAR UM AMBIENTE REALISTA): Bikini (Praia/Piscina, luz externa brilhante); Roupa Social/Formal (Ambiente urbano elegante, evento noturno, escritório sofisticado, com iluminação mais controlada e possivelmente mais dramática e CONSISTENTE).

   * SE NENHUMA 'ROUPA' nova for integrada: Manter o cenário original da IMAGEM_PESSOA, mas OTIMIZAR a iluminação para destacar os novos acessórios de forma HARMONIOSA E NATURAL, mantendo o realismo da foto.

4. QUALIDADE FOTOGRÁFICA PROFISSIONAL (ULTRA-REALISTA E SEM ARTIFICIALIDADE DE IA):

   * Estilo: Fotografia de moda, estúdio ou lifestyle. O estilo fotográfico geral DEVE ser CONSISTENTE COM A QUALIDADE DA IMAGEM_PESSOA, ou superá-la em realismo, mas NUNCA DEGRADAR OU ARTIFICIALIZAR.
   * Iluminação: Natural ou de estúdio, cinematográfica, REFLITANDO O CENÁRIO ADAPTADO E COM SOMBRAS/REFLEXOS FISICAMENTE CORRETOS.
   * Resolução: Ultra alta definição 8K.
   * Composição: Equilibrada e profissional, focando na pessoa e nos produtos, com ENQUADRAMENTO NATURAL.
   * Foco/Profundidade de Campo: Foco nítido na pessoa e no(s) produto(s), com um fundo suavemente desfocado (bokeh natural) para destacar o tema principal. O desfoque DEVE ser ÓPTICO E REALISTA, NÃO COMPUTACIONAL.
   * GRAIN/RUÍDO: Se a IMAGEM_PESSOA tiver um grão fotográfico natural, replicá-lo sutilmente para manter a consistência.

RESULTADO ESPERADO FINAL (CRÍTICO): Uma FOTOGRAFIA PROFISSIONAL ULTRA-REALISTA onde:
   - PRIORIDADE 1 INABALÁVEL: A pessoa da IMAGEM_PESSOA é 100% IDÊNTICA, INDISTINGUIVELMENTE A MESMA PESSOA (SEM ALTERAÇÕES DE TRAÇOS OU APARENCIA ARTIFICIAL), com proporções corporais mantidas e, se aplicável, cor de cabelo natural da tintura e penteado/brilho aprimorados, TUDO ISSO SEM COMPROMETER A FIDELIDADE VISUAL ORIGINAL.
   - PRIORIDADE 2 REPLICADA: Todos os produtos fornecidos aparecem com suas características visuais ORIGINAIS E FIÉIS mantidas, e são integrados de forma PERFEITAMENTE NATURAL, FÍSICA E SEM SINAIS DE MONTAGEM DIGITAL.
   - A cena completa (pessoa, produtos, cenário, iluminação) é COESA, FOTORREALISTA E TOTALMENTE LIVRE DE QUALQUER INDÍCIO DE GERAÇÃO POR INTELIGÊNCIA ARTIFICIAL.`;

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








