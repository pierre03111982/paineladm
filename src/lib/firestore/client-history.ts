/**
 * Sistema de Histórico de Tentativas de Clientes
 * Registra quais produtos o cliente experimentou, mesmo sem comprar ou favoritar
 */

import { getAdminDb } from "../firebaseAdmin";
import { fetchComposicoesRecentes, fetchProdutos } from "./server";
import type { ClienteDoc } from "./types";

const db = getAdminDb();

export interface ProdutoExperimentado {
  produtoId: string;
  produtoNome: string;
  categoria: string;
  dataTentativa: Date;
  liked?: boolean;
  compartilhado?: boolean;
  checkout?: boolean;
}

/**
 * Busca histórico de tentativas de um cliente
 */
export async function getClienteTentativasHistory(
  lojistaId: string,
  clienteId: string
): Promise<ProdutoExperimentado[]> {
  try {
    const composicoes = await fetchComposicoesRecentes(lojistaId, 10000);
    const composicoesDoCliente = composicoes.filter(
      (comp) => comp.customer?.id === clienteId
    );

    // Buscar produtos para obter categorias
    const produtos = await fetchProdutos(lojistaId);
    const produtosMap = new Map(produtos.map((p) => [p.id, p]));

    const produtosExperimentados: ProdutoExperimentado[] = [];
    const produtosVistos = new Set<string>(); // Para evitar duplicatas

    composicoesDoCliente.forEach((comp) => {
      comp.products.forEach((produto) => {
        // Usar chave única: produtoId + data (para permitir múltiplas tentativas do mesmo produto)
        const chave = `${produto.id}-${comp.createdAt.getTime()}`;
        if (!produtosVistos.has(chave)) {
          produtosVistos.add(chave);

          // Buscar categoria do produto
          const produtoCompleto = produtosMap.get(produto.id);
          const categoria = produtoCompleto?.categoria || "Sem categoria";

          produtosExperimentados.push({
            produtoId: produto.id,
            produtoNome: produto.nome,
            categoria,
            dataTentativa: comp.createdAt,
            liked: comp.liked,
            compartilhado: comp.shares > 0,
            checkout: false, // Placeholder - precisa verificar como checkouts são registrados
          });
        }
      });
    });

    // Ordenar por data (mais recente primeiro)
    produtosExperimentados.sort(
      (a, b) => b.dataTentativa.getTime() - a.dataTentativa.getTime()
    );

    return produtosExperimentados;
  } catch (error) {
    console.error("[ClientHistory] Erro ao buscar histórico:", error);
    return [];
  }
}

/**
 * Atualiza histórico de tentativas de um cliente
 */
export async function updateClienteTentativasHistory(
  lojistaId: string,
  clienteId: string
): Promise<void> {
  try {
    const produtosExperimentados = await getClienteTentativasHistory(lojistaId, clienteId);

    const clienteRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("clientes")
      .doc(clienteId);

    // Converter datas para formato compatível com Firestore
    const produtosParaSalvar = produtosExperimentados.map((prod) => ({
      ...prod,
      dataTentativa: prod.dataTentativa,
    }));

    await clienteRef.update({
      historicoTentativas: {
        produtosExperimentados: produtosParaSalvar,
        ultimaAtualizacao: new Date(),
      },
      updatedAt: new Date(),
    });

    console.log("[ClientHistory] Histórico atualizado para cliente:", clienteId);
  } catch (error) {
    console.error("[ClientHistory] Erro ao atualizar histórico:", error);
    throw error;
  }
}

/**
 * Atualiza histórico para todos os clientes
 */
export async function updateAllClientesTentativasHistory(
  lojistaId: string
): Promise<{ updated: number; errors: number }> {
  try {
    const clientesSnapshot = await db
      .collection("lojas")
      .doc(lojistaId)
      .collection("clientes")
      .where("arquivado", "!=", true)
      .get();

    let updated = 0;
    let errors = 0;

    for (const doc of clientesSnapshot.docs) {
      try {
        await updateClienteTentativasHistory(lojistaId, doc.id);
        updated++;
      } catch (error) {
        console.error(`[ClientHistory] Erro ao atualizar cliente ${doc.id}:`, error);
        errors++;
      }
    }

    return { updated, errors };
  } catch (error) {
    console.error("[ClientHistory] Erro ao atualizar todos os históricos:", error);
    throw error;
  }
}

