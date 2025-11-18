/**
 * Sistema de Envio Massivo de Promoções
 * Permite enviar mensagens promocionais para múltiplos clientes baseado em composições
 */

import { getAdminDb } from "../firebaseAdmin";
import { fetchComposicoesRecentes } from "./server";

const db = getAdminDb();

export interface PromocaoMassiva {
  composicaoIds: string[];
  mensagemTemplate: string;
  lojistaId: string;
}

export interface ClientePromocao {
  clienteId: string;
  clienteNome: string;
  clienteWhatsapp: string | null;
  composicaoId: string;
  produtoNome: string;
  imagemUrl: string | null;
}

/**
 * Busca clientes únicos de composições selecionadas
 */
export async function getClientesFromComposicoes(
  lojistaId: string,
  composicaoIds: string[]
): Promise<ClientePromocao[]> {
  try {
    const composicoes = await fetchComposicoesRecentes(lojistaId, 10000);
    const composicoesSelecionadas = composicoes.filter((comp) =>
      composicaoIds.includes(comp.id)
    );

    const clientesMap = new Map<string, ClientePromocao>();
    const clienteIdsUnicos = new Set<string>();

    // Coletar IDs únicos de clientes
    composicoesSelecionadas.forEach((comp) => {
      if (!comp.customer?.id) return; // Pular anônimos
      clienteIdsUnicos.add(comp.customer.id);
    });

    // Buscar dados de todos os clientes de uma vez
    const clientesPromises = Array.from(clienteIdsUnicos).map(async (clienteId) => {
      try {
        const clienteRef = db
          .collection("lojas")
          .doc(lojistaId)
          .collection("clientes")
          .doc(clienteId);
        const doc = await clienteRef.get();
        
        if (doc.exists) {
          const clienteData = doc.data();
          const whatsapp = clienteData?.whatsapp || null;
          
          // Encontrar composição associada a este cliente
          const comp = composicoesSelecionadas.find((c) => c.customer?.id === clienteId);
          if (comp) {
            const produtoNome = comp.products[0]?.nome || "Produto";
            
            return {
              clienteId,
              clienteNome: comp.customer.nome,
              clienteWhatsapp: whatsapp,
              composicaoId: comp.id,
              produtoNome,
              imagemUrl: null, // Placeholder
            };
          }
        }
        return null;
      } catch (error) {
        console.error(`[CompositionPromotions] Erro ao buscar cliente ${clienteId}:`, error);
        return null;
      }
    });

    const clientes = await Promise.all(clientesPromises);
    clientes.forEach((cliente) => {
      if (cliente) {
        clientesMap.set(cliente.clienteId, cliente);
      }
    });

    return Array.from(clientesMap.values());
  } catch (error) {
    console.error("[CompositionPromotions] Erro ao buscar clientes:", error);
    return [];
  }
}

/**
 * Filtra composições por alta conversão
 */
export async function getHighConversionComposicoes(
  lojistaId: string,
  options: {
    minLikes?: number;
    minShares?: number;
    hasCheckout?: boolean;
    limit?: number;
  } = {}
): Promise<string[]> {
  try {
    const composicoes = await fetchComposicoesRecentes(lojistaId, 10000);

    const minLikes = options.minLikes || 1;
    const minShares = options.minShares || 0;
    const hasCheckout = options.hasCheckout || false;
    const limit = options.limit || 50;

    // Filtrar composições de alta conversão
    const highConversion = composicoes
      .filter((comp) => {
        if (comp.liked && minLikes > 0) return true;
        if (comp.shares >= minShares) return true;
        // Placeholder para checkout - precisa verificar como checkouts são registrados
        if (hasCheckout) {
          // Por enquanto, retornar false se não houver lógica de checkout
          return false;
        }
        return false;
      })
      .slice(0, limit)
      .map((comp) => comp.id);

    return highConversion;
  } catch (error) {
    console.error("[CompositionPromotions] Erro ao buscar alta conversão:", error);
    return [];
  }
}

