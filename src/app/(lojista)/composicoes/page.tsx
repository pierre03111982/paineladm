import { ComposicoesGallery, type ComposicaoItem, type FilterOptions } from "./composicoes-gallery";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { COMPOSICOES_TIMEFRAMES } from "./constants";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";

async function fetchComposicoes(
  lojistaId: string,
  searchParams: { [key: string]: string | string[] | undefined }
): Promise<{
  composicoes: ComposicaoItem[];
  filterOptions: FilterOptions;
}> {
  if (!lojistaId) {
    return {
      composicoes: [],
      filterOptions: {
        clientes: [],
        produtos: [],
      },
    };
  }

  try {
    const db = getAdminDb();
    // Buscar na coleção global "composicoes" (onde as composições são realmente salvas)
    // Filtrar por lojistaId usando where
    const composicoesRef = db.collection("composicoes");

    // Calcular data limite baseado no período
    const periodo = searchParams.periodo || "week";
    const timeframe = COMPOSICOES_TIMEFRAMES.find((t) => t.value === periodo);
    let days = 7; // padrão
    if (timeframe?.value === "today") days = 1;
    else if (timeframe?.value === "week") days = 7;
    else if (timeframe?.value === "month") days = 30;
    else if (timeframe?.value === "all") days = 0; // sem limite
    
    const dateLimit = new Date();
    if (days > 0) {
      dateLimit.setDate(dateLimit.getDate() - days);
    }

    // Buscar composições da coleção global, filtrando por lojistaId
    // Nota: Se houver erro de índice, buscar todas e filtrar/ordenar em memória
    let snapshot;
    try {
      // Tentar buscar com where + orderBy (pode precisar de índice composto)
      const query = composicoesRef
        .where("lojistaId", "==", lojistaId)
        .where("createdAt", ">=", dateLimit)
        .orderBy("createdAt", "desc")
        .limit(100);
      snapshot = await query.get();
    } catch (error: any) {
      // Se falhar por falta de índice, buscar com limite e ordenar em memória
      if (error?.code === "failed-precondition") {
        console.warn("[ComposicoesPage] Índice não encontrado, buscando com limite e ordenando em memória");
        // Buscar todas as composições do lojista (sem orderBy para evitar necessidade de índice)
        const allSnapshot = await composicoesRef
          .where("lojistaId", "==", lojistaId)
          .limit(500)
          .get();
        const allDocs: any[] = [];
        allSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data?.createdAt) {
            const createdAt = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            // Filtrar por data em memória
            if (createdAt >= dateLimit) {
              allDocs.push({ id: doc.id, data, createdAt });
            }
          }
        });
        // Ordenar por data em memória
        allDocs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        snapshot = {
          forEach: (callback: any) => {
            allDocs.slice(0, 100).forEach((item) => {
              callback({
                id: item.id,
                data: () => item.data,
                exists: true,
              });
            });
          },
        } as any;
      } else {
        throw error;
      }
    }
    const allComposicoes: any[] = [];

    snapshot.forEach((doc: any) => {
      const data = typeof doc.data === "function" ? doc.data() : doc.data;
      if (!data) return;

      // Aplicar filtros
      const cliente = searchParams.cliente as string | undefined;
      const produto = searchParams.produto as string | undefined;
      const liked = searchParams.liked === "true";
      const shared = searchParams.shared === "true";
      const anonymous = searchParams.anonymous === "true";

      // Filtrar por cliente
      if (cliente && cliente !== "all") {
        const customerId = data.customerId || "";
        if (customerId !== cliente) return;
      }

      // Filtrar por produto
      if (produto && produto !== "all") {
        const primaryProductId = data.primaryProductId || "";
        if (primaryProductId !== produto) return;
      }

      // Filtrar por curtida - mostrar todas por padrão, apenas curtidas se filtro ativo
      // Se liked === "true" (checkbox marcado), mostrar apenas curtidas
      const showOnlyLiked = searchParams.liked === "true";
      if (showOnlyLiked && !data.curtido && !data.liked) return;

      // Filtrar por compartilhamento
      if (shared) {
        // Verificar se há ações de compartilhamento
        // Por enquanto, verificamos se compartilhado é true
        if (!data.compartilhado) return;
      }

      // Filtrar por anônimo (avatar IA)
      if (anonymous) {
        // Verificar se foi usado avatar IA
        // Por enquanto, assumimos que se não tem customerId, é anônimo
        if (data.customerId) return;
      }

      // Filtrar por alta conversão
      const highConversion = searchParams.highConversion === "true";
      if (highConversion) {
        const minLikes = parseInt(searchParams.minLikes as string || "1");
        const minShares = parseInt(searchParams.minShares as string || "0");
        
        // Verificar se atende aos critérios de alta conversão
        const isLiked = data.curtido === true || data.liked === true;
        const shares = data.shares || 0;
        
        if (!isLiked && minLikes > 0) return;
        if (shares < minShares) return;
      }

      // Pegar o primeiro look (Look Natural) como preview
      const firstLook = data.looks && data.looks.length > 0 ? data.looks[0] : null;
      const previewUrl = firstLook?.imagemUrl || null;

      // Extrair informações do produto
      const productName = data.primaryProductName || firstLook?.produtoNome || "Produto";
      const productId = data.primaryProductId || "";

      // Extrair informações do cliente
      const customerId = data.customerId || "";
      const customerName = data.customerName || "Cliente Anônimo";
      const customerWhatsapp = data.customerWhatsapp || null;

      // Contar compartilhamentos (buscar em actions se disponível)
      const shares = data.shares || 0;

      // Gerar paleta de cores baseada na imagem (placeholder)
      const palette = {
        from: "#6366f1",
        via: "#8b5cf6",
        to: "#ec4899",
      };

      allComposicoes.push({
        id: doc.id,
        productKey: productId,
        productName,
        customerKey: customerId,
        customerName,
        customerWhatsapp,
        createdAtISO: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        liked: data.curtido || false,
        shares,
        isAnonymous: !customerId,
        status: "concluída",
        palette,
        previewUrl,
        images: data.looks?.map((look: any) => ({
          url: look.imagemUrl,
          storagePath: null,
        })) || [],
        basePrompt: null,
        enhancedPrompt: null,
        totalCostBRL: data.totalCostBRL || null, // Custo em BRL
        processingTime: data.processingTime || null, // Tempo de processamento em ms
      });
    });

    // Coletar opções de filtro
    const clientesSet = new Set<string>();
    const produtosSet = new Set<string>();

    // Buscar composições para gerar opções de filtro (limitado para performance)
    // Usar os mesmos dados já carregados acima em vez de buscar novamente
    allComposicoes.forEach((comp) => {
      if (comp.customerKey) {
        clientesSet.add(comp.customerKey);
      }
      if (comp.productKey) {
        produtosSet.add(comp.productKey);
      }
    });

    // Buscar nomes dos clientes e produtos
    const clientes: Array<{ value: string; label: string }> = [];
    const produtos: Array<{ value: string; label: string }> = [];

    for (const customerId of clientesSet) {
      try {
        const customerDoc = await db
          .collection("lojas")
          .doc(lojistaId)
          .collection("clientes")
          .doc(customerId)
          .get();
        
        if (customerDoc.exists) {
          const customerData = customerDoc.data();
          clientes.push({
            value: customerId,
            label: customerData?.nome || customerData?.whatsapp || "Cliente",
          });
        } else {
          clientes.push({
            value: customerId,
            label: "Cliente",
          });
        }
      } catch (error) {
        clientes.push({
          value: customerId,
          label: "Cliente",
        });
      }
    }

    for (const productId of produtosSet) {
      try {
        const productDoc = await db
          .collection("lojas")
          .doc(lojistaId)
          .collection("produtos")
          .doc(productId)
          .get();
        
        if (productDoc.exists) {
          const productData = productDoc.data();
          produtos.push({
            value: productId,
            label: productData?.nome || "Produto",
          });
        } else {
          produtos.push({
            value: productId,
            label: "Produto",
          });
        }
      } catch (error) {
        produtos.push({
          value: productId,
          label: "Produto",
        });
      }
    }

    return {
      composicoes: allComposicoes,
      filterOptions: {
        clientes: clientes.sort((a, b) => a.label.localeCompare(b.label)),
        produtos: produtos.sort((a, b) => a.label.localeCompare(b.label)),
      },
    };
  } catch (error) {
    console.error("[ComposicoesPage] Erro ao buscar composições:", error);
    return {
      composicoes: [],
      filterOptions: {
        clientes: [],
        produtos: [],
      },
    };
  }
}

type SearchParams = {
  cliente?: string;
  produto?: string;
  periodo?: string;
  liked?: string;
  shared?: string;
  anonymous?: string;
  highConversion?: string;
  minLikes?: string;
  minShares?: string;
  lojistaId?: string;
};

export const dynamic = 'force-dynamic';

export default async function ComposicoesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams> | SearchParams;
}) {
  const params = await Promise.resolve(searchParams);
  const lojistaIdFromQuery = params.lojistaId;
  
  // Prioridade: query string (modo admin) > usuário logado > env var
  const lojistaIdFromAuth = lojistaIdFromQuery ? null : await getCurrentLojistaId();
  const lojistaId =
    lojistaIdFromQuery ||
    lojistaIdFromAuth ||
    process.env.NEXT_PUBLIC_LOJISTA_ID ||
    process.env.LOJISTA_ID ||
    "";

  let composicoes: ComposicaoItem[] = [];
  let filterOptions: FilterOptions = {
    clientes: [],
    produtos: [],
  };

  try {
    const result = await fetchComposicoes(
      lojistaId,
      params
    );
    composicoes = result.composicoes;
    filterOptions = result.filterOptions;
  } catch (error) {
    console.error("[ComposicoesPage] Erro ao buscar composições:", error);
  }

  const filters = {
    cliente: params.cliente || "all",
    produto: params.produto || "all",
    timeframe: params.periodo || "7d",
    liked: params.liked === "true",
    shared: params.shared === "true",
    anonymous: params.anonymous === "true",
    highConversion: params.highConversion === "true",
    minLikes: params.minLikes ? parseInt(params.minLikes) : undefined,
    minShares: params.minShares ? parseInt(params.minShares) : undefined,
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Composições</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Visualize e gerencie todas as composições geradas
        </p>
      </div>
      <ComposicoesGallery
        composicoes={composicoes}
        filterOptions={filterOptions}
        filters={filters}
        lojistaId={lojistaId}
      />
    </div>
  );
}












