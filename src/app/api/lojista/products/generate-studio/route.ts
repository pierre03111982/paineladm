import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { generateCatalogImage } from "@/lib/ai/imagen-generate";
import { getFormattedMannequinPrompt, resolveGenderFromCategory } from "@/lib/ai-services/mannequin-prompts";
import { deductCredits } from "@/lib/financials/deduct-credits";
import { FieldValue } from "firebase-admin/firestore";
import { selectScenarioForProduct, extractProductCharacteristics } from "@/lib/ai/scenario-selector";

export const dynamic = 'force-dynamic';

/** Padrão de iluminação e sombras para todas as gerações (frente, costas, looks). Ver iluminaçao.md */
const LIGHTING_BLOCK = `
--- LIGHTING & ATMOSPHERE (Global Standard) ---
1. SETUP: "Professional Softbox Studio Lighting".
   - Main Light (Key): Large softbox from the top-left (45-degree angle). Soft, diffused light.
   - Fill Light: Subtle reflector on the right to lift shadows (no pitch-black areas).
   - Back Light: Very faint rim light to separate the garment from the white background.

2. QUALITY SPECS:
   - Color Temperature: 5500K (Neutral Daylight White). NO yellow or blue tint.
   - Contrast: Balanced High Dynamic Range (HDR) to highlight fabric texture.

3. SHADOWS (mandatory — ground the figure and show depth):
   - One soft, diffuse shadow on the ground directly beneath the mannequin (under the feet/legs area) so the figure looks grounded, not floating. The shadow must be visible but soft (no hard edges).
   - Subtle soft shadows under the garment where it meets the body (e.g. at waist, under straps, under hem) to show depth and that the garment is worn on the body. Use soft, ray-traced ambient occlusion — NO harsh or hard-edged shadows.
   - Shadows must be natural for studio lighting: soft, gradual, and coherent with the main light direction (top-left).

4. LOOK & FEEL:
   - Clean, expensive, and commercial.
   - The fabric must look touchable (micro-contrast on texture).
`;

/** Extensões aceitas para imagens de manequim (ordem de tentativa). */
const MANNEQUIN_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"] as const;

/** Retorna a URL base do app (para assets estáticos). Prioriza a origin do request (Vercel/custom domain). */
function getAppBaseUrl(request: NextRequest): string | null {
  try {
    const url = request.url;
    if (url) {
      const origin = new URL(url).origin;
      if (origin && origin.startsWith("http")) return origin;
    }
  } catch (_) {}
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
  if (fromEnv) {
    const base = fromEnv.startsWith("http") ? fromEnv : `https://${fromEnv}`;
    return base.replace(/\/$/, "");
  }
  try {
    const host = request.headers.get("host") || request.headers.get("x-forwarded-host");
    const proto = request.headers.get("x-forwarded-proto") || "https";
    if (host) return `${proto}://${host}`.replace(/\/$/, "");
  } catch (_) {}
  return null;
}

/**
 * Resolve a URL da imagem de manequim tentando todas as extensões suportadas.
 * Retorna a primeira URL que responder 200 (arquivo existe). Assim aceitamos .png, .jpg, .jpeg, .webp automaticamente.
 */
async function resolveMannequinReferenceUrl(
  baseUrl: string | null,
  audience: string,
  side: "frente" | "costas"
): Promise<string | null> {
  if (!baseUrl) return null;
  const a = String(audience).toLowerCase().trim();
  if (a !== "infantil" && a !== "kids" && !a.includes("infantil") && !a.includes("kids")) return null;
  const pathBase = `/assets/mannequins/infantil/manequim-infantil-${side}`;
  for (const ext of MANNEQUIN_IMAGE_EXTENSIONS) {
    const candidateUrl = `${baseUrl}${pathBase}${ext}`;
    try {
      const res = await fetch(candidateUrl, { method: "GET", cache: "no-store" });
      if (res.ok) {
        console.log("[api/lojista/products/generate-studio] Manequim de referência encontrado:", candidateUrl);
        return candidateUrl;
      }
    } catch (_) {
      // próxima extensão
    }
  }
  console.warn("[api/lojista/products/generate-studio] Nenhum arquivo de manequim encontrado em", baseUrl + pathBase + "{.png|.jpg|.jpeg|.webp}");
  return null;
}

/**
 * API de Geração Inteligente para Estúdio de Criação IA
 * FASE 32: Estúdio de Criação Digital
 * 
 * Tipos de geração:
 * - "catalog": Imagem de catálogo simples (1 crédito/pack)
 * - "combined": Look combinado com peça complementar (2 créditos/pack)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const searchParams = request.nextUrl.searchParams;
    
    // Ler lojistaId do body ou da query string (compatibilidade com typos)
    const lojistaIdFromQuery = searchParams.get("lojistaId") || searchParams.get("lojistald");
    
    const {
      produtoId,
      imagemUrl,
      mannequinId,
      tipo, // "catalog" | "combined"
      variante, // "frente" | "costas" — para catálogo: frente = Foto Frente (rawImageUrl), costas = Foto Costas (Foto Verso upload)
      fotoFrenteUrl, // opcional: URL da Foto Frente gerada — usada como referência de ÂNGULO/composição ao gerar Foto Costas
      fotoCostasUrl, // opcional: URL da Foto Costas (upload ou gerada) — usada como referência de COR e TECIDO ao gerar Foto Frente (evita diferença de tom e alucinação)
      lojistaId: lojistaIdFromBody,
      nome,
      categoria,
      preco,
      precoPromocional, // Preço promocional (pode vir do wizard)
      tags, // Tags do produto (pode vir do wizard)
      productIds, // IDs de produtos para combinação manual
      targetAudience: targetAudienceFromBody, // "infantil" | "bebe" | "adulto" — para biometria do manequim invisível
      size: sizeFromBody, // ex.: "4", "6", "8", "10" (infantil) — para biometria
      gender: genderFromBody, // "feminino" | "masculino" — para biometria
      // Análise Inteligente (opcional): ancorar a geração para reduzir oscilação e melhorar fidelidade
      productType: productTypeFromBody,
      detectedFabric: detectedFabricFromBody,
      tecido_estimado: tecidoEstimadoFromBody,
      analysisSummary: analysisSummaryFromBody,
    } = body;
    
    // Priorizar body, depois query string
    const lojistaId = lojistaIdFromBody || lojistaIdFromQuery;

    // Validações
    if (!imagemUrl) {
      return NextResponse.json(
        { error: "imagemUrl é obrigatória" },
        { status: 400 }
      );
    }

    if (!mannequinId) {
      return NextResponse.json(
        { error: "mannequinId é obrigatório" },
        { status: 400 }
      );
    }

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório" },
        { status: 400 }
      );
    }

    if (!tipo || !["catalog", "combined"].includes(tipo)) {
      return NextResponse.json(
        { error: "tipo deve ser 'catalog' ou 'combined'" },
        { status: 400 }
      );
    }

    console.log("[api/lojista/products/generate-studio] Iniciando geração:", {
      produtoId: produtoId || "novo produto",
      mannequinId,
      tipo,
      lojistaId,
      categoria,
    });

    // Buscar dados do produto (se existir)
    let produtoData: any = null;
    if (produtoId) {
      const db = getAdminDb();
      const produtoDoc = await db
        .collection("lojas")
        .doc(lojistaId)
        .collection("produtos")
        .doc(produtoId)
        .get();

      if (produtoDoc.exists) {
        produtoData = produtoDoc.data();
      }
    }

    // Preparar dados do produto
    // Prioridade: 1) Body (wizard), 2) produtoData (banco), 3) Default
    const produtoNome = nome || produtoData?.nome || "Produto";
    
    // Garantir que o preço seja um número válido (evitar 0 ou NaN)
    let precoFinal = 0;
    if (preco !== undefined && preco !== null) {
      precoFinal = parseFloat(String(preco));
    } else if (produtoData?.preco !== undefined && produtoData?.preco !== null) {
      precoFinal = parseFloat(String(produtoData.preco));
    }
    // Se ainda for 0 ou NaN, usar valor padrão razoável
    if (!precoFinal || isNaN(precoFinal) || precoFinal <= 0) {
      precoFinal = 199.90; // Valor padrão para novos produtos
    }
    const produtoPreco = precoFinal;
    
    // Preço promocional
    let produtoPrecoPromocional: number | null = null;
    if (precoPromocional !== undefined && precoPromocional !== null && precoPromocional > 0) {
      produtoPrecoPromocional = parseFloat(String(precoPromocional));
    } else if (produtoData?.precoPromocional !== undefined && produtoData?.precoPromocional !== null && produtoData.precoPromocional > 0) {
      produtoPrecoPromocional = parseFloat(String(produtoData.precoPromocional));
    }
    // Validar que o promocional é menor que o original
    if (produtoPrecoPromocional && produtoPrecoPromocional >= produtoPreco) {
      produtoPrecoPromocional = null;
    }
    
    const produtoCategoria = categoria || produtoData?.categoria || "Roupas";
    
    // Normalizar tamanhos - pode vir como array, string ou undefined
    let produtoTamanhos: string[] = [];
    if (Array.isArray(produtoData?.tamanhos) && produtoData.tamanhos.length > 0) {
      produtoTamanhos = produtoData.tamanhos;
    } else if (typeof produtoData?.tamanhos === "string" && produtoData.tamanhos.trim()) {
      produtoTamanhos = produtoData.tamanhos.split(",").map((t: string) => t.trim()).filter(Boolean);
    }
    // Se não houver tamanhos, deixar vazio (vai mostrar "Consulte disponibilidade")
    
    console.log("[api/lojista/products/generate-studio] Dados do produto para etiqueta:", {
      produtoNome,
      produtoPreco,
      produtoPrecoPromocional,
      produtoTamanhos,
      precoFromBody: preco,
      precoFromData: produtoData?.preco,
      tamanhosFromData: produtoData?.tamanhos,
    });
    
    // Extrair características do produto para análise de cenário
    // Incluir tags passadas no body (do wizard) e dados do produto no banco
    const produtoCaracteristicas = extractProductCharacteristics({
      ...produtoData,
      categoria: produtoCategoria,
      nome: produtoNome,
      // Tags podem vir do body (wizard) ou do produto salvo
      tags: tags || produtoData?.tags || [],
    });
    
    // Selecionar cenário apropriado baseado nas características
    let cenarioSelecionado = selectScenarioForProduct(produtoCaracteristicas);
    
    // Para Foto Frente (catálogo): fundo branco e estilo ghost mannequin, como referência de catálogo e-commerce
    if (tipo === "catalog") {
      cenarioSelecionado =
        "Fundo branco sólido e uniforme de estúdio de moda. Sem elementos adicionais, sem texturas, sem cenários. Iluminação profissional e uniforme. Estilo foto de catálogo e-commerce, apresentação limpa do produto.";
    }

    console.log("[api/lojista/products/generate-studio] Análise de cenário:", {
      categoria: produtoCategoria,
      tags: produtoCaracteristicas.tags,
      cenarioSelecionado: cenarioSelecionado.substring(0, 100) + "...",
    });

    // Obter prompt do manequim formatado
    const mannequinPrompt = getFormattedMannequinPrompt(mannequinId, produtoCategoria);
    if (!mannequinPrompt) {
      return NextResponse.json(
        { error: "Estilo de manequim não encontrado" },
        { status: 400 }
      );
    }

    // Calcular custo (priorizar pacote de catálogo)
    const db = getAdminDb();
    const lojaDoc = await db.collection("lojas").doc(lojistaId).get();
    const lojaData = lojaDoc.data() || {};
    const catalogPack = lojaData.catalogPack || 0;
    const credits = lojaData.credits || 0;
    const lojaNome = lojaData.nome || lojaData.name || lojaData.nomeLoja || "";

    // Verificar se é a loja Pierre Moda (teste ilimitado com contabilização)
    // Verificar múltiplas variações do nome
    const lojaNomeLower = lojaNome.toLowerCase().trim();
    const isPierreModa = 
      (lojaNomeLower.includes("pierre") && (lojaNomeLower.includes("moda") || lojaNomeLower.includes("fashion"))) ||
      lojaNomeLower === "pierre moda" ||
      lojaNomeLower === "pierre fashion" ||
      lojistaId === "hOQL4BaVY92787EjKVMt"; // ID específico da loja Pierre Moda para garantir
    
    const subscription = lojaData.subscription || {};
    const isTestUnlimited = subscription.clientType === "test_unlimited" || isPierreModa;
    
    console.log("[api/lojista/products/generate-studio] Verificação de créditos:", {
      lojistaId,
      lojaNome,
      lojaNomeLower,
      isPierreModa,
      clientType: subscription.clientType,
      isTestUnlimited,
      catalogPack,
      credits,
    });

    const cost = tipo === "combined" ? 2 : 1;
    const usePack = catalogPack > 0 && !isTestUnlimited; // Não usar pack se for teste ilimitado

    // Verificar créditos disponíveis (pular verificação se for teste ilimitado)
    if (!isTestUnlimited) {
      if (usePack && catalogPack < cost) {
        if (credits < cost) {
          return NextResponse.json(
            { error: `Saldo insuficiente. Necessário: ${cost} ${usePack ? "Pack" : "Créditos"}` },
            { status: 402 }
          );
        }
      } else if (!usePack && credits < cost) {
        return NextResponse.json(
          { error: `Saldo insuficiente. Necessário: ${cost} Créditos` },
          { status: 402 }
        );
      }
    }

    // Debitar créditos (priorizar pacote, mas contabilizar uso mesmo em teste ilimitado)
    if (isTestUnlimited) {
      // Modo teste ilimitado: não debitar saldo, mas contabilizar uso
      const usageMetrics = lojaData.usageMetrics || {
        totalGenerated: 0,
        creditsUsed: 0,
        creditsRemaining: 0,
      };

      await db.collection("lojas").doc(lojistaId).update({
        "usageMetrics.totalGenerated": FieldValue.increment(cost),
        "usageMetrics.creditsUsed": FieldValue.increment(cost),
        updatedAt: FieldValue.serverTimestamp(),
      });

      console.log(`[api/lojista/products/generate-studio] ✅ Modo Teste Ilimitado (Pierre Moda) - ${cost} crédito(s) contabilizado(s) sem debitar saldo`);
    } else if (usePack && catalogPack >= cost) {
      await db.collection("lojas").doc(lojistaId).update({
        catalogPack: catalogPack - cost,
        updatedAt: new Date(),
      });
      console.log(`[api/lojista/products/generate-studio] ✅ ${cost} Pack debitado. Restante: ${catalogPack - cost}`);
    } else {
      const deductResult = await deductCredits({
        lojistaId,
        amount: cost,
      });

      if (!deductResult.success) {
        return NextResponse.json(
          { error: deductResult.message || "Erro ao debitar créditos" },
          { status: 402 }
        );
      }

      console.log(`[api/lojista/products/generate-studio] ✅ ${cost} Créditos debitados.`);
    }

    // Construir prompt baseado no tipo
    let finalPrompt: string;
    /** URLs das imagens dos produtos complementares (Look Combinado). Enviadas à IA para fidelidade EXATA. */
    let complementaryProductImageUrls: string[] = [];

    if (tipo === "combined") {
      // Look Combinado: Usar produtos selecionados pela IA ou buscar automaticamente
      let complementaryProducts: Array<{ id: string; nome: string; categoria: string; imagemUrl: string }> = [];
      
      if (productIds && Array.isArray(productIds) && productIds.length > 0) {
        // Usar produtos selecionados pela IA
        console.log("[api/lojista/products/generate-studio] Usando produtos selecionados pela IA:", productIds);
        
        // Buscar dados completos dos produtos no Firestore
        for (const productId of productIds) {
          const productDoc = await db
            .collection("lojas")
            .doc(lojistaId)
            .collection("produtos")
            .doc(productId)
            .get();
          
          if (productDoc.exists) {
            const productData = productDoc.data();
            const analiseIA = productData?.analiseIA || {};
            const nome = productData?.nome || "Produto Complementar";
            const categoria = (productData?.categoria || "Roupas").toLowerCase();
            
            complementaryProducts.push({
              id: productDoc.id,
              nome,
              categoria: productData?.categoria || "Roupas",
              imagemUrl: productData?.imagemPrincipal || productData?.imagemUrl || productData?.imagemUrlOriginal || "",
              tipo: analiseIA.product_type || productData?.tipo || "",
              cores: analiseIA.dominant_colors || [],
              tecido: analiseIA.detected_fabric || productData?.tecido || "",
              descricao: productData?.descricao_seo || productData?.obs || (typeof productData?.descricao === "string" ? productData.descricao : ""),
              isCalçado: /calçado|calcado|sapato|tênis|tenis|sneaker|shoe|footwear|bota|boot/i.test(categoria) || /calçado|calcado|sapato|tênis|tenis|sneaker|shoe|footwear|bota|boot/i.test(String(nome)),
            } as any);
          }
        }
      } else {
        // Fallback: Buscar produto complementar automaticamente (lógica antiga)
        const complementaryProduct = await findComplementaryProduct(
          lojistaId,
          produtoCategoria,
          produtoId
        );
        
        if (complementaryProduct) {
          complementaryProducts.push(complementaryProduct);
        }
      }

      if (complementaryProducts.length > 0) {
        complementaryProductImageUrls = complementaryProducts
          .map((p: any) => p.imagemUrl)
          .filter((u: string) => u && String(u).trim());
        const hasCalçado = complementaryProducts.some((p: any) => p.isCalçado);
        const complementaryDescriptions = complementaryProducts.map((p: any, idx: number) => {
          const cores = Array.isArray(p.cores) 
            ? p.cores.map((c: any) => c.name || c).join(", ") 
            : "cores naturais";
          const detalhe = (p.descricao && String(p.descricao).trim()) ? ` Detalhes/aparência: ${String(p.descricao).slice(0, 120)}.` : "";
          return `
   ${idx + 2}. ${p.nome} (${p.categoria})${p.isCalçado ? " [CALÇADO — deve aparecer com aparência EXATA]" : ""}
      - Tipo: ${p.tipo || "não especificado"}
      - Cores: ${cores}
      - Tecido/material: ${p.tecido || "não especificado"}${detalhe}
      - OBRIGATÓRIO: Este produto deve aparecer na imagem com APARÊNCIA EXATA (mesmo design, cores, detalhes distintivos como logotipos, formato, textura).`;
        }).join("\n");
        
        const regraCalçadoEPernas = hasCalçado ? `
**REGRA ESPECIAL — CALÇADO E PERNAS (proporção corporal natural):**
Se a Imagem 1 (base) NÃO mostrar pernas ou pés: complete o corpo com ANATOMIA HUMANA NATURAL — pernas com comprimento proporcional ao torso (cerca de metade da altura total do corpo), joelhos e tornozelos em posição correta, pés em escala real em relação ao corpo. NÃO desenhe pernas curtas, distorcidas, grossas demais ou desproporcionais; a figura deve parecer uma pessoa real da cabeça aos pés. Adicione uma calça que combine e coloque o calçado da(s) imagem(ns) de produto nos pés com APARÊNCIA EXATA (cor, modelo, logotipo, detalhes). Não invente outro calçado.` : "";

        const refImagens = complementaryProductImageUrls.length > 0
          ? `
**REFERÊNCIA DAS IMAGENS ENVIADAS (PRIORIDADE MÁXIMA — FIDELIDADE):**
- **Imagem 1:** Base (Foto Modelo Frente). Modelo já vestindo o produto principal. Mantenha modelo, pose e esta peça.
${complementaryProductImageUrls.map((_, i) => `- **Imagem ${i + 2}:** Produto complementar ${i + 1}. Você DEVE colocar este produto no look com APARÊNCIA EXATA — mesma cor, design, logotipos, detalhes. Copie da imagem, não invente algo parecido.`).join("\n")}
A semelhança dos produtos com as Imagens 2${complementaryProductImageUrls.length > 1 ? (complementaryProductImageUrls.length === 2 ? " e 3" : " a " + (complementaryProductImageUrls.length + 1)) : ""} é a prioridade número 1.`
          : "";

        finalPrompt = `**INSTRUÇÃO MESTRE - LOOK COMBINADO — PRODUTO É A PRIORIDADE**

Você recebeu a Foto Modelo Frente (base) e as imagens dos produtos complementares. Sua tarefa: montar um look realista em um cenário que combine, PRIORIZANDO A SEMELHANÇA EXATA DOS PRODUTOS às imagens fornecidas.
**PROPORÇÃO CORPORAL:** Se a base NÃO mostrar pernas ou pés, complete a figura com ANATOMIA HUMANA NATURAL — pernas com comprimento proporcional ao torso (cerca de metade da altura total do corpo), joelhos e tornozelos em posição correta, pés em escala real. A figura deve parecer uma pessoa real da cabeça aos pés; NÃO pernas curtas, distorcidas ou desproporcionais.
${refImagens}

**PRODUTO JÁ NA BASE (não alterar):** ${produtoNome} (${produtoCategoria}).

**PRODUTOS A ADICIONAR (usar aparência EXATA das imagens enviadas):**
${complementaryDescriptions}
${regraCalçadoEPernas}

**REGRAS OBRIGATÓRIAS:**
1. **Fidelidade às imagens dos produtos:** Cada produto cuja imagem foi enviada deve aparecer no resultado com a MESMA aparência (cores, formato, logotipos, detalhes). Ex.: se a Imagem 2 é um tênis branco e azul com um logo X, o modelo deve usar exatamente esse tênis, não um similar.
2. **Completar pernas/calçado com proporção natural:** Se a base não mostra pernas/pés: gere pernas com ANATOMIA HUMANA NATURAL — comprimento das pernas proporcional ao torso (cerca de metade da altura total), joelhos e tornozelos em posição correta, pés em escala real. NÃO pernas curtas, distorcidas ou desproporcionais. Adicione uma calça que combine e coloque o calçado com aparência idêntica à imagem do produto.
3. **Cenário:** Pode manter o cenário da base ou usar outro coerente (interior, exterior, estúdio). ${cenarioSelecionado}

**VALIDAÇÕES:** Produto principal preservado; produtos complementares com aparência EXATA das imagens; look completo e natural; figura com proporção corporal real da cabeça aos pés.`;
      } else {
        // Se não encontrar complementares, usar apenas o manequim
        finalPrompt = mannequinPrompt;
      }
    } else {
      // --- CATÁLOGO: Geração Frente e Costas — SEM imagem de manequim; apenas foto do produto + prompt completo ---
      const targetAudience = targetAudienceFromBody || produtoData?.targetAudience || produtoData?.públicoAlvo || "adulto";
      const productType = productTypeFromBody || produtoData?.product_type || produtoData?.productType;
      const detectedFabric = detectedFabricFromBody ?? tecidoEstimadoFromBody ?? produtoData?.detected_fabric ?? produtoData?.tecido_estimado;
      const analysisSummary = analysisSummaryFromBody ?? (produtoData?.descricao_seo ? String(produtoData.descricao_seo).slice(0, 300) : undefined);
      const sizeOrGrade = sizeFromBody ?? (Array.isArray(produtoTamanhos) && produtoTamanhos[0] ? String(produtoTamanhos[0]).trim() : undefined) ?? produtoData?.tamanho;
      // Cenário: sem cenário (fundo branco); posição do manequim é a instruída no prompt.
      const cenarioCatalog = "Pure white background (#FFFFFF) only. NO scenario, NO environment, NO background elements. Studio product shot only.";
      finalPrompt = buildCatalogPromptNoMannequinImage(variante === "costas", {
        targetAudience,
        size: sizeOrGrade,
        analysis: (productType || detectedFabric || analysisSummary)
          ? { productType, detectedFabric: detectedFabric ? String(detectedFabric) : undefined, summary: analysisSummary ? String(analysisSummary).slice(0, 350) : undefined }
          : undefined,
        lightingBlock: LIGHTING_BLOCK,
      });
      console.log("[api/lojista/products/generate-studio] Catálogo (sem imagem manequim):", {
        variante: variante || "frente",
        produtoNome,
        targetAudience,
        promptLength: finalPrompt.length,
      });
    }

    // Catálogo: apenas imagem do produto; referência só para costas (fotoFrenteUrl para ângulo), nunca imagem de manequim.
    const produtoIdParaGeracao = produtoId || `temp-${Date.now()}`;
    const referenceUrl =
      tipo === "catalog"
        ? (variante === "costas" ? fotoFrenteUrl : undefined)
        : undefined;

    // Instrução de sistema para catálogo: regras do manequim E fidelidade ao produto (repetidas para reforço).
    const CATALOG_SYSTEM_INSTRUCTION =
      "You generate catalog product images. RULE 1 — MANNEQUIN: Head and arms are allowed. Legs only 30 cm from waist then cut (no knees, no feet) so the mannequin floats. No visible floor; pure white background #FFFFFF. RULE 2 — PRODUCT: Copy the garment from the input image EXACTLY. Same design, color, texture, straps, buttons, details. On back view: copy straps (alças) exactly, both symmetrical, no distortion at shoulders. Both rules are non-negotiable.";
    // Look combinado: quando imagens dos produtos são enviadas (Imagem 2, 3...), copiar aparência EXATA. Prioridade = fidelidade aos produtos. Proporção corporal natural ao completar pernas.
    const COMBINED_SYSTEM_INSTRUCTION =
      "You generate a combined look. Image 1 is the base (model wearing main product). If more images are provided (Image 2, 3, ...), they are the COMPLEMENTARY PRODUCTS: you MUST place them on the model with EXACT appearance — same colors, design, logos, and details as in those images. Do NOT substitute with similar or generic items; product fidelity is the top priority. BODY PROPORTIONS (when base has no legs/feet): If the base does not show legs or feet, you MUST complete the body with NATURAL HUMAN PROPORTIONS: leg length roughly half of total body height; correct anatomy (thighs, knees, calves, ankles, feet) in correct scale relative to the torso and head; do NOT draw shortened, distorted, oversized, or stubby legs; the figure must look like a real person from head to toe. Add complementary pants/skirt if needed and show the exact footwear from the product image. Scene may match the base or be another coherent setting. Output: one single coherent photo.";
    const catalogOptions =
      tipo === "catalog"
        ? {
            aspectRatio: "9:16" as const,
            ...(referenceUrl ? { referenceImageUrl: referenceUrl } : {}),
            ...(variante === "frente" ? { temperature: 0, seed: 42 } : {}),
            systemInstruction: CATALOG_SYSTEM_INSTRUCTION,
          }
        : tipo === "combined"
          ? {
              aspectRatio: "9:16" as const,
              systemInstruction: COMBINED_SYSTEM_INSTRUCTION,
              temperature: 0.15,
              ...(complementaryProductImageUrls.length > 0 ? { additionalImageUrls: complementaryProductImageUrls } : {}),
            }
          : undefined;
    const imageUrl = await generateCatalogImage(
      finalPrompt,
      imagemUrl,
      lojistaId,
      produtoIdParaGeracao,
      catalogOptions
    );

    console.log("[api/lojista/products/generate-studio] ✅ Imagem gerada:", imageUrl);

    return NextResponse.json({
      success: true,
      imageUrl,
      tipo,
      mannequinId,
      cost,
      usedPack: usePack && catalogPack >= cost,
    });
  } catch (error: any) {
    console.error("[api/lojista/products/generate-studio] Erro:", error);
    return NextResponse.json(
      {
        error: "Erro ao gerar imagem",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Prompt do catálogo com MANEQUIM DE REFERÊNCIA — recriado do zero.
 * Regras: (1) Produto é fonte única; (2) Manequim modelado à roupa (frente e costas); (3) Costas: só o que está na foto (nunca bolsos); (4) Tecido/cor/sombras fiéis e realistas.
 */
function buildMannequinReferenceCatalogPrompt(isBack: boolean): string {
  const viewLabel = isBack ? "COSTAS (back)" : "FRENTE (front)";

  const frontOnly = isBack ? "" : `
--- REGRAS ESPECÍFICAS — VISTA FRENTE ---
• MANEQUIM MODELADO À ROUPA (obrigatório): O manequim deve estar CORRETAMENTE MODELADO à roupa. O corpo (manequim) deve se ADAPTAR ao volume e ao caimento da peça — por exemplo, na região do short saia / pregas, o formato do manequim deve seguir o volume e as dobras da roupa, e não um manequim rígido com a roupa em cima. A roupa dita a forma do corpo por baixo. Isso vale para frente e para costas.
• SHORT SAIA (skort): Se a Imagem 2 mostrar "short saia" (frente de saia com laço, botões e pregas), reproduza exatamente: um painel contínuo na frente, laço no centro, botões abaixo do laço, pregas horizontais nas laterais. Não simplifique para short liso.
• BOTÕES: Copie TODOS os botões da Imagem 2: mesmo número, posição, tamanho, forma e cor (ex.: top com 3 botões no centro; parte de baixo com 2 abaixo do laço). Não remova, não adicione, não altere.
• TOP: Decote, alças (ex.: largas com babado), shirring/smocking, barra — iguais à Imagem 2.`;

  const backOnly = isBack ? `
--- REGRAS ESPECÍFICAS — VISTA COSTAS ---
• SÓ O QUE ESTÁ NA FOTO DE COSTAS (Imagem 2): Copie APENAS o que é visível na foto de costas. NUNCA invente detalhes que não aparecem na Imagem 2.
• NUNCA ADICIONAR BOLSOS: Se a Imagem 2 (costas) NÃO mostrar bolsos no short/saia, a saída NÃO pode ter bolsos. Não desenhe bolsos traseiros, patch pockets, ou qualquer bolso que não esteja na foto de costas. Se a costas do short for lisa (cintura elástica, costas simples), a saída deve ser lisa — sem bolsos.
• NUNCA adicionar: laço atrás, botões atrás, pregas de frente atrás, painel de saia atrás, ou qualquer elemento da frente. Só: cintura (elástica ou simples), costas do top (shirring/alças), costas do short (simples).
• MANEQUIM MODELADO À ROUPA: O manequim deve estar CORRETAMENTE MODELADO à roupa de costas — a roupa envolve as curvas (bumbum, cintura, quadril) de forma natural; o corpo preenche a peça. Não deixe a costas chapada; a peça deve seguir as curvas do manequim.` : "";

  return `TASK — CATALOG IMAGE WITH REFERENCE MANNEQUIN (${viewLabel})

--- ROLE: MASTER DIGITAL TAILOR & PHOTO-REALISTIC RENDERER ---
Vestir o manequim base (Imagem 1) com a foto do produto (Imagem 2). Resultado = foto real do produto em forma invisível/glass. Sem "cara de IA", sem textura plástica, sem detalhes distorcidos.

--- PRIORITY 1: A FOTO DO PRODUTO (IMAGEM 2) É A ÚNICA FONTE DE VERDADE ---
• NÃO ALTERE: textura do tecido, cor exata, cada botão, costura, bolso (ou ausência de bolso), prega e dobra. Se o produto tem um caimento ou ajuste específico, preserve.
• NÃO INVENTE detalhes. NÃO "limpe" o tecido. Copie a peça de forma autêntica.
• TECIDO: A textura na saída deve ser a MESMA da Imagem 2 — mesmo tipo de tecido (weave, grain, fosco ou brilho). Não achate nem suavize; mantenha a sensação de tecido real (microcontraste, variação sutil).
• COR: A cor na saída deve ser a MESMA da Imagem 2 — mesmo matiz e mesma saturação. Não desature, não mude o tom. O azul (ou outra cor) deve ser idêntico ao da foto do produto.

--- PRIORITY 2: MANEQUIM MODELADO À ROUPA (VALE PARA FRENTE E COSTAS) ---
• O manequim (Imagem 1) define POSE e ÂNGULO; a ROUPA define como o corpo preenche a peça.
• O manequim deve estar CORRETAMENTE MODELADO à roupa: o corpo se adapta ao volume e ao caimento do tecido. Não use um manequim rígido com a roupa "em cima" — a roupa dita a forma por baixo. Em áreas com volume (pregas, short saia, costas), o formato do manequim deve seguir a roupa.
• SEM TECIDO FLUTUANDO: O tecido deve tocar o manequim onde a gravidade puxaria. As curvas do manequim NÃO podem ultrapassar a roupa; a peça envolve o corpo.
• Saída = UMA única figura vestida (não sobreposição manequim + roupa).

--- PRIORITY 3: MATERIAL, ILUMINAÇÃO E SOMBRAS (REALISMO) ---
• Material do manequim: transparente/glass, fino, elegante.
• Iluminação realista no TECIDO (textura, microcontraste) e no VIDRO (refrações sutis).
• SOMBRAS: (1) Uma sombra suave e difusa no chão, diretamente sob o manequim, para ancorar a figura. (2) Sombras realistas DENTRO da roupa (entre tecido e corpo) para profundidade e para mostrar que a roupa está vestida. Sombras suaves, coerentes com a luz principal (topo-esquerda). Sem bordas duras.
• Aparência geral: limpa, comercial, tecido "touchable". Seguir estritamente o bloco de iluminação abaixo.

You receive TWO images in this order:
- Image 1: MANNEQUIN EMPTY (${isBack ? "back" : "front"} view) — no clothes. POSE, ANGLE, and FRAMING reference.
- Image 2: GARMENT (product) — ${isBack ? "BACK view only" : "FRONT view"} of the garment to put ON the mannequin.

OUTPUT: ONE image = MANNEQUIN FROM IMAGE 1 WEARING THE EXACT GARMENT FROM IMAGE 2. Garment RENDERED ON the mannequin's body — ONE unified dressed figure, NOT superposition or overlay.

--- MANDATORY — MESMA POSIÇÃO E ÂNGULO DA IMAGEM 1 ---
- Posição, ângulo de câmera, enquadramento e pose do manequim na saída = EXATAMENTE os da Imagem 1. Só vestir com a peça da Imagem 2, renderizada NO corpo.
- Mostrar o corpo inteiro do manequim (torso, pescoço, área dos braços, pernas) como na Imagem 1, com a peça da Imagem 2 vestida — uma única imagem, não duas camadas.
${frontOnly}
${backOnly}

--- GLOBAL ---
- Fundo branco ou cinza muito claro (#FFFFFF ou #F5F5F5). Vertical 9:16. Alta resolução.
- Preservar todos os detalhes da Imagem 2: mesmo design, tecido, cor, construção. Não simplificar nem inventar.

${LIGHTING_BLOCK}

CRITICAL SUMMARY: (1) Imagem 2 é a única fonte — fidelidade total a tecido, cor, botões, detalhes; NUNCA adicionar bolsos na costas se não estiverem na foto. (2) Manequim MODELADO à roupa em AMBAS as fotos (frente e costas): corpo se adapta ao volume e caimento; não manequim rígido com roupa em cima. (3) Saída = uma figura vestida, mesmo ângulo/pose da Imagem 1. (4) Frente: short saia (laço, botões, pregas); costas: só detalhes de costas, sem bolsos se a foto não tiver. (5) Tecido e cor idênticos à Imagem 2; sombras realistas (chão + dentro da roupa). Meta: foto tão real que pareça produto real em forma invisível.`.trim();
}

/**
 * Prompt de catálogo SEM imagem de manequim — apenas a foto do produto + instruções textuais completas.
 * O manequim é construído pela IA conforme: ghost glass, sem cabeça/braços, torso + quadril + coxas, pose 3/4 (nunca 100% frente ou 100% costas), flutuando com sombra suave.
 * Mesmo nível de exigência que o modelo 2: fidelidade total ao produto, iluminação/sombras do LIGHTING_BLOCK.
 */
function buildCatalogPromptNoMannequinImage(
  isBack: boolean,
  opts: {
    targetAudience?: string;
    size?: string;
    analysis?: { productType?: string; detectedFabric?: string; summary?: string };
    lightingBlock?: string;
  }
): string {
  const audience = String(opts.targetAudience ?? "adulto").toLowerCase();
  const size = opts.size != null ? String(opts.size).trim().toLowerCase() : "";
  const isChild =
    audience.includes("infantil") ||
    audience.includes("bebe") ||
    audience.includes("kids") ||
    ["4", "6", "8", "10"].includes(size);
  const formType = isChild
    ? "female child (girl's proportions) ghost mannequin form designed for children's clothing"
    : "adult ghost mannequin form";
  const lightingBlock = opts.lightingBlock ?? LIGHTING_BLOCK;
  const analysisLine =
    opts.analysis && (opts.analysis.productType || opts.analysis.detectedFabric || opts.analysis.summary)
      ? `Product context: ${opts.analysis.productType || "see image"}. Fabric: ${opts.analysis.detectedFabric || "see image"}.${opts.analysis.summary ? ` ${opts.analysis.summary}` : ""}.\n\n`
      : "";

  const viewLabel = isBack ? "BACK VIEW" : "FRONT VIEW";

  // Blocos repetidos 3x (início, meio, fim) — MANEQUIM: cabeça e braços permitidos; pernas cortadas para manter flutuando
  const mannequinRule = `MANNEQUIN RULE (non-negotiable): Head and arms are ALLOWED (full head, full arms). LEGS only 30 cm from waist downward then clean cut — NO knees, NO lower legs, NO feet. The mannequin must be FLOATING (legs cut so it floats). NO floor, NO ground, NO grey surface under the figure; only a soft shadow beneath. Background pure white #FFFFFF only. Drawing full legs with knees/feet or a visible floor = WRONG.`;
  const mannequinRuleRepeat = `[REPEAT] ${mannequinRule}`;
  const mannequinRuleFinal = `[FINAL] ${mannequinRule}`;

  // Blocos repetidos 3x (início, meio, fim) para forçar obediência — FIDELIDADE AO PRODUTO
  const productFidelityRule = `PRODUCT FIDELITY RULE (non-negotiable): The garment in your output MUST be an EXACT COPY of the garment in the input image. Same design, same color, same fabric texture, same buttons (same number and position), same pleats, same details. Do NOT add or remove any element. Do NOT change the style. The product in the output must look IDENTICAL to the product in the input — only placed on the mannequin. Inventing or altering the garment = WRONG.`;
  const productFidelityRepeat = `[REPEAT] ${productFidelityRule}`;
  const productFidelityFinal = `[FINAL] ${productFidelityRule}`;

  // Início do prompt: ambas as regras em bloco
  const mandatoryFirst = `=== RULE 1 — MANNEQUIN (obey exactly) ===
${mannequinRule}

=== RULE 2 — PRODUCT (obey exactly) ===
${productFidelityRule}
`;

  // Fim do prompt: ambas as regras de novo
  const mandatoryLast = `=== FINAL — MANNEQUIN ===
${mannequinRuleFinal}

=== FINAL — PRODUCT ===
${productFidelityFinal}
`;

  // Manequim: cabeça e braços permitidos; pernas cortadas (30 cm da cintura) para manter efeito flutuante
  const visibleAreaBlock = `
--- MANNEQUIN FORM ---
The mannequin is a transparent glass form for ${formType}. Head and arms are ALLOWED (you may show full head and full arms). LEGS: only 30 cm from the waist downward (upper thighs only), then a clean, polished cut — NO knees, NO lower legs, NO feet. This cut creates the FLOATING effect. Polished edge at the leg cut-off only.`;

  const materialBlock = `
--- MATERIAL & QUALITY ---
Ultra-thin, highly transparent, premium clear glass (or acrylic). Sleek, subtle reflections. The only cut-off edge is at the legs (polished, smooth).`;

  const forbiddenBlock = `
--- DO NOT SHOW (image invalid if present) ---
Do NOT show: knees, lower legs, feet, or anything beyond 30 cm from waist on legs (legs must be cut to keep floating). Do NOT draw a visible floor, ground, grey surface under the mannequin — only a soft shadow beneath. Background MUST be pure white #FFFFFF only — same in front and back; no gray, no gradients, no objects.`;

  const poseBlock = isBack
    ? `
--- POSE & PERSPECTIVE ---
This image shows the REAR/BACK of the mannequin. It MUST maintain a slightly turned 3/4 perspective — NOT 100% from behind. The mannequin is turned slightly (same angle as the front view) so we see the back and a bit of the sides. Same 3/4 angle as the front view, but seen from behind. Never render fully frontal (0°) or fully from the back (180°).`
    : `
--- POSE & PERSPECTIVE ---
This image shows the FRONT of the mannequin. It MUST use a slightly turned 3/4 perspective — NOT 100% frontal. The mannequin is turned slightly (e.g. to its left) so we see the front and a bit of the side. Never render fully frontal (0°) or fully from the back (180°).`;

  const environmentBlock = `
--- ENVIRONMENT ---
The mannequin is FLOATING in mid-air — suspended with no visible support. There is NO floor, NO ground, NO grey or visible surface under the figure. Only one soft, diffused shadow cast directly beneath the form (on an invisible plane) — light grey, soft edges — to suggest depth. Do not draw the mannequin standing on anything. Background: seamless, pure infinite white #FFFFFF only — identical in front and back; no other elements.`;

  const priority1Block = `
--- GARMENT FIDELITY (PRIORITY 1) ---
You have ONE image: the ${isBack ? "BACK" : "FRONT"} of the garment (product). Place this garment on the ghost mannequin described above. Copy the garment with maximum fidelity.
• Do NOT alter: fabric texture, exact color, every button, seam, pocket (or absence of pocket), pleat and fold.
• Do NOT invent details. Mannequin: head and arms allowed; legs only 30 cm from waist then cut (floating).
• FABRIC: Same weave, grain, matte or sheen as the input. COLOR: Same hue and saturation as the input.`;

  const frontOnlyRules = isBack ? "" : `
--- FRONT-VIEW GARMENT RULES ---
• SHORT-SAIA (skort): If the image shows skirt front with bow, buttons, pleats — reproduce exactly. Same number and position of buttons; same pleats and bow.
• TOP: Neckline, straps, shirring/smocking, hem — match the image.`;

  const backOnlyRules = isBack ? `
--- BACK-VIEW GARMENT RULES ---
• COPY ONLY WHAT IS IN THE BACK PHOTO: If the back does NOT show pockets, output must NOT have pockets. Do not add bow, buttons, or front details on the back. Only: waist, back of top, back of bottom as in the input.
• STRAPS (alças) ON THE BACK — CRITICAL: Copy the back straps of the top EXACTLY as in the input back photo. Both straps must be symmetrical (left and right mirror each other). Each strap must go cleanly from the top to the shoulder — no crossed X pattern unless the input shows it, no distortion, no merging into the shoulder joint, no asymmetrical or doubled straps. If the input has two simple parallel straps on the back, output two simple parallel straps. Render straps clearly and correctly.
• Volume and draping: 3D form, natural curves (waist, hips), garment wrapping the form — not flat.` : "";

  const shadowsBlock = `
--- SHADOWS (mandatory) ---
One soft, diffuse shadow on the invisible floor directly beneath the mannequin (under thigh/leg area) so the figure appears floating with grounding. Shadow visible but soft (no hard edges). Subtle soft shadows under the garment where it meets the body (waist, straps, hem) for depth. Coherent with main light (top-left).`;

  // Repetição no MEIO do prompt (manequim + produto)
  const middleRepeatBlock = `
=== MIDDLE — REPEAT RULES (obey exactly) ===
${mannequinRuleRepeat}

${productFidelityRepeat}
`;

  if (isBack) {
    return `${mandatoryFirst}

${analysisLine}Professional 3D product rendering of the BACK VIEW of the ${formType}. Mannequin: head and arms allowed; legs only 30 cm from waist then cut (floating). Pure white background.

REMINDER — Mannequin: head and arms allowed; legs only 30 cm from waist then cut (floating); white background. REMINDER — Product: copy the garment from the input EXACTLY; same design, color, texture, straps, details; do not add or remove anything.

${visibleAreaBlock}
${materialBlock}
${forbiddenBlock}
${poseBlock}
${environmentBlock}

You receive ONE image: the BACK of the garment. Generate the BACK catalog photo by placing this garment on the mannequin. Mannequin: head and arms allowed; legs cut at 30 cm from waist (floating). Copy the back of the garment exactly — especially the STRAPS (alças): both straps symmetrical, clear, as in the input; no crossed X, no distortion at shoulders. Output MUST be clearly 3D — correct volume, depth, natural draping.
${priority1Block}
${backOnlyRules}
${middleRepeatBlock}
${shadowsBlock}

${lightingBlock}

CRITICAL — MANNEQUIN: Head and arms allowed. Legs only 30 cm from waist then cut (floating). No knees, no feet. No floor. White #FFFFFF.
CRITICAL — PRODUCT: Copy the back of the garment from the input EXACTLY. Same design, same details, same color, same texture. STRAPS (alças) on the back: copy exactly, both symmetrical, no distortion at shoulders. (3) Slightly turned 3/4 angle from behind.

Output: 9:16, high resolution. Back of garment on mannequin (head and arms allowed; legs cut at 30 cm from waist, floating). Pure white #FFFFFF only. Same design and details as input; straps correct and symmetrical.

${mandatoryLast}`.trim();
  }

  return `${mandatoryFirst}

${analysisLine}Professional 3D product rendering of the FRONT VIEW of the ${formType}. Mannequin: head and arms allowed; legs only 30 cm from waist then cut (floating). Pure white background.

REMINDER — Mannequin: head and arms allowed; legs only 30 cm from waist then cut (floating); white background. REMINDER — Product: copy the garment from the input EXACTLY; same design, color, texture, buttons, details; do not add or remove anything.

${visibleAreaBlock}
${materialBlock}
${forbiddenBlock}
${poseBlock}
${environmentBlock}

You receive ONE image: the FRONT of the garment. Generate the FRONT catalog photo by placing this garment on the mannequin. Mannequin: head and arms allowed; legs cut at 30 cm from waist (floating). Your output MUST be the FRONT view only.
${priority1Block}
${frontOnlyRules}
${middleRepeatBlock}
${shadowsBlock}

${lightingBlock}

CRITICAL — MANNEQUIN: Head and arms allowed. Legs only 30 cm from waist then cut (floating). No knees, no feet. No floor. White #FFFFFF.
CRITICAL — PRODUCT: Copy the garment from the input EXACTLY. Same design, same color, same texture, same buttons, same details. Do not add or remove anything. (3) Slightly turned 3/4 perspective.

Output: 9:16, high resolution. Front of garment on mannequin (head and arms allowed; legs cut at 30 cm from waist, floating). Pure white #FFFFFF only. Exact copy of product.

${mandatoryLast}`.trim();
}

/**
 * Monta o prompt para geração de foto de catálogo (Ghost Mannequin).
 * Frente: reconstrução 3D com corpo invisível (ar). Costas: edição — remover corpo/fundo, manter roupa intacta.
 * Quando opts.analysis está presente (dados da Análise Inteligente), o prompt da frente inclui um âncora de texto para reduzir oscilação.
 */
function buildGhostMannequinPrompt(
  isBack: boolean,
  opts: {
    targetAudience?: string;
    size?: string;
    cenario?: string;
    analysis?: { productType?: string; detectedFabric?: string; summary?: string };
    hasReferenceBack?: boolean;
    lightingBlock?: string;
  }
): string {
  const audience = String(opts.targetAudience ?? "adulto").toLowerCase();
  const size = opts.size != null ? String(opts.size).trim().toLowerCase() : "";
  const isChild =
    audience.includes("infantil") ||
    audience.includes("bebe") ||
    audience.includes("kids") ||
    ["4", "6", "8", "10"].includes(size);
  const childHint = isChild
    ? " Use child proportions: short boxy torso, flat chest, do not elongate. Keep the same width-to-height ratio as the input."
    : "";

  if (isBack) {
    return `The image you receive is the BACK of a garment (the only reference). The input may be flat/2D. Your output MUST be clearly 3D — with correct volume, depth, and natural draping — same angle as the FRONT (3/4 view), pure white background. DESIGN and DETAILS must match the back photo exactly. Do not invent or add anything that is not in the input back.

CRITICAL — 3D VOLUME (do NOT output flat/2D): The back view must look three-dimensional, as if the garment is on an invisible body. Add natural volume and depth: soft folds and creases where the fabric would naturally fall (e.g. at the waist, along the straps, at the hem of the top and shorts). The fabric must show subtle shadows and highlights that convey form and depth. Do NOT render as a flat, uniform hang — the shorts and top must have gentle curves, natural draping, and correct volume. One soft shadow under the garment to ground it. The result must look like a professional 3D ghost mannequin shot, not a 2D cutout.

COPY THE BACK EXACTLY (critical — similarity to original):
- Structure: If the input back has an ELASTIC waistband (gathered, no belt loops), output must have elastic waistband with NO belt loops. If the input has NO pockets visible on the back, output must have NO pockets. If the input has simple shorts back (no tiered pleats, no ruffles on the lower back), output must be simple — do NOT add tiered pleats, ruffles, or belt loops. Match the waistband type, pocket presence, and back design exactly as in the input.
- Top back: Only what you see — ruffles on straps (if present), shirring/smocking (if present). Do not add details that are not in the input back. Keep shirring/smocking with natural volume and subtle folds.
- Do NOT add: belt loops, pockets, tiered pleats, ruffles on shorts back, or any detail that is not clearly visible in the back photo. If the original back is simple (elastic waist, simple legs), your output must be simple too.
- Fabric: Same color and texture (weave, grain) as the input. Do not smooth or change.
- LINING (forro): Any visible interior (inside straps, neck edge, inside of garment) must be the SAME color as the fabric but slightly darker — to create an internal shadow effect. Do NOT use black. Use a darker shade of the garment color (e.g. if the fabric is blue, the lining is darker blue, not black).

3D OUTPUT (mandatory — volume and depth):
- ANGLE: Same as the front — slightly 3/4 view. Show the back and a bit of the sides. Pure white background only (#FFFFFF).
- VOLUME: Render with clear 3D form — natural draping, soft folds, creases, and depth. The garment must look like it has an invisible body inside: subtle curves at the back, natural fall of the fabric, not flat. Shorts: gentle volume and soft folds at the legs and waist. Top: volume at the shirred panel and along the straps.
- Lighting: Soft studio lighting with subtle shadows and highlights on the fabric to create depth. One soft shadow under the garment. No flat, even lighting — use light and shadow to convey 3D form.
- Remove mannequin and background; replace with white. Inside empty (air only). No glass, no plastic.
${opts.lightingBlock ? `\n${opts.lightingBlock}\n` : ""}
Output: Back of the garment in 3D with correct volume and depth, 3/4 angle, same design and details as the input back photo, on pure white. 9:16. High resolution. ${opts.cenario ?? ""}`.trim();
  }

  // --- FOTO FRENTE: uma ÚNICA imagem (sempre a frente). Saída obrigatoriamente FRENTE, nunca costas. ---
  const analysisLine =
    opts.analysis && (opts.analysis.productType || opts.analysis.detectedFabric || opts.analysis.summary)
      ? `Product: ${opts.analysis.productType || "see image"}. Fabric: ${opts.analysis.detectedFabric || "see image"}.${opts.analysis.summary ? ` ${opts.analysis.summary}` : ""}.\n\n`
      : "";

  return `${analysisLine}IMAGEM DE FRENTE (Foto Frente — mandatory): Your output must be the FRONT view of the garment only (vista frontal). Do NOT generate the back or the verso. The garment must be shown from the front, as in the input image.

TASK: You receive ONE image — the FRONT of a garment. Place this garment on a GLASS MANNEQUIN to generate the FRONT catalog photo. Your output MUST be the FRONT view only. Copy the front of the garment from the input and show it on the mannequin from the front.

REGRAS RÍGIDAS — MANEQUIM (STRICT — non-negotiable): The mannequin MUST have NO HEAD and NO ARMS. You are FORBIDDEN to draw: head, neck, face, oval form above the neckline, arms (short or long), hands, fingers, shoulder stubs, or any limb extending from the shoulders. The neckline opening must show ONLY empty space or the inside of the garment — no head shape, no neck, no transparent head. The armholes and strap areas must show ONLY empty space or the inside of the garment — no arms, no long arms, no hands. The mannequin is ONLY: (1) a transparent glass TORSO (chest, waist, hips) and (2) a SMALL piece of the legs below the bottom garment (short length only — no full legs, no knees, no feet). If your output shows a head or arms, the image is WRONG. Repeat: NO head. NO arms. NO hands. Torso and small leg piece only.

MANEQUIM TOTALMENTE TRANSPARENTE (mandatory): The mannequin must be TOTALLY transparent glass — smooth, uniform, seamless. Do NOT draw any visible seams, joints, connection points, or lines on the shoulders or armhole areas. No "emendas" (seams/joints) on the arms or shoulders — the transparent form must be smooth and continuous. If the shoulder or armhole area is visible, it must be smooth transparent glass only, no seams or joints. Totally transparent = no visible structure lines, no plastic seams.

MANEQUIM DE FRENTE (mandatory): The mannequin must be shown DE FRENTE — facing the camera, frontal view (vista frontal). GLASS MANNEQUIN: totally transparent, smooth torso (chest, waist, hips) + SMALL piece of legs only. NO head, NO neck, NO face, NO arms, NO hands. Neckline = empty or garment interior only. Armholes = empty or garment interior only. Pure white background (#FFFFFF).

PERSPECTIVE: MANEQUIM DE FRENTE — the mannequin and garment must be viewed from the front (vista frontal). At most a very slight rotation to the mannequin's left (viewer's right) for minimal depth — the main view must be frontal, mannequin facing the camera.

SOMBRA DE FLUTUAÇÃO (mandatory): Add one soft, diffuse shadow on the white background directly beneath the mannequin (below the small piece of legs). The shadow suggests the form is floating or hovering; the garment on the glass torso and the short leg portion plus the soft shadow ground the composition.

ANALISAR TIPO DE PRODUTO E MANTER FIELMENTE (mandatory): First ANALYZE the product type in the input image. If the product has the APPEARANCE of a skirt (short-saia / skort) — continuous front panel, pleats, no visible leg division from the front — then replicate it as a SKIRT style. If it looks like a skirt, it IS a skirt (short-saia). Do NOT render it as shorts with a visible fly, slit, or crotch gap. Maintain the same product type faithfully: same design, same number of buttons, same style (skirt vs shorts). Replicate faithfully what you see.

REGRAS RÍGIDAS — SEMELHANÇA DO PRODUTO ORIGINAL (STRICT — non-negotiable): The garment in the output must be a FAITHFUL copy of the garment in the input image. Do NOT interpret or redesign — COPY. Same design (e.g. crop top + short-saia/skort, not plain shorts). Same number and position of buttons (3 on top, 2 on bottom). Same details: ruffles, bow, pleats — same style, size, and placement as in the input. Same color and fabric texture. Do NOT add elements that are not in the input (e.g. pockets, extra buttons). Do NOT remove or simplify elements that are in the input (e.g. side pleats, bow). The output garment must look like the same product as in the single image — only on the mannequin. If the input has short-saia with horizontal side pleats and a bow, the output must have the same — not shorts, not different pleats.

ROUPA FIEL À ORIGINAL (critical): Copy with maximum fidelity: same design, same details (ruffles, bow, pleats — same style and size), same color and texture. No tag/label visible. Do NOT add or remove details. The garment must look EXACTLY like the one in the image, only worn on the glass mannequin.

BOTÕES — COPIAR DA FOTO ORIGINAL (critical): Copy the buttons from the input image EXACTLY. Same number: 3 buttons on the top (vertical center front), and exactly 2 buttons on the bottom piece below the bow. Do NOT omit a button — if the original has 2 buttons below the bow, the output MUST have 2 buttons (no gap, no missing button). Same size and shape as in the input. Same position and spacing. Buttons same color as the fabric. Do NOT add or remove buttons.

SAIA / SHORT-SAIA — ESTILO SAIA OBRIGATÓRIO (critical): The bottom piece is a short-saia (short que é saia) — it has the APPEARANCE of a skirt from the front. Analyze the input: if it looks like a skirt (continuous front panel, pleats, no visible fly/slit), replicate it as a SKIRT style. Copy from the input: waistband with belt loops, fabric sash tied in a bow at center front, exactly TWO buttons below the bow on the central placket (no missing button). The front must be CLOSED and continuous like a skirt panel — do NOT draw a vertical slit, gap, or "fly" at the crotch; no open seam between the legs. Front panel with horizontal pleats on both sides (same curve, spacing, and layout as in the input). If the product has appearance of saia (skirt), output saia style — one continuous front, no shorts-style fly or gap. No invented pockets.

PARTE DE BAIXO — FIDELIDADE OBRIGATÓRIA (critical): The BOTTOM piece (short-saia, skort, skirt, shorts) must be copied EXACTLY from the input image. Do NOT reinterpret or redesign it. Look at the input photo and replicate: (1) Waistband type — if the input has belt loops and a fabric sash/bow, output the same; if it has elastic only, output the same. (2) Buttons — same number and position as in the input (e.g. two buttons below the bow). (3) Pleats/panels — copy the exact pleat style, direction, and placement from the input: if the input has horizontal pleats on the sides of the front panel, replicate that (same curve of the seam, same number and spacing of pleats, same side-by-side layout). (4) ZONA ENTRE O CENTRO E AS PREGAS LATERAIS (critical): The area between the central placket (bow, buttons) and the pleated side panels must match the input image exactly — do NOT leave a smooth, plain, or empty fabric zone there. Copy the same texture, pleats, or structure that appears in that region in the original photo; the entire front of the bottom piece (center, transition zones, and side pleats) must be faithful to the input. Do NOT invent angular stitched panels, different pleat directions, or a different structure. Do NOT turn a short-saia into plain shorts. The bottom piece in the output must look like a direct copy of the bottom piece in the single image — only on the mannequin.

SINGLE IMAGE = FRONT: The only image attached is the FRONT of the garment (imagem de frente). Your output must show the same FRONT view on the mannequin — vista frontal only. Never output the back or the verso.

3D AND FABRIC: Garment must look three-dimensional on the glass form (soft curves, natural draping). Fabric like real cloth — not stiff or plastic. Preserve texture from the input.

LIGHTING: Soft studio lighting. Glass mannequin can have subtle reflections. The only shadow is the soft, diffuse floating shadow beneath the torso (no harsh shadows, no multiple shadows).
${opts.lightingBlock ? `\n${opts.lightingBlock}\n` : ""}
LINING (neck/armholes): Where garment interior is visible, use same hue as fabric but slightly darker — subtle shadow. Never black.

Output: Vertical 9:16, IMAGEM DE FRENTE — MANEQUIM: torso + small legs ONLY (NO head, NO arms, NO hands). Garment: exact copy of the input image (same design, buttons, short-saia, pleats, bow). Frontal view, soft shadow beneath, pure white background. High resolution.${childHint ? ` ${childHint}` : ""} ${opts.cenario ?? ""}`.trim();
}

/**
 * Busca um produto complementar no estoque
 * Algoritmo: Se produto é "Blusa" -> buscar "Calça" ou "Saia"
 */
async function findComplementaryProduct(
  lojistaId: string,
  categoriaOriginal: string,
  produtoIdExcluir?: string
): Promise<{ id: string; nome: string; categoria: string; imagemUrl: string } | null> {
  try {
    const db = getAdminDb();
    const categoriaLower = categoriaOriginal.toLowerCase();

    // Mapear categorias complementares
    const complementaryCategories: Record<string, string[]> = {
      blusa: ["calça", "saia", "short"],
      calça: ["blusa", "camisa", "top"],
      saia: ["blusa", "camisa", "top"],
      short: ["blusa", "camisa", "top"],
      vestido: [], // Vestido não precisa de complemento
      camisa: ["calça", "saia"],
      top: ["calça", "saia", "short"],
    };

    const categoriasBuscadas = complementaryCategories[categoriaLower] || [];

    if (categoriasBuscadas.length === 0) {
      return null;
    }

    // Buscar produtos nas categorias complementares
    const produtosRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("produtos");

    // Buscar em cada categoria complementar
    for (const categoriaComplementar of categoriasBuscadas) {
      const snapshot = await produtosRef
        .where("categoria", "==", categoriaComplementar)
        .where("arquivado", "!=", true)
        .limit(5)
        .get();

      if (!snapshot.empty) {
        // Filtrar produto atual se existir
        const produtos = snapshot.docs
          .filter((doc) => doc.id !== produtoIdExcluir)
          .map((doc) => {
            const data = doc.data() as any;
            return {
              id: doc.id,
              nome: data.nome,
              categoria: data.categoria,
              imagemUrl: data.imagemUrl,
              imagemUrlCatalogo: data.imagemUrlCatalogo,
              imagemUrlOriginal: data.imagemUrlOriginal,
            };
          });

        if (produtos.length > 0) {
          // Retornar o primeiro produto encontrado
          const produto = produtos[0];
          return {
            id: produto.id,
            nome: produto.nome || "Produto Complementar",
            categoria: produto.categoria || categoriaComplementar,
            imagemUrl: produto.imagemUrl || produto.imagemUrlCatalogo || produto.imagemUrlOriginal || "",
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.error("[findComplementaryProduct] Erro:", error);
    return null;
  }
}

