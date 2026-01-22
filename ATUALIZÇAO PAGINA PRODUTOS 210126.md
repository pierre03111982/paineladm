MASTERPLAN: REESTRUTURAÇÃO INTELLIGENT PRODUCT STUDIO (V3.0)
Data: 21/01/2026 Objetivo: Transformar o cadastro de produtos em um "Estúdio Inteligente" com precisão milimétrica, suporte a grades dinâmicas (Infantil/Plus Size), entrada rápida via OCR e UI limpa. Stack: Next.js 14, TypeScript, Firebase, Vertex AI (Gemini 2.5 Flash).

1. UX/UI: O Novo Layout "Clean Studio"
Problema Anterior: Overlays (setas/textos) sobre a imagem estavam poluídos, ilegíveis e imprecisos. Nova Diretriz: "Foco na Imagem, Dados na Lateral".

1.1. Estrutura da Tela (ProductStudioLayout)
Refatorar a tela de edição para um layout dividido (Split View):

Esquerda (65% - A Vitrine):

Exibir apenas a imagem processada (Ghost Mannequin) em alta resolução.

Fundo neutro (bg-gray-50) com sombra suave.

Zoom Interativo: Ao passar o mouse, ampliar a imagem (lupa) para ver detalhes do tecido.

Sem Overlays Fixos: Remover todas as setas e textos SVG fixos.

Botão Flutuante (Toggle): "👁️ Ver Guia Visual" (Só mostra as linhas se o usuário clicar).

Direita (35% - O Painel de Controle):

Cabeçalho: Seletores de Contexto (Público/Grade) - Ver seção 2.

Inputs de Medidas: Campos de texto com ícones ilustrativos ao lado (ex: ícone de busto ao lado do input "Busto").

Badges de IA: Se o valor foi preenchido pela IA, mostrar um pequeno ícone ✨ IA roxo ao lado.

Status de Calibração: Indicador "Calibrado via Referência (A4)" ou "Estimativa IA".

2. Lógica de Negócio: Contexto e Grades Dinâmicas
Problema Anterior: A IA analisava roupas infantis com proporções de adulto. Nova Diretriz: O Contexto define a Regra.

2.1. O "Pré-Seletor" Obrigatório
Antes ou durante o upload da imagem, o usuário deve confirmar o contexto. A UI de grade deve mudar dinamicamente:

Seletor 1: Público Alvo (targetAudience)

[ ] Feminino / Masculino (Adulto)

[ ] Infantil / Bebê

Seletor 2: Tipo de Grade (Reativo)

Se Adulto: Mostrar opções: "Padrão (P-GG)", "Numérico (36-54)", "Plus Size (G1-G4)".

Se Infantil: Mostrar opções: "Bebê (RN-12m)", "Primeiros Passos (1-3)", "Juvenil (4-16)".

2.2. Injeção de Contexto na IA
Ao chamar a API de análise (/api/lojista/products/analyze ou detect-landmarks), o body deve incluir:

TypeScript

{
  imageUrl: string;
  context: {
    audience: 'KIDS' | 'ADULT';
    sizeSystem: 'AGE_BASED' | 'LETTER_BASED' | 'NUMERIC';
  }
}
O Prompt do Gemini deve receber isso para ajustar sua expectativa anatômica.

3. Precisão: Sistema de Calibração Híbrido
Problema Anterior: Medidas "alucinadas" ou desproporcionais. Nova Diretriz: Matemática sobre Adivinhação.

Implementar 3 níveis de precisão no backend de análise:

3.1. Nível 1: Detecção de Objeto de Referência (Ouro)
Instruir a IA a buscar objetos padrão na imagem original (raw):

Folha A4: Se detectada, definir escala: Largura A4 = 210mm.

Cartão de Crédito: Se detectado, definir escala: Largura = 85.6mm.

Lógica: Pixel_por_CM = Largura_Pixels_Objeto / Largura_Real_Objeto. Aplica-se essa razão para medir a roupa.

3.2. Nível 2: Cabide Padrão (Prata)
Se não houver A4, tentar detectar o cabide. Assumir largura média de cabide adulto = 42cm.

3.3. Nível 3: Correção de Ponto Único (Bronze - Fallback)
Se a IA não tiver referência, ela estima.

Na UI: Adicionar botão "Recalibrar" ao lado dos inputs.

Fluxo: O usuário corrige apenas o Busto (ex: de 40cm para 45cm). O sistema recalcula automaticamente Cintura e Comprimento mantendo a proporção visual que a IA detectou.

4. Nova Feature: "Entrada Rápida" (OCR de Notas/Caderno)
Objetivo: Permitir cadastro via foto de nota fiscal ou anotação manual.

4.1. Componente QuickImportModal
Upload de foto (papel, tela, caderno).

API: Envia para Gemini Vision com prompt específico de OCR.

Prompt de Sistema (Backend):

"Analise esta imagem de documento (nota fiscal ou anotação manual). Extraia uma lista de itens em JSON contendo: nome_produto (string), quantidade (number), custo (number), preco_venda (number ou null). Se houver apenas custo, ignore o preço de venda."

Ação: Popula a tabela de "Importação em Massa" para revisão do usuário.

5. Inteligência de Estoque: "Smart Look Combination"
Problema Anterior: A IA gerava roupas aleatórias para combinar, criando alucinações. Nova Diretriz: Usar o estoque real do lojista.

5.1. Lógica de Busca Semântica
Ao clicar em "Gerar Look Combinado":

Análise: O sistema identifica a peça principal (ex: "Camiseta Preta Masculina Básica").

Query no Firestore: O sistema busca no banco de dados do lojista:

Filtro: Categoria = "Parte Inferior" (Short/Calça).

Filtro: Gênero = Igual.

Estilo: Cores complementares (ex: Jeans, Bege, Cinza).

Geração (Inpainting):

Envia para a Vertex AI:

Input A: Foto da Camiseta (Ghost Mannequin).

Input B: Foto da Calça do Estoque (Ghost Mannequin).

Prompt: "Compose a professional fashion photo of a model wearing Product A and Product B together..."

Resultado: Um look onde ambas as peças estão à venda na loja.

6. Prompt Engineering (Instruções para o Cursor Implementar)
Para garantir que o Cursor escreva o código certo, use estas definições de estrutura:

6.1. Interface de Dados Atualizada
TypeScript

interface SmartAnalysisResult {
  // Dados Básicos
  name: string;
  description: string;
  category: string;
  
  // Contexto Detectado
  detected_audience: 'KIDS' | 'ADULT';
  
  // Medidas Calibradas
  measurements: {
    bust?: number;
    waist?: number;
    length?: number;
    hip?: number;
    unit: 'cm';
    calibration_method: 'A4_REFERENCE' | 'HANGER' | 'AI_ESTIMATE';
  };
  
  // Enriquecimento
  details: {
    fabric_type: string; // ex: "Bengaline"
    neckline: string;    // ex: "Gola Quadrada"
    sleeves: string;     // ex: "Manga Bufante"
    visual_tags: string[]; // ["Mini Diva", "Tendência", "Babado"]
  }
}
6.2. Regra de Gradação (Auto-Grading Logic)
Instruir o Cursor a criar a função calculateGrading(baseSize, baseMeasurements, rule):

Se rule === 'ADULT_STANDARD': +/- 4cm para circunferências, +/- 1.5cm para comprimento.

Se rule === 'KIDS_AGE': Usar tabela de crescimento ABNT (ex: salto maior entre tamanhos 4 e 6 do que entre 10 e 12).

Resumo das Tarefas para o Cursor (Checklist)
[ ] Refatorar UI: Criar ProductStudioLayout (Split View) e remover overlays SVG fixos.

[ ] Implementar Contexto: Adicionar seletores de Público/Grade que afetam o prompt da IA.

[ ] Backend de Análise: Atualizar prompt do Gemini para aceitar contexto "Kids" e buscar "Folha A4" para calibração.

[ ] Implementar OCR: Criar modal de importação via foto de nota/caderno.

[ ] Implementar Smart Looks: Alterar lógica de geração de look para consultar produtos existentes no Firestore antes de gerar a imagem.

[ ] Migração de Dados: Garantir que produtos antigos sem targetAudience definido recebam um valor padrão (ex: Adulto) para não quebrar.


AJUSTE ANTE DE CONTINUAR 

DOCUMENTO TÉCNICO PARA O CURSOR (Copie e Cole)
Este prompt cobre a UI das grades, a lógica de equivalência (38=M) e a preparação para o Provador Virtual.

Markdown

# MASTER TASK: IMPLEMENTAÇÃO FINAL DE GRADES E MATCHING LOGIC

Estamos refinando o `ProductStudioLayout` e a lógica de cadastro. O cliente precisa de suporte avançado para **Grades Híbridas** e **Equivalência de Tamanhos** para alimentar o Provador Virtual.

## 1. UI Refactoring: Seletor de Grades Dinâmico
Atualmente, ao selecionar "Infantil", as opções de grade somem. Precisamos corrigir isso e organizar o layout.

**Requisito Visual:**
Exibir cards de seleção de grade lado a lado. Os cards devem mudar dinamicamente baseados no `targetAudience`.

**Lógica de Renderização:**

```tsx
// Exemplo de Lógica
const SIZE_GRIDS = {
  ADULT: [
    { id: 'standard', label: 'Letras (Padrão)', examples: 'P, M, G, GG' },
    { id: 'numeric', label: 'Numérica (Jeans)', examples: '36, 38, 40, 42' },
    { id: 'plus', label: 'Plus Size', examples: 'G1, G2, G3, 46+' }
  ],
  KIDS: [
    { id: 'baby', label: 'Bebê (Meses)', examples: 'RN, 3M, 6M, 9M' },
    { id: 'kids_numeric', label: 'Infantil (Anos)', examples: '2, 4, 6, 8, 10' },
    { id: 'teen', label: 'Juvenil', examples: '12, 14, 16' }
  ]
};

// Se audience === 'KIDS', renderize as opções de KIDS.
// Destaque visualmente a opção selecionada com uma borda roxa/azul forte.
2. Feature: Equivalência de Tamanhos (Mapping)
Para produtos numéricos (ex: 38, 40), o lojista quer indicar a referência em letras para facilitar a busca.

Alteração no Schema do Produto (ProductData): Adicione suporte para um "label secundário" em cada variação de tamanho.

TypeScript

interface ProductSizeVariant {
  name: string;      // ex: "38"
  equivalence?: string; // ex: "M" (Opcional)
  measurements: {    // Medidas detectadas pela IA para ESTE tamanho
    bust?: number;
    waist?: number;
    hip?: number;
    length?: number;
  };
  stock: number;
}
Alteração na UI de Variações: Quando o usuário adicionar o tamanho "38", mostre um pequeno dropdown ou campo opcional ao lado: "Ref: [ M ]".

3. Integração com IA (Contexto Atualizado)
A IA precisa saber exatamente qual grade estamos usando para sugerir as medidas corretas. Atualize o payload da análise (/api/lojista/products/analyze) para enviar:

sizeSystem: 'numeric' | 'letter' | 'age'

Comportamento Esperado:

Se sizeSystem === 'numeric' (Adulto): A IA deve esperar cintura ~70cm para um tamanho "38".

Se sizeSystem === 'kids_numeric' (Infantil): A IA deve esperar cintura ~50cm para um tamanho "6".

Isso corrige o erro de a IA achar que uma roupa infantil é um adulto pequeno.

4. Algoritmo de Sugestão (Provador Virtual - Backend Logic)
Prepare a função utilitária que será usada no App do Cliente para sugerir o tamanho.

TypeScript

export function suggestSize(
  userMeasurements: UserBodyMetrics, 
  product: ProductDoc
): SuggestionResult {
  // Lógica: Comparar medidas do corpo do usuário com as medidas cadastradas no produto
  // Tolerância de conforto: +2cm a +4cm de folga é o ideal para tecido plano.
  // Retorna: "38 (Caimento Perfeito)" ou "36 (Fica Justo)"
}
Sua Missão Agora:

Corrija o bug da UI Infantil (fazer aparecer as grades de idade).

Implemente a lógica de seleção de grade lado a lado.

Garanta que essa seleção seja enviada para a IA calibrar a análise de medidas.


---

### O que isso resolve?

1.  **Grade Infantil:** Agora você terá botões específicos para "2, 4, 6, 8", e a IA saberá que "6" significa "6 anos" e não "Tamanho 6 adulto" (que não existe, mas confundiria o sistema).
2.  **38 = M:** Com o campo `equivalence`, você atende ao pedido de sinalizar a referência em letras, mantendo a precisão numérica.
3.  **Provador Preciso:** Ao estruturar os dados assim, o cálculo de "Fit" (Caime