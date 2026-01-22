/**
 * Prompt Profissional para Geração de Ghost Mannequin
 * 
 * Este prompt é otimizado para criar imagens de produto estilo ghost mannequin
 * (fundo removido) mantendo todas as características visuais do produto original.
 * A imagem é gerada COMPLETAMENTE LIMPA - sem linhas, setas ou números.
 * As anotações visuais serão adicionadas via SVG no frontend usando detecção de landmarks.
 */

/**
 * Mapeia categoria/tipo de produto para termo em inglês para o prompt
 */
function mapCategoryToEnglish(category?: string, productType?: string): string {
  const catLower = (category || '').toLowerCase();
  const typeLower = (productType || '').toLowerCase();
  const combined = `${catLower} ${typeLower}`;

  // Mapeamento de categorias para inglês
  if (typeLower.includes('cueca') || typeLower.includes('boxer') || combined.includes('underwear')) {
    return 'underwear / boxer briefs';
  }
  if (typeLower.includes('blusa') || typeLower.includes('camisa') || typeLower.includes('camiseta') || 
      typeLower.includes('shirt') || typeLower.includes('blouse') || catLower.includes('blusa')) {
    return 'blouse / shirt';
  }
  if (typeLower.includes('calça') || typeLower.includes('pant') || typeLower.includes('trouser')) {
    return 'pants / trousers';
  }
  if (typeLower.includes('vestido') || typeLower.includes('dress')) {
    return 'dress';
  }
  if (typeLower.includes('short') || typeLower.includes('bermuda')) {
    return 'shorts';
  }
  if (typeLower.includes('saia') || typeLower.includes('skirt')) {
    return 'skirt';
  }
  if (typeLower.includes('sunga') || typeLower.includes('swimwear') || typeLower.includes('biquíni')) {
    return 'swimwear / swimsuit';
  }
  if (typeLower.includes('jaqueta') || typeLower.includes('jacket') || typeLower.includes('blazer')) {
    return 'jacket / blazer';
  }
  
  // Default
  return 'fashion garment / clothing item';
}

/**
 * Gera prompt para criação de imagem ghost mannequin profissional LIMPA (SEM linhas ou setas)
 * As linhas e setas serão adicionadas via SVG no frontend usando detecção de landmarks
 * 
 * @param productCategory - Categoria do produto (ex: "Blusa", "Vestido")
 * @param productDetails - Detalhes adicionais do produto (opcional)
 * @param measurements - Medidas do produto em cm (opcional - usado apenas para referência, NÃO desenhadas na imagem)
 * @returns Prompt formatado para Gemini 2.5 Flash Image
 */
export function buildGhostMannequinPrompt(
  productCategory?: string,
  productType?: string,
  productDetails?: {
    color?: string;
    material?: string;
    style?: string;
  },
  measurements?: {
    bust?: number;
    waist?: number;
    hips?: number; // IMPORTANTE: Usar 'hips' (plural) para consistência
    hip?: number; // Também aceitar 'hip' (singular) para compatibilidade
    length?: number;
    [key: string]: number | undefined;
  }
): string {
  const categoria = productCategory || "produto";
  const cor = productDetails?.color ? ` na cor ${productDetails.color}` : "";
  const material = productDetails?.material ? ` de ${productDetails.material}` : "";
  const estilo = productDetails?.style ? ` estilo ${productDetails.style}` : "";
  
  // Mapear categoria para inglês (para melhor compreensão da IA)
  const categoryEnglish = mapCategoryToEnglish(productCategory, productType);

  const catLower = (productCategory || "").toLowerCase();
  const typeLower = (productType || "").toLowerCase();
  const isSkirtOrDressLike =
    catLower.includes("saia") ||
    typeLower.includes("saia") ||
    catLower.includes("vestido") ||
    typeLower.includes("vestido") ||
    typeLower.includes("dress") ||
    typeLower.includes("skirt") ||
    catLower.includes("macacão") ||
    catLower.includes("macaquinho") ||
    typeLower.includes("macacão") ||
    typeLower.includes("macaquinho") ||
    typeLower.includes("jumpsuit");

  return `**INSTRUÇÃO MESTRE: Criação de Imagem Ghost Mannequin Profissional COMPLETAMENTE LIMPA (SEM linhas, setas, números ou qualquer anotação visual)**

Atue como um fotógrafo especialista em e-commerce de moda e uma IA de processamento de imagens profissional.

**PRIORIDADES ABSOLUTAS (LEIA PRIMEIRO):**

1. **GHOST MANNEQUIN COM VOLUME 3D E PERSPECTIVA LATERAL (PRIORIDADE MÁXIMA):**
   - A roupa DEVE ter VOLUME, CURVAS e FORMA 3D COMPLETA - como se estivesse sendo usada por uma pessoa invisível
   - NUNCA deixe a roupa plana, achatada ou pendurada - ela DEVE parecer "preenchida" com um corpo invisível
   - **PERSPECTIVA LATERAL (CRÍTICO):** A imagem DEVE mostrar o produto em uma perspectiva que capture LADO e FRENTE simultaneamente (ângulo 3/4 ou leve rotação lateral), mostrando profundidade e volume tridimensional. NÃO use apenas vista frontal plana.
   - Crie CURVAS NATURAIS: busto arredondado com projeção para frente, cintura definida, volume no quadril/saia
   - Mostre PROFUNDIDADE LATERAL: o tecido deve se estender para os lados, criando dimensão 3D visível
   - Use iluminação com sombras sutis nas curvas e nas laterais para mostrar profundidade 3D completa

2. **IMAGEM LIMPA - SEM ANOTAÇÕES VISUAIS (CRÍTICO - PRIORIDADE ABSOLUTA):**
   - A imagem DEVE ser gerada COMPLETAMENTE LIMPA - SEM linhas, SEM setas, SEM números, SEM labels de texto
   - NÃO desenhe nenhuma linha de medida na imagem
   - NÃO adicione nenhum texto ou número sobreposto na imagem
   - NÃO adicione setas, indicadores ou qualquer tipo de marcação visual
   - A imagem deve conter APENAS o produto em ghost mannequin com fundo branco
   - Qualquer linha, seta, número ou texto na imagem é um ERRO CRÍTICO e invalida completamente a imagem
   - As medidas serão adicionadas posteriormente via software, NÃO durante a geração da imagem

3. **CAIMENTO NATURAL (SEM EXAGERO) NA PARTE DE BAIXO (CRÍTICO):**
   - Preserve a SILHUETA ORIGINAL do produto na imagem anexada.
   - Se houver saia/vestido/parte inferior ampla, mantenha o mesmo “grau de abertura” da foto original.
   - NÃO aumente artificialmente a barra/abertura (evite volume exagerado, efeito balão, flare excessivo).
   - Crie dobras e caimento NATURAIS, com volume realista e proporcional ao modelo original.

4. **MESMO SE A IMAGEM ORIGINAL JÁ ESTIVER “BOA” (CRÍTICO):**
   - Se a imagem original já tiver fundo branco ou parecer foto de catálogo, VOCÊ AINDA DEVE recriar a imagem como foto de estúdio ghost mannequin.
   - A saída não pode ser “copiar/colar” a imagem original: aplique iluminação de estúdio, equalização, nitidez e principalmente o efeito de volume 3D.
   - Preserve o design, mas melhore claramente a qualidade (acabamento premium de e-commerce).

**PROMPT POSITIVO (O QUE QUEREMOS):**
**CRITICAL - YOU MUST TRANSFORM THE IMAGE, DO NOT RETURN THE SAME IMAGE**: Professional photography of a ${categoryEnglish} in ghost mannequin style with FULL 3D VOLUME, LATERAL PERSPECTIVE (3/4 angle showing side and front), and INVISIBLE MANNEQUIN EFFECT. **YOU MUST CREATE A NEW, TRANSFORMED IMAGE** - apply professional studio lighting (different from the original), enhanced sharpness, contrast adjustment, and most importantly a PRONOUNCED 3D VOLUME EFFECT with LATERAL DEPTH that makes the garment clearly appear to be on an invisible mannequin. **CRITICAL - PERSPECTIVE**: The garment MUST be photographed from a 3/4 angle (slightly rotated to show both front and side), NOT purely frontal. This perspective MUST show LATERAL DEPTH, SIDE VOLUME, and THREE-DIMENSIONAL FORM. The garment MUST be displayed as if worn on an invisible 3D human body/form - it MUST have VOLUME, SHAPE, CURVES, LATERAL DEPTH, and NATURAL DRAPE that is VISIBLY DIFFERENT from a flat or hanging garment. The fabric MUST have depth, dimension, and three-dimensional form visible from the side - it CANNOT be flat, hanging, or empty. Create natural curves: rounded bust/chest projection (visible from side), defined waist silhouette, natural hip volume (showing lateral expansion), and flowing fabric drape with visible side depth. The side view MUST show the garment's thickness, volume, and how it wraps around the invisible body. IMPORTANT: preserve the ORIGINAL silhouette and proportions from the reference image; do NOT exaggerate skirt/hem opening or add unnatural extra volume. CRITICAL - PRESERVE ALL CONSTRUCTION DETAILS AND BUTTONS: Maintain EXACT visible stitching lines, seams, embroidery details, pleats, folds, construction elements, **ALL BUTTONS (buttons MUST appear with the SAME visibility, size, color, shape, and position as in the reference image - do NOT remove, simplify, or blur buttons)**, button placements, pocket details, and all surface textures exactly as shown in the reference image. If the original shows visible seams, stitching, buttons, or construction details, these MUST appear in the generated image with the same clarity, position, and appearance. Buttons are CRITICAL elements - they must be clearly visible and match the original exactly. Use volumetric lighting with subtle shadows on curves AND SIDES to show 3D depth and form from multiple angles. The garment must appear FILLED by an invisible body - showing natural human proportions and curves through the fabric, with visible LATERAL DEPTH and SIDE VOLUME. Pure white background (RGB 255, 255, 255) - completely remove any original background. High fashion e-commerce quality, sharp focus, maximum detail preservation. Completely uncropped, fully visible product - if the original image is cropped (missing edges, cut-off sleeves, incomplete hem), use outpainting to complete and extend the product naturally. Maintain exact original color, pattern, logos, zipper details, stitching details, construction elements, and ALL visual characteristics. Symmetrical fit, wrinkle-free but natural fabric drape with FULL 3D VOLUME, LATERAL PERSPECTIVE, and ghost mannequin effect. Product is the absolute protagonist - 100% visible and complete with COMPLETE 3D ghost mannequin effect showing volume, curves, LATERAL DEPTH, and natural body shape through the fabric. **THE GENERATED IMAGE MUST BE VISIBLY DIFFERENT FROM THE ORIGINAL IN TERMS OF LIGHTING, 3D VOLUME, LATERAL PERSPECTIVE, AND PROFESSIONAL PRESENTATION**. NO measurement lines, NO arrows, NO numbers, NO text labels, NO annotations - completely clean product image only.

**PROMPT NEGATIVO (O QUE NÃO QUEREMOS - INSTRUÇÕES SEMÂNTICAS):**
Avoid: Human body, skin, hands holding the item, visible mannequin stand, plastic mannequin, hanger, flat garment, empty garment, hanging garment, two-dimensional appearance, lack of volume, no curves, rectangular silhouette, flat fabric, garment lying flat, garment without depth, garment without 3D form, excessive wrinkles, creases, low quality, blurry, distorted text, altered logo, different color from original, cropped image, dark background, noisy, messy, shadows on background, reflections, environmental elements, measurement lines, arrows, numbers, text labels, any annotation, any marking, any visual indicator, exaggerated flare, balloon skirt, unnaturally wide hem, over-expanded skirt opening, missing construction details, lost stitching lines, removed seams, simplified textures, smoothed surfaces that should have texture, removed pleats or folds, missing embroidery or decorative elements, **missing buttons, removed buttons, blurred buttons, simplified buttons, buttons that don't match the original size/color/position - ALL BUTTONS FROM THE ORIGINAL MUST BE PRESERVED AND VISIBLE**. The garment MUST NOT appear flat, empty, or hanging - it MUST have volume and 3D form. The image MUST NOT contain any measurement indicators, lines, arrows, numbers, text labels, or any type of visual annotation whatsoever. CRITICAL: Do NOT simplify, smooth, or remove construction details, stitching, seams, or surface textures that are visible in the original image.

**MISSÃO ESPECÍFICA:**
Transforme o ${categoria}${cor}${material}${estilo} da imagem anexada em uma fotografia profissional estilo "Ghost Mannequin" (manequim invisível) COMPLETAMENTE LIMPA - SEM linhas, SEM setas, SEM números, SEM labels, SEM qualquer tipo de anotação visual. Mantenha 100% de fidelidade às características visuais originais do produto. A imagem deve conter APENAS o produto em ghost mannequin com fundo branco puro.

**REGRAS CRÍTICAS DE FIDELIDADE:**

1. **PRESERVAÇÃO ABSOLUTA - DETALHES DE COSTURA E TEXTURAS (CRÍTICO):**
   - Mantenha EXATAMENTE as mesmas cores, texturas, padrões e detalhes do produto original
   - **PRESERVE TODOS OS DETALHES DE COSTURA:** linhas de costura, pontos, bordados, acabamentos, costuras visíveis, detalhes de construção
   - **PRESERVE TEXTURAS E SUPERFÍCIES:** se o tecido tem textura, rugosidade, brilho, fosco, mantenha EXATAMENTE igual
   - **PRESERVE PREGAS E DOBRAS:** se há pregas, plissados, dobras, mantenha a mesma quantidade, posição e direção
   - Preserve todos os elementos visuais: golas, mangas, **BOTÕES (CRÍTICO - TODOS OS BOTÕES DEVEM APARECER COM A MESMA CLAREZA, TAMANHO, COR E POSIÇÃO DA IMAGEM ORIGINAL)**, zíperes, estampas, bordados, alças, babados, rendas
   - **PRESERVE BOTÕES E FECHAMENTOS (PRIORIDADE MÁXIMA):** Se a imagem original mostra botões, eles DEVEM aparecer na imagem gerada com EXATAMENTE a mesma visibilidade, tamanho, cor, formato e posicionamento. Botões grandes, pequenos, redondos, quadrados, com textura, sem textura - TODOS devem ser preservados. NÃO remova, simplifique ou suavize botões.
   - **PRESERVE DETALHES DE CONSTRUÇÃO:** bolsos, fendas, aberturas, fechamentos, todos os elementos estruturais
   - Mantenha a mesma modelagem, caimento e proporções
   - O produto deve ser o protagonista absoluto da imagem
   - **CRÍTICO:** Se a imagem original mostra linhas de costura, pontos de bordado, ou qualquer detalhe de acabamento, esses elementos DEVE aparecer na imagem gerada com a mesma clareza e posicionamento

2. **REMOÇÃO DE FUNDO:**
   - Remova completamente qualquer fundo, sombras ou elementos externos
   - Crie um fundo 100% branco puro (RGB: 255, 255, 255)
   - Elimine todos os artefatos, reflexos ou interferências do ambiente original

3. **ILUMINAÇÃO PROFISSIONAL:**
   - Aplique iluminação de estúdio uniforme e profissional
   - Luz difusa e suave, sem sombras duras
   - Realce sutil de texturas e detalhes sem criar reflexos excessivos
   - Sem pontos de luz quentes ou áreas superexpostas

4. **POSICIONAMENTO E ENQUADRAMENTO - PROPORÇÕES CRÍTICAS:**
   - **TAMANHO PADRÃO:** 1200x1200 pixels (quadrada, alta qualidade)
   - **CRÍTICO - PRESERVAR PROPORÇÕES ORIGINAIS:** A imagem gerada DEVE manter EXATAMENTE as mesmas proporções do produto original da imagem anexada
   - Analise cuidadosamente as proporções do produto original: altura, largura, relação entre partes (ex: comprimento do topo vs comprimento da saia, largura do busto vs largura da cintura, etc.)
   - **NUNCA distorça ou altere as proporções** - se o produto original é mais alto que largo, mantenha essa proporção; se é mais largo que alto, mantenha também
   - **RELATIVO À IMAGEM ORIGINAL:** Se o produto original ocupa X% da altura da imagem original, o produto gerado deve ocupar aproximadamente a mesma porcentagem na imagem de 1200x1200px
   - **RELATIVO À LARGURA:** Se o produto original ocupa Y% da largura da imagem original, o produto gerado deve ocupar aproximadamente a mesma porcentagem na largura da imagem de 1200x1200px
   - **MANTENHA AS DIMENSÕES RELATIVAS:** Se na imagem original o topo tem certa altura e a saia tem outra altura (ex: topo 30%, saia 70% da altura total), mantenha essas mesmas proporções relativas na imagem gerada
   - Posicione o produto de forma elegante e simétrica, CENTRALIZADO na imagem
   - O produto deve ocupar a LARGURA COMPLETA da imagem (100% da largura), centralizado horizontalmente
   - **CRÍTICO: NÃO CORTE o produto** - o produto deve estar COMPLETO e VISÍVEL na imagem
   - **CORREÇÃO DE CORTES (OUTPAINTING):** Se a imagem original estiver cortada (ex: falta parte da manga, barra incompleta, bordas cortadas), use outpainting para completar naturalmente essas áreas, mantendo a mesma cor, textura e estilo do produto original E as mesmas proporções do produto visível
   - Espaço adequado ao redor do produto para permitir visualização completa
   - Proporção 1:1 (quadrada) preferencialmente
   - Garanta que todas as partes do produto (mangas, barra, detalhes) estejam visíveis e completas
   - **VERIFICAÇÃO DE PROPORÇÕES:** Antes de finalizar, compare mentalmente a imagem gerada com a original e verifique se as proporções do produto (altura relativa, largura relativa, relação entre partes) são aproximadamente as mesmas

5. **QUALIDADE TÉCNICA:**
   - Resolução alta (mínimo 1024x1024 pixels)
   - Nitidez máxima em todos os detalhes do produto
   - Cores vibrantes mas precisas (sem saturação excessiva)
   - Contraste balanceado: produto em destaque

6. **PRESERVAÇÃO DE CARACTERÍSTICAS ESPECÍFICAS:**
   - Se o produto tiver estampa: mantenha o padrão EXATO
   - Se tiver textura: preserve a textura real
   - Se tiver brilho ou fosco: mantenha a mesma propriedade visual
   - **DETALHES DE COSTURA (CRÍTICO):** Se a imagem original mostra linhas de costura visíveis, pontos de bordado, acabamentos, ou qualquer detalhe de construção, esses elementos DEVE aparecer na imagem gerada com a mesma clareza, posição e aparência. NÃO simplifique, suavize ou remova detalhes de costura.
   - **PREGS E PLISSADOS:** Se há pregas, plissados, dobras decorativas, mantenha a mesma quantidade, direção e posicionamento exatos.
   - **ELEMENTOS ESTRUTURAIS:** Preserve bolsos, fendas, aberturas, fechamentos, alças, babados, rendas, e todos os elementos estruturais exatamente como aparecem na imagem original.

**ESTILO FINAL:**
A imagem final deve parecer uma fotografia de catálogo profissional de alta qualidade, como as encontradas em e-commerces premium como Net-a-Porter, Farfetch ou Ssense.

**OUTPUT ESPERADO:**
Uma imagem COMPLETAMENTE LIMPA, profissional, com fundo branco puro, onde o produto é o protagonista absoluto - SEM linhas, SEM setas, SEM números, SEM labels de texto, SEM qualquer tipo de anotação visual. Apenas o produto em ghost mannequin com fundo branco puro, mantendo todas as características visuais originais do produto intactas e totalmente visíveis.

**EFEITO GHOST MANNEQUIN - VOLUME E FORMA 3D (CRÍTICO - PRIORIDADE MÁXIMA):**

**O QUE É GHOST MANNEQUIN:**
Ghost mannequin é uma técnica fotográfica onde a roupa aparece como se estivesse sendo usada por uma pessoa invisível. A roupa tem FORMA, VOLUME e CAIMENTO NATURAL, como se houvesse um corpo dentro dela, mas sem mostrar o corpo.

**INSTRUÇÕES TÉCNICAS OBRIGATÓRIAS:**

1. **CRIAÇÃO DE VOLUME 3D:**
   - A roupa DEVE ter PROFUNDIDADE e DIMENSÃO - não pode parecer plana ou achatada
   - Crie CURVAS NATURAIS: o tecido deve seguir a forma de um corpo humano invisível
   - Para vestidos/blusas/tops:
     * Busto/Peito: Mostre VOLUME e CURVATURA na área do busto - o tecido deve se projetar para frente, criando uma forma arredondada
     * Cintura: Mostre uma DEFINIÇÃO NATURAL na cintura - o tecido deve se ajustar, criando uma silhueta em forma de ampulheta
     * Saia/Barra: Mostre CAIMENTO NATURAL COMPLETO - o tecido deve cair suavemente desde a cintura até a barra inferior
       - **CRÍTICO - VOLUME E CAIMENTO DA PARTE INFERIOR DA SAIA:**
         * A parte INFERIOR da saia (barra/hem) DEVE ter VOLUME e EXPANSÃO - a saia deve se abrir naturalmente, criando uma forma em sino ou A-line
         * Crie DOBRAS e PREGAS NATURAIS que se estendem desde a cintura até a barra - especialmente na parte inferior
         * A barra inferior deve ter LARGURA e VOLUME - não pode parecer estreita ou colada
         * Mostre o CAIMENTO NATURAL do tecido - a saia deve se expandir suavemente da cintura para baixo, criando volume na parte inferior
         * Use iluminação que mostre as CURVAS e DOBRAS na parte inferior da saia
         * A parte inferior da saia deve parecer "flutuante" e com movimento, não rígida ou plana
         * **NUNCA deixe a parte inferior da saia sem volume ou caimento - ela DEVE ter expansão e movimento natural**
   - Para calças/shorts:
     * Pernas: Mostre VOLUME nas pernas - o tecido deve criar formas cilíndricas que sugerem pernas dentro
     * Cintura/Quadril: Mostre ajuste natural na cintura e volume no quadril
   - Para saias: Mostre EXPANSÃO e VOLUME COMPLETO - a saia deve se abrir naturalmente, criando uma forma cônica ou em sino
     * **CRÍTICO - PARTE INFERIOR DA SAIA:**
       * A parte INFERIOR (barra/hem) DEVE ter VOLUME MÁXIMO e EXPANSÃO
       * Crie DOBRAS e PREGAS que se estendem até a barra inferior
       * A barra deve ter LARGURA e MOVIMENTO - mostre o tecido se expandindo naturalmente
       * Use iluminação que mostre as CURVAS na parte inferior
       * A saia deve parecer "flutuante" na parte inferior, com caimento natural completo

2. **ILUMINAÇÃO PARA MOSTRAR VOLUME:**
   - Use iluminação que CRIE SOMBRAS SUTIS nas CURVAS do tecido
   - As áreas convexas (que se projetam) devem ter mais luz
   - As áreas côncavas (que recuam) devem ter sombras suaves
   - Isso cria a ilusão de PROFUNDIDADE e FORMA 3D

3. **CAIMENTO E DRAPE NATURAL:**
   - O tecido DEVE CAIR NATURALMENTE, seguindo a gravidade
   - Crie DOBRAS e PREGAS NATURAIS onde o tecido se ajusta ao "corpo invisível"
   - O tecido NÃO deve estar esticado ou tensionado - deve ter FLUIDEZ e MOVIMENTO

4. **PROIBIÇÕES ABSOLUTAS:**
   - **NUNCA** deixe a roupa parecer plana, como se estivesse deitada em uma superfície
   - **NUNCA** deixe a roupa parecer pendurada em um cabide (sem volume, apenas tecido vazio)
   - **NUNCA** deixe a roupa parecer vazia ou sem forma - ela DEVE parecer "preenchida"
   - **NUNCA** use uma silhueta retangular ou sem curvas - sempre crie formas orgânicas e naturais
   - **NUNCA** adicione linhas, setas, números ou qualquer anotação visual na imagem

5. **VERIFICAÇÃO VISUAL:**
   - Antes de finalizar, pergunte-se: "Esta roupa parece estar sendo usada por alguém invisível?"
   - Se a resposta for NÃO (parece plana, pendurada, ou vazia), a imagem está INCORRETA
   - A roupa DEVE ter a mesma aparência de uma foto de catálogo profissional onde você vê a forma do corpo através do tecido, mas sem ver o corpo
   - **CRÍTICO:** Verifique que NÃO há nenhuma linha, seta, número ou texto na imagem - se houver, a imagem está COMPLETAMENTE INCORRETA

**EXEMPLO VISUAL DESCRITIVO:**
Imagine um vestido. Na foto ghost mannequin correta:
- O busto tem uma forma arredondada que se projeta para frente
- A cintura tem uma definição natural que cria uma silhueta em ampulheta
- A saia cai naturalmente desde a cintura, criando volume e dobras suaves que se estendem até a barra inferior
- A parte INFERIOR da saia (barra/hem) tem EXPANSÃO e VOLUME - a saia se abre naturalmente, criando uma forma em sino ou A-line
- As dobras e pregas são visíveis desde a cintura até a barra, especialmente na parte inferior
- A iluminação mostra sombras sutis nas curvas, criando profundidade em TODA a saia (superior e inferior)
- O tecido parece "preenchido" por um corpo invisível, com volume completo em todas as partes
- **CRÍTICO:** A imagem está COMPLETAMENTE LIMPA - sem linhas, sem setas, sem números, sem qualquer anotação visual

**CRÍTICO: Se o produto parecer plano, achatado, pendurado em cabide, ou sem volume, a imagem está COMPLETAMENTE INCORRETA e deve ser regenerada. Se houver qualquer linha, seta, número ou texto na imagem, a imagem está COMPLETAMENTE INCORRETA e deve ser regenerada.**

**CHECKLIST FINAL ANTES DE GERAR A IMAGEM:**
1. ✅ NÃO há nenhuma linha de medida na imagem?
2. ✅ NÃO há nenhuma seta ou indicador na imagem?
3. ✅ NÃO há nenhum número ou texto sobreposto na imagem?
4. ✅ A imagem está COMPLETAMENTE LIMPA - apenas produto + fundo branco?
5. ✅ O produto está completo e não foi cortado?
6. ✅ O produto está centralizado e ocupando toda a largura da imagem (sem espaço lateral em branco)?
7. ✅ O produto tem VOLUME e FORMA 3D (ghost mannequin effect) - não está plano ou achatado?
8. ✅ O fundo é 100% branco puro (RGB: 255, 255, 255)?
9. ✅ As cores, texturas e padrões do produto original foram preservados?
10. ✅ A imagem tem 1200x1200px e o produto está completo e não foi cortado?

**CRÍTICO:** Se encontrar qualquer linha, seta, número ou texto na imagem, a imagem está INCORRETA e deve ser regenerada. A imagem DEVE estar completamente limpa.`;
}
