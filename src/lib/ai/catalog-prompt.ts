/**
 * Serviço de Prompt para Geração de Imagens de Catálogo com IA
 * 
 * Gera prompts otimizados para criar imagens de catálogo profissional
 * para produtos, com etiquetas de preço integradas e design de estúdio.
 * 
 * Fase 13: Gerador de Catálogo
 */

export interface ProdutoParaCatalogo {
  nome: string
  preco: number
  precoPromocional?: number | null
  tamanhos?: string[] | null
  corManequim?: string
}

/**
 * Constrói o prompt para geração de imagem de catálogo
 * 
 * @param produto - Dados do produto
 * @param corManequim - Cor do manequim (default: "branco fosco")
 * @param descricaoCenario - Descrição do cenário de fundo (opcional)
 * @returns Prompt formatado para enviar ao Gemini/Imagen
 */
export function buildCatalogPrompt(
  produto: ProdutoParaCatalogo,
  corManequim: string = "branco fosco",
  descricaoCenario: string | null = null
): string {
  // Calcular se existe desconto (Passo A: Lógica V6.0)
  // Verificar se há desconto: precoPromocional > 0 e precoPromocional < precoOriginal
  const precoOriginal = produto.preco
  const precoPromocional = produto.precoPromocional
  const temDesconto = precoPromocional != null 
    && precoPromocional > 0 
    && precoPromocional < precoOriginal

  // Formatar variáveis
  const COR_DO_MANEQUIM = corManequim || "branco fosco"
  const NOME_DO_PRODUTO = produto.nome || "Produto"
  
  // Preço original cheio (riscado, se tiver desconto)
  const PRECO_ORIGINAL_CHEIO = temDesconto 
    ? formatPrice(precoOriginal)
    : ""

  // Preço final atual (o que será exibido em destaque)
  const PRECO_FINAL_ATUAL = formatPrice(temDesconto ? precoPromocional! : precoOriginal)

  // Porcentagem de desconto
  const PORCENTAGEM_DESCONTO = temDesconto
    ? `${Math.round((1 - precoPromocional! / precoOriginal) * 100)}% OFF`
    : ""

  // Tamanhos disponíveis
  const TAMANHOS_DISPONIVEIS = produto.tamanhos && produto.tamanhos.length > 0
    ? produto.tamanhos.join(", ")
    : "Consulte disponibilidade"

  // Prompt Mestre (copiado EXATAMENTE do documento Fase 13)
  const prompt = `**INSTRUÇÃO MESTRE (Prioridade Máxima: Extração, Fidelidade e Hierarquia Visual de Preço):**
Atue como um fotógrafo profissional de e-commerce de luxo e uma IA de análise visual forense.

Sua missão crítica é tripla:
1. **EXTRAÇÃO CIRÚRGICA:** Isole o produto da imagem anexada de qualquer contexto original com precisão absoluta.
2. **RÉPLICA EXATA:** Replique o produto com 100% de fidelidade em um NOVO suporte de exibição realista e cenário minimalista.
3. **INTEGRAÇÃO DINÂMICA DE PREÇO:** Adicionar uma etiqueta minimalista onde a hierarquia visual do preço muda drasticamente se houver um desconto aplicado.

**ETAPA 1: ANÁLISE FORENSE DO PRODUTO**
Analise a foto anexada milímetro por milímetro. Memorize: Categoria, Material (Textura/Brilho), Detalhes (Botões/Costuras).

**ETAPA 2: GERAÇÃO DA IMAGEM (Regras Rígidas)**
* **REGRA Nº1: FIDELIDADE TOTAL:** O produto na imagem final deve ser uma cópia carbono do produto anexado.
* **SUPORTE DE EXIBIÇÃO (Novo Manequim):**
    * Use um manequim de loja de alto padrão, cor: ${COR_DO_MANEQUIM}.
    * *Roupas (Look Completo):* Manequim de corpo inteiro, pose elegante.
    * *Roupas (Peça Parcial):* Enquadramento que valorize a peça, evitando manequim "vazio".
* **CENÁRIO:** ${descricaoCenario ? descricaoCenario : "Fundo que sugira o ambiente de uso, mas extremamente desfocado (bokeh suave)."}
* **ETIQUETA DE INFORMAÇÃO COM LÓGICA DE PROMOÇÃO:**
    * Adicione uma etiqueta (tag) flutuante ao lado do produto, estilo minimalista.
    * **Conteúdo:**
        * Linha 1: ${NOME_DO_PRODUTO} em negrito.
        * **BLOCO DE PREÇO:**
            ${temDesconto 
              ? `* **SE** "${PRECO_ORIGINAL_CHEIO}" e "${PORCENTAGEM_DESCONTO}" tiverem dados:
                1. Exiba ${PRECO_ORIGINAL_CHEIO} pequeno, cinza, com RISCO HORIZONTAL (strikethrough).
                2. Abaixo, exiba ${PRECO_FINAL_ATUAL} MUITO MAIOR, negrito, cor de destaque (vermelho escuro ou preto forte).
                3. Ao lado, badge com ${PORCENTAGEM_DESCONTO}.`
              : `* **SENÃO (Se estiverem vazios):**
                1. Exiba apenas ${PRECO_FINAL_ATUAL} em tamanho de destaque padrão.`}
        * Linha Final: ${TAMANHOS_DISPONIVEIS} em texto menor.
    * **Linha Conectora:** Uma linha fina conectando a etiqueta ao produto.
* **ILUMINAÇÃO:** Luz de estúdio para realçar texturas.

**CRITICAL FRAMING INSTRUCTIONS:**
Generate a vertical image with a strictly 2:3 aspect ratio (aspect ratio 2:3 vertical).
The mannequin must be a FULL BODY shot, fully visible from the top of the head to the feet within the frame.
Perfectly framed, subject fills the frame entirely, no borders, no padding, edge to edge composition.
The subject must be centered.
No letterboxing, no black bars, no white borders, no pillarboxing, no blurred borders, no extra background filler.
The image must fill the entire canvas from edge to edge.
High-resolution fashion photography style.`

  return prompt
}

/**
 * Formata preço em Real brasileiro
 */
function formatPrice(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

