import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { generateCatalogImage } from "@/lib/ai/imagen-generate";
import { deductCredits } from "@/lib/financials/deduct-credits";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

type ScenarioKey = "studio_minimalista" | "urbano_cidade" | "natureza_solar" | "interior_luxo";
type LifestyleView = "front" | "back";
type AudienceKey = "female" | "male" | "kids";
type SizeCategoryKey = "standard" | "plus" | "numeric" | "baby" | "kids_numeric" | "teen";

function is429Error(err: any): boolean {
  const msg = String(err?.message || err || "");
  return (
    msg.includes("429") ||
    msg.toLowerCase().includes("resource exhausted") ||
    msg.toLowerCase().includes("too many requests") ||
    msg.toLowerCase().includes("resource_exhausted")
  );
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function pickScenarioKeyFromProduct(input: {
  productCategory?: string;
  productType?: string;
  tags?: string[];
}): ScenarioKey {
  const cat = (input.productCategory || "").toLowerCase();
  const type = (input.productType || "").toLowerCase();
  const tags = (input.tags || []).map((t) => String(t).toLowerCase());
  const text = `${cat} ${type} ${tags.join(" ")}`.trim();

  // Natureza/Solar: praia, verão, swimwear, resort
  if (
    /praia|beach|ver[aã]o|summer|resort|biqu[ií]ni|bikini|swim|sunga|mai[oô]|sa[ií]da de praia|linen|linho/.test(text)
  ) {
    return "natureza_solar";
  }

  // Urbano/Cidade: streetwear, jeans, moletom, sneaker vibe
  if (
    /urbano|cidade|street|streetwear|jeans|denim|moletom|hoodie|casual|oversized|cargo|tenis|sneaker/.test(text)
  ) {
    return "urbano_cidade";
  }

  // Interior Luxo: social, festa, alfaiataria, blazer, couro, seda
  if (
    /luxo|social|festa|noite|evening|alfaiataria|blazer|terno|suit|cetim|seda|silk|couro|leather|salto|gala/.test(text)
  ) {
    return "interior_luxo";
  }

  // Padrão: interior com cenário (evitar fundo branco) — cenário que combine com a roupa
  return "interior_luxo";
}

function resolveScenarioDescription(scenario: ScenarioKey): string {
  switch (scenario) {
    case "studio_minimalista":
      return "Fashion studio with a styled backdrop that complements the garment (soft tones, subtle texture or gradient matching the outfit). NOT plain white background. Clean editorial look, soft lighting, shallow depth of field.";
    case "urbano_cidade":
      return "Urban city street fashion, modern architecture background, shallow depth of field, golden hour or soft overcast light, editorial street style vibe. Visible urban scenario that complements the outfit.";
    case "natureza_solar":
      return "Outdoor nature scene, warm sunlight, natural greenery, soft bokeh, airy summer vibe, realistic ambient light. Visible natural scenario that complements the outfit.";
    case "interior_luxo":
      return "Luxury interior environment, premium decor, elegant textures, soft window light, high-end editorial vibe, shallow depth of field. Visible interior scenario that complements the outfit.";
    default:
      return "Luxury interior environment, premium decor, soft window light, shallow depth of field. Visible scenario that complements the outfit.";
  }
}

function resolveBiotypePrompt(audience: AudienceKey, sizeCategory: SizeCategoryKey): string {
  const audiencePart =
    audience === "male" ? "Male model" : audience === "female" ? "Female model" : "Kids model";

  // Regra solicitada (P/M vs G/GG/XG) não existe 1:1 aqui; usamos o proxy mais confiável do app: sizeCategory.
  const sizePart = sizeCategory === "plus" ? "Curvy plus size fashion model" : "Standard fit fashion model";

  // Ordem importa: primeiro o sexo, depois biotipo/fit
  return `${audiencePart}, ${sizePart}`;
}

function buildLifestylePrompt(params: {
  view: LifestyleView;
  biotype: string;
  scenario: string;
  productDescription: string;
  hasSeedRef: boolean;
}): string {
  const viewInstr =
    params.view === "back"
      ? "Generate the BACK VIEW: model in a SLIGHTLY TURNED, dynamic pose (NOT static). The back of the garment must be clearly visible. POSE: Use a gentle editorial pose — e.g. body at a soft three-quarter back angle, or one shoulder slightly forward, or a very slight glance over one shoulder (quarter profile only; never full face toward camera). Natural movement: weight on one leg, or one hand resting naturally on hip/waist, or arms relaxed with a subtle angle. The pose must feel alive and editorial, not rigid or frozen. Do NOT make the model completely static. Do NOT twist excessively: no head turned 180 degrees toward camera, no contorted torso or unnatural anatomy. Keep the same person identity, same hair, same skin tone, same body proportions. BACK GARMENT FIDELITY: Image 1 is the ORIGINAL BACK (catalog back). The BACK of the garment on the model MUST match Image 1 exactly: same back neckline, same wide straps with ruffles from behind, same smocking/shirring on the back of the top, same waistband and belt loops on the shorts, same color and fabric texture. Do not add or remove back details."
      : "Generate the FRONT VIEW. Medium close-up or three-quarter shot (from waist up or chest up) so the GARMENT is the main focus and hero of the image. Fashion pose, realistic proportions. The outfit must be the clear focal point.";

  const seedInstr = params.hasSeedRef
    ? "CRITICAL CONSISTENCY: The second image is a SEED/CHARACTER reference. You MUST keep EXACTLY the same person identity (same hair, face, skin tone, body) as that reference image. Do not change the character."
    : "CHARACTER: Create a new photorealistic fashion model identity (unique person).";

  // A imagem 1 é SEMPRE o resultado Ghost Mannequin (produto isolado). Para view=back, é a foto costas.
  // A imagem 2 (quando existe) é a referência do personagem (seed lock).
  const image1Label =
    params.view === "back"
      ? "Reference product BACK view (catalog back / ghost mannequin back). This is the ORIGINAL BACK of the product. The BACK of the garment on the model MUST be IDENTICAL to Image 1 (same back details, smocking, ruffles on straps, waistband, etc.)."
      : "Reference product (ghost mannequin / catalog). This is the ORIGINAL product. The garment worn by the model MUST be IDENTICAL to Image 1.";
  const fidelityBlock =
    params.view === "back"
      ? "GARMENT FIDELITY (CRITICAL): Image 1 shows the BACK of the product. The BACK of the garment on the model must match Image 1 exactly: same back neckline, wide straps with ruffles from behind, smocking/shirring on the back of the top, waistband and belt loops on the shorts, same color and fabric. Do not add or remove back details. Only the model, scenario and lighting are new; the back of the clothing must match Image 1."
      : "GARMENT FIDELITY (CRITICAL): The product in the final image must look EXACTLY like the original in Image 1. Copy the garment from Image 1 onto the model: same design, same color and fabric tone, same number and position of buttons (e.g. 3 buttons = 3 buttons), same ruffles/straps/bow/pleats/seams, same texture. Do not simplify, add or remove details. Only the model, scenario and lighting are new; the clothing must match Image 1.";
  const backOnlyRule =
    params.view === "back"
      ? "MANDATORY: Your output MUST be the BACK VIEW — the model must be seen FROM BEHIND, showing the back of the garment. Do NOT output a front view. Do NOT reuse or copy the pose/angle from Image 2. Image 1 is the back of the product — use it as the ONLY garment reference for what the back must look like."
      : null;

  return [
    backOnlyRule,
    "Photorealistic fashion photography.",
    params.view === "back"
      ? "RULE: The BACK of the garment in the photo must look EXACTLY like the original back product (Image 1). Only the model, scenario and lighting are new."
      : "RULE: The garment in the photo must look EXACTLY like the original product (Image 1). Only the model, scenario and lighting are new.",
    "CRITICAL — SCENARIO: The image MUST have a visible background/scenario that complements the outfit. Do NOT use a plain white or empty studio background. The environment must match and enhance the style of the garment.",
    `${params.biotype}.`,
    `Wearing: ${params.productDescription}.`,
    `${params.scenario}.`,
    "Shot on 85mm, shallow depth of field, sharp focus on the garment, natural skin texture, realistic fabric texture, soft lighting, high-end editorial quality. The clothing is the hero of the image.",
    "SOURCE IMAGES:",
    `- Image 1: ${image1Label}`,
    params.hasSeedRef ? "- Image 2: Model seed reference (same person identity)." : "",
    seedInstr,
    fidelityBlock,
    "NO TEXT, NO WATERMARKS, NO LOGOS ON IMAGE (except the garment’s original branding).",
    viewInstr,
    params.view === "back"
      ? "AVOID (back view): Completely static or rigid pose, frozen figure, head turned 180 degrees toward camera, twisted or contorted body, unnatural anatomy. WANT: slight turn, dynamic editorial pose, natural movement, back of garment clearly visible."
      : null,
    "Output: vertical 9:16, medium close-up or three-quarter shot that emphasizes the garment (waist up or chest up). Sharp focus on the outfit, shallow depth of field on the background. Realistic lighting consistent with the scenario.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const searchParams = request.nextUrl.searchParams;
    const lojistaIdFromQuery = searchParams.get("lojistaId") || searchParams.get("lojistald");

    const {
      lojistaId: lojistaIdFromBody,
      produtoId,
      ghostImageUrl,
      view,
      scenarioKey,
      targetAudience,
      sizeCategory,
      seedImageUrl,
      productDescription,
      productCategory,
      productType,
      tags,
    } = body as {
      lojistaId?: string;
      produtoId?: string;
      ghostImageUrl?: string;
      view?: LifestyleView;
      scenarioKey?: ScenarioKey | "auto";
      targetAudience?: AudienceKey;
      sizeCategory?: SizeCategoryKey;
      seedImageUrl?: string | null;
      productDescription?: string;
      productCategory?: string;
      productType?: string;
      tags?: string[];
    };

    const lojistaId = lojistaIdFromBody || lojistaIdFromQuery;

    if (!lojistaId) {
      return NextResponse.json({ error: "lojistaId é obrigatório" }, { status: 400 });
    }
    if (!ghostImageUrl || typeof ghostImageUrl !== "string") {
      return NextResponse.json({ error: "ghostImageUrl é obrigatório" }, { status: 400 });
    }
    if (!view || !["front", "back"].includes(view)) {
      return NextResponse.json({ error: "view deve ser 'front' ou 'back'" }, { status: 400 });
    }
    if (!targetAudience || !["female", "male", "kids"].includes(targetAudience)) {
      return NextResponse.json({ error: "targetAudience inválido" }, { status: 400 });
    }
    if (!sizeCategory || !["standard", "plus", "numeric", "baby", "kids_numeric", "teen"].includes(sizeCategory)) {
      return NextResponse.json({ error: "sizeCategory inválido" }, { status: 400 });
    }

    // Seed locking: costas exige seed
    if (view === "back" && (!seedImageUrl || typeof seedImageUrl !== "string")) {
      return NextResponse.json({ error: "seedImageUrl é obrigatório para view='back' (Seed Locking)" }, { status: 400 });
    }

    // Créditos: 1 por geração lifestyle (mesmo custo do catálogo)
    const cost = 1;
    const db = getAdminDb();
    const lojaDoc = await db.collection("lojas").doc(lojistaId).get();
    const lojaData = lojaDoc.data() || {};
    const catalogPack = lojaData.catalogPack || 0;
    const credits = lojaData.credits || 0;
    const lojaNome = (lojaData.nome || lojaData.name || lojaData.nomeLoja || "") as string;

    const lojaNomeLower = lojaNome.toLowerCase().trim();
    const isPierreModa =
      (lojaNomeLower.includes("pierre") && (lojaNomeLower.includes("moda") || lojaNomeLower.includes("fashion"))) ||
      lojaNomeLower === "pierre moda" ||
      lojaNomeLower === "pierre fashion" ||
      lojistaId === "hOQL4BaVY92787EjKVMt";

    const subscription = lojaData.subscription || {};
    const isTestUnlimited = subscription.clientType === "test_unlimited" || isPierreModa;
    const usePack = catalogPack > 0 && !isTestUnlimited;

    // Validar saldo, mas NÃO debitar antes de gerar (evita perder crédito em erro 429/500)
    if (!isTestUnlimited) {
      if (usePack && catalogPack < cost) {
        if (credits < cost) {
          return NextResponse.json({ error: `Saldo insuficiente. Necessário: ${cost} ${usePack ? "Pack" : "Créditos"}` }, { status: 402 });
        }
      } else if (!usePack && credits < cost) {
        return NextResponse.json({ error: `Saldo insuficiente. Necessário: ${cost} Créditos` }, { status: 402 });
      }
    }

    const effectiveScenarioKey: ScenarioKey =
      scenarioKey && scenarioKey !== "auto"
        ? (scenarioKey as ScenarioKey)
        : pickScenarioKeyFromProduct({ productCategory, productType, tags });

    const scenario = resolveScenarioDescription(effectiveScenarioKey);
    const biotype = resolveBiotypePrompt(targetAudience, sizeCategory);
    const produtoDesc = (productDescription || "the exact garment from the source image").trim();
    const prompt = buildLifestylePrompt({
      view,
      biotype,
      scenario,
      productDescription: produtoDesc,
      hasSeedRef: !!seedImageUrl,
    });

    const produtoIdParaGeracao = produtoId || `temp-${Date.now()}`;
    // Para view=back: primeira imagem (ghostImageUrl) DEVE ser a Foto Costas (slot2); segunda (seedImageUrl) = Modelo Frente (seed). Nunca inverter.
    const systemInstructionBack =
      view === "back"
        ? "You must generate ONLY the BACK view of the model. Image 1 is the back of the product — use it as the sole garment reference for the back. Image 2 is for character/identity only (same person); do NOT copy the pose, angle or view from Image 2. The output must show the model from behind with the back of the garment clearly visible. Never output a front view."
        : undefined;

    // Retry leve em 429 (quota/limite de taxa do Vertex/Gemini)
    let imageUrl: string | null = null;
    const attempts = [0, 1800, 3500]; // tentativa imediata + backoff
    let lastErr: any = null;
    for (let i = 0; i < attempts.length; i++) {
      if (attempts[i] > 0) await sleep(attempts[i]);
      try {
        imageUrl = await generateCatalogImage(prompt, ghostImageUrl, lojistaId, produtoIdParaGeracao, {
          aspectRatio: "9:16",
          referenceImageUrl: seedImageUrl || undefined,
          systemInstruction: systemInstructionBack,
        });
        break;
      } catch (e: any) {
        lastErr = e;
        if (!is429Error(e)) break; // só retry em 429
      }
    }
    if (!imageUrl) {
      if (is429Error(lastErr)) {
        return NextResponse.json(
          { error: "Limite temporário atingido (429). Aguarde alguns segundos e tente novamente.", details: String(lastErr?.message || lastErr || "") },
          { status: 429 }
        );
      }
      throw lastErr;
    }

    // Debitar / contabilizar SOMENTE após sucesso
    if (isTestUnlimited) {
      await db.collection("lojas").doc(lojistaId).update({
        "usageMetrics.totalGenerated": FieldValue.increment(cost),
        "usageMetrics.creditsUsed": FieldValue.increment(cost),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else if (usePack && catalogPack >= cost) {
      await db.collection("lojas").doc(lojistaId).update({
        catalogPack: catalogPack - cost,
        updatedAt: new Date(),
      });
    } else {
      const deductResult = await deductCredits({ lojistaId, amount: cost });
      if (!deductResult.success) {
        return NextResponse.json({ error: deductResult.message || "Erro ao debitar créditos" }, { status: 402 });
      }
    }

    // "Seed" = ID de consistência: na Frente, vira a própria imagem gerada; na Costas, mantém o seed recebido.
    const effectiveSeed = view === "front" ? imageUrl : (seedImageUrl as string);

    return NextResponse.json({
      success: true,
      imageUrl,
      seed: effectiveSeed,
      cost,
      usedPack: usePack && catalogPack >= cost,
      scenarioKey: effectiveScenarioKey,
      view,
    });
  } catch (error: any) {
    console.error("[api/lojista/products/generate-lifestyle] Erro:", error);
    if (is429Error(error)) {
      return NextResponse.json(
        { error: "Limite temporário atingido (429). Aguarde alguns segundos e tente novamente.", details: String(error?.message || error || "") },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "Erro ao gerar imagem lifestyle", details: error.message },
      { status: 500 }
    );
  }
}

