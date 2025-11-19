/**
 * Sistema de Segmentação Automática de Clientes
 * Cria tags automáticas baseadas no comportamento do cliente
 */

import { getAdminDb } from "../firebaseAdmin";
import { fetchComposicoesRecentes } from "./server";
import { fetchFavoriteLooks } from "./server";
import type { ClienteDoc } from "./types";

const db = getAdminDb();

export type ClienteSegmento =
  | "abandonou-carrinho"
  | "fa-vestidos"
  | "high-spender"
  | "somente-tryon"
  | "comprador-frequente"
  | "novo-cliente";

/**
 * Calcula segmentação automática para um cliente
 */
export async function calculateClienteSegmentation(
  lojistaId: string,
  clienteId: string
): Promise<{
  tags: string[];
  segmento?: ClienteSegmento;
}> {
  try {
    const composicoes = await fetchComposicoesRecentes(lojistaId, 10000);
    const composicoesDoCliente = composicoes.filter(
      (comp) => comp.customer?.id === clienteId
    );

    const favoritos = await fetchFavoriteLooks({ lojistaId, customerId: clienteId });

    const tags: string[] = [];
    let segmento: ClienteSegmento | undefined;

    // Verificar se é novo cliente (menos de 7 dias)
    const clienteDoc = await db
      .collection("lojas")
      .doc(lojistaId)
      .collection("clientes")
      .doc(clienteId)
      .get();

    if (clienteDoc.exists) {
      const clienteData = clienteDoc.data();
      const createdAt = clienteData?.createdAt?.toDate?.() || new Date(clienteData?.createdAt);
      const diasDesdeCriacao = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

      if (diasDesdeCriacao < 7) {
        tags.push("Novo Cliente");
        segmento = "novo-cliente";
      }
    }

    // Verificar comportamento de Try-On
    const totalTryOns = composicoesDoCliente.length;
    const totalLikes = favoritos.length;
    const totalShares = composicoesDoCliente.reduce((sum, comp) => sum + (comp.shares || 0), 0);
    const totalCheckouts = composicoesDoCliente.filter((comp) => {
      // Assumir que checkout é registrado de outra forma (pode precisar ajuste)
      return false; // Placeholder - precisa verificar como checkouts são registrados
    }).length;

    // Somente Try-On (muitas experimentações, poucos likes/compras)
    if (totalTryOns > 5 && totalLikes < 2 && totalCheckouts === 0) {
      tags.push("Somente Try-On");
      if (!segmento) segmento = "somente-tryon";
    }

    // Fã de Vestidos (analisar produtos mais experimentados)
    const produtosExperimentados = composicoesDoCliente.flatMap((comp) =>
      comp.products.map((p) => p.nome.toLowerCase())
    );
    const vestidosCount = produtosExperimentados.filter((nome) =>
      nome.includes("vestido") || nome.includes("dress")
    ).length;
    if (vestidosCount > totalTryOns * 0.5 && totalTryOns >= 3) {
      tags.push("Fã de Vestidos");
      if (!segmento) segmento = "fa-vestidos";
    }

    // High Spender Potencial (muitos likes e compartilhamentos)
    if (totalLikes > 5 && totalShares > 3) {
      tags.push("High Spender Potencial");
      if (!segmento) segmento = "high-spender";
    }

    // Comprador Frequente (muitas composições e checkouts)
    if (totalTryOns > 10 && totalCheckouts > 2) {
      tags.push("Comprador Frequente");
      if (!segmento) segmento = "comprador-frequente";
    }

    // Abandonou Carrinho (muitas experimentações, likes, mas sem checkout)
    if (totalTryOns > 3 && totalLikes > 2 && totalCheckouts === 0) {
      tags.push("Abandonou Carrinho");
      if (!segmento) segmento = "abandonou-carrinho";
    }

    return { tags, segmento };
  } catch (error) {
    console.error("[ClientSegmentation] Erro ao calcular segmentação:", error);
    return { tags: [], segmento: undefined };
  }
}

/**
 * Atualiza segmentação de um cliente
 */
export async function updateClienteSegmentation(
  lojistaId: string,
  clienteId: string
): Promise<void> {
  try {
    const { tags, segmento } = await calculateClienteSegmentation(lojistaId, clienteId);

    const clienteRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("clientes")
      .doc(clienteId);

    await clienteRef.update({
      tags,
      segmentacao: {
        tipo: segmento,
        ultimaAtualizacao: new Date(),
      },
      updatedAt: new Date(),
    });

    console.log("[ClientSegmentation] Segmentação atualizada para cliente:", clienteId);
  } catch (error) {
    console.error("[ClientSegmentation] Erro ao atualizar segmentação:", error);
    throw error;
  }
}

/**
 * Atualiza segmentação para todos os clientes
 */
export async function updateAllClientesSegmentation(
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
        await updateClienteSegmentation(lojistaId, doc.id);
        updated++;
      } catch (error) {
        console.error(`[ClientSegmentation] Erro ao atualizar cliente ${doc.id}:`, error);
        errors++;
      }
    }

    return { updated, errors };
  } catch (error) {
    console.error("[ClientSegmentation] Erro ao atualizar todas as segmentações:", error);
    throw error;
  }
}

