import { getAdminDb } from "@/lib/firebaseAdmin";

export type CompositionForVisualHistory = {
  id: string;
  imagemUrl: string;
  createdAt: Date;
  customerName: string;
  customerWhatsapp: string | null;
  produtoNome?: string;
  customerId: string;
};

export async function fetchAllCompositionsForVisualHistory(
  lojistaId: string
): Promise<CompositionForVisualHistory[]> {
  if (!lojistaId) {
    console.warn("[fetchAllCompositions] ⚠️  lojistaId não fornecido");
    return [];
  }

  console.log(`[fetchAllCompositions] 🔍 Buscando composições para lojistaId: ${lojistaId}`);

  try {
    const db = getAdminDb();
    const allCompositions: CompositionForVisualHistory[] = [];
    const clientesCache = new Map<string, { nome: string | null; whatsapp: string | null }>();

    // PAINEL DO LOJISTA: Buscar APENAS da subcoleção (não acessa coleção global)
    // Apenas o painel administrativo tem acesso à coleção global
    try {
      // Usar EXATAMENTE a mesma estratégia do Radar
      const subcollectionRef = db
        .collection("lojas")
        .doc(lojistaId)
        .collection("composicoes");
      
      // USAR EXATAMENTE A MESMA ESTRATÉGIA DO RADAR
      // O Radar usa: subcollectionRef.limit(1000).get() SEM paginação
      // Isso garante que ambas as páginas busquem da mesma forma e encontrem as mesmas composições
      const snapshot = await subcollectionRef.limit(1000).get();
      
      console.log(`[fetchAllCompositions] ✅ Total de documentos encontrados: ${snapshot.size} (igual ao Radar: limit 1000)`);
      
      // Se houver exatamente 1000, pode haver mais composições
      // Mas vamos manter igual ao Radar que também usa apenas limit(1000)
      if (snapshot.size === 1000) {
        console.log(`[fetchAllCompositions] ⚠️  Limite de 1000 atingido. Pode haver mais composições, mas usando mesma estratégia do Radar.`);
      }

      // Processar todas as composições encontradas (EXATAMENTE como o Radar faz)
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Converter data - EXATAMENTE como o Radar faz
        let createdAt: Date;
        if (data?.createdAt) {
          if (data.createdAt.toDate) {
            createdAt = data.createdAt.toDate();
          } else if (data.createdAt instanceof Date) {
            createdAt = data.createdAt;
          } else if (typeof data.createdAt === 'string') {
            createdAt = new Date(data.createdAt);
          } else {
            createdAt = new Date();
          }
        } else {
          createdAt = new Date();
        }

        // Pegar URL da imagem - EXATAMENTE como o Radar faz
        // O Radar usa: data.imagemUrl || data.imageUrl (linha 173 do crm-queries.ts)
        // MAS o Radar não filtra composições sem imagem, apenas deixa vazio
        let imagemUrl = data.imagemUrl || data.imageUrl || "";
        
        // Se não tem no nível raiz, verificar no array looks (onde as composições novas estão)
        // Isso é uma melhoria sobre o Radar - vamos buscar também em looks para encontrar todas
        if (!imagemUrl || imagemUrl.trim() === "") {
          const firstLook = data.looks && Array.isArray(data.looks) && data.looks.length > 0 ? data.looks[0] : null;
          if (firstLook) {
            imagemUrl = firstLook?.imagemUrl || firstLook?.imageUrl || firstLook?.url || "";
          }
        }
        
        // NÃO filtrar composições sem imagem - o Radar também não filtra
        // Apenas deixar imagemUrl vazio se não encontrar
        
        // Excluir remixes explícitos (igual ao Radar faz)
        const isRemix = data.isRemix === true;
        if (isRemix) {
          return; // Não incluir remixes explícitos
        }

        // Extrair informações do cliente
        const customerId = data.customerId || "";
        let customerName = data.customerName || data.clienteNome || null;
        let customerWhatsapp = data.customerWhatsapp || null;

        // Produto
        const produtoNome = data.primaryProductName || data.produtoNome || data.productName;

        allCompositions.push({
          id: doc.id,
          imagemUrl,
          createdAt,
          customerName: customerName || "Cliente Anônimo",
          customerWhatsapp,
          produtoNome,
          customerId,
        });
      });
      
      console.log(`[fetchAllCompositions] ✅ ${snapshot.size} documentos processados, ${allCompositions.length} composições válidas`);
    } catch (error) {
      console.error("[fetchAllCompositions] ❌ Erro ao buscar da subcoleção:", error);
      if (error instanceof Error) {
        console.error("[fetchAllCompositions] Mensagem:", error.message);
      }
    }

    // NOTA: Painel do lojista não acessa coleção global
    // Apenas painel administrativo tem acesso à coleção global

    // Buscar dados dos clientes que faltam
    const customerIdsToFetch = new Set<string>();
    allCompositions.forEach(comp => {
      if (comp.customerId && (!comp.customerName || !comp.customerWhatsapp)) {
        customerIdsToFetch.add(comp.customerId);
      }
    });

    // Buscar dados dos clientes
    for (const customerId of customerIdsToFetch) {
      if (clientesCache.has(customerId)) {
        continue;
      }

      try {
        const customerDoc = await db
          .collection("lojas")
          .doc(lojistaId)
          .collection("clientes")
          .doc(customerId)
          .get();

        if (customerDoc.exists) {
          const customerData = customerDoc.data();
          clientesCache.set(customerId, {
            nome: customerData?.nome || null,
            whatsapp: customerData?.whatsapp || null,
          });
        } else {
          clientesCache.set(customerId, { nome: null, whatsapp: null });
        }
      } catch (error) {
        console.warn(`[fetchAllCompositions] Erro ao buscar dados do cliente ${customerId}:`, error);
        clientesCache.set(customerId, { nome: null, whatsapp: null });
      }
    }

    // Atualizar composições com dados dos clientes
    allCompositions.forEach(comp => {
      if (comp.customerId && clientesCache.has(comp.customerId)) {
        const cached = clientesCache.get(comp.customerId)!;
        if (!comp.customerName || comp.customerName === "Cliente Anônimo") {
          comp.customerName = cached.nome || "Cliente Anônimo";
        }
        if (!comp.customerWhatsapp) {
          comp.customerWhatsapp = cached.whatsapp || null;
        }
      }
    });

    // Ordenar por data (mais recente primeiro)
    allCompositions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    console.log(`[fetchAllCompositions] ✅ Total final: ${allCompositions.length} composições encontradas e ordenadas`);

    // Log detalhado das datas
    if (allCompositions.length > 0) {
      const maisRecente = allCompositions[0];
      const maisAntiga = allCompositions[allCompositions.length - 1];
      console.log(`[fetchAllCompositions] 📅 Mais recente: ${maisRecente.createdAt.toLocaleDateString("pt-BR")} ${maisRecente.createdAt.toLocaleTimeString("pt-BR")}`);
      console.log(`[fetchAllCompositions] 📅 Mais antiga: ${maisAntiga.createdAt.toLocaleDateString("pt-BR")} ${maisAntiga.createdAt.toLocaleTimeString("pt-BR")}`);
      
      // Log das 10 mais recentes para debug
      console.log(`[fetchAllCompositions] 📋 10 composições mais recentes:`);
      allCompositions.slice(0, 10).forEach((comp, idx) => {
        const dateStr = comp.createdAt.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        console.log(`  ${idx + 1}. ${dateStr} | ${comp.customerName}`);
      });
    }

    return allCompositions;
  } catch (error) {
    console.error("[fetchAllCompositions] ❌ Erro ao buscar composições:", error);
    if (error instanceof Error) {
      console.error("[fetchAllCompositions] Stack:", error.stack);
    }
    return [];
  }
}
