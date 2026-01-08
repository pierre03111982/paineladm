import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { ProductAnalyzerService } from "@/lib/ai-services/product-analyzer";
import { logError } from "@/lib/logger";

export const dynamic = 'force-dynamic';

const productAnalyzerService = new ProductAnalyzerService();

function buildCorsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin") || "*";
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(origin),
  });
}

/**
 * Endpoint para atualizar análises automáticas de todos os produtos
 * FASE 28: Análise Automática de Produtos
 * 
 * POST /api/lojista/products/bulk-analyze
 * Body: { lojistaId?: string, limit?: number, skip?: number }
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin") || "*";
  
  try {
    const body = await request.json();
    const { lojistaId, limit = 100, skip = 0 } = body;

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório" },
        { status: 400, headers: buildCorsHeaders(origin) }
      );
    }

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { error: "Firestore Admin não inicializado" },
        { status: 500, headers: buildCorsHeaders(origin) }
      );
    }

    console.log(`[bulk-analyze] 🔄 Iniciando atualização em massa de análises para lojista ${lojistaId}`);

    // Buscar todos os produtos da loja
    const produtosRef = db.collection("lojas").doc(lojistaId).collection("produtos");
    const produtosSnapshot = await produtosRef
      .limit(limit)
      .offset(skip)
      .get();

    if (produtosSnapshot.empty) {
      return NextResponse.json(
        { 
          message: "Nenhum produto encontrado",
          processed: 0,
          updated: 0,
          errors: 0
        },
        { status: 200, headers: buildCorsHeaders(origin) }
      );
    }

    const results = {
      processed: 0,
      updated: 0,
      errors: 0,
      skipped: 0,
      details: [] as Array<{ produtoId: string; nome: string; status: string; error?: string }>
    };

    // Processar cada produto
    for (const produtoDoc of produtosSnapshot.docs) {
      const produtoId = produtoDoc.id;
      const produtoData = produtoDoc.data();
      
      results.processed++;

      try {
        // Verificar se tem imagem
        const imagemUrl = produtoData.imagemUrlOriginal || produtoData.imagemUrl;
        
        if (!imagemUrl) {
          results.skipped++;
          results.details.push({
            produtoId,
            nome: produtoData.nome || "Sem nome",
            status: "skipped",
            error: "Sem imagem"
          });
          console.log(`[bulk-analyze] ⏭️ Produto ${produtoId} pulado: sem imagem`);
          continue;
        }

        // Analisar produto com IA (focando apenas na roupa)
        const analysisResult = await productAnalyzerService.analyzeProductImage(imagemUrl);

        if (!analysisResult.success || !analysisResult.data) {
          results.errors++;
          results.details.push({
            produtoId,
            nome: produtoData.nome || "Sem nome",
            status: "error",
            error: analysisResult.error || "Erro desconhecido na análise"
          });
          console.error(`[bulk-analyze] ❌ Erro ao analisar produto ${produtoId}:`, analysisResult.error);
          continue;
        }

        const analysis = analysisResult.data;

        // Preparar atualização (sempre atualizar, mesmo que campos já tenham valores)
        const updateData: any = {};

        // Atualizar nome (sempre, pois a análise pode melhorar o nome existente)
        if (analysis.nome_sugerido) {
          updateData.nome = analysis.nome_sugerido;
        }

        // Adicionar descrição SEO ao campo observações (sem data)
        if (analysis.descricao_seo) {
          const observacoesAtuais = produtoData.obs || produtoData.observacoes || "";
          // Remover análises anteriores da IA para evitar duplicação
          const observacoesSemAnaliseAnterior = observacoesAtuais
            .split('\n\n[Análise IA')
            .filter((part: string, index: number) => index === 0 || !part.includes(']'))
            .join('\n\n')
            .trim();
          
          // Adicionar apenas a descrição SEO, sem data
          const novaObservacao = observacoesSemAnaliseAnterior
            ? `${observacoesSemAnaliseAnterior}\n\n${analysis.descricao_seo}`
            : analysis.descricao_seo;
          updateData.obs = novaObservacao;
          updateData.observacoes = novaObservacao;
        }

        // Atualizar categoria (sempre)
        if (analysis.categoria_sugerida) {
          updateData.categoria = analysis.categoria_sugerida;
        }

        // Atualizar tags (substituir por novas tags da análise, mesclando com existentes apenas se necessário)
        if (analysis.tags && Array.isArray(analysis.tags) && analysis.tags.length > 0) {
          // Usar tags da análise como base, mas manter tags existentes que não conflitem
          const tagsExistentes = produtoData.tags || [];
          const tagsDaAnalise = analysis.tags;
          // Mesclar: tags da análise + tags existentes que não estão na análise
          const tagsFinais = [...new Set([...tagsDaAnalise, ...tagsExistentes])];
          updateData.tags = tagsFinais;
        }

        // Atualizar cores (adicionar cor predominante da análise)
        if (analysis.cor_predominante) {
          const coresExistentes = produtoData.cores || [];
          const novaCor = analysis.cor_predominante;
          // Adicionar nova cor se não existir, ou substituir se for a primeira cor
          if (coresExistentes.length === 0) {
            updateData.cores = [novaCor];
          } else if (!coresExistentes.includes(novaCor)) {
            // Adicionar como primeira cor (cor predominante)
            updateData.cores = [novaCor, ...coresExistentes.filter((c: string) => c !== novaCor)];
          }
        }

        // Adicionar metadados COMPLETOS da análise IA
        updateData.analiseIA = {
          // Nome e descrição
          nome_sugerido: analysis.nome_sugerido,
          descricao_seo: analysis.descricao_seo,
          
          // Categoria e tipo
          suggested_category: analysis.suggested_category || analysis.categoria_sugerida,
          categoria_sugerida: analysis.categoria_sugerida || analysis.suggested_category,
          product_type: analysis.product_type,
          
          // Tecido
          detected_fabric: analysis.detected_fabric || analysis.tecido_estimado,
          tecido_estimado: analysis.tecido_estimado || analysis.detected_fabric,
          
          // Cores
          dominant_colors: analysis.dominant_colors || [],
          cor_predominante: analysis.cor_predominante,
          
          // Detalhes e tags
          detalhes: analysis.detalhes || [],
          tags: analysis.tags || [],
          
          // Metadados
          ultimaAtualizacao: new Date().toISOString(),
        };

        // Atualizar produto no Firestore
        await produtosRef.doc(produtoId).update(updateData);

        results.updated++;
        results.details.push({
          produtoId,
          nome: produtoData.nome || analysis.nome_sugerido,
          status: "updated"
        });

        console.log(`[bulk-analyze] ✅ Produto ${produtoId} atualizado com sucesso`);

        // Pequeno delay para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        results.errors++;
        results.details.push({
          produtoId,
          nome: produtoData.nome || "Sem nome",
          status: "error",
          error: error.message || "Erro desconhecido"
        });
        console.error(`[bulk-analyze] ❌ Erro ao processar produto ${produtoId}:`, error);
        await logError("BulkAnalyzeProducts", error, { produtoId, lojistaId });
      }
    }

    console.log(`[bulk-analyze] ✅ Processamento concluído:`, {
      processed: results.processed,
      updated: results.updated,
      errors: results.errors,
      skipped: results.skipped
    });

    return NextResponse.json(
      {
        success: true,
        ...results,
        message: `Processados ${results.processed} produtos. ${results.updated} atualizados, ${results.errors} erros, ${results.skipped} pulados.`
      },
      { status: 200, headers: buildCorsHeaders(origin) }
    );

  } catch (error: any) {
    console.error("[bulk-analyze] ❌ Erro geral:", error);
    await logError("BulkAnalyzeProducts", error, { requestBody: await request.json().catch(() => ({})) });
    
    return NextResponse.json(
      { error: "Erro interno do servidor ao processar análises em massa." },
      { status: 500, headers: buildCorsHeaders(origin) }
    );
  }
}

