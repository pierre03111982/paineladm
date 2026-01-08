/**
 * Seletor de Cenário para Catálogo de Produtos
 * Analisa características do produto (tags, categoria, detalhes) para escolher o cenário apropriado
 */

export interface ProdutoCaracteristicas {
  categoria?: string;
  tags?: string[] | string;
  nome?: string;
  detalhes?: string[];
  corPredominante?: string;
  tecido?: string;
}

/**
 * Determina o cenário apropriado baseado nas características do produto
 */
export function selectScenarioForProduct(produto: ProdutoCaracteristicas): string {
  const categoria = (produto.categoria || "").toLowerCase();
  const tagsArray = Array.isArray(produto.tags) 
    ? produto.tags 
    : (typeof produto.tags === "string" ? produto.tags.split(",").map(t => t.trim()) : []);
  const tagsLower = tagsArray.map(t => t.toLowerCase());
  const nome = (produto.nome || "").toLowerCase();
  const detalhes = produto.detalhes || [];
  const detalhesLower = detalhes.map(d => d.toLowerCase());

  // Regras específicas baseadas em tags
  // PRIORIDADE 1: Tags de contexto (ativam cenários específicos)
  
  // Bikini Law: Praia/Swimwear
  if (tagsLower.some(t => ["praia", "swimwear", "bikini", "maiô", "sunga", "banho", "verão"].includes(t))) {
    return "Cenário de praia tropical com areia branca, palmeiras desfocadas ao fundo e céu azul claro. Luz natural do sol, ambiente relaxante e veraniego. Bokeh suave no fundo para destacar o produto.";
  }

  // Winter Rule: Inverno/Couro
  if (tagsLower.some(t => ["inverno", "winter", "couro", "casaco", "sobretudo", "bota", "cachecol", "frio"].includes(t))) {
    return "Cenário urbano elegante de inverno com arquitetura moderna desfocada, neve sutil ao fundo e céu nublado. Luz difusa e ambiente sofisticado. Bokeh suave no fundo para destacar o produto.";
  }

  // Gym Integrity: Fitness/Esporte
  if (tagsLower.some(t => ["fitness", "gym", "esporte", "atividade física", "academia", "treino", "workout", "athletic"].includes(t))) {
    return "Cenário de academia moderna com equipamentos desfocados ao fundo, luz artificial brilhante e ambiente dinâmico. Paredes claras e espaço amplo. Bokeh suave no fundo para destacar o produto.";
  }

  // Office/Social: Trabalho/Formal
  if (tagsLower.some(t => ["social", "office", "trabalho", "formal", "terno", "blazer", "executivo", "corporativo"].includes(t))) {
    return "Cenário corporativo elegante com escritório moderno desfocado ao fundo, luz natural suave vinda de janelas e ambiente profissional. Mobiliário contemporâneo. Bokeh suave no fundo para destacar o produto.";
  }

  // Festa/Party: Eventos/Noite
  if (tagsLower.some(t => ["festa", "party", "noite", "evento", "gala", "balada", "cerimônia", "casamento"].includes(t))) {
    return "Cenário de evento elegante com iluminação sofisticada, decoração desfocada ao fundo e ambiente festivo refinado. Luz ambiente dramática e atmosfera exclusiva. Bokeh suave no fundo para destacar o produto.";
  }

  // Casual/Street: Casual/Dia a dia
  if (tagsLower.some(t => ["casual", "street", "dia a dia", "cotidiano", "urbano", "relaxado"].includes(t))) {
    return "Cenário urbano casual com rua movimentada desfocada ao fundo, luz natural do dia e ambiente descontraído. Arquitetura moderna e vida urbana. Bokeh suave no fundo para destacar o produto.";
  }

  // PRIORIDADE 2: Categoria do produto
  
  if (categoria.includes("vestido")) {
    if (tagsLower.some(t => ["festivo", "gala", "noite"].includes(t))) {
      return "Cenário de evento elegante com iluminação sofisticada, decoração desfocada ao fundo e ambiente festivo refinado. Luz ambiente dramática e atmosfera exclusiva. Bokeh suave no fundo para destacar o produto.";
    }
    return "Cenário elegante de estúdio de moda com fundo neutro suave, luz de estúdio profissional e ambiente sofisticado. Paredes claras e espaço minimalista. Bokeh suave no fundo para destacar o produto.";
  }

  if (categoria.includes("calça") || categoria.includes("jeans")) {
    return "Cenário urbano casual com rua movimentada desfocada ao fundo, luz natural do dia e ambiente descontraído. Arquitetura moderna e vida urbana. Bokeh suave no fundo para destacar o produto.";
  }

  if (categoria.includes("blusa") || categoria.includes("camisa") || categoria.includes("top")) {
    if (tagsLower.some(t => ["social", "office", "formal"].includes(t))) {
      return "Cenário corporativo elegante com escritório moderno desfocado ao fundo, luz natural suave vinda de janelas e ambiente profissional. Mobiliário contemporâneo. Bokeh suave no fundo para destacar o produto.";
    }
    return "Cenário casual de estúdio com fundo neutro suave, luz natural difusa e ambiente descontraído. Paredes claras e espaço minimalista. Bokeh suave no fundo para destacar o produto.";
  }

  if (categoria.includes("acessório") || categoria.includes("boné") || categoria.includes("chapéu") || categoria.includes("óculos")) {
    return "Cenário urbano contemporâneo com arquitetura moderna desfocada ao fundo, luz natural do dia e ambiente moderno. Elementos arquitetônicos interessantes. Bokeh suave no fundo para destacar o produto.";
  }

  if (categoria.includes("sapato") || categoria.includes("calçado") || categoria.includes("tênis")) {
    if (tagsLower.some(t => ["esporte", "fitness", "atlético"].includes(t))) {
      return "Cenário de academia moderna com equipamentos desfocados ao fundo, luz artificial brilhante e ambiente dinâmico. Paredes claras e espaço amplo. Bokeh suave no fundo para destacar o produto.";
    }
    return "Cenário elegante de estúdio de moda com fundo neutro suave, luz de estúdio profissional e ambiente sofisticado. Paredes claras e espaço minimalista. Bokeh suave no fundo para destacar o produto.";
  }

  // PRIORIDADE 3: Análise por detalhes do produto
  
  if (detalhesLower.some(d => d.includes("praia") || d.includes("banho") || d.includes("verão"))) {
    return "Cenário de praia tropical com areia branca, palmeiras desfocadas ao fundo e céu azul claro. Luz natural do sol, ambiente relaxante e veraniego. Bokeh suave no fundo para destacar o produto.";
  }

  if (detalhesLower.some(d => d.includes("inverno") || d.includes("frio") || d.includes("casaco"))) {
    return "Cenário urbano elegante de inverno com arquitetura moderna desfocada, neve sutil ao fundo e céu nublado. Luz difusa e ambiente sofisticado. Bokeh suave no fundo para destacar o produto.";
  }

  if (detalhesLower.some(d => d.includes("festa") || d.includes("evento") || d.includes("noite"))) {
    return "Cenário de evento elegante com iluminação sofisticada, decoração desfocada ao fundo e ambiente festivo refinado. Luz ambiente dramática e atmosfera exclusiva. Bokeh suave no fundo para destacar o produto.";
  }

  // CENÁRIO PADRÃO (se nenhuma regra específica se aplicar)
  return "Cenário elegante de estúdio de moda com fundo neutro suave, luz de estúdio profissional e ambiente sofisticado. Paredes claras e espaço minimalista. Bokeh suave no fundo para destacar o produto.";
}

/**
 * Extrai características do produto para análise de cenário
 */
export function extractProductCharacteristics(produtoData: any): ProdutoCaracteristicas {
  // Normalizar tags - pode vir como array, string separada por vírgula, ou objeto com análise IA
  let tags: string[] = [];
  if (Array.isArray(produtoData.tags)) {
    tags = produtoData.tags;
  } else if (typeof produtoData.tags === "string") {
    tags = produtoData.tags.split(",").map(t => t.trim()).filter(Boolean);
  }
  
  // Verificar se há análise IA com tags sugeridas
  if (produtoData.analiseIA?.tags && Array.isArray(produtoData.analiseIA.tags)) {
    tags = [...tags, ...produtoData.analiseIA.tags];
  } else if (produtoData.analiseIA?.tags && typeof produtoData.analiseIA.tags === "string") {
    tags = [...tags, ...produtoData.analiseIA.tags.split(",").map(t => t.trim()).filter(Boolean)];
  }
  
  // Normalizar detalhes
  let detalhes: string[] = [];
  if (Array.isArray(produtoData.detalhes)) {
    detalhes = produtoData.detalhes;
  } else if (typeof produtoData.detalhes === "string") {
    detalhes = produtoData.detalhes.split(",").map(d => d.trim()).filter(Boolean);
  }
  
  // Verificar se há análise IA com detalhes
  if (produtoData.analiseIA?.detalhes && Array.isArray(produtoData.analiseIA.detalhes)) {
    detalhes = [...detalhes, ...produtoData.analiseIA.detalhes];
  }
  
  // Remover duplicatas
  tags = [...new Set(tags)];
  detalhes = [...new Set(detalhes)];

  return {
    categoria: produtoData.categoria || produtoData.categoria_sugerida || produtoData.analiseIA?.categoria_sugerida,
    tags: tags.length > 0 ? tags : [],
    nome: produtoData.nome || produtoData.nome_sugerido || produtoData.analiseIA?.nome_sugerido,
    detalhes: detalhes.length > 0 ? detalhes : [],
    corPredominante: produtoData.cor_predominante || produtoData.cores || produtoData.analiseIA?.cor_predominante,
    tecido: produtoData.tecido_estimado || produtoData.tecido || produtoData.analiseIA?.tecido_estimado,
  };
}

