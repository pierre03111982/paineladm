import { NextRequest, NextResponse } from "next/server";
import { VertexAI } from "@google-cloud/vertexai";

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * API para seleção inteligente de produtos compatíveis para Look Combinado
 * 
 * A IA analisa o produto atual e seleciona automaticamente produtos do estoque
 * que criam uma combinação harmoniosa e estilosa.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lojistaId, currentProduct, availableProducts, numProducts, autoDecide } = body;

    if (!lojistaId || !currentProduct || !availableProducts) {
      return NextResponse.json(
        { error: "Dados incompletos" },
        { status: 400 }
      );
    }

    // Validar que há produtos disponíveis
    if (!Array.isArray(availableProducts) || availableProducts.length === 0) {
      return NextResponse.json(
        { error: "Nenhum produto disponível para seleção" },
        { status: 400 }
      );
    }

    // Decidir quantos produtos usar baseado no tipo de produto principal
    let targetNumProducts = numProducts;
    if (autoDecide) {
      // IA decide automaticamente baseado na categoria
      const categoria = currentProduct.categoria?.toLowerCase() || '';
      
      // Produtos que geralmente ficam bem com 1 complemento
      const singleComplementCategories = ['vestido', 'macacão', 'conjunto', 'look completo'];
      // Produtos que ficam bem com 2 complementos
      const doubleComplementCategories = ['blusa', 'top', 'camisa', 'camiseta', 'saia', 'shorts'];
      
      if (singleComplementCategories.some(cat => categoria.includes(cat))) {
        targetNumProducts = 1;
      } else if (doubleComplementCategories.some(cat => categoria.includes(cat))) {
        targetNumProducts = 2;
      } else {
        targetNumProducts = 1; // Default
      }
      
      console.log(`[SelectCombination] 🎯 Auto-decisão: ${targetNumProducts} produto(s) para categoria "${currentProduct.categoria}"`);
    }

    // Configurar Vertex AI
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || "";
    const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

    if (!projectId) {
      console.error("[SelectCombination] GOOGLE_CLOUD_PROJECT_ID não configurado");
      return NextResponse.json(
        { error: "Configuração do Google Cloud ausente" },
        { status: 500 }
      );
    }

    const vertexAI = new VertexAI({
      project: projectId,
      location: location,
    });

    const model = vertexAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    // Criar prompt para a IA selecionar produtos compatíveis
    const prompt = `Você é um personal stylist especializado em moda com expertise em criar looks completos para manequins de estúdio fotográfico. Sua missão é selecionar ${targetNumProducts || 1} produto(s) do estoque que irão COMPOR um look harmonioso no MANEQUIM junto com o produto principal.

**🎯 CONTEXTO DA TAREFA:**
Estamos criando uma foto de estúdio profissional onde um MANEQUIM vestirá múltiplas peças ao mesmo tempo. O produto principal já estará no manequim, e você deve selecionar produtos complementares que:
1. Completam visualmente o look no manequim
2. São fisicamente compatíveis para serem vestidos juntos
3. Criam harmonia estética e funcional

**📦 PRODUTO PRINCIPAL (já estará no manequim):**
- Nome: ${currentProduct.nome}
- Categoria: ${currentProduct.categoria}
- Tipo: ${currentProduct.tipo || "Não especificado"}
- Tecido: ${currentProduct.tecido || "Não especificado"}
- Cores: ${currentProduct.cores?.map((c: any) => c.name || c).join(", ") || "Não especificado"}
- Tags: ${currentProduct.tags?.join(", ") || "Nenhuma"}

**🛍️ PRODUTOS DISPONÍVEIS NO ESTOQUE:**
${availableProducts.map((p: any, idx: number) => {
  const analiseIA = p.analiseIA || {};
  return `
${idx + 1}. ID: ${p.id}
   Nome: ${p.nome}
   Categoria: ${p.categoria}
   Tipo: ${analiseIA.product_type || "N/A"}
   Cores: ${analiseIA.dominant_colors?.map((c: any) => c.name || c).join(", ") || "N/A"}
   Tecido: ${analiseIA.detected_fabric || "N/A"}
   Tags: ${p.tags?.join(", ") || "Nenhuma"}
   Preço: R$ ${p.preco}`;
}).join("\n")}

**✅ CRITÉRIOS DE SELEÇÃO (ordem de prioridade):**

1. **COMPATIBILIDADE FÍSICA NO MANEQUIM**
   - Produtos devem poder ser vestidos JUNTOS no mesmo manequim
   - Exemplo CORRETO: Vestido + Jaqueta / Calça + Blusa / Short + Top + Kimono
   - Exemplo ERRADO: Vestido + Calça (conflito) / Duas blusas (não faz sentido)

2. **COMPLEMENTARIDADE LÓGICA**
   - Se produto principal é PARTE DE CIMA → selecione PARTE DE BAIXO (calça, saia, short)
   - Se produto principal é PARTE DE BAIXO → selecione PARTE DE CIMA (blusa, top, camisa)
   - Se produto principal é PEÇA ÚNICA (vestido, macacão) → selecione SOBRETUDO (jaqueta, casaco, kimono, blazer)
   - SEGUNDA PEÇA COMPLEMENTAR: Acessórios que completam (bolsa, sapato, chapéu, lenço)

3. **HARMONIA DE CORES**
   - Cores que combinam: complementares, análogas ou neutras
   - Evite conflitos cromáticos
   - Neutros (preto, branco, bege, cinza) combinam com tudo

4. **COERÊNCIA DE ESTILO**
   - Casual + Casual / Elegante + Elegante / Esportivo + Esportivo
   - Ocasião compatível (praia, festa, trabalho, academia)

5. **DIVERSIDADE DE CATEGORIA**
   - NUNCA selecione produtos da MESMA categoria do principal
   - Busque COMPLEMENTAR, não DUPLICAR

**🚫 REGRAS ABSOLUTAS:**
- Selecione EXATAMENTE ${targetNumProducts || 1} produto(s)
- Os produtos DEVEM poder ser vestidos JUNTOS no manequim (sem conflitos físicos)
- NÃO selecione produtos da mesma categoria do produto principal
- PRIORIZE peças que completam visualmente o look (não apenas combinam conceitualmente)
- Se o produto principal for "Vestido" ou "Macacão", selecione SOBRETUDOS ou ACESSÓRIOS (nunca calças/saias)
- Se o produto principal for "Calça" ou "Saia", selecione PARTES DE CIMA (blusa, top, camisa)
- Se o produto principal for "Blusa" ou "Top", selecione PARTES DE BAIXO (calça, saia, short)

**📝 FORMATO DE RESPOSTA (JSON puro, sem markdown):**
{
  "selectedProductIds": ["id1", "id2"],
  "reasoning": "Explicação técnica da escolha considerando compatibilidade física e harmonia visual (máximo 3 linhas)"
}`;

    console.log("[SelectCombination] 🤖 Solicitando seleção de produtos à IA...");
    console.log("[SelectCombination] 📊 Produtos disponíveis:", availableProducts.length);
    console.log("[SelectCombination] 🎯 Número de produtos a selecionar:", targetNumProducts || 1);

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log("[SelectCombination] 📥 Resposta bruta da IA:", text);

    // Extrair JSON da resposta
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[SelectCombination] ❌ Resposta da IA não contém JSON válido");
      return NextResponse.json(
        { error: "Resposta da IA inválida" },
        { status: 500 }
      );
    }

    const aiResponse = JSON.parse(jsonMatch[0]);
    const selectedProductIds = aiResponse.selectedProductIds || [];

    // Validar que a IA retornou IDs válidos
    const validIds = selectedProductIds.filter((id: string) => 
      availableProducts.some((p: any) => p.id === id)
    );

    if (validIds.length === 0) {
      console.error("[SelectCombination] ❌ IA não retornou IDs válidos");
      
      // Fallback: selecionar produtos aleatórios se a IA falhar
      const fallbackIds = availableProducts
        .filter((p: any) => p.categoria !== currentProduct.categoria) // Evitar mesma categoria
        .slice(0, targetNumProducts || 1)
        .map((p: any) => p.id);

      console.log("[SelectCombination] 🔄 Usando fallback com produtos aleatórios:", fallbackIds);

      return NextResponse.json({
        selectedProductIds: fallbackIds,
        reasoning: "Seleção automática baseada em disponibilidade",
        fallback: true,
      });
    }

    // Limitar ao número solicitado
    const finalIds = validIds.slice(0, targetNumProducts || 1);

    console.log("[SelectCombination] ✅ Produtos selecionados:", finalIds);
    console.log("[SelectCombination] 💭 Raciocínio:", aiResponse.reasoning);

    return NextResponse.json({
      selectedProductIds: finalIds,
      reasoning: aiResponse.reasoning || "Produtos selecionados pela IA",
    });

  } catch (error: any) {
    console.error("[SelectCombination] ❌ Erro:", error);
    console.error("[SelectCombination] Stack:", error?.stack);
    
    return NextResponse.json(
      { 
        error: error?.message || "Erro ao selecionar produtos",
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}
