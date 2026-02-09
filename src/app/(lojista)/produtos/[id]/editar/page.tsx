import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { ProductEditorLayout } from "@/components/admin/products/ProductEditorLayout";
import { PageWrapper } from "@/components/ui/PageWrapper";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

type EditarProdutoPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function EditarProdutoPage({ params, searchParams }: EditarProdutoPageProps) {
  const { id } = await params;
  const queryParams = await searchParams;
  
  // Tentar ler tanto lojistaId quanto lojistald (para compatibilidade com typos)
  const lojistaIdFromQuery = (queryParams.lojistaId || queryParams.lojistald) as string | undefined;
  
  // Prioridade: query string (modo admin) > usuário logado > env var
  const lojistaIdFromAuth = lojistaIdFromQuery ? null : await getCurrentLojistaId();
  const lojistaId =
    lojistaIdFromQuery ||
    lojistaIdFromAuth ||
    process.env.NEXT_PUBLIC_LOJISTA_ID ||
    process.env.LOJISTA_ID ||
    "";

  if (!lojistaId) {
    return (
      <PageWrapper>
        <div className="p-6">
          <p className="text-red-500">Erro: ID da loja não encontrado</p>
        </div>
      </PageWrapper>
    );
  }

  // Buscar produto do Firestore
  const db = getAdminDb();
  const produtoDoc = await db
    .collection("lojas")
    .doc(lojistaId)
    .collection("produtos")
    .doc(id)
    .get();

  if (!produtoDoc.exists) {
    notFound();
  }

  const produtoData = produtoDoc.data();
  if (!produtoData) {
    notFound();
  }

  // Converter Timestamps do Firestore para valores serializáveis
  const produto: any = {
    id: produtoDoc.id,
    ...produtoData,
  };

  // Converter createdAt se existir
  if (produto.createdAt && typeof produto.createdAt.toDate === 'function') {
    produto.createdAt = produto.createdAt.toDate().toISOString();
  } else if (produto.createdAt && produto.createdAt._seconds) {
    produto.createdAt = new Date(produto.createdAt._seconds * 1000).toISOString();
  }

  // Converter updatedAt se existir
  if (produto.updatedAt && typeof produto.updatedAt.toDate === 'function') {
    produto.updatedAt = produto.updatedAt.toDate().toISOString();
  } else if (produto.updatedAt && produto.updatedAt._seconds) {
    produto.updatedAt = new Date(produto.updatedAt._seconds * 1000).toISOString();
  }

  // Converter catalogGeneratedAt se existir
  if (produto.catalogGeneratedAt && typeof produto.catalogGeneratedAt.toDate === 'function') {
    produto.catalogGeneratedAt = produto.catalogGeneratedAt.toDate().toISOString();
  } else if (produto.catalogGeneratedAt && produto.catalogGeneratedAt._seconds) {
    produto.catalogGeneratedAt = new Date(produto.catalogGeneratedAt._seconds * 1000).toISOString();
  }

  // Garantir que todos os valores sejam serializáveis (remover funções, classes, etc)
  const produtoSerializado = JSON.parse(JSON.stringify(produto));

  // Preparar dados iniciais para o editor
  // Limpar a data da descrição SEO se existir
  const descricaoSEO = (produtoSerializado.observacoes || produtoSerializado.obs || "").toString();
  const descricaoSEOLimpa = descricaoSEO
    .replace(/\[Análise IA[^\]]*\]\s*/g, "") // Remove [Análise IA - data]
    .trim();
  
  // Carregar dados COMPLETOS da análise IA do Firestore
  const analiseIASalva = produtoSerializado.analiseIA || {};
  
  // Carregar variações do produto se existirem
  const variacoesSalvas = produtoSerializado.variacoes && Array.isArray(produtoSerializado.variacoes) 
    ? produtoSerializado.variacoes.map((v: any, index: number) => ({
        id: `existing-${index}-${Date.now()}`,
        variacao: v.variacao || produtoSerializado.tamanhos?.[index] || "",
        estoque: v.estoque?.toString() || "0",
        sku: v.sku || "",
        equivalence: v.equivalence || "",
      }))
    : [];

  // Verificar se produto tem variações ativas
  const temVariacoesAtivo = variacoesSalvas.length > 0 || 
    (produtoSerializado.variacoes && Array.isArray(produtoSerializado.variacoes) && produtoSerializado.variacoes.length > 0);

  const initialEditorData = {
    rawImageUrl: produtoSerializado.imagemUrlOriginal || produtoSerializado.imagemUrl || "",
    aiAnalysisData: {
      // Nome e descrição
      nome_sugerido: analiseIASalva.nome_sugerido || produtoSerializado.nome || "",
      descricao_seo: analiseIASalva.descricao_seo || descricaoSEOLimpa,
      
      // Categoria e tipo
      suggested_category: analiseIASalva.suggested_category || analiseIASalva.categoria_sugerida || produtoSerializado.categoria || "Roupas",
      categoria_sugerida: analiseIASalva.categoria_sugerida || analiseIASalva.suggested_category || produtoSerializado.categoria || "Roupas",
      product_type: analiseIASalva.product_type || produtoSerializado.product_type || "",
      
      // Tecido
      detected_fabric: analiseIASalva.detected_fabric || analiseIASalva.tecido_estimado || produtoSerializado.detected_fabric || "",
      tecido_estimado: analiseIASalva.tecido_estimado || analiseIASalva.detected_fabric || produtoSerializado.detected_fabric || "",
      
      // Cores
      dominant_colors: analiseIASalva.dominant_colors || produtoSerializado.dominant_colors || [],
      cor_predominante: analiseIASalva.cor_predominante || (Array.isArray(produtoSerializado.cores) 
        ? (produtoSerializado.cores[0] || "")
        : (typeof produtoSerializado.cores === "string" 
          ? produtoSerializado.cores.split("-")[0]?.trim() || ""
          : "")),
      
      // Detalhes e tags
      detalhes: analiseIASalva.detalhes || [],
      tags: analiseIASalva.tags || (Array.isArray(produtoSerializado.tags) ? produtoSerializado.tags : []),
    },
    generatedCatalogImage: produtoSerializado.imagemUrlCatalogo || (Array.isArray(produtoSerializado.catalogImageUrls) && produtoSerializado.catalogImageUrls[0]) || null,
    generatedCombinedImage: produtoSerializado.imagemUrlCombinada || (Array.isArray(produtoSerializado.catalogImageUrls) && produtoSerializado.catalogImageUrls[4]) || null,
    // Garantir que todas as imagens do catálogo IA apareçam ao editar rascunho: usar catalogImageUrls se existir, senão [imagemUrlCatalogo] para pelo menos slot1
    catalogImageUrls:
      Array.isArray(produtoSerializado.catalogImageUrls) && produtoSerializado.catalogImageUrls.length > 0
        ? produtoSerializado.catalogImageUrls
        : produtoSerializado.imagemUrlCatalogo
          ? [produtoSerializado.imagemUrlCatalogo]
          : undefined,
    selectedCoverImage: produtoSerializado.imagemUrl || produtoSerializado.imagemUrlOriginal || null,
    imagemMedidasCustomizada: produtoSerializado.imagemMedidasCustomizada || null,
    manualData: {
      preco: produtoSerializado.preco?.toString().replace(".", ",") || "",
      precoPromocional: produtoSerializado.precoPromocional?.toString().replace(".", ",") || "",
      estoque: produtoSerializado.estoque?.toString() || "",
      sku: produtoSerializado.sku || "",
      tamanhos: Array.isArray(produtoSerializado.tamanhos) ? produtoSerializado.tamanhos : [],
      cores: Array.isArray(produtoSerializado.cores) 
        ? produtoSerializado.cores 
        : (typeof produtoSerializado.cores === "string" 
          ? produtoSerializado.cores.split("-").map((c: string) => c.trim()).filter(Boolean)
          : []),
      ativo: produtoSerializado.ativo !== undefined ? produtoSerializado.ativo : true,
      destaquePromocional: produtoSerializado.destaquePromocional || false,
      exibirNoDisplay: produtoSerializado.exibirNoDisplay || false,
      unidadeMedida: produtoSerializado.unidadeMedida || "UN",
    },
    // Carregar variações e estado de variações
    temVariacoes: temVariacoesAtivo,
    variacoes: variacoesSalvas.length > 0 
      ? variacoesSalvas 
      : (produtoSerializado.tamanhos && Array.isArray(produtoSerializado.tamanhos) && produtoSerializado.tamanhos.length > 0
          ? produtoSerializado.tamanhos.map((tamanho: string, index: number) => ({
              id: `generated-${index}-${Date.now()}`,
              variacao: tamanho,
              estoque: produtoSerializado.estoque?.toString() || "0",
              sku: "",
            }))
          : []),
    // Status do produto para proteção de navegação (rascunho vs publicado)
    productStatus: produtoSerializado.status === "draft" ? "draft" as const : ("published" as const),
    // Foto Costas e extras: restaurar para não perder após redirecionamento do auto-save rascunho
    extraImages: Array.isArray(produtoSerializado.extraImageUrls) && produtoSerializado.extraImageUrls.length > 0
      ? produtoSerializado.extraImageUrls.map((e: { idx: number; url: string }) => ({ idx: e.idx, url: e.url, file: null }))
      : [],
    // Produtos usados nos Looks Combinados 1 e 2 — exibir ao editar
    lookCombinado1ProductIds: Array.isArray(produtoSerializado.lookCombinado1ProductIds) && produtoSerializado.lookCombinado1ProductIds.length > 0
      ? produtoSerializado.lookCombinado1ProductIds
      : undefined,
    lookCombinado2ProductIds: Array.isArray(produtoSerializado.lookCombinado2ProductIds) && produtoSerializado.lookCombinado2ProductIds.length > 0
      ? produtoSerializado.lookCombinado2ProductIds
      : undefined,
  };

  return (
    <PageWrapper>
      <ProductEditorLayout 
        lojistaId={lojistaId} 
        produtoId={id}
        produtoNome={produtoSerializado.nome || "Produto"}
        initialData={initialEditorData}
      />
    </PageWrapper>
  );
}

