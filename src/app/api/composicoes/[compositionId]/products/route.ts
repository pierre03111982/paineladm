/**
 * API Route: Buscar produtos de uma composição
 * GET /api/composicoes/[compositionId]/products?lojistaId=...&imagemUrl=...
 * 
 * ESTRATÉGIA COMPLETA E ROBUSTA:
 * 1. Buscar composição em lojas/{lojistaId}/composicoes (PRINCIPAL)
 * 2. Buscar composição na collection raiz "composicoes"
 * 3. Buscar generation pelo compositionId
 * 4. Buscar generation pela imagemUrl (com múltiplas estratégias de match)
 * 5. Buscar composição pela imagemUrl em todas as composições do lojista
 * 6. Buscar produtos no Firestore usando productIds encontrados
 * 7. Fallback: usar produtoNome dos favoritos
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ compositionId: string }> }
) {
  try {
    const { compositionId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const lojistaId = searchParams.get("lojistaId");
    const imagemUrlParam = searchParams.get("imagemUrl");

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório" },
        { status: 400 }
      );
    }

    console.log(`[API] 🔍 ========== BUSCA DE PRODUTOS ==========`);
    console.log(`[API] 📋 Parâmetros:`, {
      compositionId,
      lojistaId,
      imagemUrl: imagemUrlParam?.substring(0, 100),
    });

    const db = getAdminDb();
    const lojaRef = db.collection("lojas").doc(lojistaId);
    let products: any[] = [];
    let productIds: string[] = [];
    let composicaoEncontrada: any = null;

    // ============================================
    // ESTRATÉGIA 0: Buscar no ProductRegistry (MAIS CONFIÁVEL)
    // ============================================
    console.log(`[API] 🔍 ESTRATÉGIA 0: Buscando produtos no ProductRegistry para compositionId: ${compositionId}`);
    try {
      const { getProductsByCompositionId } = await import("@/lib/firestore/productRegistry");
      const produtosRegistry = await getProductsByCompositionId(lojistaId, compositionId);
      
      if (produtosRegistry && produtosRegistry.length > 0) {
        products = produtosRegistry;
        console.log(`[API] ✅ ESTRATÉGIA 0: ${products.length} produtos encontrados no ProductRegistry`);
        console.log(`[API] 📦 Produtos do ProductRegistry:`, products.map(p => ({
          id: p.id,
          nome: p.nome,
          preco: p.preco,
          temImagem: !!p.imagemUrl,
        })));
        return NextResponse.json({ products });
      } else {
        console.log(`[API] ⚠️ ESTRATÉGIA 0: Nenhum produto encontrado no ProductRegistry para ${compositionId}`);
      }
    } catch (error: any) {
      console.warn(`[API] ⚠️ Erro na ESTRATÉGIA 0 (ProductRegistry):`, error.message);
      console.warn(`[API] ⚠️ Stack trace:`, error.stack);
    }

    // ============================================
    // ESTRATÉGIA 1: Buscar composição em lojas/{lojistaId}/composicoes
    // ============================================
    console.log(`[API] 🔍 ESTRATÉGIA 1: Buscando composição em lojas/${lojistaId}/composicoes/${compositionId}`);
    try {
      // Verificar se o caminho está correto
      console.log(`[API] 📋 Debug ESTRATÉGIA 1:`, {
        lojistaId,
        compositionId,
        caminhoCompleto: `lojas/${lojistaId}/composicoes/${compositionId}`,
      });
      
      const composicaoDoc = await lojaRef
        .collection("composicoes")
        .doc(compositionId)
        .get();

      console.log(`[API] 📋 ESTRATÉGIA 1: Documento existe?`, composicaoDoc.exists);
      
      if (composicaoDoc.exists) {
        composicaoEncontrada = composicaoDoc.data();
        console.log(`[API] ✅ ESTRATÉGIA 1: Composição encontrada em lojas/{lojistaId}/composicoes`);
        console.log(`[API] 📦 Dados da composição:`, {
          temProdutos: !!composicaoEncontrada?.produtos,
          totalProdutos: composicaoEncontrada?.produtos?.length || 0,
          temProductIds: !!composicaoEncontrada?.productIds,
          totalProductIds: composicaoEncontrada?.productIds?.length || 0,
        });

        // Verificar se tem produtos completos
        if (composicaoEncontrada?.produtos && Array.isArray(composicaoEncontrada.produtos) && composicaoEncontrada.produtos.length > 0) {
          products = composicaoEncontrada.produtos.map((p: any, index: number) => ({
            id: p.id || p.productId || `prod-${index}`,
            nome: p.nome || p.name || "Produto",
                      preco: p.preco !== undefined ? p.preco : (p.price || 0),
                      imagemUrl: p.imagemUrl || p.imageUrl || p.productUrl || p.imagem || p.image || null,
                      categoria: p.categoria || p.category || null,
            tamanhos: Array.isArray(p.tamanhos) 
              ? p.tamanhos 
              : (p.tamanho ? [p.tamanho] : (p.size ? [p.size] : ["Único"])),
            cores: Array.isArray(p.cores) 
              ? p.cores 
              : (p.cor ? [p.cor] : (p.color ? [p.color] : [])),
            medidas: p.medidas || p.medida || p.measure || null,
            desconto: p.desconto !== undefined ? p.desconto : (p.discount || 0),
                      descricao: p.descricao || p.description || null,
                    })).filter((p: any) => p.id && p.nome);
                    
                    if (products.length > 0) {
            console.log(`[API] ✅ Retornando ${products.length} produtos da composição (ESTRATÉGIA 1)`);
                      return NextResponse.json({ products });
                    }
                  }
                  
        // Se não tem produtos completos, extrair productIds
        if (composicaoEncontrada?.productIds && Array.isArray(composicaoEncontrada.productIds) && composicaoEncontrada.productIds.length > 0) {
          productIds = composicaoEncontrada.productIds;
                    console.log(`[API] ✅ ProductIds encontrados na composição:`, productIds);
          
          // NOVO: Tentar buscar produtos no ProductRegistry usando os IDs
          try {
            const { getProductsByIds } = await import("@/lib/firestore/productRegistry");
            const produtosRegistry = await getProductsByIds(lojistaId, productIds);
            
            if (produtosRegistry && produtosRegistry.length > 0) {
              products = produtosRegistry;
              console.log(`[API] ✅ Produtos encontrados no ProductRegistry usando productIds:`, products.length);
              return NextResponse.json({ products });
            }
          } catch (error: any) {
            console.warn(`[API] ⚠️ Erro ao buscar produtos no ProductRegistry:`, error.message);
          }
        }
        
        // NOVO: Verificar se tem registeredProductIds
        if (composicaoEncontrada?.registeredProductIds && Array.isArray(composicaoEncontrada.registeredProductIds) && composicaoEncontrada.registeredProductIds.length > 0) {
          try {
            const { getProductsByIds } = await import("@/lib/firestore/productRegistry");
            const produtosRegistry = await getProductsByIds(lojistaId, composicaoEncontrada.registeredProductIds);
            
            if (produtosRegistry && produtosRegistry.length > 0) {
              products = produtosRegistry;
              console.log(`[API] ✅ Produtos encontrados no ProductRegistry usando registeredProductIds:`, products.length);
              return NextResponse.json({ products });
            }
          } catch (error: any) {
            console.warn(`[API] ⚠️ Erro ao buscar produtos no ProductRegistry:`, error.message);
          }
                  }
                } else {
        console.log(`[API] ⚠️ ESTRATÉGIA 1: Composição não encontrada em lojas/{lojistaId}/composicoes`);
      }
    } catch (error: any) {
      console.warn(`[API] ⚠️ Erro na ESTRATÉGIA 1:`, error.message);
    }

    // ============================================
    // ESTRATÉGIA 2: Buscar composição na collection raiz "composicoes"
    // ============================================
    if (products.length === 0 && productIds.length === 0) {
      try {
        const composicaoDocRaiz = await db
                  .collection("composicoes")
          .doc(compositionId)
                  .get();
                
        if (composicaoDocRaiz.exists) {
          composicaoEncontrada = composicaoDocRaiz.data();
          console.log(`[API] ✅ ESTRATÉGIA 2: Composição encontrada na collection raiz "composicoes"`);

          if (composicaoEncontrada?.produtos && Array.isArray(composicaoEncontrada.produtos) && composicaoEncontrada.produtos.length > 0) {
            products = composicaoEncontrada.produtos.map((p: any, index: number) => ({
              id: p.id || p.productId || `prod-${index}`,
              nome: p.nome || p.name || "Produto",
                      preco: p.preco !== undefined ? p.preco : (p.price || 0),
                      imagemUrl: p.imagemUrl || p.imageUrl || p.productUrl || p.imagem || p.image || null,
                      categoria: p.categoria || p.category || null,
              tamanhos: Array.isArray(p.tamanhos) 
                ? p.tamanhos 
                : (p.tamanho ? [p.tamanho] : (p.size ? [p.size] : ["Único"])),
              cores: Array.isArray(p.cores) 
                ? p.cores 
                : (p.cor ? [p.cor] : (p.color ? [p.color] : [])),
              medidas: p.medidas || p.medida || p.measure || null,
              desconto: p.desconto !== undefined ? p.desconto : (p.discount || 0),
                      descricao: p.descricao || p.description || null,
                    })).filter((p: any) => p.id && p.nome);
                    
                    if (products.length > 0) {
              console.log(`[API] ✅ Retornando ${products.length} produtos da composição (ESTRATÉGIA 2)`);
                      return NextResponse.json({ products });
                    }
                  }
                  
          if (composicaoEncontrada?.productIds && Array.isArray(composicaoEncontrada.productIds) && composicaoEncontrada.productIds.length > 0) {
            productIds = composicaoEncontrada.productIds;
            console.log(`[API] ✅ ProductIds encontrados na composição (raiz):`, productIds);
          }
        }
      } catch (error: any) {
        console.warn(`[API] ⚠️ Erro na ESTRATÉGIA 2:`, error.message);
      }
    }

    // ============================================
    // ESTRATÉGIA 3: Buscar generation pelo compositionId
    // ============================================
    if (products.length === 0 && productIds.length === 0) {
      try {
        const generationsRef = db.collection("generations");
        
        let generationQuery;
        try {
          generationQuery = await generationsRef
                .where("compositionId", "==", compositionId)
                .where("lojistaId", "==", lojistaId)
            .limit(1)
            .get();
        } catch (whereError: any) {
          // Se falhar (falta de índice), buscar todas e filtrar
          const allGenerations = await generationsRef
            .where("lojistaId", "==", lojistaId)
                      .limit(2000)
                      .get();
                    
          const filtered = allGenerations.docs.filter(doc => {
                    const data = doc.data();
            return data.compositionId === compositionId;
                  });
                  
          generationQuery = {
                    docs: filtered,
                    size: filtered.length,
            empty: filtered.length === 0
                  } as any;
                }
                      
                      if (!generationQuery.empty) {
                        const generationData = generationQuery.docs[0].data();
          console.log(`[API] ✅ ESTRATÉGIA 3: Generation encontrada pelo compositionId`);
          console.log(`[API] 📋 Generation data:`, {
            id: generationQuery.docs[0].id,
            temProdutos: !!generationData.produtos,
            produtos: generationData.produtos?.length || 0,
            temProductIds: !!generationData.productIds,
            productIds: generationData.productIds?.length || 0,
          });

          // Verificar se tem produtos salvos diretamente
          if (generationData.produtos && Array.isArray(generationData.produtos) && generationData.produtos.length > 0) {
            products = generationData.produtos.map((p: any, index: number) => ({
              id: p.id || p.productId || `prod-gen-${index}`,
              nome: p.nome || p.name || "Produto",
                            preco: p.preco !== undefined ? p.preco : (p.price || 0),
                            imagemUrl: p.imagemUrl || p.imageUrl || p.productUrl || p.imagem || p.image || null,
                            categoria: p.categoria || p.category || null,
            tamanhos: Array.isArray(p.tamanhos) 
              ? p.tamanhos 
                : (p.tamanho ? [p.tamanho] : (p.size ? [p.size] : ["Único"])),
            cores: Array.isArray(p.cores) 
              ? p.cores 
                : (p.cor ? [p.cor] : (p.color ? [p.color] : [])),
              medidas: p.medidas || p.medida || p.measure || null,
              desconto: p.desconto !== undefined ? p.desconto : (p.discount || 0),
                            descricao: p.descricao || p.description || null,
                          })).filter((p: any) => p.id && p.nome);
                          
                          if (products.length > 0) {
              console.log(`[API] ✅ Retornando ${products.length} produtos da generation (ESTRATÉGIA 3)`);
                            return NextResponse.json({ products });
                          }
                        }
                        
          // Se não tem produtos, usar productIds
          if (generationData.productIds && Array.isArray(generationData.productIds) && generationData.productIds.length > 0) {
            productIds = generationData.productIds;
                console.log(`[API] ✅ ProductIds encontrados na generation:`, productIds);
          }
          
          // NOVO: Se generation não tem produtos mas tem compositionId, buscar a composição diretamente
          if (products.length === 0 && generationData.compositionId) {
            console.log(`[API] 🔍 Generation sem produtos - buscando composição diretamente: ${generationData.compositionId}`);
            
            try {
              // Tentar primeiro em lojas/{lojistaId}/composicoes
              let compDoc = await lojaRef
                .collection("composicoes")
                .doc(generationData.compositionId)
                .get();
              
              // Se não encontrou, tentar na collection raiz
              if (!compDoc.exists) {
                compDoc = await db
                  .collection("composicoes")
                  .doc(generationData.compositionId)
                  .get();
              }
              
              if (compDoc.exists) {
                const compData = compDoc.data();
                console.log(`[API] ✅ Composição encontrada pela generation.compositionId:`, {
                  temProdutos: !!compData?.produtos,
                  totalProdutos: compData?.produtos?.length || 0,
                });
                
                if (compData?.produtos && Array.isArray(compData.produtos) && compData.produtos.length > 0) {
                  products = compData.produtos.map((p: any, index: number) => ({
                    id: p.id || p.productId || `prod-${index}`,
                    nome: p.nome || p.name || "Produto",
                    preco: p.preco !== undefined ? p.preco : (p.price || 0),
                    imagemUrl: p.imagemUrl || p.imageUrl || p.productUrl || p.imagem || p.image || null,
                    categoria: p.categoria || p.category || null,
                    tamanhos: Array.isArray(p.tamanhos) 
                      ? p.tamanhos 
                      : (p.tamanho ? [p.tamanho] : (p.size ? [p.size] : ["Único"])),
                    cores: Array.isArray(p.cores) 
                      ? p.cores 
                      : (p.cor ? [p.cor] : (p.color ? [p.color] : [])),
                    medidas: p.medidas || p.medida || p.measure || null,
                    desconto: p.desconto !== undefined ? p.desconto : (p.discount || 0),
                    descricao: p.descricao || p.description || null,
                  })).filter((p: any) => p.id && p.nome);
                  
                  if (products.length > 0) {
                    console.log(`[API] ✅ Retornando ${products.length} produtos da composição encontrada pela generation (ESTRATÉGIA 3)`);
                    return NextResponse.json({ products });
                  }
                }
              }
            } catch (error) {
              console.warn(`[API] ⚠️ Erro ao buscar composição pela generation.compositionId:`, error);
            }
          }
        }
          } catch (error: any) {
        console.warn(`[API] ⚠️ Erro na ESTRATÉGIA 3:`, error.message);
      }
    }

    // ============================================
    // ESTRATÉGIA 4: Buscar generation pela imagemUrl
    // ============================================
    if (products.length === 0 && productIds.length === 0 && imagemUrlParam) {
      try {
              const generationsRef = db.collection("generations");
        const imagemUrlNormalizada = imagemUrlParam.split('?')[0].trim();
        const imagemFileName = imagemUrlNormalizada.split('/').pop() || '';
        
        const allGenerations = await generationsRef
                .where("lojistaId", "==", lojistaId)
          .limit(2000)
                .get();
              
        console.log(`[API] 🔍 ESTRATÉGIA 4: Verificando ${allGenerations.size} generations pela imagemUrl...`);
                
        for (const genDoc of allGenerations.docs) {
                  const genData = genDoc.data();
          const genImagemUrl = genData.imagemUrl || genData.imageUrl;
          
          if (genImagemUrl) {
            const genUrlNormalizada = genImagemUrl.split('?')[0].trim();
            const genFileName = genUrlNormalizada.split('/').pop() || '';
            
            // Múltiplas estratégias de match
            const matchExato = genImagemUrl === imagemUrlParam || genImagemUrl.trim() === imagemUrlParam.trim();
            const matchNormalizado = genUrlNormalizada === imagemUrlNormalizada;
            const matchFileName = imagemFileName && genFileName && imagemFileName === genFileName;
            
            if (matchExato || matchNormalizado || matchFileName) {
              console.log(`[API] ✅ ESTRATÉGIA 4: Generation encontrada pela imagemUrl`);
              console.log(`[API] 📋 Generation ID: ${genDoc.id}`);
              console.log(`[API] 📋 Generation data:`, {
                temProdutos: !!genData.produtos,
                produtos: genData.produtos?.length || 0,
                temProductIds: !!genData.productIds,
                productIds: genData.productIds?.length || 0,
                compositionId: genData.compositionId,
              });

              // Verificar se tem produtos salvos diretamente
              if (genData.produtos && Array.isArray(genData.produtos) && genData.produtos.length > 0) {
                products = genData.produtos.map((p: any, index: number) => ({
                  id: p.id || p.productId || `prod-gen-${index}`,
                  nome: p.nome || p.name || "Produto",
                  preco: p.preco !== undefined ? p.preco : (p.price || 0),
                  imagemUrl: p.imagemUrl || p.imageUrl || p.productUrl || p.imagem || p.image || null,
                  categoria: p.categoria || p.category || null,
                  tamanhos: Array.isArray(p.tamanhos) 
                    ? p.tamanhos 
                    : (p.tamanho ? [p.tamanho] : (p.size ? [p.size] : ["Único"])),
                  cores: Array.isArray(p.cores) 
                    ? p.cores 
                    : (p.cor ? [p.cor] : (p.color ? [p.color] : [])),
                  medidas: p.medidas || p.medida || p.measure || null,
                  desconto: p.desconto !== undefined ? p.desconto : (p.discount || 0),
                  descricao: p.descricao || p.description || null,
                })).filter((p: any) => p.id && p.nome);

                if (products.length > 0) {
                  console.log(`[API] ✅ Retornando ${products.length} produtos da generation (ESTRATÉGIA 4)`);
                  return NextResponse.json({ products });
                }
              }

              // IMPORTANTE: Se encontrou a generation, SEMPRE buscar a composição relacionada
              // Mesmo que a generation não tenha productIds, a composição pode ter produtos salvos
              if (genData.compositionId) {
                console.log(`[API] 🔍 Generation encontrada tem compositionId: ${genData.compositionId}`);
                console.log(`[API] 🔍 Buscando composição relacionada (mesmo que generation não tenha productIds)...`);
                
                // Buscar a composição usando o compositionId da generation
                try {
                  // Tentar primeiro em lojas/{lojistaId}/composicoes
                  let composicaoRelacionada = await lojaRef
                    .collection("composicoes")
                    .doc(genData.compositionId)
                        .get();
                      
                  console.log(`[API] 📋 Busca em lojas/{lojistaId}/composicoes:`, {
                    compositionId: genData.compositionId,
                    existe: composicaoRelacionada.exists,
                  });
                  
                  // Se não encontrou, tentar na collection raiz
                  if (!composicaoRelacionada.exists) {
                    composicaoRelacionada = await db
                      .collection("composicoes")
                      .doc(genData.compositionId)
                      .get();
                    
                    console.log(`[API] 📋 Busca na collection raiz composicoes:`, {
                      compositionId: genData.compositionId,
                      existe: composicaoRelacionada.exists,
                    });
                  }
                  
                  if (composicaoRelacionada.exists) {
                    const compData = composicaoRelacionada.data();
                    console.log(`[API] ✅ Composição relacionada encontrada! ID: ${genData.compositionId}`);
                    console.log(`[API] 📦 Dados da composição:`, {
                      temProdutos: !!compData?.produtos,
                      totalProdutos: compData?.produtos?.length || 0,
                      temProductIds: !!compData?.productIds,
                      totalProductIds: compData?.productIds?.length || 0,
                      temRegisteredProductIds: !!compData?.registeredProductIds,
                      totalRegisteredProductIds: compData?.registeredProductIds?.length || 0,
                    });
                    
                    // Verificar se tem produtos completos
                    if (compData?.produtos && Array.isArray(compData.produtos) && compData.produtos.length > 0) {
                      products = compData.produtos.map((p: any, index: number) => ({
                        id: p.id || p.productId || `prod-${index}`,
                        nome: p.nome || p.name || "Produto",
            preco: p.preco !== undefined ? p.preco : (p.price || 0),
            imagemUrl: p.imagemUrl || p.imageUrl || p.productUrl || p.imagem || p.image || null,
            categoria: p.categoria || p.category || null,
            tamanhos: Array.isArray(p.tamanhos) 
              ? p.tamanhos 
                          : (p.tamanho ? [p.tamanho] : (p.size ? [p.size] : ["Único"])),
            cores: Array.isArray(p.cores) 
              ? p.cores 
                          : (p.cor ? [p.cor] : (p.color ? [p.color] : [])),
                        medidas: p.medidas || p.medida || p.measure || null,
                        desconto: p.desconto !== undefined ? p.desconto : (p.discount || 0),
            descricao: p.descricao || p.description || null,
                      })).filter((p: any) => p.id && p.nome);
                      
          if (products.length > 0) {
                        console.log(`[API] ✅ Retornando ${products.length} produtos da composição relacionada (ESTRATÉGIA 4)`);
            return NextResponse.json({ products });
                      }
                    }
                    
                    // Se não tem produtos completos, extrair productIds
                    if (compData?.productIds && Array.isArray(compData.productIds) && compData.productIds.length > 0) {
                      productIds = compData.productIds;
                      console.log(`[API] ✅ ProductIds encontrados na composição relacionada:`, productIds);
                    }
                    
                    // Verificar também registeredProductIds
                    if (compData?.registeredProductIds && Array.isArray(compData.registeredProductIds) && compData.registeredProductIds.length > 0) {
                      productIds = [...productIds, ...compData.registeredProductIds];
                      console.log(`[API] ✅ RegisteredProductIds encontrados na composição relacionada:`, compData.registeredProductIds);
        }
      } else {
                    console.log(`[API] ⚠️ Composição relacionada não encontrada: ${genData.compositionId}`);
                    console.log(`[API] 📋 Tentou buscar em:`, {
                      caminho1: `lojas/${lojistaId}/composicoes/${genData.compositionId}`,
                      caminho2: `composicoes/${genData.compositionId}`,
                    });
      }
    } catch (error) {
                  console.warn(`[API] ⚠️ Erro ao buscar composição relacionada:`, error);
                }
              }
              
              // Se ainda não encontrou produtos mas tem imagemUrl, criar fallback melhorado
              if (products.length === 0 && imagemUrlParam) {
                console.log(`[API] ⚠️ Generation encontrada mas sem produtos - criando fallback melhorado`);
                products = [{
                  id: `prod-${genData.compositionId || compositionId}-fallback`,
                  nome: "Look Completo (Gerado pela IA)",
                  preco: 0,
                  imagemUrl: imagemUrlParam, // ✅ Usar imagem da composição
                  categoria: null,
                  tamanhos: ["Único"],
                  cores: [],
                  medidas: null,
                  desconto: 0,
                  descricao: null,
                }];
                console.log(`[API] ✅ Fallback melhorado criado com imagem da composição`);
                return NextResponse.json({ products });
              }
              
              // Se ainda não tem produtos, usar productIds da generation (se existirem)
              if (products.length === 0 && genData.productIds && Array.isArray(genData.productIds) && genData.productIds.length > 0) {
                productIds = genData.productIds;
                console.log(`[API] ✅ ProductIds encontrados na generation (imagemUrl):`, productIds);
                break; // Encontrou, sair do loop
              } else if (products.length === 0 && (!genData.productIds || genData.productIds.length === 0)) {
                console.log(`[API] ⚠️ Generation encontrada mas sem productIds e sem produtos na composição relacionada`);
                // Continuar buscando mesmo assim
              }
            }
          }
        }
      } catch (error: any) {
        console.warn(`[API] ⚠️ Erro na ESTRATÉGIA 4:`, error.message);
      }
    }

    // ============================================
    // ESTRATÉGIA 5: Buscar composição pela imagemUrl em todas as composições
    // ============================================
    if (products.length === 0 && productIds.length === 0 && imagemUrlParam) {
      try {
        console.log(`[API] 🔍 ESTRATÉGIA 5: Buscando composição pela imagemUrl em todas as composições...`);
        
        const imagemUrlNormalizada = imagemUrlParam.split('?')[0].trim();
        const imagemFileName = imagemUrlNormalizada.split('/').pop() || '';
        
        // Buscar todas as composições do lojista
        const todasComposicoes = await lojaRef
          .collection("composicoes")
          .limit(2000)
              .get();
            
        console.log(`[API] 📊 Verificando ${todasComposicoes.size} composições pela imagemUrl...`);
        
        for (const compDoc of todasComposicoes.docs) {
          const compData = compDoc.data();
          
          // Verificar em diferentes campos
          const compImagemUrl = compData?.imagemUrl || 
                                compData?.looks?.[0]?.imagemUrl ||
                                compData?.looks?.[0]?.url ||
                                compData?.imageUrl;
          
          if (compImagemUrl) {
            const compUrlNormalizada = compImagemUrl.split('?')[0].trim();
            const compFileName = compUrlNormalizada.split('/').pop() || '';
            
            const matchExato = compImagemUrl === imagemUrlParam || compImagemUrl.trim() === imagemUrlParam.trim();
            const matchNormalizado = compUrlNormalizada === imagemUrlNormalizada;
            const matchFileName = imagemFileName && compFileName && imagemFileName === compFileName;
            
            if (matchExato || matchNormalizado || matchFileName) {
              console.log(`[API] ✅ ESTRATÉGIA 5: Composição encontrada pela imagemUrl! ID: ${compDoc.id}`);
              
              if (compData?.produtos && Array.isArray(compData.produtos) && compData.produtos.length > 0) {
                products = compData.produtos.map((p: any, index: number) => ({
                  id: p.id || p.productId || `prod-${index}`,
                  nome: p.nome || p.name || "Produto",
                  preco: p.preco !== undefined ? p.preco : (p.price || 0),
                  imagemUrl: p.imagemUrl || p.imageUrl || p.productUrl || p.imagem || p.image || null,
                  categoria: p.categoria || p.category || null,
                  tamanhos: Array.isArray(p.tamanhos) 
                    ? p.tamanhos 
                    : (p.tamanho ? [p.tamanho] : (p.size ? [p.size] : ["Único"])),
                  cores: Array.isArray(p.cores) 
                    ? p.cores 
                    : (p.cor ? [p.cor] : (p.color ? [p.color] : [])),
                  medidas: p.medidas || p.medida || p.measure || null,
                  desconto: p.desconto !== undefined ? p.desconto : (p.discount || 0),
                  descricao: p.descricao || p.description || null,
                })).filter((p: any) => p.id && p.nome);
                
                if (products.length > 0) {
                  console.log(`[API] ✅ Retornando ${products.length} produtos da composição encontrada (ESTRATÉGIA 5)`);
                      return NextResponse.json({ products });
                    }
                  }
                  
              if (compData?.productIds && Array.isArray(compData.productIds) && compData.productIds.length > 0) {
                productIds = compData.productIds;
                console.log(`[API] ✅ ProductIds encontrados na composição (imagemUrl):`, productIds);
                break;
              }
            }
          }
        }
      } catch (error: any) {
        console.warn(`[API] ⚠️ Erro na ESTRATÉGIA 5:`, error.message);
      }
    }

    // ============================================
    // ESTRATÉGIA 6: Buscar produtos no ProductRegistry usando productIds
    // ============================================
    if (products.length === 0 && productIds.length > 0) {
      console.log(`[API] 🔍 ESTRATÉGIA 6: Buscando ${productIds.length} produtos no ProductRegistry...`);
      
      try {
        const { getProductsByIds } = await import("@/lib/firestore/productRegistry");
        const produtosRegistry = await getProductsByIds(lojistaId, productIds);
        
        if (produtosRegistry && produtosRegistry.length > 0) {
          products = produtosRegistry;
          console.log(`[API] ✅ ESTRATÉGIA 6: ${products.length} produtos encontrados no ProductRegistry`);
        } else {
          console.log(`[API] ⚠️ ESTRATÉGIA 6: Nenhum produto encontrado no ProductRegistry, tentando Firestore...`);
          
          // Fallback: buscar no Firestore produtos collection
          const produtosPromises = productIds.map(async (productId: string) => {
        try {
          const produtoDoc = await lojaRef
            .collection("produtos")
            .doc(productId)
                  .get();
                
          if (produtoDoc.exists) {
            const produtoData = produtoDoc.data();
                const produto = {
              id: productId,
                  nome: produtoData?.nome || produtoData?.name || "Produto",
                  preco: produtoData?.preco !== undefined ? produtoData.preco : (produtoData?.price || 0),
                  imagemUrl: produtoData?.imagemUrl || produtoData?.imageUrl || produtoData?.productUrl || produtoData?.imagem || produtoData?.image || null,
                  categoria: produtoData?.categoria || produtoData?.category || null,
              tamanhos: Array.isArray(produtoData?.tamanhos) 
                ? produtoData.tamanhos 
                    : (produtoData?.tamanho ? [produtoData.tamanho] : (produtoData?.size ? [produtoData.size] : ["Único"])),
              cores: Array.isArray(produtoData?.cores) 
                ? produtoData.cores 
                    : (produtoData?.cor ? [produtoData.cor] : (produtoData?.color ? [produtoData.color] : [])),
                  medidas: produtoData?.medidas || produtoData?.medida || produtoData?.measure || null,
                  desconto: produtoData?.desconto !== undefined ? produtoData.desconto : (produtoData?.discount || 0),
                  descricao: produtoData?.descricao || produtoData?.description || null,
                };
                
                return produto;
              }
              
              return null;
        } catch (error) {
          console.error(`[API] ❌ Erro ao buscar produto ${productId}:`, error);
              return null;
            }
          });
          
          const produtosEncontrados = await Promise.all(produtosPromises);
          products = produtosEncontrados.filter((p): p is any => p !== null);
          console.log(`[API] ✅ ESTRATÉGIA 6 (Fallback): ${products.length} produtos encontrados no Firestore`);
        }
      } catch (error: any) {
        console.warn(`[API] ⚠️ Erro na ESTRATÉGIA 6:`, error.message);
      }
    }

    // ============================================
    // VALIDAÇÃO FINAL: Garantir que todos os produtos tenham dados mínimos
    // ============================================
    if (products.length > 0) {
      products = products.map((p: any) => {
        // Garantir dados mínimos
        return {
          id: p.id || `prod-${Date.now()}`,
                      nome: p.nome || "Produto",
          preco: p.preco !== undefined && p.preco !== null ? Number(p.preco) : 0,
          imagemUrl: p.imagemUrl || null,
                      categoria: p.categoria || null,
          tamanhos: Array.isArray(p.tamanhos) && p.tamanhos.length > 0 
            ? p.tamanhos 
            : ["Único"],
          cores: Array.isArray(p.cores) ? p.cores : [],
          medidas: p.medidas || null,
          desconto: p.desconto !== undefined && p.desconto !== null ? Number(p.desconto) : 0,
                      descricao: p.descricao || null,
        };
      });
      
      console.log(`[API] ✅ Produtos validados:`, products.map(p => ({
        id: p.id,
        nome: p.nome,
        preco: p.preco,
        temImagemUrl: !!p.imagemUrl,
        tamanhos: p.tamanhos,
      })));
      
      // NOVO: Registrar produtos encontrados no ProductRegistry para futuras buscas
      // Isso garante que composições antigas também sejam indexadas automaticamente
      if (compositionId && products.length > 0) {
        try {
          const { registerCompositionProducts } = await import("@/lib/firestore/productRegistry");
          await registerCompositionProducts(lojistaId, compositionId, products);
          console.log(`[API] ✅ Produtos registrados no ProductRegistry para futuras buscas`);
        } catch (registryError: any) {
          console.warn(`[API] ⚠️ Erro ao registrar produtos no ProductRegistry:`, registryError.message);
          // Não falhar se o registro falhar
        }
      }
    }

    // ============================================
    // FALLBACK: Retornar produto genérico se não encontrou nada
    // ============================================
    if (products.length === 0) {
      console.error(`[API] ❌ ========== NENHUM PRODUTO ENCONTRADO ==========`);
      console.error(`[API] 📋 Debug completo:`, {
        compositionId,
        lojistaId,
        imagemUrl: imagemUrlParam?.substring(0, 150),
        productIdsEncontrados: productIds.length,
        productIds,
        composicaoEncontrada: !!composicaoEncontrada,
      });
      
      // Tentar buscar produtoNome nos favoritos
      let produtoNomeFallback: string | null = null;
      try {
        const clientesSnapshot = await lojaRef.collection("clientes").limit(50).get();
        for (const clienteDoc of clientesSnapshot.docs) {
          try {
            const favoritosSnapshot = await lojaRef
              .collection("clientes")
              .doc(clienteDoc.id)
              .collection("favoritos")
              .where("action", "==", "like")
              .where("compositionId", "==", compositionId)
              .limit(1)
              .get();
            
            if (!favoritosSnapshot.empty) {
              const favoritoData = favoritosSnapshot.docs[0].data();
              produtoNomeFallback = favoritoData.produtoNome || null;
              if (produtoNomeFallback) {
                console.log(`[API] ✅ ProdutoNome encontrado no favorito: ${produtoNomeFallback}`);
                break;
              }
            }
          } catch (error) {
            // Continuar
          }
        }
      } catch (error) {
        console.warn("[API] ⚠️ Erro ao buscar produtoNome nos favoritos:", error);
      }
      
      const nomeProduto = produtoNomeFallback || "Look Completo (Gerado pela IA)";
      
      // ✅ TAREFA 2: Usar imagem da composição no fallback (NUNCA null se tiver imagemUrl)
      const imagemFallback = imagemUrlParam || null;
      
      // Se o nome contém " + ", separar em múltiplos produtos
      if (nomeProduto.includes(" + ")) {
        const nomesSeparados = nomeProduto.split(" + ");
        products = nomesSeparados.map((nome: string, index: number) => ({
          id: `prod-${compositionId}-fallback-${index}`,
          nome: nome.trim(),
          preco: 0,
          imagemUrl: imagemFallback, // ✅ Usar imagem da composição
          categoria: null,
          tamanhos: ["Único"],
          cores: [],
          medidas: null,
          desconto: 0,
          descricao: null,
        }));
          } else {
        products = [{
          id: `prod-${compositionId}-fallback`,
          nome: nomeProduto,
          preco: 0,
          imagemUrl: imagemFallback, // ✅ Usar imagem da composição (não mais null)
          categoria: null,
          tamanhos: ["Único"],
          cores: [],
          medidas: null,
          desconto: 0,
          descricao: null,
        }];
      }
      
      console.log(`[API] ⚠️ Retornando ${products.length} produto(s) genérico(s) como fallback:`, {
        nome: products[0]?.nome,
        temImagem: !!products[0]?.imagemUrl,
        imagemUrl: products[0]?.imagemUrl?.substring(0, 100) || "SEM IMAGEM",
      });
    }

    console.log(`[API] ✅ ========== RESULTADO FINAL ==========`);
    console.log(`[API] ✅ Total de produtos retornados: ${products.length}`);
    console.log(`[API] 📋 Resumo final:`, products.map(p => ({
      id: p.id,
      nome: p.nome,
      preco: p.preco,
      temImagem: !!p.imagemUrl,
      temTamanhos: p.tamanhos && p.tamanhos.length > 0,
    })));

    return NextResponse.json({ products });
  } catch (error: any) {
    console.error("[API] ❌ Erro ao buscar produtos da composição:", error);
    return NextResponse.json(
      { error: "Erro ao buscar produtos", details: error.message },
      { status: 500 }
    );
  }
}
