# 📋 AUDITORIA COMPLETA - PÁGINA DE PRODUTOS

**Data da Auditoria:** 2025-01-23  
**Versão do Sistema:** Painel Admin - Layout Azul Único  
**Escopo:** Estrutura completa da aba "Produtos" do painel administrativo

---

## 📑 ÍNDICE

1. [Visão Geral](#1-visão-geral)
2. [Estrutura de Arquivos](#2-estrutura-de-arquivos)
3. [Arquitetura e Fluxo de Dados](#3-arquitetura-e-fluxo-de-dados)
4. [Componentes Principais](#4-componentes-principais)
5. [Lógica de Negócio](#5-lógica-de-negócio)
6. [Layout e UI](#6-layout-e-ui)
7. [APIs e Integrações](#7-apis-e-integrações)
8. [Tipos e Interfaces](#8-tipos-e-interfaces)
9. [Funcionalidades](#9-funcionalidades)
10. [Fluxos de Usuário](#10-fluxos-de-usuário)

---

## 1. VISÃO GERAL

A página de **Produtos** é o centro de gerenciamento do catálogo que alimenta o Provador Virtual. Permite cadastrar, editar, visualizar, arquivar e gerenciar produtos de forma completa, com suporte a análise por IA, importação em massa, variações de tamanho/cor e geração de imagens otimizadas.

### 1.1 Objetivos Principais
- ✅ Gerenciar catálogo completo de produtos
- ✅ Análise automática de imagens com IA (Gemini 2.5 Flash)
- ✅ Geração de imagens de catálogo e looks combinados
- ✅ Importação em massa via CSV
- ✅ Suporte a variações (tamanhos, cores, estoque)
- ✅ Sistema de descontos (global e por produto)
- ✅ Métricas de performance e qualidade

### 1.2 Tecnologias Utilizadas
- **Framework:** Next.js 14+ (App Router)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS (layout azul único, sem dark mode)
- **Animações:** Framer Motion
- **Banco de Dados:** Firebase Firestore
- **IA:** Google Gemini 2.5 Flash
- **Geração de Imagens:** IA generativa para catálogo e looks

---

## 2. ESTRUTURA DE ARQUIVOS

### 2.1 Diretório Principal
```
src/app/(lojista)/produtos/
├── page.tsx                          # Página principal (Server Component)
├── products-page-content.tsx        # Conteúdo da página (Client Component)
├── products-table.tsx                # Tabela/Grid de produtos (1022 linhas)
├── manual-product-form.tsx           # Formulário manual de criação
├── edit-product-form.tsx             # Formulário de edição inline
├── product-actions.tsx               # Ações em lote (arquivar, deletar)
├── import-catalog-modal.tsx          # Modal de importação CSV
├── category-options.ts               # Opções de categorias consolidadas
├── novo/
│   └── page.tsx                      # Página de novo produto
└── [id]/
    └── editar/
        └── page.tsx                  # Página de edição de produto
```

### 2.2 Componentes Compartilhados
```
src/components/admin/products/
├── ProductEditorLayout.tsx           # Layout principal do editor (2614 linhas)
├── ProductCreationWizard.tsx         # Wizard de criação (3 passos)
├── ProductWizardStep1.tsx            # Passo 1: Análise de Imagem
├── ProductWizardStep2.tsx            # Passo 2: Estúdio Criativo
├── ProductWizardStep3.tsx            # Passo 3: Detalhes de Venda
├── ProductWizardStepper.tsx          # Indicador de progresso do wizard
├── ProductStudioInline.tsx           # Estúdio inline de geração de imagens
├── ProductStudioModal.tsx            # Estúdio em modal
├── ManualCombinationModal.tsx        # Modal de combinação manual
├── MeasurementGuideCard.tsx          # Card de guia de medidas
└── SmartMeasurementEditor.tsx        # Editor de medidas inteligente (2088+ linhas)

src/components/products/
├── ProductImageGallery.tsx           # Galeria de imagens com navegação
└── ProductPerformanceAI.tsx         # Análise de performance com IA
```

### 2.3 APIs Relacionadas
```
src/app/api/lojista/products/
├── route.ts                          # GET (listar) / POST (criar)
├── [productId]/route.ts              # GET, PATCH, DELETE (CRUD individual)
├── analyze/route.ts                  # Análise de imagem com IA
├── bulk-analyze/route.ts             # Análise em massa
├── import/route.ts                   # Importação CSV
├── upload-image/route.ts             # Upload de imagens
├── generate-studio/route.ts          # Geração de imagens no estúdio
├── select-combination/route.ts      # Seleção de combinação
├── quality/route.ts                 # Métricas de qualidade
├── process-measurements/route.ts     # Geração de imagem ghost mannequin
├── detect-landmarks/route.ts         # Detecção de pontos de referência
└── [productId]/display-asset/route.ts # Assets de display
```

---

## 3. ARQUITETURA E FLUXO DE DADOS

### 3.1 Fluxo de Renderização

```
┌─────────────────────────────────────────────────────────────┐
│                    page.tsx (Server)                        │
│  - Busca lojistaId (query > auth > env)                     │
│  - Carrega produtos do Firestore                            │
│  - Filtra arquivados                                        │
│  - Passa dados para ProductsPageContent                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              ProductsPageContent (Client)                    │
│  - Gerencia estado de modais                                │
│  - Botões de ação (Adicionar, Importar, Analisar)          │
│  - Renderiza ProductsTable                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  ProductsTable (Client)                       │
│  - Grid de cards responsivo                                 │
│  - Filtros e busca                                          │
│  - Modais de visualização/edição                            │
│  - Ações em lote                                            │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Fluxo de Criação de Produto

```
┌─────────────────────────────────────────────────────────────┐
│              /produtos/novo (Server)                         │
│  - Valida lojistaId                                          │
│  - Renderiza ProductEditorLayout                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│            ProductEditorLayout (Client)                      │
│  - Gerencia estado completo do produto                       │
│  - 3 Modos: Wizard / Manual / Edição                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Wizard     │ │   Manual    │ │   Edição    │
│  (3 passos)  │ │  (1 tela)   │ │  (inline)   │
└──────────────┘ └──────────────┘ └──────────────┘
        │              │              │
        └──────────────┼──────────────┘
                       ▼
            POST /api/lojista/products
                       │
                       ▼
            Firestore: lojas/{id}/produtos
```

### 3.3 Fluxo de Análise com IA

```
Usuário faz upload de imagem
         │
         ▼
POST /api/lojista/products/analyze
         │
         ▼
productAnalyzerService.analyzeProductImage()
         │
         ▼
Google Gemini 2.5 Flash API
         │
         ▼
Retorna: nome, categoria, cores, tecido, tags, etc.
         │
         ▼
Preenche formulário automaticamente
```

---

## 4. COMPONENTES PRINCIPAIS

### 4.1 `page.tsx` (Server Component)
**Localização:** `src/app/(lojista)/produtos/page.tsx`

**Responsabilidades:**
- Autenticação e obtenção de `lojistaId`
- Carregamento inicial de produtos do Firestore
- Filtragem de produtos arquivados
- Tratamento de erros

**Configurações:**
```typescript
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0; // Sem cache
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';
```

**Fluxo:**
1. Lê `lojistaId` de query params, auth ou env vars
2. Chama `fetchProdutos(lojistaId)` do Firestore
3. Filtra arquivados se `includeArchived !== "true"`
4. Passa dados para `ProductsPageContent`

---

### 4.2 `ProductsPageContent` (Client Component)
**Localização:** `src/app/(lojista)/produtos/products-page-content.tsx`

**Estado:**
```typescript
- showImportModal: boolean
- analyzingBulk: boolean
- bulkAnalysisResult: string | null
```

**Funcionalidades:**
- Header com ícone e descrição
- Botão "Adicionar produto" → navega para `/produtos/novo`
- Botão "Analisar Todos os Produtos" → análise em massa
- Botão "Importar CSV" → abre modal de importação
- Botão "Modelo CSV" → download de template
- Botão "Testar Ajustador de Medidas" → página de teste
- Renderiza `ProductsTable` com produtos

**APIs Utilizadas:**
- `POST /api/lojista/products/bulk-analyze` - Análise em massa

---

### 4.3 `ProductsTable` (Client Component)
**Localização:** `src/app/(lojista)/produtos/products-table.tsx`  
**Tamanho:** 1022 linhas (componente mais complexo)

**Estado Principal:**
```typescript
- produtos: ProdutoDoc[]
- searchTerm: string
- showArchived: boolean
- categoryFilter: string
- selectedProducts: Set<string>
- editingProduto: ProdutoDoc | null
- viewingProduto: ProdutoDoc | null
- loading: boolean
- error: string | null
- success: string | null
- lojaDiscount: number
```

**Subcomponentes:**
- `ProductGridCard` - Card individual de produto (grid responsivo)
- `EditProdutoModal` - Modal de edição rápida
- `ViewProdutoModal` - Modal de visualização detalhada

**Funcionalidades:**
1. **Grid Responsivo de Produtos**
   - Layout em grid adaptativo
   - Cards com imagem, nome, preço, categoria, estoque, tamanhos
   - Checkbox para seleção múltipla
   - Botões "Ver" e "Editar"

2. **Filtros e Busca**
   - Busca por nome, categoria ou observações
   - Filtro por categoria
   - Toggle para mostrar/ocultar arquivados

3. **Ações em Lote**
   - Seleção múltipla de produtos
   - Arquivar/desarquivar em lote
   - Deletar em lote

4. **Modais**
   - **Visualização:** Mostra todos os detalhes do produto
   - **Edição Rápida:** Edição inline sem sair da página

**Lógica de Filtragem:**
```typescript
const filteredProdutos = useMemo(() => {
  let filtered = produtos;
  
  // Filtrar arquivados
  if (!showArchived) {
    filtered = filtered.filter((p) => !p.arquivado);
  }
  
  // Filtrar por busca
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.nome.toLowerCase().includes(term) ||
        p.categoria.toLowerCase().includes(term) ||
        (p.obs && p.obs.toLowerCase().includes(term))
    );
  }
  
  // Filtrar por categoria
  if (categoryFilter !== "all") {
    filtered = filtered.filter((p) => p.categoria === categoryFilter);
  }
  
  return filtered;
}, [produtos, searchTerm, categoryFilter, showArchived]);
```

**Cálculo de Descontos:**
```typescript
const descontoRedes = descontoRedesSociais || 0;
const descontoEspecial = produto.descontoProduto || 0;
const descontoTotal = descontoRedes + descontoEspecial;
const precoComDesconto = descontoTotal > 0 && precoOriginal > 0
  ? precoOriginal * (1 - descontoTotal / 100)
  : precoOriginal;
```

---

### 4.4 `ProductGridCard` (Subcomponente)
**Localização:** Dentro de `products-table.tsx`

**Estrutura Visual:**
```
┌─────────────────────────────────────┐
│ [✓] Checkbox (top-left)             │
│                                     │
│ ┌─────────────────────────────┐    │
│ │   ProductImageGallery       │    │
│ │   (múltiplas imagens)       │    │
│ └─────────────────────────────┘    │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ Nome do Produto (gradiente) │    │
│ └─────────────────────────────┘    │
│                                     │
│ ┌──────┬──────┐                    │
│ │ Cat. │Preço │                    │
│ ├──────┼──────┤                    │
│ │Estoq.│Tamhos│                    │
│ └──────┴──────┘                    │
│                                     │
│ [Ver] [Editar]                     │
└─────────────────────────────────────┘
```

**Imagens Suportadas (ordem de prioridade):**
1. `imagemUrlCatalogo` - Foto de catálogo gerada por IA
2. `imagemUrlOriginal` - Foto original do upload
3. `imagemUrlCombinada` - Look combinado gerado por IA

**Estilos Forçados:**
- CSS injetado via `useEffect` para garantir cores corretas
- Botões com gradientes específicos (azul-roxo para "Ver", verde para "Editar")
- Texto branco forçado nos cards (exceto preços)

---

### 4.5 `ProductEditorLayout` (Componente Principal do Editor)
**Localização:** `src/components/admin/products/ProductEditorLayout.tsx`  
**Tamanho:** 2614 linhas (maior componente)

**Interface de Estado:**
```typescript
export interface ProductEditorState {
  // Imagens
  rawImageUrl: string;
  rawImageFile: File | null;
  generatedCatalogImage: string | null;
  generatedCombinedImage: string | null;
  selectedCoverImage: string | null;
  imagemMedidasCustomizada: string | null;
  
  // Análise IA
  aiAnalysisData: {
    nome_sugerido?: string;
    descricao_seo?: string;
    tags?: string[];
    suggested_category?: string;
    categoria_sugerida?: string;
    product_type?: string;
    detected_fabric?: string;
    dominant_colors?: Array<{ hex: string; name: string }>;
    cor_predominante?: string;
    tecido_estimado?: string;
    detalhes?: string[];
  } | null;
  
  // Estúdio
  selectedMannequinId: string | null;
  combinationMode: 'auto' | 'manual' | null;
  manualCombinationItems: string[];
  
  // Dados Operacionais
  manualData: {
    preco: string;
    precoPromocional: string;
    estoque: string;
    sku: string;
    tamanhos: string[];
    cores: string[];
    ativo: boolean;
    destaquePromocional: boolean;
    unidadeMedida?: string;
    descontoProduto?: string;
    // ... outros campos
  };
  
  // Variações
  temVariacoes: boolean;
  variacoes: Array<{
    id: string;
    variacao: string;
    estoque: string;
    sku: string;
  }>;
  
  // Grade de Tamanho
  sizeCategory: 'standard' | 'plus';
  
  // Público Alvo
  targetAudience: 'female' | 'male' | 'kids';
}
```

**Modos de Operação:**
1. **Wizard (3 Passos)** - Para novos produtos
2. **Manual** - Formulário direto
3. **Edição** - Carregamento de dados existentes

**Seções do Layout:**
1. **Header** - Título e navegação
2. **Step 1: Análise de Imagem** - Upload e análise IA
3. **Step 2: Estúdio Criativo** - Geração de imagens
4. **Step 3: Detalhes de Venda** - Preço, estoque, variações
5. **Guia de Medidas** - Card com instruções

---

### 4.6 `ProductCreationWizard` (Wizard de 3 Passos)
**Localização:** `src/components/admin/products/ProductCreationWizard.tsx`

**Estrutura:**
```
┌─────────────────────────────────────┐
│  [1] [2] [3]  Stepper               │
├─────────────────────────────────────┤
│                                     │
│  Conteúdo do Passo Atual            │
│                                     │
├─────────────────────────────────────┤
│  [← Voltar]  [Próximo →]            │
└─────────────────────────────────────┘
```

**Passos:**
1. **Step 1: Análise de Imagem** (`ProductWizardStep1`)
   - Upload de imagem
   - Análise automática com IA
   - Exibição de resultados

2. **Step 2: Estúdio Criativo** (`ProductWizardStep2`)
   - Seleção de manequim
   - Geração de imagem de catálogo
   - Geração de look combinado
   - Seleção de imagem de capa

3. **Step 3: Detalhes de Venda** (`ProductWizardStep3`)
   - Nome, descrição, categoria
   - Preço, estoque, SKU
   - Variações (tamanhos/cores)
   - Publicação final

---

### 4.7 `ManualProductForm` (Formulário Manual)
**Localização:** `src/app/(lojista)/produtos/manual-product-form.tsx`

**Características:**
- Formulário completo em uma única tela
- Suporte a análise IA opcional
- Geração de SKU automático
- Suporte a variações com auto-geração de SKU
- Integração com `ProductStudioInline` para geração de imagens

**Auto-geração de SKU:**
```typescript
function generateSKU(nomeProduto: string, variacao: string): string {
  // Formato: SLUG-DO-PRODUTO-VARIAÇÃO-XXXX
  // SLUG: Primeiros 10 caracteres, maiúsculas, hífens
  // VARIAÇÃO: Nome da variação em maiúsculas
  // XXXX: Sufixo aleatório de 4 caracteres
}
```

---

### 4.8 `ProductImageGallery` (Galeria de Imagens)
**Localização:** `src/components/products/ProductImageGallery.tsx`

**Funcionalidades:**
- Suporte a múltiplas imagens
- Navegação por setas (desktop)
- Navegação por swipe (mobile)
- Navegação por teclado (setas ← →)
- Indicadores de pontos (dots)
- Labels para cada imagem

**Props:**
```typescript
interface ProductImageGalleryProps {
  images: Array<{
    url: string;
    label: string;
  }>;
  className?: string;
  aspectRatio?: string; // default: "aspect-square"
}
```

---

### 4.9 `ProductPerformanceAI` (Análise de Performance)
**Localização:** `src/components/products/ProductPerformanceAI.tsx`

**Funcionalidades:**
- Diagnóstico automático de problemas
- Análise de taxa de rejeição e conversão
- Recomendações baseadas em IA
- Priorização (alta, média, baixa)

**Tipos de Problemas Detectados:**
- `high_rejection` - Alta taxa de rejeição
- `low_conversion` - Baixa conversão
- `ai_distortion` - Distorção na imagem gerada
- `fit_issue` - Problema de caimento

---

## 5. LÓGICA DE NEGÓCIO

### 5.1 Sistema de Descontos

**Hierarquia:**
1. **Desconto Global** (`descontoRedesSociais` do perfil da loja)
2. **Desconto Específico** (`descontoProduto` do produto)
3. **Cálculo:** `descontoTotal = descontoRedes + descontoEspecial`
4. **Preço Final:** `precoOriginal * (1 - descontoTotal / 100)`

**Exibição:**
- Preço original riscado (vermelho)
- Preço com desconto (verde)
- Percentual de desconto (amarelo)

---

### 5.2 Sistema de Variações

**Estrutura:**
```typescript
variacoes: Array<{
  id: string;           // ID único gerado
  variacao: string;     // Nome (ex: "P", "M", "Azul", "Vermelho")
  estoque: string;      // Quantidade em estoque
  sku: string;          // SKU único (auto-gerado)
}>
```

**Auto-geração de SKU:**
- Formato: `SLUG-PRODUTO-VARIAÇÃO-XXXX`
- Regenera quando nome do produto ou variação muda
- Não regenera se SKU foi editado manualmente
- Validação para evitar loops infinitos

**Grade de Tamanhos:**
- **Standard:** P, M, G, GG, XG, XXG
- **Plus Size:** G1, G2, G3, G4

**Público Alvo:**
- `female` - Feminino
- `male` - Masculino
- `kids` - Infantil

---

### 5.3 Sistema de Imagens

**Tipos de Imagens:**
1. **`imagemUrlOriginal`** - Foto original do upload
2. **`imagemUrlCatalogo`** - Foto gerada por IA (prioridade de exibição)
3. **`imagemUrlCombinada`** - Look combinado gerado por IA
4. **`imagemMedidasCustomizada`** - Imagem de medidas inserida manualmente

**Ordem de Prioridade na Exibição:**
1. Foto Catálogo (melhor qualidade)
2. Imagem Original (se diferente)
3. Look Combinado (se diferente)

---

### 5.4 Sistema de Categorias

**Fonte:** `src/lib/categories/consolidated-categories.ts`

**Características:**
- Categorias consolidadas/normalizadas
- Mapeamento automático de categorias sugeridas pela IA
- Suporte a categorias customizadas

**Uso:**
```typescript
import { getConsolidatedCategories, normalizeCategory } from "@/lib/categories/consolidated-categories";

const AVAILABLE_CATEGORIES = getConsolidatedCategories();
const categoriaNormalizada = normalizeCategory(categoriaSugerida);
```

---

### 5.5 Sistema de Arquivamento

**Campo:** `arquivado: boolean`

**Comportamento:**
- Produtos arquivados não aparecem na listagem padrão
- Toggle "Mostrar arquivados" para exibir
- Ações em lote: arquivar/desarquivar múltiplos produtos
- Produtos arquivados mantêm todos os dados

---

## 6. LAYOUT E UI

### 6.1 Design System

**Cores Principais:**
- **Azul:** `#113574`, `#4169E1` (gradientes)
- **Indigo:** `#4f46e5`, `#2563eb` (botões, links)
- **Verde:** `#22c55e`, `#10b981` (sucesso, preços)
- **Vermelho:** `#f87171`, `#dc2626` (erros, ações destrutivas)
- **Amarelo:** `#facc15` (alertas, descontos)

**Componentes UI:**
- `AnimatedCard` - Cards com animação
- `PageWrapper` - Wrapper de página
- `IconPageHeader` - Header com ícone e gradiente
- Botões com gradientes e sombras

**Responsividade:**
- Grid adaptativo (1 coluna mobile, 2-4 desktop)
- Modais responsivos
- Navegação touch-friendly

---

### 6.2 Estrutura Visual da Página

```
┌─────────────────────────────────────────────────────────┐
│  📦 Produtos                                            │
│  Gerencie o catálogo que alimenta o Provador Virtual   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Inventário                                             │
│                                                         │
│  [➕ Adicionar] [✨ Analisar Todos] [📤 Importar CSV] │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  [Busca]  [Filtro Categoria]  [Mostrar Arquivados]│ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                │
│  │ Card │ │ Card │ │ Card │ │ Card │                │
│  │  1   │ │  2   │ │  3   │ │  4   │                │
│  └──────┘ └──────┘ └──────┘ └──────┘                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### 6.3 Estrutura do Card de Produto

```
┌─────────────────────────────────────┐
│ [✓]                                  │
│                                      │
│ ┌─────────────────────────────┐    │
│ │                             │    │
│ │      IMAGEM DO PRODUTO      │    │
│ │   (galeria com navegação)   │    │
│ │                             │    │
│ └─────────────────────────────┘    │
│                                      │
│ ┌─────────────────────────────┐    │
│ │  Nome do Produto (gradiente)│    │
│ └─────────────────────────────┘    │
│                                      │
│ ┌──────┬──────┐                     │
│ │Cat.  │Preço│                     │
│ ├──────┼──────┤                     │
│ │Estoq.│Tamhos│                     │
│ └──────┴──────┘                     │
│                                      │
│ [👁 Ver] [✏️ Editar]                │
└─────────────────────────────────────┘
```

---

## 7. APIs E INTEGRAÇÕES

### 7.1 `GET /api/lojista/products`
**Arquivo:** `src/app/api/lojista/products/route.ts`

**Query Params:**
- `lojistaId` (opcional) - ID do lojista
- `includeArchived` (opcional) - Incluir arquivados

**Resposta:**
```typescript
ProdutoDoc[] // Array direto de produtos
```

**Fluxo:**
1. Valida `lojistaId`
2. Chama `fetchProdutos(lojistaId)` do Firestore
3. Filtra arquivados se necessário
4. Retorna array de produtos

---

### 7.2 `POST /api/lojista/products`
**Arquivo:** `src/app/api/lojista/products/route.ts`

**Body:**
```typescript
{
  nome: string;
  categoria: string;
  preco: number;
  imagemUrl: string;
  imagemUrlOriginal?: string;
  imagemUrlCatalogo?: string;
  imagemUrlCombinada?: string;
  tamanhos: string[];
  cores?: string[];
  estoque?: number;
  sku?: string;
  tags?: string[];
  obs?: string;
  medidas?: string;
  descontoProduto?: number;
  variacoes?: Array<{
    variacao: string;
    estoque: string;
    sku: string;
  }>;
  // ... outros campos
}
```

**Resposta:**
```typescript
{
  success: boolean;
  produtoId: string;
  produto: ProdutoDoc;
}
```

---

### 7.3 `PATCH /api/lojista/products/[productId]`
**Arquivo:** `src/app/api/lojista/products/[productId]/route.ts`

**Funcionalidade:**
- Atualização parcial de produto
- Mesma estrutura de body do POST
- Preserva campos não enviados

---

### 7.4 `DELETE /api/lojista/products/[productId]`
**Arquivo:** `src/app/api/lojista/products/[productId]/route.ts`

**Funcionalidade:**
- Deleta produto permanentemente do Firestore
- Remove da coleção `lojas/{lojistaId}/produtos/{productId}`

---

### 7.5 `POST /api/lojista/products/analyze`
**Arquivo:** `src/app/api/lojista/products/analyze/route.ts`

**Body:**
```typescript
{
  imageUrl: string; // URL HTTP/HTTPS válida
}
```

**Query Params:**
- `lojistaId` (opcional)

**Resposta:**
```typescript
{
  success: boolean;
  data: {
    nome_sugerido: string;
    descricao_seo: string;
    categoria_sugerida: string;
    cor_predominante: string;
    tecido_estimado: string;
    dominant_colors: Array<{ hex: string; name: string }>;
    tags: string[];
    detalhes: string[];
    product_type?: string;  // CRÍTICO: Detecta conjuntos (ex: "Conjunto Cropped e Shorts")
    // ... outros campos
  };
  processingTime?: number; // ms
}
```

**Integração:**
- Usa `productAnalyzerService` do Gemini 2.5 Flash
- Retorna erro suave se falhar (permite preenchimento manual)
- **Detecção de Conjuntos:** Prompt instrui IA a detectar múltiplas peças
- **Correção Pós-Processamento:** Se retorna apenas "Short" mas há evidências de conjunto, corrige automaticamente
- **Tratamento de JSON Malformado:** Múltiplas estratégias de correção automática

---

### 7.6 `POST /api/lojista/products/bulk-analyze`
**Arquivo:** `src/app/api/lojista/products/bulk-analyze/route.ts`

**Body:**
```typescript
{
  lojistaId: string;
  limit?: number; // default: 1000
  skip?: number;  // default: 0
}
```

**Resposta:**
```typescript
{
  processed: number;  // Produtos processados
  updated: number;    // Produtos atualizados
  errors: number;      // Erros encontrados
  skipped: number;     // Produtos pulados
}
```

**Funcionalidade:**
- Analisa todos os produtos do catálogo
- Atualiza análise IA de cada produto
- Processa em lotes para evitar timeout

---

### 7.7 `POST /api/lojista/products/import`
**Arquivo:** `src/app/api/lojista/products/import/route.ts`

**Body:**
```typescript
{
  produtos: Array<{
    linha: number; // Linha do CSV (para referência de erro)
    dados: {
      nome: string;
      categoria: string;
      preco: number;
      imagemUrl: string;
      cores: string[];
      tamanhos: string[];
      estoque?: number;
    };
  }>;
}
```

**Resposta:**
```typescript
{
  criados: number;
  falhasValidacao?: Array<{ linha: number; erro: string }>;
  falhasEscrita?: Array<{ linha: number; erro: string }>;
}
```

---

### 7.8 `POST /api/lojista/products/generate-studio`
**Arquivo:** `src/app/api/lojista/products/generate-studio/route.ts`

**Funcionalidade:**
- Gera imagem de catálogo ou look combinado
- Usa IA generativa com manequim selecionado
- Retorna URL da imagem gerada

### 7.9 `POST /api/lojista/products/process-measurements`
**Arquivo:** `src/app/api/lojista/products/process-measurements/route.ts`

**Funcionalidade:**
- Gera imagem ghost mannequin profissional
- Transforma imagem original em foto de catálogo
- Preserva detalhes (botões, costuras, texturas)
- Retorna URL da imagem processada

**Características:**
- Temperatura: 0.75 (garante transformação)
- Preserva botões e detalhes de construção
- Volume 3D pronunciado
- Fundo branco puro

### 7.10 `POST /api/lojista/products/detect-landmarks`
**Arquivo:** `src/app/api/lojista/products/detect-landmarks/route.ts`

**Body:**
```typescript
{
  imageUrl: string;
  category: string;
}
```

**Query Params:**
- `lojistaId` (opcional)

**Resposta:**
```typescript
{
  success: boolean;
  data: {
    bust_start?: { x: number; y: number };
    bust_end?: { x: number; y: number };
    waist_start?: { x: number; y: number };
    waist_end?: { x: number; y: number };
    Length_top?: { x: number; y: number };
    Length_bottom?: { x: number; y: number };
    hip_start?: { x: number; y: number };
    hip_end?: { x: number; y: number };
  };
  fallback?: boolean;  // true se usou coordenadas padrão
}
```

**Funcionalidade:**
- Detecta pontos de referência na imagem usando IA
- Suporta fallback quando detecção falha
- Classifica categoria de roupa (TOPS, BOTTOMS, DRESS)
- Trata erro 429 automaticamente

---

## 8. TIPOS E INTERFACES

### 8.1 `ProdutoDoc` (Tipo Principal)
**Localização:** `src/lib/firestore/types.ts`

```typescript
export type ProdutoDoc = {
  id: string;
  nome: string;
  preco: number;
  
  // Imagens (hierarquia)
  imagemUrl: string; // DEPRECATED
  imagemUrlOriginal?: string;
  imagemUrlCatalogo?: string;
  imagemUrlCombinada?: string;
  imagemMedidasCustomizada?: string;
  
  // Categorização
  categoria: string;
  tags?: string[];
  
  // Variações
  tamanhos: string[];
  cores?: string[];
  
  // Estoque e Preço
  estoque?: number;
  stock_quantity?: number;
  descontoProduto?: number; // % específico
  
  // Metadados
  medidas?: string;
  obs?: string;
  sku?: string;
  createdAt: Date;
  updatedAt: Date;
  arquivado?: boolean;
  catalogGeneratedAt?: Date;
  
  // Sincronização E-commerce
  ecommerceSync?: {
    platform: "shopify" | "nuvemshop" | "woocommerce" | "other";
    productId?: string;
    variantId?: string;
    lastSyncedAt?: Date;
    autoSync?: boolean;
    syncPrice?: boolean;
    syncStock?: boolean;
    syncVariations?: boolean;
  };
  
  // Métricas de Qualidade
  qualityMetrics?: {
    compatibilityScore?: number; // 1-5
    conversionRate?: number;
    complaintRate?: number;
    lastCalculatedAt?: Date;
  };
  
  // Dimensões Físicas
  dimensions?: {
    weight_kg: number;
    height_cm: number;
    width_cm: number;
    depth_cm: number;
  };
};
```

---

### 8.2 `ProductEditorState`
**Localização:** `src/components/admin/products/ProductEditorLayout.tsx`

Interface completa do estado do editor (ver seção 4.5).

---

### 8.3 `WizardState`
**Localização:** `src/components/admin/products/ProductCreationWizard.tsx`

Estado do wizard de criação (3 passos).

---

## 9. FUNCIONALIDADES

### 9.1 CRUD Completo
- ✅ **Create:** Wizard ou formulário manual
- ✅ **Read:** Listagem em grid, visualização detalhada
- ✅ **Update:** Edição inline ou página dedicada
- ✅ **Delete:** Deletar individual ou em lote

### 9.2 Análise com IA
- ✅ Análise automática de imagem
- ✅ Detecção de categoria, cores, tecido
- ✅ Geração de nome e descrição SEO
- ✅ Análise em massa de catálogo
- ✅ **Detecção de Conjuntos** - Identifica produtos multi-item automaticamente
- ✅ **Correção Automática** - Corrige classificação incorreta (ex: "Short" → "Conjunto")
- ✅ **Tratamento de JSON Malformado** - Correção automática de erros de parsing

### 9.3 Geração de Imagens
- ✅ Imagem de catálogo otimizada
- ✅ Look combinado com manequim
- ✅ Seleção de manequim (feminino/masculino)
- ✅ Modo automático e manual de combinação
- ✅ **Ghost Mannequin** - Transforma imagem original em foto profissional
- ✅ **Preservação de Detalhes** - Botões, costuras e texturas preservados
- ✅ **Volume 3D** - Efeito de manequim invisível pronunciado

### 9.9 Editor de Medidas Inteligente
- ✅ Detecção automática de landmarks
- ✅ Suporte a produtos multi-item (conjuntos)
- ✅ Medidas dinâmicas por tipo de produto
- ✅ Gradação automática entre tamanhos
- ✅ Fallback robusto com medidas padrão
- ✅ Interface visual interativa

### 9.4 Importação em Massa
- ✅ Importação via CSV
- ✅ Validação de dados
- ✅ Relatório de erros por linha
- ✅ Template CSV para download

### 9.5 Sistema de Variações
- ✅ Múltiplas variações por produto
- ✅ Estoque individual por variação
- ✅ SKU único por variação (auto-gerado)
- ✅ Grade de tamanhos (standard/plus)

### 9.6 Sistema de Descontos
- ✅ Desconto global (redes sociais)
- ✅ Desconto específico por produto
- ✅ Cálculo automático de preço final
- ✅ Exibição visual de desconto

### 9.7 Métricas e Performance
- ✅ Taxa de conversão
- ✅ Taxa de rejeição
- ✅ Diagnóstico automático com IA
- ✅ Recomendações de melhoria

### 9.8 Arquivamento
- ✅ Arquivar/desarquivar produtos
- ✅ Filtro para mostrar arquivados
- ✅ Ações em lote

---

## 10. FLUXOS DE USUÁRIO

### 10.1 Fluxo: Criar Novo Produto (Wizard)

```
1. Usuário clica "Adicionar produto"
   ↓
2. Navega para /produtos/novo
   ↓
3. ProductEditorLayout renderiza Wizard
   ↓
4. PASSO 1: Upload de imagem
   - Usuário faz upload
   - Sistema analisa com IA automaticamente
   - Preenche nome, categoria, cores, etc.
   ↓
5. PASSO 2: Estúdio Criativo
   - Seleciona manequim
   - Gera imagem de catálogo
   - Gera look combinado
   - Seleciona imagem de capa
   ↓
6. PASSO 3: Detalhes de Venda
   - Ajusta nome, descrição, categoria
   - Define preço, estoque, SKU
   - Adiciona variações (opcional)
   - Publica produto
   ↓
7. POST /api/lojista/products
   ↓
8. Produto salvo no Firestore
   ↓
9. Redireciona para /produtos
   ↓
10. Produto aparece na listagem
```

---

### 10.2 Fluxo: Criar Produto Manual

```
1. Usuário clica "Adicionar produto"
   ↓
2. Navega para /produtos/novo
   ↓
3. ProductEditorLayout renderiza ManualProductForm
   ↓
4. Preenche formulário completo:
   - Upload de imagem (opcional)
   - Análise IA (opcional)
   - Nome, categoria, preço
   - Estoque, SKU
   - Variações (se necessário)
   ↓
5. Gera imagens no estúdio (opcional)
   ↓
6. Salva produto
   ↓
7. Produto aparece na listagem
```

---

### 10.3 Fluxo: Editar Produto

```
1. Usuário clica "Editar" no card
   ↓
2. Opção A: Modal de edição rápida
   - Edita campos principais inline
   - Salva sem sair da página
   
   Opção B: Página dedicada
   - Navega para /produtos/{id}/editar
   - Carrega dados do Firestore
   - ProductEditorLayout em modo edição
   - Permite alterar tudo
   ↓
3. PATCH /api/lojista/products/{id}
   ↓
4. Firestore atualizado
   ↓
5. Listagem atualizada
```

---

### 10.4 Fluxo: Importar CSV

```
1. Usuário clica "Importar CSV"
   ↓
2. Modal ImportCatalogModal abre
   ↓
3. Usuário seleciona arquivo CSV
   ↓
4. Sistema valida formato
   ↓
5. POST /api/lojista/products/import
   ↓
6. Sistema processa linha por linha:
   - Valida dados
   - Cria produtos no Firestore
   - Coleta erros
   ↓
7. Retorna relatório:
   - Produtos criados
   - Linhas com erro
   ↓
8. Usuário vê resultado
   ↓
9. Listagem atualizada
```

---

### 10.5 Fluxo: Análise em Massa

```
1. Usuário clica "Analisar Todos os Produtos"
   ↓
2. Confirma ação
   ↓
3. POST /api/lojista/products/bulk-analyze
   ↓
4. Sistema itera sobre produtos:
   - Busca imagem de cada produto
   - Chama análise IA
   - Atualiza análiseIA no Firestore
   ↓
5. Retorna estatísticas:
   - Processados
   - Atualizados
   - Erros
   - Pulados
   ↓
6. Página recarrega após 2 segundos
   ↓
7. Produtos aparecem com análises atualizadas
```

---

## 11. DETALHES TÉCNICOS

### 11.1 Geração Automática de SKU

**Função:** `generateSKU(nomeProduto: string, variacao: string): string`

**Algoritmo:**
1. Normaliza nome do produto (primeiros 10 chars, maiúsculas, hífens)
2. Normaliza variação (maiúsculas, hífens)
3. Gera sufixo aleatório de 4 caracteres (A-Z, 0-9)
4. Retorna: `SLUG-PRODUTO-VARIAÇÃO-XXXX`

**Exemplo:**
```
Nome: "Vestido Floral"
Variação: "P"
SKU Gerado: "VESTIDO-FL-P-A3B7"
```

**Proteção contra Loops:**
- `useRef` para rastrear se SKU foi editado manualmente
- Refs para últimos valores processados
- Validação antes de atualizar estado

---

### 11.2 Sistema de Imagens Múltiplas

**Componente:** `ProductImageGallery`

**Funcionalidades:**
- Navegação por setas (desktop)
- Navegação por swipe (mobile/touch)
- Navegação por teclado (setas ← →)
- Indicadores de pontos
- Labels descritivos

**Prioridade de Exibição:**
1. Foto Catálogo (melhor qualidade)
2. Imagem Original (se diferente)
3. Look Combinado (se diferente)

---

### 11.3 Cálculo de Descontos

**Lógica:**
```typescript
const descontoRedes = perfil.descontoRedesSociais || 0;
const descontoEspecial = produto.descontoProduto || 0;
const descontoTotal = descontoRedes + descontoEspecial; // Soma dos descontos
const precoComDesconto = precoOriginal * (1 - descontoTotal / 100);
```

**Exibição Visual:**
- Preço original: riscado, vermelho
- Preço com desconto: verde, negrito
- Percentual: amarelo, pequeno

---

### 11.4 Filtros e Busca

**Busca:**
- Campo de texto livre
- Busca em: nome, categoria, observações
- Case-insensitive
- Tempo real (debounce implícito)

**Filtros:**
- Por categoria (dropdown)
- Mostrar/ocultar arquivados (toggle)
- Combináveis com busca

**Performance:**
- `useMemo` para filtrar produtos
- Recalcula apenas quando dependências mudam

---

## 12. SEGURANÇA E VALIDAÇÃO

### 12.1 Autenticação
- Validação de `lojistaId` em todas as rotas
- Prioridade: query param > auth > env var
- Tratamento de erros de autenticação

### 12.2 Validação de Dados
- Validação de tipos TypeScript
- Validação de campos obrigatórios
- Validação de URLs de imagem
- Validação de formatos (preço, estoque)

### 12.3 Sanitização
- Sanitização de inputs de texto
- Validação de arquivos CSV
- Proteção contra XSS

---

## 13. PERFORMANCE E OTIMIZAÇÕES

### 13.1 Lazy Loading
- Componentes carregados sob demanda
- Modais renderizados apenas quando abertos
- Imagens com `loading="lazy"`

### 13.2 Memoização
- `useMemo` para filtros
- `useCallback` para funções estáveis
- Evita re-renders desnecessários

### 13.3 Cache
- Configuração: `revalidate = 0` (sem cache)
- Dados sempre frescos do Firestore
- Atualização em tempo real após ações

---

## 14. TRATAMENTO DE ERROS

### 14.1 Níveis de Erro
1. **Erro de Autenticação:** Mensagem clara, redireciona para login
2. **Erro de Validação:** Mensagem específica, mantém dados do formulário
3. **Erro de API:** Mensagem amigável, permite retry
4. **Erro de IA:** Fallback para preenchimento manual

### 14.2 Feedback Visual
- Mensagens de sucesso (verde)
- Mensagens de erro (vermelho)
- Estados de loading (spinner)
- Confirmações para ações destrutivas

---

## 15. DEPENDÊNCIAS EXTERNAS

### 15.1 Firebase
- **Firestore:** Armazenamento de produtos
- **Storage:** Armazenamento de imagens (implícito)

### 15.2 Google Gemini 2.5 Flash
- Análise de imagens de produtos
- Geração de metadados estruturados
- Diagnóstico de performance

### 15.3 Bibliotecas
- **Next.js:** Framework
- **React:** Biblioteca UI
- **Framer Motion:** Animações
- **Lucide React:** Ícones
- **Tailwind CSS:** Estilização

---

## 16. MÉTRICAS E MONITORAMENTO

### 16.1 Logs
- Console logs em pontos críticos
- Prefixos `[ProductsTable]`, `[ProductsPageContent]`, etc.
- Logs de erros com stack traces

### 16.2 Métricas de Produto
- `qualityMetrics.compatibilityScore` - Nota 1-5
- `qualityMetrics.conversionRate` - Taxa de conversão
- `qualityMetrics.complaintRate` - Taxa de reclamações

---

## 17. MELHORIAS FUTURAS SUGERIDAS

### 17.1 Performance
- [ ] Paginação na listagem de produtos
- [ ] Virtualização de grid para muitos produtos
- [ ] Cache inteligente de análises IA

### 17.2 Funcionalidades
- [ ] Exportação de catálogo em PDF
- [ ] Sincronização bidirecional com e-commerce
- [ ] Histórico de alterações de produtos
- [ ] Versões de imagens (timeline)

### 17.3 UX
- [ ] Drag & drop para reordenar produtos
- [ ] Preview em tempo real de alterações
- [ ] Atalhos de teclado para ações rápidas

---

## 18. COMPONENTES DETALHADOS

### 18.1 ProductWizardStep1 (Análise de Imagem)

**Funcionalidades:**
- Upload de imagem (drag & drop ou seleção)
- Análise automática ao fazer upload
- Exibição de resultados da IA:
  - Nome sugerido
  - Categoria sugerida
  - Cores predominantes
  - Tecido estimado
  - Tags e detalhes
- Skeleton loader durante análise
- Botão para reprocessar análise

**Integração:**
- Chama `POST /api/lojista/products/analyze`
- Usa `productAnalyzerService` (Gemini 2.5 Flash)
- Preenche automaticamente campos do formulário

---

### 18.2 ProductWizardStep2 (Estúdio Criativo)

**Funcionalidades:**
- Seleção de manequim (feminino/masculino)
- Geração de imagem de catálogo
- Geração de look combinado
- Seleção de imagem de capa
- Preview de todas as imagens geradas
- Modo automático e manual de combinação

**Manequins Disponíveis:**
- Feminino: múltiplos estilos
- Masculino: múltiplos estilos
- Configurados em `MANNEQUIN_STYLES`

**Integração:**
- `POST /api/lojista/products/generate-studio`
- Geração assíncrona com feedback visual

---

### 18.3 ProductWizardStep3 (Detalhes de Venda)

**Campos:**
- Nome (preenchido da IA, editável)
- Descrição SEO (preenchida da IA, editável)
- Categoria (dropdown com categorias consolidadas)
- Preço (obrigatório)
- Preço promocional (opcional)
- Estoque (número)
- SKU (auto-gerado, editável)
- Tamanhos (multi-select)
- Cores (multi-select)
- Variações (se habilitado)
- Unidade de medida (UN, KG, etc.)
- Desconto específico do produto (%)

**Validações:**
- Nome obrigatório
- Preço obrigatório e > 0
- Categoria obrigatória
- Validação de formato de preço

---

### 18.4 ProductStudioInline / ProductStudioModal

**Funcionalidades:**
- Geração de imagem de catálogo
- Geração de look combinado
- Seleção de manequim
- Modo automático (IA escolhe combinação)
- Modo manual (usuário escolhe produtos)
- Preview em tempo real
- Download de imagens geradas

**Estados:**
- `generating` - Gerando imagem
- `success` - Imagem gerada com sucesso
- `error` - Erro na geração

---

### 18.5 MeasurementGuideCard

**Funcionalidades:**
- Exibe guia de medidas do produto
- Permite editar medidas
- Tabela de medidas por tamanho
- Validação de medidas

**Estrutura de Dados:**
```typescript
medidas: {
  "P": { "Busto": 88, "Cintura": 72, "Quadril": 92 },
  "M": { "Busto": 92, "Cintura": 76, "Quadril": 96 },
  // ...
}
```

---

## 19. FLUXOS DE DADOS DETALHADOS

### 19.1 Fluxo: Análise de Imagem com IA

```
Upload de Imagem
       │
       ▼
POST /api/lojista/products/analyze
       │
       ▼
productAnalyzerService.analyzeProductImage(imageUrl)
       │
       ▼
Google Gemini 2.5 Flash API
       │
       ├─→ Vision API (análise de imagem)
       ├─→ Text Generation (descrição SEO)
       └─→ Structured Output (metadados)
       │
       ▼
Retorna JSON estruturado:
{
  nome_sugerido: "Vestido Floral",
  categoria_sugerida: "Roupas",
  cor_predominante: "Rosa",
  tecido_estimado: "Algodão",
  dominant_colors: [...],
  tags: ["floral", "verão", "casual"],
  detalhes: [...]
}
       │
       ▼
Preenche ProductEditorState.aiAnalysisData
       │
       ▼
Formulário atualizado automaticamente
```

---

### 19.2 Fluxo: Geração de Imagem de Catálogo

```
Usuário seleciona manequim
       │
       ▼
POST /api/lojista/products/generate-studio
Body: {
  imageUrl: string,
  mannequinId: string,
  type: "catalog" | "combined"
}
       │
       ▼
Serviço de Geração de Imagem (IA)
       │
       ├─→ Processa imagem original
       ├─→ Aplica manequim selecionado
       ├─→ Gera imagem otimizada
       └─→ Upload para storage
       │
       ▼
Retorna URL da imagem gerada
       │
       ▼
Atualiza ProductEditorState:
- generatedCatalogImage (se type="catalog")
- generatedCombinedImage (se type="combined")
       │
       ▼
Preview atualizado na UI
```

---

## 20. ESTRUTURA DE DADOS NO FIRESTORE

### 20.1 Caminho da Coleção
```
lojas/{lojistaId}/produtos/{productId}
```

### 20.2 Documento de Produto
```typescript
{
  id: "abc123",
  nome: "Vestido Floral",
  preco: 329.90,
  categoria: "Roupas",
  imagemUrl: "https://...",
  imagemUrlOriginal: "https://...",
  imagemUrlCatalogo: "https://...",
  imagemUrlCombinada: "https://...",
  tamanhos: ["P", "M", "G"],
  cores: ["Rosa", "Azul"],
  estoque: 10,
  sku: "VESTIDO-FL-A3B7",
  descontoProduto: 15,
  tags: ["floral", "verão"],
  obs: "Descrição SEO...",
  medidas: "Altura: 150cm, Largura: 80cm",
  variacoes: [
    {
      variacao: "P",
      estoque: "5",
      sku: "VESTIDO-FL-P-XY12"
    },
    // ...
  ],
  analiseIA: {
    nome_sugerido: "Vestido Floral",
    categoria_sugerida: "Roupas",
    // ... dados completos da análise
  },
  qualityMetrics: {
    compatibilityScore: 4.5,
    conversionRate: 25.3,
    complaintRate: 5.2,
    lastCalculatedAt: Timestamp
  },
  createdAt: Timestamp,
  updatedAt: Timestamp,
  arquivado: false,
  catalogGeneratedAt: Timestamp
}
```

---

## 21. VALIDAÇÕES E REGRAS DE NEGÓCIO

### 21.1 Validações de Criação
- ✅ Nome obrigatório (string não vazia)
- ✅ Preço obrigatório (number > 0)
- ✅ Categoria obrigatória (deve estar na lista)
- ✅ Imagem obrigatória (URL válida)
- ✅ SKU único (validação no backend)

### 21.2 Validações de Variações
- ✅ Nome da variação obrigatório
- ✅ Estoque >= 0
- ✅ SKU único por variação
- ✅ Não permite variações duplicadas

### 21.3 Regras de Desconto
- ✅ Desconto total não pode exceder 100%
- ✅ Desconto específico sobrescreve global
- ✅ Desconto global aplicado a todos os produtos
- ✅ Cálculo: soma dos descontos (não multiplicação)

---

## 22. TRATAMENTO DE EDGE CASES

### 22.1 Produto sem Imagem
- Exibe placeholder com ícone Package
- Permite adicionar imagem depois
- Análise IA não funciona sem imagem

### 22.2 Análise IA Falha
- Mostra erro amigável
- Permite preenchimento manual
- Não bloqueia criação do produto

### 22.3 Muitos Produtos
- Grid responsivo se adapta
- Filtros ajudam a encontrar produtos
- Busca em tempo real

### 22.4 Produto sem Variações
- Funciona normalmente
- Estoque único do produto
- SKU único do produto

---

## 23. INTEGRAÇÕES FUTURAS

### 23.1 E-commerce (Planejado)
- Sincronização com Shopify
- Sincronização com Nuvemshop
- Sincronização com VTEX
- Sincronização bidirecional

### 23.2 Métricas Avançadas
- Dashboard de performance
- Análise de tendências
- Recomendações de preço
- Análise de concorrência

---

## 24. DETALHES DOS COMPONENTES DO WIZARD

### 24.1 ProductWizardStep1 - Análise de Imagem

**Fluxo Completo:**
1. Upload de imagem (drag & drop ou seleção)
2. Upload para `/api/lojista/products/upload-image`
3. Recebe URL da imagem
4. Análise automática via `POST /api/lojista/products/analyze`
5. Preenche `wizardState.aiAnalysisData`
6. Exibe resultados em cards organizados

**Estados:**
- `uploading` - Upload em andamento
- `analyzing` - Análise IA em andamento
- `analysisProgress` - Progresso da análise (0-100%)

**Validações:**
- Imagem obrigatória para prosseguir
- URL válida (http:// ou https://)
- Análise deve completar antes de avançar

---

### 24.2 ProductWizardStep2 - Estúdio Criativo

**Seleção de Manequim:**
- Grid de manequins disponíveis
- Estilos diferentes (feminino/masculino)
- Preview do manequim selecionado
- Informações de créditos necessários

**Geração de Imagens:**
- **Imagem de Catálogo:** Otimizada para exibição
- **Look Combinado:** Produto no manequim com fundo

**Modos de Combinação:**
- **Automático:** IA escolhe melhor combinação
- **Manual:** Usuário seleciona produtos para combinar

**Sistema de Créditos:**
- Verifica créditos disponíveis antes de gerar
- Consome créditos ao gerar
- Atualiza saldo após geração

---

### 24.3 ProductWizardStep3 - Detalhes de Venda

**Campos Editáveis:**
- Nome (preenchido da IA)
- Descrição SEO (preenchida da IA)
- Categoria (dropdown)
- Preço (obrigatório, formato brasileiro)
- Preço promocional (opcional)
- Estoque (número)
- SKU (auto-gerado, editável)
- Tamanhos (adicionar/remover dinamicamente)
- Cores (adicionar/remover dinamicamente)
- Tags (adicionar/remover dinamicamente)
- Unidade de medida (UN, KG, etc.)
- Desconto específico (%)

**Ações:**
- Adicionar/remover tamanhos
- Adicionar/remover cores
- Adicionar/remover tags
- Validação antes de publicar

**Publicação:**
- Valida todos os campos obrigatórios
- Prepara payload completo
- POST ou PATCH para API
- Redireciona após sucesso

---

## 25. SISTEMA DE MANEQUINS

### 25.1 Configuração
**Localização:** `src/lib/ai-services/mannequin-prompts.ts`

**Estrutura:**
```typescript
export const MANNEQUIN_STYLES: MannequinStyle[] = [
  {
    id: "female-1",
    name: "Elegante",
    gender: "female",
    description: "...",
    prompt: "..."
  },
  // ... mais estilos
]
```

**Tipos:**
- Feminino: múltiplos estilos
- Masculino: múltiplos estilos
- Cada estilo tem prompt específico para IA

---

## 26. SISTEMA DE CRÉDITOS

### 26.1 Verificação de Créditos
**API:** `GET /api/lojista/credits?lojistaId={id}`

**Resposta:**
```typescript
{
  credits: number;        // Créditos disponíveis
  catalogPack: number;    // Pacote de catálogo disponível
}
```

**Uso:**
- Verifica antes de gerar imagens
- Consome créditos ao gerar
- Atualiza saldo após uso

---

## 27. ESTRUTURA DE IMPORTAÇÃO CSV

### 27.1 Formato do CSV
```csv
nome,preco,categoria,imagemUrl,cores,tamanhos,estoque
Vestido Aurora,329.90,Roupas,https://...,lilás - grafite,P;M;G,10
Blusa Primavera,149.90,Roupas,https://...,branco - preto,PP;P;M;G,15
```

### 27.2 Processamento
1. Parse do CSV linha por linha
2. Validação de campos obrigatórios
3. Normalização de dados:
   - Preço: substitui vírgula por ponto
   - Cores: split por "-"
   - Tamanhos: split por ";"
4. Criação em lote no Firestore
5. Relatório de erros por linha

---

## 28. SISTEMA DE MÉTRICAS DE QUALIDADE

### 28.1 Campos
```typescript
qualityMetrics: {
  compatibilityScore: number;    // 1-5 (compatibilidade com provador)
  conversionRate: number;       // % (likes/composições)
  complaintRate: number;        // % (rejeições)
  lastCalculatedAt: Date;       // Último cálculo
}
```

### 28.2 Cálculo
- **compatibilityScore:** Baseado em análise de imagem e metadados
- **conversionRate:** Likes / Total de visualizações
- **complaintRate:** Rejeições / Total de interações

### 28.3 Uso
- Exibido no card do produto
- Usado para diagnóstico de performance
- Base para recomendações da IA

---

## 29. INTEGRAÇÃO COM PROVADOR VIRTUAL

### 29.1 Dados Necessários
- Medidas do produto (por tamanho)
- Imagens de catálogo otimizadas
- Categoria e tipo de produto
- Público alvo (feminino/masculino/infantil)

### 29.2 Formato de Medidas
```typescript
medidas: {
  "P": { "Busto": 88, "Cintura": 72, "Quadril": 92 },
  "M": { "Busto": 92, "Cintura": 76, "Quadril": 96 },
  // ...
}
```

---

## 30. TRATAMENTO DE ERROS ESPECÍFICOS

### 30.1 Erro de Upload
- Mensagem: "Erro ao fazer upload"
- Ação: Permite tentar novamente
- Não bloqueia criação manual

### 30.2 Erro de Análise IA
- Mensagem: "Erro ao analisar produto"
- Ação: Permite preenchimento manual
- Fallback: Campos vazios, usuário preenche

### 30.3 Erro de Geração de Imagem
- Mensagem: "Erro ao gerar imagem"
- Ação: Permite tentar novamente
- Não bloqueia publicação (usa imagem original)

### 30.4 Erro de Validação
- Mensagem específica por campo
- Destaca campo com erro
- Mantém dados preenchidos

---

## 31. OTIMIZAÇÕES DE PERFORMANCE

### 31.1 Lazy Loading
- Componentes pesados carregados sob demanda
- Modais renderizados apenas quando abertos
- Imagens com `loading="lazy"`

### 31.2 Memoização
- `useMemo` para filtros complexos
- `useCallback` para funções passadas como props
- Evita re-renders desnecessários

### 31.3 Debounce
- Busca em tempo real (debounce implícito do React)
- Validações após parar de digitar

---

## 32. ACESSIBILIDADE

### 32.1 Implementações
- Labels descritivos em inputs
- `aria-label` em botões sem texto
- Navegação por teclado
- Contraste adequado (texto preto em fundo branco)

### 32.2 Melhorias Sugeridas
- [ ] Foco visível em todos os elementos
- [ ] Suporte a screen readers
- [ ] Atalhos de teclado documentados

---

## 33. TESTES E VALIDAÇÃO

### 33.1 Validações Implementadas
- ✅ Validação de tipos TypeScript
- ✅ Validação de campos obrigatórios
- ✅ Validação de formatos (preço, URL)
- ✅ Validação de limites (estoque >= 0)

### 33.2 Testes Sugeridos
- [ ] Testes unitários de funções utilitárias
- [ ] Testes de integração de APIs
- [ ] Testes E2E de fluxos principais
- [ ] Testes de acessibilidade

---

## 34. DOCUMENTAÇÃO DE CÓDIGO

### 34.1 Comentários
- Funções principais documentadas
- Lógica complexa explicada
- TODOs marcados onde necessário

### 34.2 Nomenclatura
- Nomes descritivos e consistentes
- Prefixos claros (`handle`, `on`, `is`, `has`)
- Tipos TypeScript bem definidos

---

## 35. DEPENDÊNCIAS E VERSÕES

### 35.1 Principais Dependências
```json
{
  "next": "^14.x",
  "react": "^18.x",
  "framer-motion": "^10.x",
  "lucide-react": "^0.x",
  "tailwindcss": "^3.x"
}
```

### 35.2 Serviços Externos
- Firebase Firestore (banco de dados)
- Google Gemini 2.5 Flash (IA)
- Firebase Storage (imagens, implícito)

---

## 36. ROTAS E NAVEGAÇÃO

### 36.1 Rotas Principais
- `/produtos` - Listagem
- `/produtos/novo` - Criar novo
- `/produtos/[id]/editar` - Editar existente

### 36.2 Query Params
- `lojistaId` - ID do lojista (modo admin)
- `includeArchived` - Incluir arquivados
- `admin=true` - Modo admin

---

## 37. ESTADOS E GERENCIAMENTO

### 37.1 Estado Local (useState)
- Estados de UI (modais, loading, erros)
- Estados de formulário
- Estados de seleção

### 37.2 Estado do Servidor
- Dados iniciais via Server Components
- Atualização via API routes
- Sincronização com Firestore

### 37.3 Estado Compartilhado
- `lojistaId` via query params ou auth
- Dados do perfil da loja
- Desconto global

---

## 38. SEGURANÇA

### 38.1 Autenticação
- Validação de `lojistaId` em todas as rotas
- Verificação de permissões
- Tratamento de sessão expirada

### 38.2 Validação de Dados
- Sanitização de inputs
- Validação de tipos
- Validação de limites

### 38.3 Proteção de APIs
- CORS configurado
- Validação de origem
- Rate limiting (implícito)

---

## 39. LOGS E DEBUGGING

### 39.1 Console Logs
- Prefixos consistentes: `[ProductsTable]`, `[ProductsPageContent]`
- Logs em pontos críticos
- Stack traces em erros

### 39.2 Informações Logadas
- IDs de produtos
- Contagens de produtos
- Erros com detalhes
- Estados de operações

---

## 40. APIS DETALHADAS

### 40.1 GET /api/lojista/products
**Arquivo:** `src/app/api/lojista/products/route.ts`

**Query Params:**
- `lojistaId` (opcional) - ID do lojista
- `includeArchived` (opcional) - "true" para incluir arquivados

**Resposta:**
```typescript
ProdutoDoc[] // Array direto (não objeto)
```

**Comportamento:**
- Sem cache (`force-dynamic`)
- CORS habilitado
- Retorna array vazio em caso de erro (não quebra frontend)

---

### 40.2 POST /api/lojista/products
**Arquivo:** `src/app/api/lojista/products/route.ts`

**Body Completo:**
```typescript
{
  nome: string;
  categoria: string;
  preco: number;
  imagemUrl: string;
  imagemUrlOriginal?: string;
  imagemUrlCatalogo?: string;
  imagemUrlCombinada?: string;
  tamanhos: string[];
  cores?: string[];
  estoque?: number;
  sku?: string;
  tags?: string[];
  obs?: string;
  medidas?: string;
  descontoProduto?: number;
  variacoes?: Array<{
    variacao: string;
    estoque: string;
    sku: string;
  }>;
  analiseIA?: {
    // Dados completos da análise
  };
  unidadeMedida?: string;
  lojistaId: string;
}
```

**Processamento:**
1. Valida `lojistaId`
2. Converte imagem para PNG se necessário
3. Normaliza categoria
4. Cria produto no Firestore
5. Retorna produto criado

---

### 40.3 PATCH /api/lojista/products/[productId]
**Arquivo:** `src/app/api/lojista/products/[productId]/route.ts`

**Funcionalidades:**
- Atualização parcial (apenas campos enviados)
- Preserva campos não enviados
- Converte imagem para PNG se necessário
- Normaliza categoria
- Atualiza `updatedAt` automaticamente

**Campos Especiais:**
- `analiseIA` - Objeto completo de análise
- `variacoes` - Array de variações
- `imagemMedidasCustomizada` - Imagem de medidas

---

### 40.4 DELETE /api/lojista/products/[productId]
**Arquivo:** `src/app/api/lojista/products/[productId]/route.ts`

**Funcionalidade:**
- Deleta produto permanentemente
- Remove da coleção Firestore
- Não há soft delete (usa arquivamento)

---

### 40.5 POST /api/lojista/products/analyze
**Arquivo:** `src/app/api/lojista/products/analyze/route.ts`

**Body:**
```typescript
{
  imageUrl: string; // URL HTTP/HTTPS válida
}
```

**Query Params:**
- `lojistaId` (opcional)

**Processamento:**
1. Valida URL da imagem
2. Chama `productAnalyzerService.analyzeProductImage()`
3. Usa Gemini 2.5 Flash
4. Retorna análise estruturada

**Resposta:**
```typescript
{
  success: boolean;
  data: {
    nome_sugerido: string;
    descricao_seo: string;
    categoria_sugerida: string;
    cor_predominante: string;
    tecido_estimado: string;
    dominant_colors: Array<{ hex: string; name: string }>;
    tags: string[];
    detalhes: string[];
    product_type?: string;
  };
  processingTime?: number; // ms
}
```

---

### 40.6 POST /api/lojista/products/bulk-analyze
**Arquivo:** `src/app/api/lojista/products/bulk-analyze/route.ts`

**Body:**
```typescript
{
  lojistaId: string;
  limit?: number; // default: 1000
  skip?: number;  // default: 0
}
```

**Processamento:**
1. Busca produtos do Firestore
2. Itera sobre cada produto
3. Chama análise IA para cada um
4. Atualiza `analiseIA` no Firestore
5. Coleta estatísticas

**Resposta:**
```typescript
{
  processed: number;
  updated: number;
  errors: number;
  skipped: number;
}
```

---

### 40.7 POST /api/lojista/products/generate-studio
**Arquivo:** `src/app/api/lojista/products/generate-studio/route.ts`

**Body:**
```typescript
{
  produtoId?: string;
  imagemUrl: string;
  mannequinId: string;
  tipo: "catalog" | "combined";
  lojistaId: string;
  nome?: string;
  categoria?: string;
  preco?: number;
  productIds?: string[]; // Para combinação manual
  // ... outros campos para contexto
}
```

**Processamento:**
1. Valida dados obrigatórios
2. Verifica créditos disponíveis
3. Gera prompt com contexto do produto
4. Chama serviço de geração de imagem
5. Faz upload da imagem gerada
6. Deduz créditos
7. Retorna URL da imagem

**Resposta:**
```typescript
{
  success: boolean;
  imageUrl: string;
  creditsRemaining: number;
}
```

---

### 40.8 POST /api/lojista/products/import
**Arquivo:** `src/app/api/lojista/products/import/route.ts`

**Body:**
```typescript
{
  produtos: Array<{
    linha: number;
    dados: {
      nome: string;
      categoria: string;
      preco: number;
      imagemUrl: string;
      cores: string[];
      tamanhos: string[];
      estoque?: number;
    };
  }>;
}
```

**Processamento:**
1. Valida cada linha
2. Normaliza dados
3. Cria produtos em lote
4. Coleta erros de validação e escrita
5. Retorna relatório

**Resposta:**
```typescript
{
  criados: number;
  falhasValidacao?: Array<{ linha: number; erro: string }>;
  falhasEscrita?: Array<{ linha: number; erro: string }>;
}
```

---

## 41. SISTEMA DE MANEQUINS DETALHADO

### 41.1 Estrutura
**Arquivo:** `src/lib/ai-services/mannequin-prompts.ts`

```typescript
export interface MannequinStyle {
  id: string;
  name: string;
  gender: "female" | "male";
  description: string;
  prompt: string;
  imageUrl?: string;
}

export const MANNEQUIN_STYLES: MannequinStyle[] = [
  // ... estilos configurados
]
```

### 41.2 Seleção
- Grid visual de manequins
- Preview ao selecionar
- Filtro por gênero
- Informações de créditos necessários

---

## 42. SISTEMA DE CRÉDITOS

### 42.1 Verificação
**API:** `GET /api/lojista/credits?lojistaId={id}`

**Uso:**
- Verifica antes de gerar imagens
- Exibe saldo disponível
- Bloqueia se insuficiente

### 42.2 Consumo
- **Catálogo:** 1 crédito ou 1 pack
- **Combinado:** 2 créditos ou 1 pack
- Deduz automaticamente após geração

---

## 43. RESUMO EXECUTIVO

### 43.1 Arquitetura Geral
```
┌─────────────────────────────────────────┐
│     Next.js App Router (Server)        │
│  - page.tsx (Server Component)         │
│  - Carrega dados iniciais               │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   Client Components (React)             │
│  - ProductsPageContent                  │
│  - ProductsTable                        │
│  - ProductEditorLayout                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   API Routes (Next.js)                  │
│  - CRUD de produtos                     │
│  - Análise IA                           │
│  - Geração de imagens                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   Firebase Services                     │
│  - Firestore (dados)                    │
│  - Storage (imagens)                     │
└─────────────────────────────────────────┘
```

### 43.2 Fluxo de Dados Principal
```
Usuário → Componente → API Route → Firestore → Resposta → UI Atualizada
```

### 43.3 Tecnologias-Chave
- **Next.js 14+** - Framework
- **React 18+** - UI Library
- **TypeScript** - Type Safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Animações
- **Firebase** - Backend
- **Gemini 2.5 Flash** - IA

---

## 44. MÉTRICAS DO PROJETO

### 44.1 Tamanho do Código
- **Total de arquivos:** ~30 arquivos relacionados
- **Linhas de código:** ~15.000+ linhas
- **Componente maior:** ProductEditorLayout (2614 linhas)
- **Tabela maior:** ProductsTable (1022 linhas)

### 44.2 Complexidade
- **Alta:** Integração com IA, múltiplos fluxos
- **Média:** CRUD padrão, formulários
- **Baixa:** Componentes de UI simples

---

## 45. CHECKLIST DE FUNCIONALIDADES

### 45.1 CRUD
- ✅ Criar produto (Wizard + Manual)
- ✅ Listar produtos (Grid responsivo)
- ✅ Visualizar produto (Modal detalhado)
- ✅ Editar produto (Inline + Página dedicada)
- ✅ Deletar produto (Individual + Lote)
- ✅ Arquivar produto (Individual + Lote)

### 45.2 IA e Automação
- ✅ Análise automática de imagem
- ✅ Geração de nome e descrição
- ✅ Detecção de categoria, cores, tecido
- ✅ Geração de imagem de catálogo
- ✅ Geração de look combinado
- ✅ Análise em massa
- ✅ Diagnóstico de performance

### 45.3 Importação e Exportação
- ✅ Importação CSV
- ✅ Validação de dados
- ✅ Relatório de erros
- ✅ Template CSV para download

### 45.4 Variações e Estoque
- ✅ Sistema de variações completo
- ✅ Auto-geração de SKU
- ✅ Estoque por variação
- ✅ Grade de tamanhos (standard/plus)

### 45.5 Descontos
- ✅ Desconto global (redes sociais)
- ✅ Desconto específico por produto
- ✅ Cálculo automático
- ✅ Exibição visual

### 45.6 UI/UX
- ✅ Layout responsivo
- ✅ Animações suaves
- ✅ Feedback visual
- ✅ Estados de loading
- ✅ Tratamento de erros
- ✅ Confirmações de ações

---

## 46. PONTOS DE ATENÇÃO

### 46.1 Performance
- ⚠️ Grid pode ficar lento com muitos produtos (sugestão: paginação)
- ⚠️ Análise em massa pode demorar (já tem feedback visual)
- ✅ Imagens com lazy loading

### 46.2 Manutenibilidade
- ✅ Código bem organizado
- ✅ Componentes modulares
- ⚠️ Alguns componentes muito grandes (sugestão: quebrar em menores)

### 46.3 Segurança
- ✅ Validação de autenticação
- ✅ Sanitização de inputs
- ✅ Validação de tipos

---

## 47. RESUMO EXECUTIVO

### 47.1 Visão Geral
A página de **Produtos** é um sistema completo de gerenciamento de catálogo com:
- **9 arquivos principais** na pasta `/produtos`
- **10 componentes compartilhados** em `/components/admin/products` e `/components/products`
- **13 rotas de API** para operações CRUD e funcionalidades avançadas
- **~15.000+ linhas de código** TypeScript/React
- **Integração profunda com IA** (Gemini 2.5 Flash)

### 47.2 Funcionalidades Principais
1. ✅ **CRUD Completo** - Criar, ler, atualizar, deletar produtos
2. ✅ **Análise com IA** - Análise automática de imagens
3. ✅ **Geração de Imagens** - Catálogo e looks combinados
4. ✅ **Importação em Massa** - Via CSV com validação
5. ✅ **Sistema de Variações** - Tamanhos, cores, estoque individual
6. ✅ **Sistema de Descontos** - Global e específico
7. ✅ **Métricas de Performance** - Análise de qualidade
8. ✅ **Arquivamento** - Soft delete de produtos

### 47.3 Arquitetura
- **Server Components** para carregamento inicial
- **Client Components** para interatividade
- **API Routes** para operações de backend
- **Firestore** como banco de dados
- **TypeScript** para type safety

### 47.4 Tecnologias
- Next.js 14+ (App Router)
- React 18+
- TypeScript
- Tailwind CSS (layout azul único)
- Framer Motion (animações)
- Firebase (Firestore + Storage)
- Google Gemini 2.5 Flash (IA)

---

## 48. GLOSSÁRIO

### 48.1 Termos Técnicos
- **ProdutoDoc:** Tipo principal de produto no sistema
- **Wizard:** Fluxo de criação em 3 passos
- **Manequim:** Estilo de manequim para geração de imagens
- **Variação:** Tamanho/cor específico de um produto
- **SKU:** Código único de identificação
- **Análise IA:** Metadados extraídos por IA da imagem
- **Catálogo:** Imagem otimizada para exibição
- **Look Combinado:** Produto combinado com outros produtos

### 48.2 Campos Importantes
- **imagemUrlCatalogo:** Imagem principal (prioridade de exibição)
- **imagemUrlOriginal:** Foto original do upload
- **imagemUrlCombinada:** Look combinado gerado
- **analiseIA:** Dados completos da análise com IA
- **variacoes:** Array de variações (tamanho/cor/estoque/SKU)
- **descontoProduto:** Desconto específico do produto
- **qualityMetrics:** Métricas de performance

---

## 49. REFERÊNCIAS DE CÓDIGO

### 49.1 Arquivos Principais
```
src/app/(lojista)/produtos/
├── page.tsx                    # Entry point (Server)
├── products-page-content.tsx   # Container principal (Client)
├── products-table.tsx          # Grid e lógica (Client, 1022 linhas)
├── manual-product-form.tsx     # Formulário manual (Client)
├── edit-product-form.tsx       # Edição inline (Client)
└── import-catalog-modal.tsx   # Modal de importação (Client)
```

### 49.2 Componentes Compartilhados
```
src/components/admin/products/
├── ProductEditorLayout.tsx     # Editor completo (2614 linhas)
├── ProductCreationWizard.tsx   # Wizard de 3 passos
├── ProductStudioInline.tsx     # Estúdio de geração
└── SmartMeasurementEditor.tsx  # Editor de medidas inteligente (2088+ linhas)
```

### 49.3 APIs
```
src/app/api/lojista/products/
├── route.ts                    # GET, POST
├── [productId]/route.ts        # GET, PATCH, DELETE
├── analyze/route.ts            # Análise IA
├── generate-studio/route.ts    # Geração de imagens
├── process-measurements/route.ts # Geração ghost mannequin
└── detect-landmarks/route.ts   # Detecção de landmarks
```

---

## 50. EDITOR DE MEDIDAS INTELIGENTE (SMART MEASUREMENT EDITOR)

### 50.1 Visão Geral
O **SmartMeasurementEditor** é um sistema avançado para edição interativa de medidas de produtos, com detecção automática de landmarks (pontos de referência) e suporte a produtos multi-item (conjuntos).

**Localização:** `src/components/admin/products/SmartMeasurementEditor.tsx`

### 50.2 Funcionalidades Principais
- ✅ **Detecção Automática de Landmarks** - IA detecta pontos de referência na imagem
- ✅ **Suporte a Produtos Multi-Item** - Detecta e trata conjuntos (ex: cropped + short, biquíni)
- ✅ **Medidas Dinâmicas** - Seleciona medidas relevantes baseado no tipo de produto
- ✅ **Geração de Imagem Ghost Mannequin** - Transforma imagem original em foto de catálogo profissional
- ✅ **Gradação Automática** - Calcula medidas para diferentes tamanhos automaticamente
- ✅ **Fallback Robusto** - Usa medidas padrão quando landmarks não são detectados

### 50.3 Detecção de Produtos Multi-Item

**Tipos Suportados:**
- **BIKINI** - Biquíni (top + calcinha)
- **SET_TOP_BOTTOM** - Conjuntos (cropped + short, blusa + calça, etc.)

**Heurísticas de Detecção:**
1. **Análise de Texto:**
   - Verifica `category`, `productType`, `name`, `description`
   - Detecta palavras-chave: "conjunto", "set", "kit", "cropped", "short", etc.
   - Se `productType` é "Short" mas há evidências de conjunto → força detecção

2. **Análise Visual:**
   - Verifica landmarks de top (bust_start, Length_top)
   - Verifica landmarks de bottom (waist_start, Length_bottom, hip_start)
   - Se ambos presentes → detecta como conjunto

3. **Correção Pós-Processamento:**
   - Se análise IA retorna apenas "Short" mas nome/descrição mencionam conjunto → corrige automaticamente

### 50.4 Medidas por Tipo de Produto

**Peças Superiores (blusa, camisa, top, cropped):**
- Busto (bust)
- Comprimento (length)
- **NÃO inclui:** Cintura, Quadril

**Peças Inferiores (calça, short, bermuda, saia):**
- Cintura (waist)
- Quadril (hip)
- Comprimento (length)
- **NÃO inclui:** Busto

**Vestidos e Macacões:**
- Busto (bust)
- Cintura (waist)
- Quadril (hip)
- Comprimento (length)

**Roupa Íntima (sunga, cueca, calcinha):**
- Quadril (hip)
- Comprimento (length)
- **NÃO inclui:** Busto, Cintura

**Conjuntos (multi-item):**
- **Top:** Busto + Comprimento
- **Bottom:** Cintura + Quadril + Comprimento
- Cria grupos separados de medidas

### 50.5 Fluxo de Processamento

```
1. Upload de Imagem Original
   ↓
2. Geração de Imagem Ghost Mannequin (process-measurements)
   ↓
3. Detecção Automática de Landmarks (detect-landmarks)
   ↓
4. Verificação de Multi-Item
   ↓
5. Determinação de Medidas Relevantes
   ↓
6. Extração de Geometria (coordenadas X/Y)
   ↓
7. Criação de Valores Iniciais (por tamanho)
   ↓
8. Exibição no Editor
```

### 50.6 APIs Relacionadas

**POST /api/lojista/products/process-measurements**
- Gera imagem ghost mannequin
- Retorna URL da imagem processada

**POST /api/lojista/products/detect-landmarks**
- Detecta pontos de referência na imagem
- Retorna coordenadas de medidas (bust_start, waist_start, etc.)
- Suporta fallback quando detecção falha

### 50.7 Tratamento de Erros

**Erro 429 (Resource Exhausted):**
- Detecta automaticamente
- Usa fallback com medidas padrão
- Continua processamento normalmente

**Landmarks Não Detectados:**
- Usa coordenadas padrão baseadas no tipo de produto
- Garante que medidas sempre aparecem

**JSON Parsing Errors:**
- Correção automática de strings não fechadas
- Correção de propriedades sem aspas
- Múltiplas estratégias de reparação

### 50.8 Estrutura de Dados

**SmartGuideData:**
```typescript
{
  baseImage: string;              // URL da imagem ghost mannequin
  activeSize: SizeKey;            // Tamanho ativo (P, M, G, etc.)
  autoGrading: boolean;           // Gradação automática habilitada
  sizes: Record<SizeKey, MeasurementPoint[]>;  // Medidas por tamanho (legado)
  groups?: MeasurementGroup[];   // Grupos de medidas (multi-item)
}
```

**MeasurementGroup (Multi-Item):**
```typescript
{
  id: string;                     // "top" ou "bottom"
  label: string;                  // "Cropped" ou "Short"
  sizes: Record<SizeKey, MeasurementPoint[]>;
}
```

**MeasurementPoint:**
```typescript
{
  id: MeasurementType;            // "bust", "waist", "length", etc.
  label: string;                  // "Busto", "Cintura", etc.
  value: number;                  // Valor em cm
  startX: number;                 // Coordenada X inicial (0-100%)
  startY: number;                 // Coordenada Y inicial (0-100%)
  endX: number;                   // Coordenada X final (0-100%)
  endY: number;                   // Coordenada Y final (0-100%)
}
```

### 50.9 Melhorias Implementadas (2026-01-21)

1. **Detecção Robusta de Conjuntos:**
   - Múltiplas heurísticas (texto, visual, pós-processamento)
   - Correção automática quando análise IA retorna apenas uma peça
   - Busca expandida em múltiplos campos (name, nome, suggestedName, etc.)

2. **Preservação de Detalhes na Imagem:**
   - Instruções explícitas para preservar botões
   - Preservação de costuras e texturas
   - Temperatura aumentada (0.75) para garantir transformação

3. **Tratamento de Erros JSON:**
   - Correção automática de strings não fechadas
   - Correção de propriedades sem aspas
   - Correção direcionada na posição do erro

4. **Fallback Robusto:**
   - Medidas padrão quando landmarks falham
   - Garantia de medidas para ambas as partes em conjuntos
   - Validação e logs para debug

---

## 51. CONCLUSÃO FINAL

### 50.1 Estado Atual
A página de Produtos está **completa e funcional**, com:
- ✅ Todas as funcionalidades implementadas
- ✅ Integração robusta com IA
- ✅ UI moderna e responsiva
- ✅ Tratamento adequado de erros
- ✅ Sistema flexível de variações
- ✅ Performance otimizada

### 50.2 Pontos Fortes
1. **Arquitetura bem estruturada** - Separação clara de responsabilidades
2. **TypeScript completo** - Type safety em todo o código
3. **Integração IA avançada** - Análise e geração de imagens
4. **UX moderna** - Animações, feedback visual, estados claros
5. **Sistema flexível** - Suporta múltiplos fluxos (wizard, manual, edição)

### 50.3 Áreas de Melhoria Futura
1. **Performance:** Paginação para muitos produtos
2. **Testes:** Cobertura de testes automatizados
3. **Documentação:** Mais comentários em funções complexas
4. **Acessibilidade:** Melhorias em screen readers

### 50.4 Métricas de Qualidade
- **Código:** Bem organizado, modular
- **Manutenibilidade:** Alta (componentes reutilizáveis)
- **Performance:** Boa (lazy loading, memoização)
- **Segurança:** Adequada (validações, sanitização)

---

**Documento gerado em:** 2025-01-23  
**Última atualização:** 2026-01-21  
**Versão:** 2.0  
**Status:** Completo ✅

A página de Produtos é um sistema completo e robusto para gerenciamento de catálogo, com:
- ✅ Arquitetura bem estruturada
- ✅ Separação clara de responsabilidades
- ✅ Suporte completo a CRUD
- ✅ Integração avançada com IA
- ✅ Sistema flexível de variações
- ✅ UI moderna e responsiva
- ✅ Tratamento adequado de erros

**Total de Arquivos:** 9 arquivos principais + 11 componentes compartilhados + 15 rotas de API

**Linhas de Código Estimadas:** ~18.000+ linhas

**Complexidade:** Alta (devido à integração com IA, múltiplos fluxos e sistema de medidas inteligente)

### Melhorias Implementadas (2026-01-21)

1. **Sistema de Medidas Inteligente:**
   - Editor completo de medidas com detecção automática de landmarks
   - Suporte a produtos multi-item (conjuntos, biquínis)
   - Medidas dinâmicas baseadas no tipo de produto
   - Gradação automática entre tamanhos

2. **Detecção Robusta de Conjuntos:**
   - Múltiplas heurísticas de detecção (texto, visual, pós-processamento)
   - Correção automática quando análise IA retorna apenas uma peça
   - Suporte a conjuntos complexos (cropped + short, blusa + calça, etc.)

3. **Melhorias na Análise IA:**
   - Prompt otimizado para detectar conjuntos
   - Correção automática de JSON malformado
   - Tratamento robusto de erros (429, parsing, etc.)

4. **Geração de Imagens:**
   - Preservação de detalhes (botões, costuras, texturas)
   - Volume 3D pronunciado
   - Transformação garantida (não retorna imagem igual)

---

**Documento gerado em:** 2025-01-23  
**Última atualização:** 2025-01-23
