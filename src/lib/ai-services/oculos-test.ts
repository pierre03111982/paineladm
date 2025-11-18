/**
 * Serviço específico para teste de geração de imagem com óculos
 * Usa APENAS Imagen 3.0 (Try-On não suporta acessórios como óculos)
 * 
 * ENTRADA: 2 imagens (pessoa + óculos)
 * SAÍDA: 1 imagem (pessoa usando exatamente o óculos do produto)
 */

import { getImagenService } from "./nano-banana";
import { APIResponse } from "./types";

export interface OculosTestParams {
  personImageUrl: string;
  oculosImageUrl: string;
  lojistaId: string;
  preserveFace?: boolean;
  preserveBody?: boolean;
  oculosWebUrl?: string; // URL web do produto para incluir no prompt
  sceneContext?: string; // Contexto de cenário para incluir no prompt (opcional)
}

export interface OculosTestResult {
  imageUrl: string;
  method: "imagen-only";
  processingTime: number;
  cost: number;
}

/**
 * Gera imagem combinando pessoa + óculos usando APENAS Imagen 3.0
 * 
 * IMPORTANTE: Try-On NÃO aceita acessórios como óculos
 * Usamos Imagen 3.0 com prompt específico que referencia ambas as imagens
 */
export async function generateOculosTest(
  params: OculosTestParams
): Promise<APIResponse<OculosTestResult>> {
  const startTime = Date.now();

  try {
    console.log("[OculosTest] Iniciando geração com óculos (APENAS Imagen 3.0):", {
      personImageUrl: params.personImageUrl.substring(0, 50) + "...",
      oculosImageUrl: params.oculosImageUrl.substring(0, 50) + "...",
    });

    const imagenService = getImagenService();

    // IMPORTANTE: Imagen 3.0 NÃO suporta múltiplas imagens de referência
    // Vamos usar uma abordagem diferente:
    // 1. Analisar a imagem do óculos para extrair características
    // 2. Incluir essas características no prompt de forma muito detalhada
    // 3. Usar a imagem da pessoa como base
    
    console.log("[OculosTest] Analisando imagem do óculos para extrair características...");
    
    // Importar analisador de imagem do óculos
    const { generateOculosDescription } = await import("./oculos-image-analyzer");
    const oculosDescription = await generateOculosDescription(params.oculosImageUrl);
    
    // Se temos URL web do produto, incluir no prompt para a IA "ver" o link
    const urlReference = params.oculosWebUrl 
      ? `\n\n**IMPORTANTE: Referência Visual do Produto**\nA imagem do óculos está disponível neste link: ${params.oculosWebUrl}\nA IA deve acessar e analisar essa imagem para replicar EXATAMENTE o produto mostrado no link. O óculos na imagem do link é a referência visual exata que deve ser aplicada na pessoa.`
      : '';
    
    // Prompt extremamente detalhado que referencia AMBAS as imagens
    // A imagem da pessoa será usada como base (baseImageUrl)
    // O prompt descreve o óculos exato que deve ser aplicado baseado na análise
    const imagenPrompt = `**REQUISITO DE GERAÇÃO: FOTORREALISMO HÍBRIDO E ALTA FIDELIDADE**

**Objetivo:** Combinar a imagem da "Pessoa" com o "Óculos" para criar uma nova imagem fotorrealista. A pessoa da Foto deverá estar usando o óculos da outra Foto de forma natural e realista.

**Fidelidade Crítica (Não Negociável):**
* Manter **FIELMENTE** todas as características físicas da pessoa: rosto (formato, estrutura óssea, características faciais, expressão, tonalidade de pele, cor e estilo de cabelo, olhos), proporções corporais, postura, altura e estrutura física.
* **NÃO** introduzir qualquer alteração na aparência da pessoa.

**Óculos (Baseado na Imagem de Referência):**
* ${oculosDescription}${urlReference}
* Utilizar **EXATAMENTE** o óculos da foto de referência (ou do link fornecido), mantendo seu formato preciso, cor idêntica, estilo, detalhes intrínsecos, espessura das hastes e formato das lentes.
* O tamanho do óculos deve ser **PROPORCIONAL e NATURALMENTE ajustado** ao rosto da pessoa.
* **NÃO** introduzir qualquer alteração na aparência do óculos.
* A imagem de referência do óculos (ou link fornecido) mostra exatamente como ele deve aparecer na pessoa.

**Integração e Realismo:**
* A aplicação dos óculos no rosto deve ser **natural, realista e sem falhas**, posicionando-os corretamente sobre o nariz e as orelhas, com um ajuste perfeito.
* A iluminação deve ser **natural e realista**, harmonizando-se com a luz original da Foto 1 e preservando todos os detalhes da pessoa e dos óculos.

**Qualidade Final:**
* O resultado deve ser uma **fotografia profissional, fotorrealista e de alta fidelidade**, sem distorções ou artefatos.${params.sceneContext || ''}
* **Estilo:** "Editorial de moda"${params.sceneContext ? '' : ' com **fundo neutro e minimalista** (branco, cinza claro ou outro tom sólido que complemente, sem elementos distrativos)'}, para destacar a pessoa e o produto.`;

    console.log("[OculosTest] Gerando imagem com Imagen 3.0 usando pessoa como base...");
    console.log("[OculosTest] Prompt inclui descrição do óculos baseada na análise da imagem");
    
    // Usa a imagem da pessoa como base
    // O prompt descreve o óculos que deve ser aplicado baseado na análise da imagem
    // NOTA: Imagen 3.0 não aceita múltiplas imagens, então dependemos do prompt detalhado
    const imagenResult = await imagenService.generateOculosComposition({
      personImageUrl: params.personImageUrl,
      oculosImageUrl: params.oculosImageUrl,
      prompt: imagenPrompt,
      compositionId: `oculos-test-${Date.now()}`,
      lojistaId: params.lojistaId,
    });

    if (!imagenResult.success || !imagenResult.data) {
      throw new Error(imagenResult.error || "Falha ao gerar imagem com Imagen 3.0");
    }

    const totalCost = imagenResult.cost || 0.04;
    const processingTime = Date.now() - startTime;

    console.log("[OculosTest] Geração concluída:", {
      method: "imagen-only",
      processingTime,
      totalCost,
    });

    return {
      success: true,
      data: {
        imageUrl: imagenResult.data.imageUrl,
        method: "imagen-only",
        processingTime,
        cost: totalCost,
      },
      executionTime: processingTime,
      cost: totalCost,
    };
  } catch (error) {
    console.error("[OculosTest] Erro:", error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
      executionTime: Date.now() - startTime,
    };
  }
}

