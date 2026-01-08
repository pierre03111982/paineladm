# Sistema de Categorias Consolidadas

## Objetivo
Agrupar produtos similares na mesma categoria, evitando fragmentação e criação de muitas categorias ou subcategorias.

## Categorias Principais

O sistema utiliza **8 categorias consolidadas** que agrupam produtos similares:

1. **Roupas** - Agrupa: Vestidos, Blusas, Camisas, Calças, Saias, Shorts, Jaquetas, Casacos, Macacões, Conjuntos, Leggings, etc.
2. **Calçados** - Agrupa: Tênis, Sapatos, Sandálias, Chinelos, Botas, Sapatilhas, Scarpins, etc.
3. **Acessórios** - Agrupa: Bolsas, Carteiras, Cintos, Óculos, Chapéus, Gorros, Luvas, Cachecóis, Mochilas, etc.
4. **Joias** - Agrupa: Brincos, Colares, Pulseiras, Anéis, Relógios, Broches, etc.
5. **Praia** - Agrupa: Biquínis, Maiôs, Roupas de Banho, etc.
6. **Fitness** - Agrupa: Roupas Esportivas, Leggings, Tops esportivos, etc.
7. **Cosméticos** - Agrupa: Maquiagem, Skincare, Perfumes, Tinturas de Cabelo, etc.
8. **Outros** - Categoria catch-all para itens que não se encaixam nas outras

## Como Funciona

### Normalização Automática
Todas as categorias são automaticamente normalizadas para uma das categorias consolidadas usando a função `normalizeCategory()`.

### Mapeamento Inteligente
O sistema possui um mapeamento extenso que agrupa variações de nomes na mesma categoria:
- "Vestido", "Vestidos", "Vestido Midi" → **Roupas**
- "Calça", "Calças", "Calça Jeans" → **Roupas**
- "Tênis", "Tenis", "Tênis Esportivo" → **Calçados**
- "Bolsa", "Bolsas", "Necessaire" → **Acessórios**
- etc.

## Arquivos Modificados

### 1. Novo: `src/lib/categories/consolidated-categories.ts`
Arquivo centralizado com:
- Definição das categorias consolidadas
- Mapeamento de categorias antigas → consolidadas
- Função `normalizeCategory()` para normalização automática

### 2. `src/app/(lojista)/produtos/category-options.ts`
Atualizado para usar as categorias consolidadas diretamente.

### 3. `src/lib/ai-services/product-analyzer.ts`
- Prompt da IA atualizado para usar apenas as categorias consolidadas
- IA instruída a agrupar produtos similares na mesma categoria

### 4. `src/components/admin/products/ProductEditorLayout.tsx`
- Mapeamento de categorias atualizado para usar `normalizeCategory()`
- Categorias sugeridas pela IA são automaticamente normalizadas

### 5. `src/app/api/lojista/products/bulk-analyze/route.ts`
- Categorias são normalizadas ao salvar análise em massa
- Produtos analisados automaticamente recebem categoria consolidada

### 6. `src/app/api/lojista/products/[productId]/route.ts`
- Categorias são normalizadas ao salvar/atualizar produtos individualmente
- Garante consistência mesmo em edições manuais

## Impacto no App Modelo-2

O **app modelo-2** não precisa de alterações, pois:
- Ele utiliza as categorias diretamente dos produtos no Firestore
- Como todos os produtos agora recebem categorias consolidadas ao serem salvos/atualizados, o modelo-2 automaticamente passará a exibir as categorias corretas
- O filtro por categoria no modelo-2 continuará funcionando normalmente, apenas com menos fragmentação

## Migração de Produtos Existentes

**Nota:** Produtos já existentes no Firestore manterão suas categorias antigas até serem atualizados. Quando um produto for:
- Editado manualmente
- Re-analisado pela IA
- Atualizado de qualquer forma

Sua categoria será automaticamente normalizada para uma categoria consolidada.

## Benefícios

1. **Menos Fragmentação**: Produtos similares ficam agrupados na mesma categoria
2. **Filtros Mais Eficientes**: Menos categorias = filtros mais simples e eficientes
3. **Experiência do Cliente**: Mais fácil encontrar produtos similares
4. **Manutenibilidade**: Sistema centralizado e fácil de manter/expandir

## Exemplos de Agrupamento

**Antes (fragmentado):**
- Vestidos
- Vestido Midi
- Vestido Longo
- Blusas
- Camisas
- Calças
- Shorts
- Jaquetas

**Depois (consolidado):**
- Roupas (todos os itens acima)

**Antes (fragmentado):**
- Bolsas
- Carteiras
- Óculos
- Cintos

**Depois (consolidado):**
- Acessórios (todos os itens acima)

## Manutenção Futura

Para adicionar novos mapeamentos ou ajustar categorias:
1. Editar `src/lib/categories/consolidated-categories.ts`
2. Atualizar o mapeamento `CATEGORY_MAPPING` conforme necessário
3. O sistema automaticamente aplicará as mudanças em todos os pontos de entrada
