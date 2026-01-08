/**
 * PHASE 29: Engine de Profiling de Cliente
 * Atualiza o DNA de Estilo do cliente baseado em interações com produtos
 */

import { getAdminDb } from "@/lib/firebaseAdmin";
import type { ClienteDoc, ProdutoDoc } from "./types";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Pesos para cada tipo de interação
 */
const INTERACTION_WEIGHTS = {
  "try-on": 1,    // Gerou look (peso baixo)
  "like": 3,      // Curtiu resultado (peso médio)
  "buy": 10,      // Comprou/Checkout (peso alto - intenção máxima)
} as const;

type InteractionType = keyof typeof INTERACTION_WEIGHTS;

/**
 * Atualiza o DNA de Estilo do cliente baseado em uma interação com produto
 * 
 * @param lojistaId ID da loja
 * @param clienteId ID do cliente
 * @param interactionType Tipo de interação (try-on, like, buy)
 * @param productData Dados do produto interagido (deve conter metadados da IA: cor, tecido, tags)
 */
export async function updateClientDNA(
  lojistaId: string,
  clienteId: string,
  interactionType: InteractionType,
  productData: ProdutoDoc
): Promise<void> {
  if (!lojistaId || !clienteId || !productData) {
    console.warn("[client-profiling] Parâmetros inválidos para updateClientDNA");
    return;
  }

  try {
    const db = getAdminDb();
    const clienteRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("clientes")
      .doc(clienteId);

    // Obter peso da interação
    const weight = INTERACTION_WEIGHTS[interactionType];

    // Buscar documento atual do cliente
    const clienteDoc = await clienteRef.get();

    if (!clienteDoc.exists) {
      console.warn("[client-profiling] Cliente não encontrado:", clienteId);
      return;
    }

    const clienteData = clienteDoc.data() as ClienteDoc;

    // Inicializar dnaEstilo se não existir
    const currentDNA = clienteData.dnaEstilo || {
      coresPreferidas: {},
      tecidosPreferidos: {},
      tagsInteresse: {},
      faixaPrecoMedia: 0,
      tamanhosProvados: {},
      ultimaAtualizacao: new Date().toISOString(),
    };

    // Atualizar cores preferidas
    if (productData.cores && Array.isArray(productData.cores) && productData.cores.length > 0) {
      productData.cores.forEach((cor) => {
        const corNormalizada = cor.toLowerCase().trim();
        if (corNormalizada) {
          currentDNA.coresPreferidas[corNormalizada] = 
            (currentDNA.coresPreferidas[corNormalizada] || 0) + weight;
        }
      });
    } else if (productData.obs) {
      // Tentar extrair cor do campo obs se não tiver cores explícitas
      const obsLower = productData.obs.toLowerCase();
      const coresComuns = ["preto", "branco", "azul", "vermelho", "verde", "amarelo", "rosa", "roxo", "bege", "marrom", "cinza", "laranja", "verde", "amarelo"];
      coresComuns.forEach((cor) => {
        if (obsLower.includes(cor)) {
          currentDNA.coresPreferidas[cor] = 
            (currentDNA.coresPreferidas[cor] || 0) + weight;
        }
      });
    }

    // Atualizar tecidos preferidos (extrair do campo obs ou tags)
    // Se o produto tiver tags relacionadas a tecido, usar elas
    if (productData.tags && Array.isArray(productData.tags)) {
      const tecidosComuns = ["algodão", "linho", "poliéster", "seda", "couro", "jeans", "malha", "viscose"];
      productData.tags.forEach((tag) => {
        const tagLower = tag.toLowerCase().trim();
        const tecidoEncontrado = tecidosComuns.find((t) => tagLower.includes(t));
        if (tecidoEncontrado) {
          currentDNA.tecidosPreferidos[tecidoEncontrado] = 
            (currentDNA.tecidosPreferidos[tecidoEncontrado] || 0) + weight;
        }
      });
    }

    // Extrair tecido do campo obs se não encontrou nas tags
    if (productData.obs) {
      const obsLower = productData.obs.toLowerCase();
      const tecidosComuns = ["algodão", "linho", "poliéster", "seda", "couro", "jeans", "malha", "viscose"];
      tecidosComuns.forEach((tecido) => {
        if (obsLower.includes(tecido)) {
          currentDNA.tecidosPreferidos[tecido] = 
            (currentDNA.tecidosPreferidos[tecido] || 0) + weight;
        }
      });
    }

    // Atualizar tags de interesse (usar tags do produto)
    if (productData.tags && Array.isArray(productData.tags)) {
      productData.tags.forEach((tag) => {
        const tagNormalizada = tag.toLowerCase().trim();
        if (tagNormalizada) {
          currentDNA.tagsInteresse[tagNormalizada] = 
            (currentDNA.tagsInteresse[tagNormalizada] || 0) + weight;
        }
      });
    }

    // Adicionar categoria como tag de interesse
    if (productData.categoria) {
      const categoriaNormalizada = productData.categoria.toLowerCase().trim();
      if (categoriaNormalizada) {
        currentDNA.tagsInteresse[categoriaNormalizada] = 
          (currentDNA.tagsInteresse[categoriaNormalizada] || 0) + weight;
      }
    }

    // Atualizar tamanhos provados
    if (productData.tamanhos && Array.isArray(productData.tamanhos)) {
      productData.tamanhos.forEach((tamanho) => {
        const tamanhoNormalizado = tamanho.toUpperCase().trim();
        if (tamanhoNormalizado) {
          currentDNA.tamanhosProvados[tamanhoNormalizado] = 
            (currentDNA.tamanhosProvados[tamanhoNormalizado] || 0) + weight;
        }
      });
    }

    // Recalcular faixa de preço média
    // Usar média ponderada: (média_atual * total_interacoes + preço_atual) / (total_interacoes + 1)
    const totalInteracoesAnteriores = Object.values(currentDNA.coresPreferidas).reduce((sum, val) => sum + val, 0) || 0;
    const precoAtual = productData.preco || 0;
    
    if (totalInteracoesAnteriores === 0) {
      // Primeira interação
      currentDNA.faixaPrecoMedia = precoAtual;
    } else {
      // Média ponderada
      const mediaAnterior = currentDNA.faixaPrecoMedia || 0;
      const novoTotal = totalInteracoesAnteriores + weight;
      currentDNA.faixaPrecoMedia = (mediaAnterior * totalInteracoesAnteriores + precoAtual * weight) / novoTotal;
    }

    // Atualizar timestamp
    currentDNA.ultimaAtualizacao = new Date().toISOString();

    // Salvar no Firestore
    await clienteRef.update({
      dnaEstilo: currentDNA,
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log("[client-profiling] ✅ DNA de Estilo atualizado:", {
      clienteId,
      interactionType,
      weight,
      coresCount: Object.keys(currentDNA.coresPreferidas).length,
      tecidosCount: Object.keys(currentDNA.tecidosPreferidos).length,
      tagsCount: Object.keys(currentDNA.tagsInteresse).length,
    });
  } catch (error: any) {
    console.error("[client-profiling] ❌ Erro ao atualizar DNA de Estilo:", error);
    // Não lançar erro - profiling não deve quebrar o fluxo principal
  }
}

/**
 * Obtém o DNA de Estilo do cliente
 */
export async function getClientDNA(
  lojistaId: string,
  clienteId: string
): Promise<ClienteDoc["dnaEstilo"] | null> {
  try {
    const db = getAdminDb();
    const clienteDoc = await db
      .collection("lojas")
      .doc(lojistaId)
      .collection("clientes")
      .doc(clienteId)
      .get();

    if (!clienteDoc.exists) {
      return null;
    }

    const clienteData = clienteDoc.data() as ClienteDoc;
    return clienteData.dnaEstilo || null;
  } catch (error: any) {
    console.error("[client-profiling] Erro ao obter DNA de Estilo:", error);
    return null;
  }
}

