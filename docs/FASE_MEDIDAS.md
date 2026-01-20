# FASE MEDIDAS - Implementação do Sistema de Guia de Medidas Inteligente

## 📋 Visão Geral

Implementar um sistema inteligente de guia de medidas que:
1. Detecta automaticamente o tipo de produto através da análise de IA
2. Exibe a imagem técnica correspondente (diagrama + tabela de medidas)
3. Permite visualização de múltiplas imagens do produto em carrossel
4. Integra as informações de medidas no perfil do cliente para análise inteligente

---

## 🗂️ Estrutura de Arquivos e Pastas

### Onde salvar as imagens PNG:
```
public/assets/measurements/
```

**Estrutura esperada:**
```
public/
  assets/
    measurements/
      top_camiseta_basica.png
      top_regata.png
      bottom_calca_jeans.png
      ... (todas as 100 imagens conforme measurementsManifest.ts)
```

### Arquivo de dados criado:
- ✅ `src/data/measurementsManifest.ts` - Contém o mapeamento de produtos para imagens

---

## 🎯 Funcionalidades a Implementar

### 1. Carrossel de Imagens do Produto (Substituir imagem estática)

**Localização:** Coluna esquerda - "O Estúdio Visual"

**Funcionalidade:**
- Substituir a imagem estática atual por um **Carrossel de Imagens**
- Exibir navegável: 
  1. Foto Original (Upload)
  2. Foto de Catálogo (Gerada pela IA)
  3. Foto Look Combinado (Gerada pela IA)
  4. **Imagem de Medidas** (Nova - quando disponível)

**Interface:**
- Setas laterais (esquerda/direita) para navegação
- Indicadores (pontos) abaixo para mostrar quantidade de imagens
- Navegação por teclado (setas) opcional
- Botão "Trocar Foto Original" apenas quando a primeira imagem (original) estiver visível

**Componente sugerido:** `ImageCarousel.tsx`

---

### 2. Card "Guia de Medidas Sugerido (IA)"

**Localização:** Abaixo do carrossel, acima de "Estúdio Criativo IA"

**Estrutura:**
```
┌─────────────────────────────────────────────┐
│ 📏 Guia de Medidas Sugerido (IA)  [✏️ Editar] │
├─────────────────────────────────────────────┤
│                                             │
│         [Imagem Técnica do Produto]         │
│      (diagrama + tabela de medidas)         │
│                                             │
└─────────────────────────────────────────────┘
```

**Funcionalidades:**
- **Título:** "📏 Guia de Medidas Sugerido (IA)"
- **Botão de Edição:** "✏️ Editar Medidas Reais" (pequeno, estilo outline/ghost)
  - Por enquanto: `console.log("Abrir modal de edição")`
  - Futuro: Abrir modal para edição de medidas reais do produto
- **Imagem Técnica:** Exibir a imagem correspondente ao tipo de produto detectado
- **Estado inicial:** Placeholder/loading se IA ainda não analisou
  - Texto: "Aguardando análise da IA para sugerir medidas..."

**Lógica de Seleção:**
Usar a função `findMeasurementImage()` de `measurementsManifest.ts`:
```typescript
import { findMeasurementImage, getMeasurementImageUrl } from '@/data/measurementsManifest';

const measurementItem = findMeasurementImage(
  aiAnalysisData?.suggested_category,
  aiAnalysisData?.product_type,
  aiAnalysisData?.tags,
  // isPlusSize pode ser detectado ou configurado pelo usuário
);

const measurementImageUrl = getMeasurementImageUrl(measurementItem);
```

---

### 3. Lógica de Match de Imagens

**Implementação em:** `src/data/measurementsManifest.ts` (já criado)

**Algoritmo:**
1. Filtra por `isPlusSize` (se fornecido)
2. Busca match exato na categoria
3. Se não encontrar, busca por keywords (pontuação)
4. Retorna o item com maior pontuação

**Uso:**
```typescript
// No componente ProductEditorLayout
const measurementItem = findMeasurementImage(
  state.aiAnalysisData?.suggested_category,
  state.aiAnalysisData?.product_type,
  state.aiAnalysisData?.tags
);

// Obter URL da imagem
const measurementImageUrl = getMeasurementImageUrl(measurementItem);
```

---

### 4. Integração com Catálogo de Produtos

**Localização:** Tela de listagem de produtos (`products-table.tsx`)

**Mudanças necessárias:**
- O catálogo agora terá **múltiplas imagens** por produto:
  1. Imagem Principal
  2. Imagem de Catálogo (IA)
  3. Imagem Look Combinado (IA)
  4. **Imagem de Medidas** (nova)

**Interface sugerida:**
- Quando produto tem múltiplas imagens:
  - Mostrar pontos indicadores abaixo da imagem
  - Clique nos pontos para alternar entre imagens
  - Hover mostra preview ou tooltip
  - Setas laterais opcionais (desktop)

**Componente sugerido:** `ProductImageGallery.tsx` (reutilizável)

---

### 5. Integração com Perfil do Cliente

**Objetivo:** Usar informações de medidas na análise do perfil do cliente

**Dados a coletar:**
- Quando cliente "tentar" ou comprar produto:
  - Armazenar tipo de produto tentado
  - Armazenar imagem de medidas visualizada
  - Associar com preferências de tamanho/padrão

**Localização:** 
- `src/lib/ai-services/tools/customer-analysis.ts`
- `src/lib/firestore/client-profiling.ts`

**Estrutura de dados sugerida:**
```typescript
interface CustomerMeasurementProfile {
  triedProducts: Array<{
    productId: string;
    measurementImageId: string;
    category: string;
    timestamp: Date;
  }>;
  preferredCategories: string[];
  sizePreferences: {
    [category: string]: string[]; // Ex: { "top": ["P", "M"], "bottom": ["M", "G"] }
  };
}
```

---

## 📝 Checklist de Implementação

### Fase 1: Estrutura Base ✅
- [x] Criar arquivo `measurementsManifest.ts` com dados dos 100 produtos
- [x] Criar funções `findMeasurementImage()` e `getMeasurementImageUrl()`
- [ ] Criar pasta `public/assets/measurements/` (usuário fará upload das imagens)
- [x] Criar documento `FASE_MEDIDAS.md` com especificação

### Fase 2: Componente de Carrossel
- [ ] Criar componente `ImageCarousel.tsx`
- [ ] Integrar no `ProductEditorLayout.tsx` (coluna esquerda)
- [ ] Implementar navegação por setas
- [ ] Implementar indicadores de pontos
- [ ] Adicionar suporte a múltiplas imagens (original, catálogo, look, medidas)

### Fase 3: Card de Medidas
- [ ] Criar componente `MeasurementGuideCard.tsx`
- [ ] Integrar abaixo do carrossel
- [ ] Implementar lógica de match de imagem
- [ ] Adicionar estado de loading/placeholder
- [ ] Implementar botão "Editar Medidas Reais" (console.log por enquanto)

### Fase 4: Integração com Catálogo
- [ ] Criar componente `ProductImageGallery.tsx`
- [ ] Atualizar `products-table.tsx` para usar o novo componente
- [ ] Implementar indicadores de pontos para múltiplas imagens
- [ ] Adicionar suporte a clique nos pontos
- [ ] Garantir responsividade mobile

### Fase 5: Integração com Perfil do Cliente
- [ ] Atualizar tipo `CustomerMeasurementProfile`
- [ ] Criar função para salvar dados de medidas no perfil
- [ ] Integrar com análise de cliente existente
- [ ] Adicionar visualização de preferências de medidas no dashboard

---

## 🎨 Design e UX

### Carrossel de Imagens
- **Animações:** Transição suave entre imagens (fade ou slide)
- **Responsividade:** Touch swipe no mobile
- **Acessibilidade:** Navegação por teclado (setas, Home, End)
- **Performance:** Lazy loading de imagens

### Card de Medidas
- **Estilo:** Card com borda sutil, sombra leve
- **Imagem:** Zoom ao hover (opcional)
- **Loading:** Skeleton loader durante análise da IA
- **Fallback:** Imagem padrão se não encontrar match

### Indicadores de Pontos (Catálogo)
- **Estilo:** Pontos pequenos, círculos preenchidos/vazios
- **Posição:** Centralizados abaixo da imagem
- **Interatividade:** Hover mostra número/tooltip
- **Mobile:** Touch swipe ativado

---

## 🔧 Arquivos a Modificar

1. **`src/components/admin/products/ProductEditorLayout.tsx`**
   - Substituir imagem estática por carrossel
   - Adicionar card de medidas abaixo do carrossel

2. **`src/app/(lojista)/produtos/products-table.tsx`**
   - Integrar componente de galeria de imagens
   - Adicionar suporte a múltiplas imagens

3. **`src/data/measurementsManifest.ts`** ✅ (Já criado)
   - Manter atualizado com novos produtos

4. **`src/lib/firestore/client-profiling.ts`**
   - Adicionar campos de medidas ao perfil do cliente

5. **`src/lib/ai-services/tools/customer-analysis.ts`**
   - Integrar análise de preferências de medidas

---

## 📦 Novos Componentes a Criar

1. **`src/components/ui/ImageCarousel.tsx`**
   - Carrossel reutilizável de imagens
   - Props: `images: string[]`, `onImageChange?: (index: number) => void`

2. **`src/components/admin/products/MeasurementGuideCard.tsx`**
   - Card específico para guia de medidas
   - Props: `measurementImageUrl: string | null`, `onEdit?: () => void`

3. **`src/components/products/ProductImageGallery.tsx`**
   - Galeria de imagens para catálogo
   - Props: `images: string[]`, `defaultIndex?: number`

---

## 🚀 Ordem de Implementação Recomendada

1. **Primeiro:** Componente ImageCarousel (reutilizável)
2. **Segundo:** Integrar carrossel no ProductEditorLayout
3. **Terceiro:** Criar MeasurementGuideCard e integrar
4. **Quarto:** Criar ProductImageGallery para catálogo
5. **Quinto:** Integrar com perfil do cliente (fase posterior)

---

## 🧪 Testes e Validação

### Casos de Teste:
1. ✅ Match correto de imagem por categoria
2. ✅ Match por keywords quando categoria não encontrada
3. ✅ Fallback quando não há match
4. ✅ Carrossel navega corretamente entre imagens
5. ✅ Indicadores de pontos funcionam no catálogo
6. ✅ Medidas são salvas no perfil do cliente
7. ✅ Análise de cliente considera preferências de medidas

---

## 📌 Observações Importantes

1. **Upload de Imagens:** O usuário deve fazer upload das 100 imagens PNG na pasta `public/assets/measurements/`

2. **Nomenclatura:** As imagens devem seguir exatamente os nomes do `measurementsManifest.ts` (case-sensitive)

3. **Performance:** Considerar lazy loading e otimização de imagens (WebP quando possível)

4. **Fallback:** Sempre ter uma imagem padrão caso não encontre match

5. **Extensibilidade:** Sistema deve ser facilmente extensível para novos tipos de produtos

---

## 🎯 Próximos Passos

1. **Executar este documento no Cursor:** Use este MD completo como prompt
2. **Fazer upload das imagens:** Coloque todas as 100 imagens PNG na pasta especificada
3. **Testar matching:** Verificar se a lógica encontra as imagens corretas
4. **Validar UX:** Testar navegação e interatividade
5. **Integrar perfil:** Adicionar funcionalidade de análise de medidas no perfil do cliente

---

**Status:** 📝 Documento pronto para implementação
**Última atualização:** 2025-01-14
**Versão:** 1.0
