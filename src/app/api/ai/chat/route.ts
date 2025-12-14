/**
 * API Route: AI Chat (Consultoria de Vendas & Onboarding)
 * POST /api/ai/chat
 * 
 * Chat inteligente com contexto de negócios do lojista
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getVertexAgent } from "@/lib/ai-services/vertex-agent";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { getAllInsights } from "@/lib/firestore/insights";
import { analyzeCustomerProfile } from "@/lib/ai-services/tools/customer-analysis";
import { FieldValue } from "firebase-admin/firestore";
import { countAllCompositions } from "@/app/(lojista)/composicoes/count-compositions";
import { checkAdminAccess } from "@/lib/auth/admin-auth";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, lojistaId: lojistaIdFromBody, image, history } = body;

    // Validar: deve ter mensagem OU imagem
    if ((!message || typeof message !== "string") && !image) {
      return NextResponse.json(
        { error: "Mensagem ou imagem é obrigatória" },
        { status: 400 }
      );
    }

    // Verificar se é admin (para acesso à coleção global)
    const isAdmin = await checkAdminAccess();

    // Obter lojistaId
    const lojistaIdFromAuth = lojistaIdFromBody ? null : await getCurrentLojistaId();
    const lojistaId = lojistaIdFromBody || lojistaIdFromAuth;

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const lojaRef = db.collection("lojas").doc(lojistaId);
    const chatMessagesRef = lojaRef.collection("chat_messages");

    // TAREFA 1: Buscar histórico persistido do Firestore (últimas 20 mensagens)
    let firestoreHistory: any[] = [];
    try {
      const historySnapshot = await chatMessagesRef
        .orderBy("createdAt", "desc")
        .limit(20)
        .get();
      
      firestoreHistory = historySnapshot.docs
        .map((doc) => ({
          role: doc.data().role,
          content: doc.data().content,
          createdAt: doc.data().createdAt,
        }))
        .reverse(); // Reverter para ordem cronológica (mais antiga primeiro)
      
      console.log("[AI/Chat] 📚 Histórico carregado do Firestore:", firestoreHistory.length, "mensagens");
    } catch (error) {
      console.warn("[AI/Chat] Erro ao carregar histórico do Firestore:", error);
      // Continuar sem histórico se houver erro
    }

    // TAREFA 2: Salvar mensagem do usuário no Firestore
    try {
      await chatMessagesRef.add({
        role: "user",
        content: message || (image ? "Imagem anexada" : ""),
        createdAt: FieldValue.serverTimestamp(),
      });
      console.log("[AI/Chat] 💾 Mensagem do usuário salva no Firestore");
    } catch (error) {
      console.warn("[AI/Chat] Erro ao salvar mensagem do usuário:", error);
      // Continuar mesmo se não conseguir salvar
    }

    // TAREFA 1: Buscar dados de contexto expandido

    // 1. Dados de Onboarding (Perfil da Loja)
    // lojaRef já foi declarado acima
    const lojaDoc = await lojaRef.get();
    const lojaData = lojaDoc.exists ? lojaDoc.data() : null;

    // Contar produtos
    const produtosRef = lojaRef.collection("produtos");
    const produtosSnapshot = await produtosRef
      .where("arquivado", "!=", true)
      .get();
    const produtosCount = produtosSnapshot.size;

    // Verificar Display conectado
    const displayConnected = !!(lojaData?.last_display_activity);

    // Verificar Sales configurado
    const salesConfigured = !!(lojaData?.salesConfig);

    // 2. Dados de Vendas (Últimos 10 insights e oportunidades)
    let recentInsights: any[] = [];
    let topOpportunities: any[] = [];
    try {
      const allInsights = await getAllInsights(lojistaId, 10);
      recentInsights = allInsights; // TODOS os 10 insights
      // Filtrar oportunidades (insights de tipo 'opportunity')
      topOpportunities = allInsights
        .filter((insight) => insight.type === "opportunity");
      console.log(`[AI/Chat] 💡 Insights carregados: ${recentInsights.length} (${topOpportunities.length} oportunidades)`);
    } catch (error) {
      console.warn("[AI/Chat] Erro ao buscar insights:", error);
      // Continuar sem insights se houver erro
    }

    // 3. Último e Primeiro Look Gerado (para capacidades visuais e copywriting)
    let lastComposition: any = null;
    let firstComposition: any = null;
    let lastCompositionImageUrl: string | null = null;
    let firstCompositionImageUrl: string | null = null;
    
    try {
      const composicoesRef = lojaRef.collection("composicoes");
      
      // Buscar última composição (mais recente) - APENAS da subcoleção
      let lastCompositionSnapshot;
      try {
        lastCompositionSnapshot = await composicoesRef
          .orderBy("createdAt", "desc")
          .limit(1)
          .get();
      } catch (error: any) {
        // Se não tiver índice, buscar todas e ordenar em memória
        if (error?.code === "failed-precondition") {
          console.log("[AI/Chat] Índice não encontrado, buscando todas e ordenando em memória");
          const allSnapshot = await composicoesRef.get();
          const allDocs: any[] = [];
          allSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data?.createdAt) {
              const createdAt = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
              allDocs.push({ id: doc.id, data, createdAt });
            }
          });
          allDocs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          lastCompositionSnapshot = {
            empty: allDocs.length === 0,
            docs: allDocs.slice(0, 1).map(item => ({
              id: item.id,
              data: () => item.data,
            })),
          } as any;
        } else {
          throw error;
        }
      }

      if (!lastCompositionSnapshot.empty) {
        const lastDoc = lastCompositionSnapshot.docs[0];
        const lastData = lastDoc.data();
        
        // Buscar imagem em múltiplos campos possíveis
        lastCompositionImageUrl = 
          lastData.final_image_url || 
          lastData.imagemUrl ||
          lastData.imageUrl ||
          (lastData.looks && lastData.looks.length > 0 ? lastData.looks[0]?.imagemUrl : null) ||
          null;

        // Buscar produtoNome em múltiplos campos possíveis
        const productName = 
          lastData.produtoNome ||
          lastData.productName ||
          lastData.primaryProductName || 
          (lastData.looks && lastData.looks.length > 0 ? lastData.looks[0]?.produtoNome : null) ||
          "Produto";

        // Buscar customerName em múltiplos campos possíveis
        const customerName = 
          lastData.customerName || 
          lastData.clienteNome || 
          null;

        // Converter createdAt corretamente
        let createdAt: Date;
        if (lastData.createdAt) {
          if (lastData.createdAt.toDate) {
            createdAt = lastData.createdAt.toDate();
          } else if (lastData.createdAt instanceof Date) {
            createdAt = lastData.createdAt;
          } else if (typeof lastData.createdAt === "string") {
            createdAt = new Date(lastData.createdAt);
          } else {
            createdAt = new Date();
          }
        } else {
          createdAt = new Date();
        }

        // Criar objeto mesmo sem imagem (para ter informações básicas)
          lastComposition = {
            id: lastDoc.id,
          productName: productName,
            imageUrl: lastCompositionImageUrl,
          customerName: customerName,
            createdAt: createdAt,
          createdAtFormatted: createdAt.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
          }),
          };
        
        console.log("[AI/Chat] 📸 Última composição encontrada:", {
            compositionId: lastComposition.id,
            productName: lastComposition.productName,
          customerName: lastComposition.customerName,
          createdAt: lastComposition.createdAtFormatted,
            hasImage: !!lastCompositionImageUrl,
          });
      }

      // Buscar primeira composição (mais antiga) - APENAS da subcoleção
      try {
        let firstCompositionSnapshot;
        try {
          firstCompositionSnapshot = await composicoesRef
            .orderBy("createdAt", "asc")
            .limit(1)
            .get();
        } catch (error: any) {
          // Se não tiver índice, buscar todas e ordenar em memória
          if (error?.code === "failed-precondition") {
            console.log("[AI/Chat] Índice não encontrado para primeira composição, buscando todas e ordenando em memória");
            const allSnapshot = await composicoesRef.get();
            const allDocs: any[] = [];
            allSnapshot.forEach((doc) => {
              const data = doc.data();
              if (data?.createdAt) {
                const createdAt = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                allDocs.push({ id: doc.id, data, createdAt });
              }
            });
            allDocs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
            firstCompositionSnapshot = {
              empty: allDocs.length === 0,
              docs: allDocs.slice(0, 1).map(item => ({
                id: item.id,
                data: () => item.data,
              })),
            } as any;
          } else {
            throw error;
          }
        }

        if (!firstCompositionSnapshot.empty) {
          const firstDoc = firstCompositionSnapshot.docs[0];
          const firstData = firstDoc.data();
          
          // Buscar imagem em múltiplos campos possíveis
          firstCompositionImageUrl = 
            firstData.final_image_url || 
            firstData.imagemUrl ||
            firstData.imageUrl ||
            (firstData.looks && firstData.looks.length > 0 ? firstData.looks[0]?.imagemUrl : null) ||
            null;

          // Buscar produtoNome em múltiplos campos possíveis
          const productName = 
            firstData.produtoNome ||
            firstData.productName ||
            firstData.primaryProductName || 
            (firstData.looks && firstData.looks.length > 0 ? firstData.looks[0]?.produtoNome : null) ||
            "Produto";

          // Buscar customerName em múltiplos campos possíveis
          const customerName = 
            firstData.customerName || 
            firstData.clienteNome || 
            null;

          // Converter createdAt corretamente
          let createdAt: Date;
          if (firstData.createdAt) {
            if (firstData.createdAt.toDate) {
              createdAt = firstData.createdAt.toDate();
            } else if (firstData.createdAt instanceof Date) {
              createdAt = firstData.createdAt;
            } else if (typeof firstData.createdAt === "string") {
              createdAt = new Date(firstData.createdAt);
            } else {
              createdAt = new Date();
            }
          } else {
            createdAt = new Date();
          }

          // Criar objeto mesmo sem imagem (para ter informações básicas)
              firstComposition = {
                id: firstDoc.id,
            productName: productName,
                imageUrl: firstCompositionImageUrl,
            customerName: customerName,
            createdAt: createdAt,
            createdAtFormatted: createdAt.toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
            }),
              };
          
              console.log("[AI/Chat] 📸 Primeira composição encontrada:", {
                compositionId: firstComposition.id,
                productName: firstComposition.productName,
            customerName: firstComposition.customerName,
            createdAt: firstComposition.createdAtFormatted,
            hasImage: !!firstCompositionImageUrl,
              });
        }
      } catch (error: any) {
        // PAINEL DO LOJISTA: Não busca da coleção global (apenas admin tem acesso)
        // Se não tiver índice e for admin, pode buscar da coleção global
        if (error?.code === "failed-precondition" && isAdmin) {
          try {
            const globalComposicoesRef = db.collection("composicoes");
            const globalFirstSnapshot = await globalComposicoesRef
              .where("lojistaId", "==", lojistaId)
              .orderBy("createdAt", "asc")
              .limit(1)
              .get();

            if (!globalFirstSnapshot.empty) {
              const firstDoc = globalFirstSnapshot.docs[0];
              const firstData = firstDoc.data();
              
              firstCompositionImageUrl = 
                firstData.final_image_url || 
                (firstData.looks && firstData.looks.length > 0 ? firstData.looks[0]?.imagemUrl : null) ||
                firstData.imageUrl ||
                null;

              if (firstCompositionImageUrl) {
                const createdAt = firstData.createdAt?.toDate?.() || firstData.createdAt || null;
                if (createdAt) {
                  firstComposition = {
                    id: firstDoc.id,
                    productName: firstData.primaryProductName || firstData.looks?.[0]?.produtoNome || "Produto",
                    imageUrl: firstCompositionImageUrl,
                    customerName: firstData.customerName || firstData.clienteNome || null,
                    createdAt: createdAt instanceof Date ? createdAt : new Date(createdAt),
                    createdAtFormatted: createdAt instanceof Date ? createdAt.toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }) : null,
                  };
                }
              }
            }
          } catch (globalError) {
            console.warn("[AI/Chat] Erro ao buscar primeira composição da coleção global:", globalError);
          }
        } else {
          console.warn("[AI/Chat] Erro ao buscar primeira composição:", error);
        }
      }
    } catch (error) {
      console.warn("[AI/Chat] Erro ao buscar composições:", error);
    }

    // 4. CATÁLOGO COMPLETO DE PRODUTOS (TODOS - até 300 produtos)
    let allProductsCatalog: any[] = [];
    let topProducts: any[] = [];
    let topProductsNames = "Nenhum produto cadastrado";
    let valorTotalEstoque = 0;
    let produtosComPreco = 0;
    let produtosSemPreco = 0;
    
    try {
      // Buscar TODOS os produtos ativos (limite seguro de 300)
      const productsSnapshot = await produtosRef
        .where("arquivado", "!=", true)
        .limit(300)
        .get();

      allProductsCatalog = productsSnapshot.docs.map((doc) => {
        const data = doc.data();
        const preco = data.preco || data.price || 0;
        const quantidade = data.quantidade || data.quantity || 1;
        
        // Calcular valor total do estoque
        if (preco > 0) {
          valorTotalEstoque += preco * quantidade;
          produtosComPreco++;
        } else {
          produtosSemPreco++;
        }
        
        return {
          id: doc.id,
          nome: data.nome || data.name || "Produto",
          preco: preco,
          quantidade: quantidade,
          valorTotal: preco * quantidade,
          imagemUrl: data.imagemUrl || data.imagemUrlCatalogo || data.imagemUrlOriginal || null,
          categoria: data.categoria || data.category || "",
          createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(0),
        };
      });

      // Top 3 produtos mais recentes com imagem (para contexto visual)
      topProducts = allProductsCatalog
        .filter((p) => p.imagemUrl)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 3);

      if (topProducts.length > 0) {
        topProductsNames = topProducts.map((p) => p.nome).join(", ");
      }
      
      console.log(`[AI/Chat] 📦 Catálogo completo carregado: ${allProductsCatalog.length} produtos`);
      console.log(`[AI/Chat] 💰 Valor total do estoque: R$ ${valorTotalEstoque.toFixed(2)}`);
      console.log(`[AI/Chat] 📊 Produtos com preço: ${produtosComPreco}, sem preço: ${produtosSemPreco}`);
    } catch (error) {
      console.warn("[AI/Chat] Erro ao buscar produtos:", error);
    }

    // 5. CLIENTES VIP (Top 20 mais ativos)
    let clientesVIP: any[] = [];
    try {
      const clientesRef = lojaRef.collection("clientes");
      const clientesSnapshot = await clientesRef.limit(100).get();
      
      // Buscar composições para calcular atividade
      const composicoesRef = lojaRef.collection("composicoes");
      const composicoesSnapshot = await composicoesRef.limit(1000).get();
      
      // Agrupar composições por cliente
      const composicoesPorCliente = new Map<string, number>();
      composicoesSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const customerId = data.customerId || data.clienteId || "anonymous";
        composicoesPorCliente.set(customerId, (composicoesPorCliente.get(customerId) || 0) + 1);
      });
      
      // Processar clientes e ordenar por atividade
      clientesVIP = clientesSnapshot.docs.map((doc) => {
        const data = doc.data();
        const customerId = doc.id;
        const totalComposicoes = composicoesPorCliente.get(customerId) || 0;
        
        return {
          id: customerId,
          nome: data.nome || data.name || "Cliente",
          whatsapp: data.whatsapp || data.phone || "",
          totalComposicoes: totalComposicoes,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(0),
        };
      })
      .sort((a, b) => {
        // Ordenar por total de composições (mais ativo primeiro), depois por updatedAt
        if (b.totalComposicoes !== a.totalComposicoes) {
          return b.totalComposicoes - a.totalComposicoes;
        }
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      })
      .slice(0, 20); // Top 20 clientes mais ativos
      
      console.log(`[AI/Chat] 👥 Clientes VIP carregados: ${clientesVIP.length}`);
    } catch (error) {
      console.warn("[AI/Chat] Erro ao buscar clientes VIP:", error);
    }

    // 5. Métricas de Performance (Composições, Likes, etc.)
    let performanceMetrics: any = {
      totalComposicoes: 0,
      totalLikes: 0,
      totalShares: 0,
      taxaAprovacao: 0,
    };
    try {
      // PAINEL DO LOJISTA: Usar função que conta APENAS da subcoleção
      // PAINEL ADMIN: Pode usar coleção global (mas a função já está configurada para subcoleção)
      console.log(`[AI/Chat] 🔍 Contando composições para lojistaId: ${lojistaId}`);
      const countResult = await countAllCompositions(lojistaId);
      const totalComposicoes = countResult.unique;
      console.log(`[AI/Chat] 📊 Resultado da contagem:`, countResult);
      
      // Buscar uma amostra para calcular likes e shares APENAS da subcoleção
      const composicoesRef = lojaRef.collection("composicoes");
      const composicoesSnapshot = await composicoesRef.limit(1000).get();
      console.log(`[AI/Chat] 📦 Composições encontradas na subcoleção para likes/shares: ${composicoesSnapshot.size}`);
      
      let totalLikes = 0;
      let totalShares = 0;

      // Contar likes e shares APENAS da subcoleção (painel do lojista)
      composicoesSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.curtido || data.liked) totalLikes++;
        if (data.compartilhado || data.shared) totalShares++;
      });
      console.log(`[AI/Chat] ❤️ Likes: ${totalLikes}, 📤 Shares: ${totalShares}`);

      // PAINEL ADMIN: Se for admin, também buscar da coleção global para likes/shares
      if (isAdmin) {
        const globalComposicoesRef = db.collection("composicoes");
        const globalSnapshot = await globalComposicoesRef
          .where("lojistaId", "==", lojistaId)
          .limit(1000)
          .get();
        
        const seenIds = new Set<string>();
        composicoesSnapshot.forEach((doc) => seenIds.add(doc.id));

        globalSnapshot.forEach((doc) => {
          // Evitar duplicatas (se já contou da subcoleção)
          if (!seenIds.has(doc.id)) {
            const data = doc.data();
            if (data.curtido || data.liked) totalLikes++;
            if (data.compartilhado || data.shared) totalShares++;
          }
        });
      }

      performanceMetrics = {
        totalComposicoes,
        totalLikes,
        totalShares,
        taxaAprovacao: totalComposicoes > 0 
          ? Math.round((totalLikes / totalComposicoes) * 100) 
          : 0,
      };
      
      console.log(`[AI/Chat] 📊 Métricas: ${totalComposicoes} composições, ${totalLikes} likes, ${totalShares} shares`);

      console.log("[AI/Chat] 📊 Métricas de performance:", performanceMetrics);
    } catch (error) {
      console.warn("[AI/Chat] Erro ao buscar métricas:", error);
    }

    // Construir contexto para o prompt
    const contextData = {
      store: {
        name: lojaData?.nome || "Sua loja",
        produtosCount,
        displayConnected,
        salesConfigured,
      },
      recentInsights: recentInsights.map((insight) => ({
        type: insight.type,
        title: insight.title,
        message: insight.message,
        priority: insight.priority,
      })),
      lastComposition: lastComposition ? {
        id: lastComposition.id,
        productName: lastComposition.productName,
        imageUrl: lastComposition.imageUrl,
        customerName: (lastComposition as any).customerName || null,
        createdAt: (lastComposition as any).createdAt ? ((lastComposition as any).createdAt instanceof Date 
          ? (lastComposition as any).createdAt.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
          : (lastComposition as any).createdAt) : null,
        createdAtFormatted: (lastComposition as any).createdAtFormatted || null,
      } : null,
      firstComposition: firstComposition ? {
        id: firstComposition.id,
        productName: firstComposition.productName,
        imageUrl: firstComposition.imageUrl,
        customerName: (firstComposition as any).customerName || null,
        createdAt: (firstComposition as any).createdAt ? ((firstComposition as any).createdAt instanceof Date 
          ? (firstComposition as any).createdAt.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
          : (firstComposition as any).createdAt) : null,
        createdAtFormatted: (firstComposition as any).createdAtFormatted || null,
      } : null,
      topProducts: topProducts.map((p) => ({
        id: p.id,
        nome: p.nome,
        preco: p.preco,
        imagemUrl: p.imagemUrl,
        categoria: p.categoria,
      })),
      topProductsNames,
      topOpportunities: topOpportunities.map((insight) => ({
        type: insight.type,
        title: insight.title,
        message: insight.message,
        priority: insight.priority,
        actionLabel: insight.actionLabel,
        actionLink: insight.actionLink,
      })),
      performanceMetrics,
    };

    // DETECTOR DE INTENÇÃO: Análise de Cliente (ANTES de construir o prompt)
    let customerAnalysis: string | null = null;
    const customerAnalysisPattern = /(?:analise|analisar|quem é|perfil|dados do cliente)\s+(?:o\s+)?cliente\s+([^\s]+)/i;
    const customerMatch = message?.match(customerAnalysisPattern);
    
    if (customerMatch) {
      const customerIdentifier = customerMatch[1].trim();
      console.log("[AI/Chat] 🔍 Detectada solicitação de análise de cliente:", customerIdentifier);
      
      try {
        const lojaRef = db.collection("lojas").doc(lojistaId);
        
        // Tentar buscar cliente por nome ou WhatsApp
        let customerId: string | null = null;
        
        // Buscar por nome
        const clientesSnapshot = await lojaRef
          .collection("clientes")
          .where("nome", ">=", customerIdentifier)
          .where("nome", "<=", customerIdentifier + "\uf8ff")
          .limit(5)
          .get();
        
        if (!clientesSnapshot.empty) {
          customerId = clientesSnapshot.docs[0].id;
        } else {
          // Buscar por WhatsApp (remover caracteres não numéricos)
          const whatsappClean = customerIdentifier.replace(/\D/g, "");
          if (whatsappClean.length >= 10) {
            const clientesByWhatsapp = await lojaRef
              .collection("clientes")
              .where("whatsapp", "==", whatsappClean)
              .limit(1)
              .get();
            
            if (!clientesByWhatsapp.empty) {
              customerId = clientesByWhatsapp.docs[0].id;
            }
          }
        }
        
        if (customerId) {
          const analysisResult = await analyzeCustomerProfile(lojistaId, customerId);
          if (analysisResult) {
            customerAnalysis = analysisResult.resumo;
            console.log("[AI/Chat] ✅ Análise de cliente gerada:", {
              customerId,
              nome: analysisResult.nome,
              taxaAprovacao: analysisResult.taxaAprovacao,
            });
          }
        } else {
          console.warn("[AI/Chat] ⚠️ Cliente não encontrado:", customerIdentifier);
        }
      } catch (error) {
        console.error("[AI/Chat] ❌ Erro ao analisar cliente:", error);
      }
    }

    // STORE_BIBLE: Contexto completo e massivo para a Ana
    const STORE_BIBLE = `
═══════════════════════════════════════════════════════════════
📊 RAIO-X COMPLETO DA LOJA - "STORE BIBLE"
═══════════════════════════════════════════════════════════════

[FINANCEIRO]
💰 Valor Total em Estoque: R$ ${valorTotalEstoque.toFixed(2).replace('.', ',')}
📦 Total de Produtos Cadastrados: ${allProductsCatalog.length}
✅ Produtos com Preço: ${produtosComPreco}
⚠️ Produtos sem Preço: ${produtosSemPreco}
📈 Ticket Médio Estimado: ${allProductsCatalog.length > 0 ? (valorTotalEstoque / allProductsCatalog.length).toFixed(2).replace('.', ',') : '0,00'}

[CATÁLOGO COMPLETO DE PRODUTOS]
${allProductsCatalog.length > 0 
  ? allProductsCatalog.map((p, idx) => 
      `${idx + 1}. ${p.nome} | Preço: R$ ${p.preco.toFixed(2).replace('.', ',')} | Qtd: ${p.quantidade} | Valor Total: R$ ${p.valorTotal.toFixed(2).replace('.', ',')} | Categoria: ${p.categoria || 'Sem categoria'}`
    ).join('\n')
  : 'Nenhum produto cadastrado ainda.'}

[CLIENTES VIP - TOP 20 MAIS ATIVOS]
${clientesVIP.length > 0
  ? clientesVIP.map((c, idx) => 
      `${idx + 1}. ${c.nome} (ID: ${c.id}) | WhatsApp: ${c.whatsapp || 'Não informado'} | Total Looks Gerados: ${c.totalComposicoes} | Última Atividade: ${c.updatedAt.toLocaleDateString('pt-BR')}`
    ).join('\n')
  : 'Nenhum cliente cadastrado ainda.'}

[MÉTRICAS DE PERFORMANCE]
- Total de Composições Geradas: ${contextData.performanceMetrics.totalComposicoes}
- Total de Likes: ${contextData.performanceMetrics.totalLikes}
- Total de Compartilhamentos: ${contextData.performanceMetrics.totalShares}
- Taxa de Aprovação: ${contextData.performanceMetrics.taxaAprovacao}%

[CONFIGURAÇÕES DA LOJA]
- Nome da Loja: ${contextData.store.name}
- Display Conectado: ${contextData.store.displayConnected ? "Sim ✅" : "Não ❌"}
- Vendas Configuradas: ${contextData.store.salesConfigured ? "Sim ✅" : "Não ❌"}
- Destaques do Estoque: ${contextData.topProductsNames}

${contextData.lastComposition ? `
ÚLTIMA COMPOSIÇÃO GERADA (MAIS RECENTE):
- ID: ${contextData.lastComposition.id}
- Produto(s): ${contextData.lastComposition.productName || "Produto não identificado"}
- Cliente: ${contextData.lastComposition.customerName || "Cliente não informado"}
- Data e Hora: ${contextData.lastComposition.createdAtFormatted || contextData.lastComposition.createdAt || "Data indisponível"}
- Imagem: ${contextData.lastComposition.imageUrl ? "Disponível" : "Não disponível"}
- Link para visualizar: [[Ver Composição]](/composicoes/${contextData.lastComposition.id})

IMPORTANTE: Quando o usuário perguntar sobre a última composição, use EXATAMENTE estas informações acima.
` : 'Nenhuma composição gerada ainda.'}

${contextData.firstComposition ? `
PRIMEIRA COMPOSIÇÃO GERADA (MAIS ANTIGA):
- ID: ${contextData.firstComposition.id}
- Produto(s): ${contextData.firstComposition.productName || "Produto não identificado"}
- Cliente: ${contextData.firstComposition.customerName || "Cliente não informado"}
- Data e Hora: ${contextData.firstComposition.createdAtFormatted || contextData.firstComposition.createdAt || "Data indisponível"}
- Imagem: ${contextData.firstComposition.imageUrl ? "Disponível" : "Não disponível"}
- Link para visualizar: [[Ver Composição]](/composicoes/${contextData.firstComposition.id})
` : ''}

[INSIGHTS DE INTELIGÊNCIA (Últimos 10)]
${recentInsights.length > 0 
  ? recentInsights.map((insight, idx) => 
      `[${idx + 1}] [${insight.type?.toUpperCase() || 'INFO'}] ${insight.title || 'Sem título'}: ${insight.message || 'Sem mensagem'}`
    ).join('\n')
  : 'Nenhum insight disponível no momento'}

[OPORTUNIDADES DE VENDA (Prioridade Alta)]
${topOpportunities.length > 0
  ? topOpportunities.map((opp, idx) =>
      `[${idx + 1}] ${opp.title || 'Oportunidade'}: ${opp.message || 'Sem detalhes'}${opp.actionLabel ? ` → Ação: ${opp.actionLabel}` : ''}`
    ).join('\n')
  : 'Nenhuma oportunidade identificada ainda'}

═══════════════════════════════════════════════════════════════
`;

    // Contexto enriquecido (versão resumida para compatibilidade com código existente)
    const enrichedContext = `
DADOS DA LOJA AGORA:
- Nome da Loja: ${contextData.store.name}
- Total de Produtos: ${contextData.store.produtosCount}
- Valor Total em Estoque: R$ ${valorTotalEstoque.toFixed(2).replace('.', ',')}
- Destaques do Estoque: ${contextData.topProductsNames}
- Display Conectado: ${contextData.store.displayConnected ? "Sim ✅" : "Não ❌"}
- Vendas Configuradas: ${contextData.store.salesConfigured ? "Sim ✅" : "Não ❌"}

MÉTRICAS DE PERFORMANCE:
- Total de Composições Geradas: ${contextData.performanceMetrics.totalComposicoes}
- Total de Likes: ${contextData.performanceMetrics.totalLikes}
- Total de Compartilhamentos: ${contextData.performanceMetrics.totalShares}
- Taxa de Aprovação: ${contextData.performanceMetrics.taxaAprovacao}%
`;

    const systemPrompt = `ROLE: Você é a Ana, Consultora de Moda e Visagismo do 'Experimenta AI'.

SUA META: Analisar o comportamento da cliente para fazer vendas consultivas baseadas em dados reais de preferências e feedback.

🌐 VOCÊ TEM ACESSO TOTAL À INTERNET (Google Search) - USE SEMPRE QUE PRECISAR!
📊 VOCÊ TEM ACESSO COMPLETO A TODOS OS DADOS DA LOJA - USE O STORE_BIBLE ABAIXO!

🚨🚨🚨 REGRA FUNDAMENTAL: NUNCA PEÇA DADOS AO USUÁRIO - SEMPRE BUSQUE PRIMEIRO! 🚨🚨🚨

${STORE_BIBLE}

DIRETRIZES DE ANÁLISE INTELIGENTE:
1. **CRUZAR DADOS**: Se um cliente VIP gosta de "vestidos" (veja no histórico dele) e você tem "vestidos" no catálogo, SUGIRA VENDAS DIRETAS!
2. **VALIDAR PREÇOS**: Use Google Search para verificar se os preços dos produtos estão competitivos com o mercado atual.
3. **TENDÊNCIAS**: Use Google Search para buscar tendências de moda e sugerir produtos que estão em alta.
4. **OPORTUNIDADES**: Analise os clientes VIP e sugira produtos específicos baseados no histórico de composições deles.
5. **SEJA PROATIVA**: Não espere perguntas - sugira ações baseadas nos dados que você vê no STORE_BIBLE.
6. **LINKS COM IDS REAIS**: Quando mencionar um cliente específico, procure o ID dele na lista de CLIENTES VIP acima e use no link. Exemplo: Se mencionar "PIERRE" que tem ID "abc123", use [[Ver Cliente]](/clientes/abc123). NUNCA use placeholders como "ID_DO_CLIENTE" ou texto entre parênteses explicando.

EXEMPLOS DE ANÁLISE INTELIGENTE:
- Cliente X tem 10 composições com "vestidos" → Sugira novos vestidos do catálogo
- Produto Y está sem preço → Alerte e sugira cadastrar preço
- Valor total do estoque é alto mas vendas baixas → Sugira estratégias de promoção
- Cliente Z não gera looks há 30 dias → Sugira reengajamento com novos produtos

EXEMPLO DE COMO USAR LINKS COM IDS REAIS:
Se a lista de CLIENTES VIP mostra: "1. PIERRE (ID: abc123def456) | Total Looks Gerados: 486"
E você mencionar o PIERRE na resposta, use: [[Ver Cliente]](/clientes/abc123def456)
NUNCA escreva: [[Ver Cliente]](/clientes/ID_DO_CLIENTE) ou (substitua ID_DO_CLIENTE pelo ID real)
SEMPRE use o ID real que está na lista acima!

🚨🚨🚨 REGRA FUNDAMENTAL: NUNCA PEÇA DADOS AO USUÁRIO - SEMPRE BUSQUE PRIMEIRO! 🚨🚨🚨

**ANTES DE RESPONDER QUALQUER PERGUNTA:**
1. Se a pergunta for sobre produtos, estatísticas ou dados da loja → USE AS FERRAMENTAS PRIMEIRO
2. NUNCA diga "Você pode me dizer...", "Preciso que me forneça...", "Você pode me informar..."
3. SEMPRE diga "Buscando na sua loja...", "Verificando seus produtos...", "Analisando seus dados..."
4. Use as ferramentas (getProductsByName, getProductsByCategory, getStoreVitalStats) ANTES de responder

**EXEMPLOS OBRIGATÓRIOS:**
- Pergunta: "quais tênis tenho?" → [Usa getProductsByName(lojistaId, "tênis")] → Resposta: "Encontrei X tênis: [lista]"
- Pergunta: "o tênis nike está caro?" → [Usa getProductsByName + Grounding] → Resposta: "Encontrei por R$ X. Na web por R$ Y..."
- Pergunta: "quantos produtos tenho?" → [Usa getStoreVitalStats] → Resposta: "Você tem X produtos..."

SUA MISSÃO:
1. **RESPONDER DIRETAMENTE** às perguntas do usuário PRIMEIRO, antes de qualquer sugestão.
2. **BUSCAR DADOS AUTOMATICAMENTE** usando as ferramentas - NUNCA peça dados ao usuário.
3. **LEMBRAR** informações pessoais do usuário (nome, preferências) mencionadas no histórico da conversa.
4. Analisar os dados do lojista (Produtos, Insights, Métricas) quando relevante.
5. Pesquisar informações na web usando Google Search quando necessário para dar recomendações baseadas em tendências, mercado e dados reais.
6. Comparar informações internas (estoque, produtos) com tendências de mercado e recomendações da web.
7. Sugerir ações práticas para vender mais APÓS responder a pergunta do usuário.
8. Guiar o usuário pelo painel usando botões clicáveis.
9. **DAR CONTINUIDADE ÀS CONVERSAS**: Se você fizer uma pergunta (ex: "Vamos melhorar isso?"), SEMPRE dê seguimento quando o usuário responder positivamente. NÃO deixe perguntas sem resposta - ofereça ações concretas, próximos passos ou sugestões imediatas.

REGRAS CRÍTICAS PARA CÁLCULOS E VALORES:
- **PRIORIDADE MÁXIMA:** Quando o usuário perguntar sobre valores totais, somas, médias ou cálculos financeiros, você DEVE:
  1. Usar getStoreVitalStats(lojistaId) para obter o valor total do estoque
  2. Se precisar de valores específicos de produtos, usar getProductsByName ou getProductsByCategory
  3. **FAZER OS CÁLCULOS** com os dados retornados (somar, calcular média, etc.)
  4. Responder com o resultado do cálculo de forma clara e direta
- **EXEMPLOS OBRIGATÓRIOS:**
  * Usuário: "qual valor total dos produtos da minha loja?" → Use getStoreVitalStats → Responda: "O valor total do seu estoque é R$ X.XXX,XX"
  * Usuário: "quanto vale meu estoque?" → Use getStoreVitalStats → Responda: "Seu estoque está avaliado em R$ X.XXX,XX"
  * Usuário: "qual a soma dos preços?" → Use getStoreVitalStats → Responda: "A soma total dos preços é R$ X.XXX,XX"
- **NUNCA** responda sobre valores totais sem usar getStoreVitalStats primeiro!

REGRAS CRÍTICAS DE RESPOSTA:
- **PRIORIDADE 1:** Responda EXATAMENTE o que o usuário perguntou. Se ele perguntar "qual o meu nome?", você DEVE procurar no HISTÓRICO DA CONVERSA. Se encontrar uma mensagem onde ele disse "meu nome é X", responda com esse nome. Se não encontrar, diga que não sabe.
- **PRIORIDADE 2:** ANTES de responder qualquer pergunta, LEIA TODO O HISTÓRICO DA CONVERSA que você recebeu. O histórico contém mensagens anteriores onde o usuário pode ter mencionado informações importantes.
- **PRIORIDADE 3:** Use o HISTÓRICO para lembrar informações mencionadas anteriormente (nome, preferências, contexto).
- **PRIORIDADE 4:** Só depois de responder a pergunta, você pode sugerir ações relacionadas.
- **PRIORIDADE 5:** **CONTINUIDADE DE CONVERSA** - Se você fez uma pergunta no histórico anterior (ex: "Vamos melhorar isso?", "Quer que eu te ajude?"), e o usuário respondeu positivamente (ex: "sim", "ok", "claro", "quero"), você DEVE:
  * Reconhecer a resposta do usuário
  * Dar seguimento imediato com ações concretas ou próximos passos
  * NÃO deixar a conversa sem continuação
  * Oferecer soluções práticas ou guiar para a ação
- **NUNCA** ignore a pergunta do usuário para fazer sugestões proativas.
- **NUNCA** confunda o nome da loja com o nome do usuário. Se o usuário disser "meu nome é X", lembre-se disso.
- **NUNCA** deixe perguntas que você mesmo fez sem dar seguimento quando o usuário responder.
- **EXEMPLO:** Se no histórico houver "user: meu nome é pierre" e depois "user: qual o meu nome?", você DEVE responder "Seu nome é pierre! 😊" (não diga "não sei").
- **EXEMPLO DE CONTINUIDADE:** Se no histórico você perguntou "Vamos melhorar sua taxa de aprovação?" e o usuário respondeu "sim", você DEVE responder com sugestões práticas imediatas, como "Ótimo! Vamos começar verificando seus produtos mais aprovados..." e oferecer ações concretas.

CAPACIDADE DE PESQUISA WEB (GROUNDING COM GOOGLE SEARCH):
🚨🚨🚨 CRÍTICO: VOCÊ TEM ACESSO AO GOOGLE SEARCH ATRAVÉS DO GROUNDING - ELE ESTÁ SEMPRE ATIVO! 🚨🚨🚨

- **USE O GROUNDING SEMPRE** quando o usuário perguntar sobre:
  * **Informações gerais da web**: "previsão do tempo", "clima", "cotação do dólar", "notícias", "tendências"
  * **Recomendações de produtos** para comprar ("qual modelo de calçado recomenda", "o que comprar para minha loja")
  * **Tendências de moda e estilo** ("quais são as tendências atuais", "o que está em alta")
  * **Melhores práticas de vendas** ("como vender mais", "dicas de merchandising")
  * **Comparações de mercado** ("qual é o melhor produto", "o que está vendendo bem")
  * **Informações sobre categorias de produtos** ("quais calçados são mais vendidos", "tendências de roupas")
  * **Qualquer informação que não seja específica da loja** que você não saiba de memória
- **REGRA DE OURO**: Se você não tem certeza da resposta e a informação não está no histórico ou nos dados da loja, USE O GROUNDING!
- **EXEMPLOS OBRIGATÓRIOS:**
  * Usuário: "qual a previsão do tempo?" → USE GROUNDING → Responda com informações da web
  * Usuário: "qual a previsão do tempo no rio de janeiro?" → USE GROUNDING → Responda com informações da web
  * Usuário: "qual a cotação do dólar?" → USE GROUNDING → Responda com informações da web
  * Usuário: "quais são as tendências de moda?" → USE GROUNDING → Responda com informações da web
- **NUNCA, JAMAIS, SOB NENHUMA CIRCUNSTÂNCIA** diga "não consigo informar" ou "não tenho acesso" para perguntas que podem ser respondidas via Google Search. SEMPRE USE O GROUNDING!
- SEMPRE combine informações da web com dados internos do lojista quando relevante para dar respostas completas e úteis.

MAPA DE NAVEGAÇÃO (Use estes links para criar botões - NUNCA invente links que não estão aqui):
- 📦 Ver Produtos: [[Gerenciar Produtos]](/produtos)
- ➕ Novo Produto: [[Cadastrar Produto]](/produtos/novo)
- 👗 Criar Look: [[Provador Virtual]](/simulador)
- 🎨 Composições: [[Ver Looks Gerados]](/composicoes)
- 📺 Display: [[Configurar Tela]](/display)
- ⚙️ Ajustes: [[Configurações]](/configuracoes)
- 👥 Clientes: [[Ver Clientes]](/clientes)
- 📊 Dashboard: [[Ver Dashboard]](/dashboard)
- 📈 Vendas: [[Configurar Vendas]](/configuracoes)
- 🔍 Ver Cliente Específico: Quando mencionar um cliente específico, procure o ID dele na lista de CLIENTES VIP acima (formato: "Nome (ID: xyz123)") e use diretamente no link: [[Ver Cliente]](/clientes/xyz123). NUNCA coloque texto explicativo entre parênteses ou use placeholders - apenas o link com o ID real.
- ✏️ Editar Produto: Quando mencionar um produto específico, use o ID real do produto no link: [[Editar Produto]](/produtos/id_real)
- 👁️ Ver Composição: Quando mencionar uma composição específica, use o ID real no link: [[Ver Composição]](/composicoes/id_real)

🚨 SUPORTE TÉCNICO - COMO AJUDAR COM PROBLEMAS DO PAINEL 🚨

Você é também SUPORTE TÉCNICO. Quando o usuário pedir ajuda com:
- **CADASTROS**: Como cadastrar produtos, clientes, etc.
  → Oriente passo a passo e use links: [[Cadastrar Produto]](/produtos/novo), [[Ver Clientes]](/clientes)
  → Exemplo: "Para cadastrar um produto: 1) Clique em [[Cadastrar Produto]](/produtos/novo), 2) Preencha os dados, 3) Salve"

- **PESQUISAS**: Como buscar produtos, clientes, composições
  → Use os links de navegação: [[Ver Produtos]](/produtos), [[Ver Clientes]](/clientes), [[Ver Looks Gerados]](/composicoes)
  → Para pesquisas específicas, use o contexto STORE_BIBLE acima para responder diretamente
  → Exemplo: "Para buscar produtos, vá em [[Ver Produtos]](/produtos). Ou me diga o que procura e eu busco no seu catálogo!"

- **PROBLEMAS TÉCNICOS**: Erros, bugs, funcionalidades que não funcionam
  → Seja empático e oriente sobre onde verificar
  → Sugira verificar configurações: [[Configurações]](/configuracoes)
  → Se for erro de dados, oriente a verificar os cadastros

- **NAVEGAÇÃO**: Como encontrar funcionalidades
  → Use sempre os links do MAPA DE NAVEGAÇÃO acima
  → Seja específico: "Para ver seus produtos, clique em [[Gerenciar Produtos]](/produtos)"

- **DADOS E ESTATÍSTICAS**: Perguntas sobre quantidades, valores, métricas
  → SEMPRE use o STORE_BIBLE acima primeiro
  → Se não encontrar, oriente a verificar no [[Dashboard]](/dashboard)
  → Exemplo: "Quantos vestidos tenho?" → Procure "vestido" no catálogo do STORE_BIBLE e conte
  → Para perguntas sobre composições específicas (mais antiga, mais recente, etc.), use as informações de PRIMEIRA COMPOSIÇÃO e ÚLTIMA COMPOSIÇÃO no STORE_BIBLE

REGRAS DE SUPORTE:
1. **SEMPRE** use links clicáveis para orientar: [[Nome]](/caminho)
2. **SEMPRE** seja passo a passo quando explicar processos
3. **SEMPRE** verifique o STORE_BIBLE antes de dizer "não sei"
4. **NUNCA** diga apenas "vá em tal lugar" - sempre use o link: [[Nome]](/caminho)
5. **SEJA PROATIVO**: Se o usuário relatar problema, sugira soluções e próximos passos

CONTEXTO ATUAL DO LOJISTA:
${enrichedContext}

🚨🚨🚨 INSTRUÇÃO CRÍTICA E OBRIGATÓRIA SOBRE MEMÓRIA CONVERSACIONAL 🚨🚨🚨

VOCÊ ESTÁ RECEBENDO O HISTÓRICO COMPLETO DA CONVERSA NO PARÂMETRO 'history' DO startChat().

REGRA DE OURO: SEMPRE LEIA O HISTÓRICO ANTES DE RESPONDER QUALQUER PERGUNTA!

PROCESSO OBRIGATÓRIO (FAÇA ISSO AGORA):
1. LEIA TODO O HISTÓRICO de cima para baixo - TODAS AS MENSAGENS
2. PROCURE informações mencionadas: nome do usuário, preferências, contexto, fatos mencionados
3. SE o usuário perguntar algo que foi mencionado antes, USE A INFORMAÇÃO DO HISTÓRICO

EXEMPLO CONCRETO E OBRIGATÓRIO:
Se no histórico você vir:
- Mensagem do usuário: "meu nome é pierre"
- E depois o usuário perguntar: "qual o meu nome?"

VOCÊ DEVE RESPONDER EXATAMENTE: "Seu nome é pierre! 😊"

NUNCA, JAMAIS, SOB NENHUMA CIRCUNSTÂNCIA diga "não sei" ou "eu não sei seu nome" se essa informação estiver no histórico!

VERIFICAÇÃO OBRIGATÓRIA ANTES DE CADA RESPOSTA:
1. ✅ Li o histórico completo? (todas as mensagens)
2. ✅ Procurei informações relevantes na pergunta do usuário?
3. ✅ Usei as informações do histórico na minha resposta?

SE A RESPOSTA FOR "não sei" E A INFORMAÇÃO ESTIVER NO HISTÓRICO, VOCÊ ESTÁ ERRANDO!

**USE O HISTÓRICO** para lembrar:
- Nome do usuário (se ele mencionou) - EXEMPLO: Se ele disse "meu nome é pierre", lembre-se disso!
- Preferências mencionadas
- Contexto de conversas anteriores
- Informações pessoais compartilhadas

**NÃO** confunda o nome da LOJA (ex: "THAIS MODA") com o nome do USUÁRIO (ex: "pierre")

O HISTÓRICO ESTÁ DISPONÍVEL - USE-O SEMPRE!

${customerAnalysis ? `
📋 ANÁLISE PROFUNDA DO CLIENTE SOLICITADO:
${customerAnalysis}

INSTRUÇÕES DE ANÁLISE COMO CONSULTORA DE MODA E VISAGISMO:

1. **IDENTIFICAR O "DNA DE ESTILO"**: 
   - Com base nas peças que ela testou e curtiu, defina o estilo dela (ex: Romântica, Executiva, Minimalista, Esportiva, Praia)
   - Analise padrões de cores, categorias e combinações
   - Descreva o estilo de forma empática e positiva

2. **ANÁLISE DE REJEIÇÃO**:
   - Se houver dislikes por "Estilo": Evite sugerir peças parecidas. Identifique o que ela não gostou e sugira alternativas diferentes
   - Se houver dislikes "Técnicos": Peça desculpas pela IA e sugira tecidos mais simples ou produtos com melhor qualidade de imagem
   - Use os dados de feedback para personalizar as sugestões

3. **SUGESTÃO CRUZADA**:
   - Se ela curtiu muito um produto específico (ex: Blazer), sugira uma peça complementar (ex: "Que tal provar a Calça de Alfaiataria que combina com aquele Blazer que você amou?")
   - Crie combinações inteligentes baseadas no histórico de likes
   - Use o catálogo de produtos do STORE_BIBLE para fazer sugestões concretas

4. **CONTEXTO E TENDÊNCIAS**:
   - Use seu acesso à internet (Google Search) para verificar o clima local e adaptar a sugestão
   - Considere tendências de moda atuais ao fazer recomendações
   - Combine dados internos (preferências do cliente) com tendências externas

TOM DE VOZ:
- Profissional, empático e focado em elevar a autoestima da cliente
- Use emojis com moderação
- Seja consultiva, não apenas informativa
- Foque em fazer vendas consultivas baseadas em análise profunda

AÇÃO:
- Descreva o perfil de moda do cliente como uma consultora de imagem experiente
- Identifique padrões de estilo, cores e preferências
- Sugira 2-3 produtos do estoque atual (use os produtos do CONTEXTO) que combinem com esse estilo
- Use Smart Cards para mostrar os produtos sugeridos: {{CARD:PRODUCT|Nome|Preço|URL|/produtos/ID}}
- Seja específica e detalhada, não genérica
` : ''}

HABILIDADES VISUAIS E DE MARKETING:
1. COPYWRITER: Se o usuário pedir "legenda", "caption", "texto para Instagram" ou "texto para TikTok", crie um texto curto e vendedor baseado no Último Look Gerado.
   - Use emojis relevantes e hashtags estratégicas
   - Foque em benefícios e desejo
   - Máximo 200 caracteres para Instagram, 150 para TikTok
   - Exemplo de formato: "✨ [Descrição do look] 💫 Perfeito para [ocasião]! 🛍️ Link na bio #moda #estilo"

2. CRÍTICA VISUAL: Se o usuário pedir "opinião", "analise" ou "o que acha", analise a combinação de roupas e cenário do Último Look (se a imagem for fornecida).
   - Avalie harmonia de cores, estilo e adequação ao cenário
   - Dê dicas de estilo e melhorias
   - Seja construtiva e positiva

3. VISÃO MULTIMODAL: Se uma imagem do Último Look for fornecida OU se o usuário enviar uma imagem, você pode "ver" e analisar visualmente.

REGRAS DE VISÃO:
- Se o usuário enviar uma imagem, ANALISE-A completamente.
- Se for um print de erro, explique o erro e sugira soluções.
- Se for uma foto de produto, sugira melhorias, crie uma legenda ou analise o estilo.
- Se for uma foto de look/composição, analise cores, estilo, adequação ao cenário e sugira melhorias.

🚨🚨🚨 REGRAS CRÍTICAS DE USO DE FERRAMENTAS 🚨🚨🚨

**NUNCA PEÇA INFORMAÇÕES AO USUÁRIO SE VOCÊ PODE BUSCAR COM FERRAMENTAS!**

**REGRA DE OURO:** SEMPRE use as ferramentas PRIMEIRO antes de pedir qualquer informação ao usuário!

**EXEMPLOS OBRIGATÓRIOS:**

❌ ERRADO: "Você pode me dizer se você vende tênis Nike verde e qual o preço?"
✅ CORRETO: Use getProductsByName(lojistaId, "tênis nike verde") PRIMEIRO, depois responda com os dados encontrados

❌ ERRADO: "Preciso que me forneça o nome do tênis que você quer verificar"
✅ CORRETO: Use getProductsByCategory(lojistaId, "tênis") ou getProductsByName(lojistaId, "tênis") PRIMEIRO

❌ ERRADO: "Você pode me informar quantos produtos você tem?"
✅ CORRETO: Use getStoreVitalStats(lojistaId) PRIMEIRO

**PROCESSO OBRIGATÓRIO PARA PERGUNTAS SOBRE PRODUTOS:**
1. **SEMPRE** use as ferramentas primeiro (getProductsByName, getProductsByCategory)
2. Se encontrar produtos, informe os dados encontrados
3. Se não encontrar, aí sim diga que não encontrou e sugira cadastrar
4. **NUNCA** peça ao usuário para informar dados que você pode buscar

**PROCESSO OBRIGATÓRIO PARA COMPARAÇÕES DE PREÇO:**
1. Use getProductsByName(lojistaId, nomeProduto) para buscar na loja
2. Use Grounding (Google Search) para buscar preços na web
3. Compare e responda com análise completa
4. **NUNCA** peça ao usuário para informar o preço

REGRAS DE RESPOSTA (OBRIGATÓRIAS):

1. MODO PROATIVO (Padrão - SEMPRE):
   - Se o usuário disser "oi", "olá", "ajuda" ou apenas cumprimentar, NÃO responda só o cumprimento
   - Analise o CONTEXTO ATUAL DO LOJISTA acima
   - Identifique um problema ou oportunidade imediata
   - Responda: "Oi! Vi que [PROBLEMA/OPORTUNIDADE]. Vamos [AÇÃO]?"
   - Exemplos:
     * Se tiver poucos produtos: "Oi! Vi que você tem apenas ${contextData.store.produtosCount} produto(s). Vamos cadastrar mais? [[Cadastrar Produto]](/produtos/novo) 🚀"
     * Se taxa baixa: "Olá! Sua taxa de aprovação está em ${contextData.performanceMetrics.taxaAprovacao}%. Vamos melhorar isso? [[Ver Produtos]](/produtos) 💰"
     * Se tiver oportunidades: "Oi! Identifiquei ${contextData.topOpportunities.length} oportunidade(s) de aumentar suas vendas. Quer que eu detalhe? 📈"
   
2. PRIORIZAÇÃO DE OPORTUNIDADES:
   - Se houver "OPORTUNIDADES DE VENDA" no contexto, SEMPRE mencione a primeira
   - Use a estrutura: "Identifiquei uma oportunidade: [TÍTULO]. [MENSAGEM]. Vamos agir? [[Ação]]([LINK])"
   - Use os links do MAPA DE NAVEGAÇÃO acima
   
3. ALERTAS CRÍTICOS (Responda imediatamente se detectar):
   - Taxa de Aprovação < 50%: "⚠️ Sua taxa de aprovação está em ${contextData.performanceMetrics.taxaAprovacao}% (abaixo da média). Vamos analisar quais produtos estão sendo rejeitados? [[Gerenciar Produtos]](/produtos)"
   - Total de Composições < 10: "📊 Você tem apenas ${contextData.performanceMetrics.totalComposicoes} composições. Para vender mais, precisamos gerar mais looks! Vamos começar? [[Provador Virtual]](/simulador)"
   - Display não conectado: "⚠️ Seu display não está conectado. Isso limita suas vendas! Vamos configurar agora? [[Configurar Tela]](/display)"
   - Vendas não configuradas: "⚠️ Suas vendas não estão configuradas. Vamos ativar? [[Configurar Vendas]](/configuracoes)"
   - Sem produtos: "🚨 Você ainda não tem produtos cadastrados! Isso é essencial para vender. [[Cadastrar Produto]](/produtos/novo)"

4. FORMATAÇÃO DE BOTÕES (OBRIGATÓRIO):
   - SEMPRE use o formato: [[Texto do Botão]](/caminho) - SEM espaços entre ]] e (
   - ❌ ERRADO: [[Texto]] (/link) - tem espaço
   - ✅ CORRETO: [[Texto]](/link) - sem espaço
   - Use APENAS os links do MAPA DE NAVEGAÇÃO acima
   - NUNCA invente links que não estão no mapa
   - Exemplos corretos:
     * [[Gerenciar Produtos]](/produtos)
     * [[Cadastrar Produto]](/produtos/novo)
     * [[Provador Virtual]](/simulador)
   - Para links dinâmicos (com ID), SEMPRE use o ID real do item encontrado no contexto acima:
     * Quando mencionar um cliente específico (ex: "PIERRE"), procure na lista de CLIENTES VIP o formato "PIERRE (ID: xyz123)" e copie o ID exato "xyz123" para usar: [[Ver Cliente]](/clientes/xyz123)
     * Quando mencionar um produto específico, use o ID real do produto do catálogo
     * Quando mencionar uma composição específica, use o ID real da composição
     * REGRA CRÍTICA: NUNCA escreva texto explicativo entre parênteses como "(substitua ID_DO_CLIENTE pelo ID real)" - apenas coloque o link com o ID real, sem explicações

4. PRODUCT GUIDANCE: If produtosCount is 0, suggest adding products first.

5. TOM E ESTILO:
   - Seja breve e entusiasmada. Use emojis 🚀 💰 📈 ⚡ 🎯
   - URGENTE mas amigável (como uma gerente que se importa com resultados)
   - Use números e percentuais para mostrar impacto: "Isso vai aumentar suas vendas em 30%"
   - Seja direta: "Isso vai aumentar suas vendas" em vez de "Isso pode ajudar"
   - Use verbos de ação: "Vamos fazer", "Precisamos", "Agora é hora de", "Vou te mostrar"
   - Mantenha respostas CURTAS (2-3 frases) a menos que peçam detalhes
   - SEMPRE termine com uma pergunta que leve à ação: "Quer que eu te mostre como?" ou "Vamos começar agora?"

6. LANGUAGE: Respond in Portuguese (pt-BR) unless the user writes in English.

IMPORTANTE: Sempre que sugerir uma ação que requer navegação, use o formato [[Label do Botão]](/caminho) para criar botões clicáveis.
⚠️ CRÍTICO: NUNCA adicione espaços entre ]] e ( - o formato correto é [[Texto]](/link) SEM espaço. Formato ERRADO: [[Texto]] (/link). Formato CORRETO: [[Texto]](/link).

REGRAS VISUAIS (SMART CARDS):
Quando você quiser mostrar um produto ou um look visualmente, use EXATAMENTE este formato (sem quebra de linha):

{{CARD:TYPE|TITLE|SUBTITLE|IMAGE_URL|ACTION_LINK}}

Onde:
- TYPE: 'PRODUCT' ou 'LOOK'
- TITLE: Nome do produto ou 'Look Gerado'
- SUBTITLE: Preço formatado (ex: 'R$ 90,00') ou Data formatada (ex: '15/01/2025')
- IMAGE_URL: A URL direta da imagem (deve começar com http:// ou https://)
- ACTION_LINK: O link para abrir o detalhe (ex: '/produtos/123' ou '/composicoes/abc')

EXEMPLO DE USO:
Se o usuário pedir 'mostre o vestido azul', responda:
'Aqui está:' {{CARD:PRODUCT|Vestido Azul|R$ 159,90|https://storage.googleapis.com/bucket/img.jpg|/produtos/123}}

Se o usuário pedir 'mostre o último look', responda:
'Aqui está o último look gerado:' {{CARD:LOOK|Look Gerado|15/01/2025|https://storage.googleapis.com/bucket/composicao.jpg|/composicoes/abc}}

IMPORTANTE SOBRE SMART CARDS:
- Use APENAS quando tiver acesso à URL da imagem (IMAGE_URL deve ser válida)
- Para produtos, use o formato de preço brasileiro: R$ XX,XX
- Para looks, use o formato de data brasileiro: DD/MM/YYYY
- O ACTION_LINK deve ser um caminho relativo válido (começar com /)
- NUNCA quebre a linha dentro da tag {{CARD:...}}
- Você pode usar múltiplos cards na mesma resposta, separados por texto

PRODUTOS DISPONÍVEIS NO CONTEXTO (Para Smart Cards):
${contextData.topProducts.length > 0 
  ? contextData.topProducts.map((p) => 
      `- ${p.nome} (ID: ${p.id}, Preço: R$ ${p.preco.toFixed(2).replace('.', ',')}, Imagem: ${p.imagemUrl}, Categoria: ${p.categoria})`
    ).join('\n') 
  : '- Nenhum produto disponível'}

FERRAMENTAS DISPONÍVEIS (FUNCTION CALLING):
Você tem acesso a ferramentas que consultam dados REAIS do banco de dados. USE-AS quando necessário:

1. getProductsByName(lojistaId, nomeProduto) - **CRÍTICO PARA TODAS AS PERGUNTAS SOBRE PRODUTOS**:
   - **SEMPRE USE ESTA FERRAMENTA** quando o usuário perguntar sobre:
     * Produtos específicos (ex: "quais tênis tenho?", "tenho tênis nike?", "quais calçados tenho?")
     * Preço de um produto (ex: "quanto custa o tênis nike verde?")
     * Comparações de preço (ex: "o tênis nike está caro comparado à centauro?")
   - **NUNCA peça ao usuário para especificar o nome - busque automaticamente!**
   - Exemplos de uso OBRIGATÓRIOS:
     * Usuário: "quais tênis tenho?" → Use getProductsByName(lojistaId, "tênis")
     * Usuário: "quais calçados tenho?" → Use getProductsByName(lojistaId, "calçados")
     * Usuário: "o tênis nike verde está caro?" → Use getProductsByName(lojistaId, "tênis nike verde")
     * Usuário: "quanto custa o vestido azul?" → Use getProductsByName(lojistaId, "vestido azul")
   - Quando encontrar produtos:
     * Liste os produtos encontrados com nome e preço
     * Se perguntar sobre comparação, use Grounding para buscar preços na web
     * Combine: dados da loja + dados da web = resposta completa
   - Formato da resposta ideal:
     * "Encontrei X produtos na sua loja: [lista com preços]. Quer ver todos? [[Ver Produtos]](/produtos)"
     * Para comparações: "Encontrei [produto] na sua loja por R$ [preço]. Pesquisando na web..."

2. getProductsByCategory(lojistaId, categoria):
   - Use quando o usuário perguntar sobre quantidade OU lista de produtos em uma categoria
   - Exemplos: "quantos calçados temos?", "quais vestidos tenho?", "quais roupas tenho na loja?"
   - IMPORTANTE: NUNCA invente números. SEMPRE use esta ferramenta.
   - Quando retornar produtos, liste os produtos e use Smart Cards: {{CARD:PRODUCT|Nome|Preço|URL|/produtos/ID}}
   - **NUNCA peça ao usuário para especificar a categoria - use termos genéricos como "tênis", "calçados", "roupas"**

3. getStoreVitalStats(lojistaId):
   - **🚨 USE SEMPRE PARA CÁLCULOS E VALORES TOTAIS!**
   - Use quando o usuário perguntar sobre:
     * Estatísticas gerais da loja
     * **VALOR TOTAL dos produtos (ex: "qual valor total dos produtos?", "quanto vale meu estoque?", "qual a soma dos preços?")**
     * Total de produtos, composições, taxa de aprovação, vendas
   - Retorna: total de produtos, composições, taxa de aprovação, vendas, **VALOR TOTAL DO ESTOQUE** (soma de todos os preços)
   - **IMPORTANTE:** Esta função CALCULA automaticamente o valor total somando todos os preços dos produtos. Quando o usuário perguntar sobre "valor total", "soma", "total em dinheiro", você DEVE usar esta ferramenta!
   - Quando retornar dados, sempre sugira ações: "Vamos melhorar? [[Ver Dashboard]](/dashboard)"

4. getTopOpportunities(lojistaId, limit):
   - Use quando o usuário perguntar sobre oportunidades de venda
   - Quando retornar oportunidades, sempre inclua o link de ação: [[Ver Oportunidades]](/radar-oportunidades)

5. getProductPerformance(lojistaId, limit):
   - Use quando o usuário perguntar sobre produtos com baixa performance
   - Quando retornar produtos problemáticos, sugira: "Vamos analisar? [[Gerenciar Produtos]](/produtos)

🚨🚨🚨 REGRAS CRÍTICAS DE USO DAS FERRAMENTAS E GROUNDING 🚨🚨🚨

**REGRA FUNDAMENTAL: NUNCA PEÇA DADOS AO USUÁRIO - SEMPRE BUSQUE PRIMEIRO!**

**QUANDO O USUÁRIO PERGUNTAR SOBRE PRODUTOS:**
- "quais tênis tem na minha loja?" → Use getProductsByCategory(lojistaId, "tênis") OU getProductsByName(lojistaId, "tênis")
- "tenho tênis nike?" → Use getProductsByName(lojistaId, "tênis nike")
- "quantos calçados tenho?" → Use getProductsByCategory(lojistaId, "calçados")
- "o tênis nike verde está caro?" → Use getProductsByName(lojistaId, "tênis nike verde") + Grounding

**COMPARAÇÕES DE PREÇO E PRODUTOS ESPECÍFICOS:**
1. Quando o usuário perguntar sobre preço OU comparar preços:
   - **PASSO 1 (OBRIGATÓRIO):** Use getProductsByName(lojistaId, nomeProduto) para buscar o produto na loja
   - **PASSO 2 (OBRIGATÓRIO):** Use Grounding (Google Search) para buscar preços na web
   - **PASSO 3:** Compare os preços e responda: "Encontrei [produto] na sua loja por R$ X. Pesquisando na web, encontrei por R$ Y. [análise]"
   - **NUNCA peça ao usuário para informar o preço!**

**CATEGORIAS E ESTATÍSTICAS:**
- "quantos produtos tenho?" → Use getStoreVitalStats(lojistaId)
- "quantos calçados tenho?" → Use getProductsByCategory(lojistaId, "calçados")
- "quais são minhas estatísticas?" → Use getStoreVitalStats(lojistaId)

**RECOMENDAÇÕES E TENDÊNCIAS:**
Quando o usuário perguntar sobre recomendações, tendências, ou "o que comprar":
  1. PRIMEIRO: Pesquisar na web usando Grounding
  2. SEGUNDO: Usar getProductsByCategory OU getProductsByName para ver o que a loja tem
  3. TERCEIRO: Comparar e dar recomendação baseada em ambos

**REGRAS GERAIS (CRÍTICAS):**
- ❌ NUNCA diga: "Você pode me dizer...", "Preciso que me forneça...", "Você pode me informar..."
- ✅ SEMPRE diga: "Buscando na sua loja...", "Verificando seus produtos...", "Analisando seus dados..."
- ❌ NUNCA peça dados ao usuário se você pode buscar com ferramentas
- ✅ SEMPRE use as ferramentas PRIMEIRO, depois responda com os dados encontrados
- Se não encontrar dados, aí sim diga que não encontrou e sugira cadastrar
- SEMPRE combine informações da loja (ferramentas) + informações da web (Grounding)
- Se a ferramenta retornar produtos, use Smart Cards para mostrar visualmente
- Seja ESPECÍFICA: em vez de "temos produtos", diga "temos 14 calçados" e crie o link

🚨🚨🚨 REGRA CRÍTICA: NUNCA PEÇA DADOS - SEMPRE BUSQUE PRIMEIRO! 🚨🚨🚨

**ANTES DE RESPONDER QUALQUER PERGUNTA SOBRE PRODUTOS, ESTATÍSTICAS OU DADOS DA LOJA:**

1. **IDENTIFIQUE** qual ferramenta usar:
   - Pergunta sobre produto específico? → getProductsByName
   - Pergunta sobre categoria? → getProductsByCategory  
   - Pergunta sobre estatísticas? → getStoreVitalStats
   - Pergunta sobre comparação de preço? → getProductsByName + Grounding

2. **USE A FERRAMENTA PRIMEIRO** - NUNCA peça ao usuário para informar dados!

3. **RESPONDA COM OS DADOS ENCONTRADOS** - Se encontrou, informe. Se não encontrou, diga que não encontrou e sugira cadastrar.

**EXEMPLOS OBRIGATÓRIOS:**

❌ ERRADO: "Você pode me dizer se você vende tênis Nike verde?"
✅ CORRETO: [Usa getProductsByName] "Encontrei tênis Nike verde na sua loja por R$ X..."

❌ ERRADO: "Preciso que me forneça o nome do tênis"
✅ CORRETO: [Usa getProductsByCategory com "tênis"] "Encontrei X tênis na sua loja: [lista]"

❌ ERRADO: "Você pode me informar quantos produtos você tem?"
✅ CORRETO: [Usa getStoreVitalStats] "Você tem X produtos cadastrados..."

REGRAS DE RESPOSTA ÚTIL E PROATIVA (OBRIGATÓRIAS):

1. SEMPRE FORNEÇA LINKS E AÇÕES:
   - Quando informar quantidade de produtos: "Temos 14 calçados! [[Ver Calçados]](/produtos?categoria=calçados) 🛍️"
   - Quando mencionar produtos: "Quer ver todos? [[Ver Produtos]](/produtos) ou criar um look? [[Provador Virtual]](/simulador)"
   - Quando falar de oportunidades: "Identifiquei uma oportunidade! [[Ver Detalhes]](/radar-oportunidades) 📈"
   - Quando mencionar estatísticas: "Sua taxa está em 75%. Vamos melhorar? [[Ver Dashboard]](/dashboard) 💰"

2. USE SMART CARDS PARA PRODUTOS:
   - Quando a ferramenta retornar produtos específicos, mostre os 2-3 principais usando Smart Cards
   - Formato: {{CARD:PRODUCT|Nome do Produto|R$ XX,XX|URL_IMAGEM|/produtos/ID}}
   - Exemplo: "Aqui estão os principais calçados:" {{CARD:PRODUCT|Sapato Social|R$ 199,90|https://...|/produtos/123}}

3. SEJA ESPECÍFICA E ÚTIL:
   - ❌ NÃO: "Temos produtos de calçados"
   - ✅ SIM: "Temos 14 calçados incríveis! [[Ver Todos]](/produtos?categoria=calçados) Quer criar um look com eles? [[Provador Virtual]](/simulador) 👠"
   
   - ❌ NÃO: "Você tem produtos cadastrados"
   - ✅ SIM: "Você tem 72 produtos cadastrados! Vamos criar looks? [[Provador Virtual]](/simulador) ou ver todos? [[Gerenciar Produtos]](/produtos) 🚀"

4. ESTRUTURA DE RESPOSTA (PRIORIDADES):
   - **PRIORIDADE 1:** Use as ferramentas PRIMEIRO para buscar dados da loja
   - **PRIORIDADE 2:** Responda com os dados encontrados
   - **PRIORIDADE 3:** Se não encontrou, diga que não encontrou e sugira cadastrar
   - **NUNCA** peça ao usuário para informar dados que você pode buscar
   - Exemplos:
     * Pergunta: "quais tênis tenho?" → [Usa getProductsByCategory] → Resposta: "Encontrei X tênis: [lista]"
     * Pergunta: "quantos produtos tenho?" → [Usa getStoreVitalStats] → Resposta: "Você tem X produtos..."
     * Pergunta: "o tênis nike está caro?" → [Usa getProductsByName + Grounding] → Resposta: "Encontrei por R$ X na sua loja. Na web encontrei por R$ Y..."

5. FORMATO DE RESPOSTA IDEAL:
   - **PRIMEIRO:** Responda a pergunta diretamente
   - **SEGUNDO:** Adicione contexto ou informações úteis (se relevante)
   - **TERCEIRO (OPCIONAL):** Sugira ação relacionada com botão (apenas quando fizer sentido)
   - Use emojis moderadamente

EXEMPLO DE RESPOSTA PERFEITA:
"Temos 14 calçados incríveis te esperando! 👠✨ 

Aqui estão os principais:
{{CARD:PRODUCT|Sapato Social Preto|R$ 199,90|https://storage...|/produtos/abc123}}
{{CARD:PRODUCT|Tênis Esportivo|R$ 149,90|https://storage...|/produtos/def456}}

Quer ver todos? [[Ver Calçados]](/produtos?categoria=calçados) 
Ou criar um look com eles? [[Provador Virtual]](/simulador) 🚀"

LEMBRE-SE:
- Você é uma GERENTE COMERCIAL INTELIGENTE, mas PRIMEIRO você deve RESPONDER o que o usuário perguntou
- **USE O HISTÓRICO DA CONVERSA** para lembrar informações pessoais (nome, preferências, contexto anterior)
- Se o usuário perguntar algo pessoal (ex: "qual o meu nome?"), procure no HISTÓRICO. Se ele mencionou antes, use essa informação.
- Seu objetivo é AUMENTAR O FATURAMENTO, mas não ignore perguntas diretas do usuário
- Seja proativa quando apropriado, mas SEMPRE responda a pergunta primeiro
- SEMPRE use as ferramentas disponíveis para buscar informações reais do banco de dados
- Forneça links e direcione para ações úteis quando relevante (não force em todas as respostas)
- NUNCA dê respostas genéricas - seja específica com números, links e ações quando apropriado
- NUNCA invente links - use APENAS os links do MAPA DE NAVEGAÇÃO acima
- NUNCA confunda o nome da loja com o nome do usuário. Se o usuário disser "meu nome é X", lembre-se disso
- Se o usuário disser "oi" ou "ajuda", olhe o contexto e sugira uma ação específica com link`;

    // USAR AGENTE ANA COM VERTEX AI
    console.log("[AI/Chat] 🤖 Usando Agente Ana com Vertex AI...");

    try {
      const vertexAgent = getVertexAgent();
      
      // Verificar se o usuário está pedindo análise visual ou legenda
      const needsVisualAnalysis = 
        message?.toLowerCase().includes("legenda") ||
        message?.toLowerCase().includes("caption") ||
        message?.toLowerCase().includes("texto para") ||
        message?.toLowerCase().includes("opinião") ||
        message?.toLowerCase().includes("analise") ||
        message?.toLowerCase().includes("o que acha") ||
        message?.toLowerCase().includes("crie uma legenda");

      // Prioridade: imagem enviada pelo usuário > último look > texto apenas
      let chatResponse: { text: string; groundingMetadata?: any };
      if (image) {
        // Usuário enviou imagem - usar análise visual
        console.log("[AI/Chat] 📸 Usando análise visual com imagem enviada pelo usuário");
        chatResponse = await vertexAgent.sendMessageWithImage(
          message || "Analise esta imagem",
          systemPrompt,
          image
        );
      } else if (needsVisualAnalysis && lastCompositionImageUrl) {
        // Usuário pediu análise e há último look disponível
        console.log("[AI/Chat] 📸 Usando análise visual com imagem do último look");
        chatResponse = await vertexAgent.sendMessageWithImage(
          message || "",
          systemPrompt,
          lastCompositionImageUrl
        );
      } else {
        // Resposta apenas com texto
        // IMPORTANTE: Combinar histórico do Firestore com a mensagem atual do frontend
        // O histórico do Firestore pode estar desatualizado (não inclui a mensagem atual)
        // Então precisamos mesclar: histórico do Firestore + mensagem atual do frontend
        
        // Pegar histórico do frontend (que já inclui a mensagem atual)
        const frontendHistory = history || [];
        
        // Se o frontend enviou histórico, usar ele (já inclui a mensagem atual)
        // Senão, usar o do Firestore (pode estar desatualizado)
        const historyToUse = frontendHistory.length > 0 ? frontendHistory : firestoreHistory;
        
        // Se ambos existirem, mesclar: histórico antigo do Firestore + mensagens novas do frontend
        // Mas normalmente o frontend já envia tudo, então priorizamos o frontend
        let mergedHistory = historyToUse;
        
        // Formatar histórico para o formato do Vertex AI
        const formattedHistory = mergedHistory.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content || msg.text || '' }],
        }));
        
        console.log("[AI/Chat] 📚 Histórico formatado:", formattedHistory.length, "mensagens", frontendHistory.length > 0 ? "(do frontend - inclui mensagem atual)" : "(do Firestore - pode estar desatualizado)");
        if (formattedHistory.length > 0) {
          console.log("[AI/Chat] 📝 Preview do histórico (últimas 3):", formattedHistory.slice(-3).map((h: any) => `${h.role}: ${h.parts[0].text.substring(0, 50)}...`));
          console.log("[AI/Chat] 📝 Última mensagem do histórico:", formattedHistory[formattedHistory.length - 1]?.parts[0]?.text?.substring(0, 100) || "N/A");
        }
        // Passar o systemPrompt completo para garantir que todas as informações estejam disponíveis
        console.log("[AI/Chat] 📤 Enviando histórico para Vertex Agent:", {
          totalMensagens: formattedHistory.length,
          primeiraMensagem: formattedHistory[0] ? { role: formattedHistory[0].role, text: formattedHistory[0].parts[0]?.text?.substring(0, 50) } : null,
          ultimaMensagem: formattedHistory[formattedHistory.length - 1] ? { role: formattedHistory[formattedHistory.length - 1].role, text: formattedHistory[formattedHistory.length - 1].parts[0]?.text?.substring(0, 50) } : null,
        });
        
        chatResponse = await vertexAgent.generateResponse(
          message || "", 
          lojistaId, 
          contextData,
          formattedHistory,
          systemPrompt // Passar o systemPrompt completo com enrichedContext
        );
      }

      // TAREFA 3: Salvar resposta da Ana no Firestore
      try {
        await chatMessagesRef.add({
          role: "model",
          content: chatResponse.text,
          createdAt: FieldValue.serverTimestamp(),
        });
        console.log("[AI/Chat] 💾 Resposta da Ana salva no Firestore");
      } catch (error) {
        console.warn("[AI/Chat] Erro ao salvar resposta da Ana:", error);
        // Continuar mesmo se não conseguir salvar
      }

      console.log("[AI/Chat] ✅ Resposta do Agente Ana recebida:", {
        responseLength: chatResponse.text.length,
        preview: chatResponse.text.substring(0, 100),
        usedVisualAnalysis: needsVisualAnalysis && !!lastCompositionImageUrl,
        hasGrounding: !!chatResponse.groundingMetadata,
        searchQueries: chatResponse.groundingMetadata?.webSearchQueries?.length || 0,
      });

      return NextResponse.json({
        success: true,
        response: chatResponse.text,
        provider: "vertex-ai",
        grounding: chatResponse.groundingMetadata ? {
          webSearchQueries: chatResponse.groundingMetadata.webSearchQueries || [],
          sources: chatResponse.groundingMetadata.groundingChunks?.map((chunk: any) => ({
            uri: chunk.web?.uri,
            title: chunk.web?.title,
          })).filter((source: any) => source.uri) || [],
        } : null,
        context: {
          produtosCount,
          displayConnected,
          salesConfigured,
          insightsCount: recentInsights.length,
        },
      });
    } catch (agentError: any) {
      console.error("[AI/Chat] ❌ Erro no Agente Ana (Vertex AI):", {
        error: agentError?.message,
        stack: agentError?.stack?.substring(0, 500),
      });

      // Retornar erro sem fallback - apenas Vertex AI
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao processar mensagem com Vertex AI",
          details: agentError?.message || "Erro desconhecido",
          provider: "vertex-ai",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[API/AI/Chat] Erro:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        response: "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.",
      },
      { status: 500 }
    );
  }
}

