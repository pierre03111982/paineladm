# ESPECIFICAÇÃO DE LAYOUT: Painel Unificado de Produto (Single-Page View)

**Contexto:**
O cliente optou por não usar um "Wizard" de múltiplas etapas. O objetivo agora é refatorar as telas de "Adicionar Produto" e "Editar Produto" (que compartilharão o mesmo layout base) em uma **única tela consolidada**. O layout deve ser limpo, organizado em colunas e cards, permitindo que o lojista visualize o fluxo criativo (IA) e o preenchimento de dados operacionais em um só lugar, de forma compacta e intuitiva.

**Conceito Visual (Layout 2 Colunas):**
A tela será dividida em duas grandes colunas verticais:
- **Coluna Esquerda (aprox. 40%): O Estúdio Visual.** Focada em upload de mídia, geração de imagens com IA e seleção da foto de capa.
- **Coluna Direita (aprox. 60%): O Hub de Dados.** Focada nos resultados da análise de IA (textos/tags) e no formulário opercional (preço/estoque).

---

## Estrutura do Layout (Componente Pai)

### 1. Cabeçalho da Página (Header Actionbar)
Uma barra superior limpa contendo:
- **Título:** "Novo Produto" ou "Editando: [Nome do Produto]".
- **Ações:** Um botão principal de destaque "💾 Salvar Produto" no canto direito.

### 2. Container Principal (Grid 2 Colunas)
Um container flex ou grid que divide o conteúdo abaixo do cabeçalho. Em mobile, deve empilhar (Esquerda em cima, Direita embaixo).

---

## ⬅️ COLUNA ESQUERDA: O Estúdio Visual (The Visual Studio)

Esta coluna deve ser visualmente rica e focar na manipulação de imagens.

### Bloco 1: Mídia Principal (Upload & Capa)
Um card proeminente no topo da coluna esquerda.
- **Estado Inicial (Sem imagem):** Um "Dropzone" grande e estilizado, convidando o usuário a arrastar a foto original.
- **Estado Com Imagem:**
    - Exibe a **Imagem de Capa Selecionada** em tamanho grande (destaque).
    - Abaixo dela, uma galeria de miniaturas horizontais mostrando todas as imagens disponíveis (Original, Gerada Catálogo, Gerada Combinada).
    - Clique na miniatura define ela como a capa principal.
    - Botão pequeno para "Substituir Imagem Original" (reabre o upload).

### Bloco 2: Estúdio Criativo IA (Ferramentas de Geração)
Um card logo abaixo, contendo as ferramentas para gerar novas imagens (baseado na lógica da Fase 32/33).
- **Seletor de Manequim:** Carrossel compacto de miniaturas dos manequins.
- **Ações de Geração:** Dois botões lado a lado com ícones de brilho (✨):
    - `[✨ Gerar Foto Catálogo]` (Custo: X)
    - `[✨ Gerar Look Combinado]` (Abre o Modal de Seleção Manual/Auto definido anteriormente).
- **Feedback:** Ao gerar, a nova imagem aparece na galeria de miniaturas do Bloco 1 e já vem selecionada como capa.

---

## ➡️ COLUNA DIREITA: O Hub de Dados (The Data Hub)

Esta coluna deve ser limpa, organizada como um formulário, mas com distinção visual entre o que é IA e o que é manual.

### Bloco 3: Inteligência Artificial (Sugestões) ✨
Um card no topo da coluna direita com um estilo visual distinto (ex: fundo roxo claro sutil ou borda colorida) para indicar que é conteúdo gerado por IA.
- **Cabeçalho do Card:** Ícone de brilho (✨) e título "Análise Inteligente & SEO". Botão pequeno "🔄 Regenerar".
- **Campos (Preenchidos automaticamente após upload na esquerda):**
    - Input: Nome do Produto (Sugerido).
    - Textarea: Descrição SEO/Comercial.
    - Input de Tags (Chips): Categoria detectada, tags de cenário, cor, tecido.

### Bloco 4: Dados Operacionais (Manual) 👤
Um card abaixo, com estilo de formulário padrão (fundo branco limpo), para os dados de negócio cruciais. Use um layout de grid interno para compactar os campos.
- **Linha 1:** Preço (R$) | Preço Promocional (R$).
- **Linha 2:** SKU | Estoque (Qtd Total).
- **Seção de Variações:** Componente para adicionar/gerenciar Grade (P/M/G) e Cores, se aplicável.
- **Toggles:** Ativar no Site / Destaque Promocional.

---

## Fluxo de Uso Esperado (UX)

1.  O lojista entra na tela.
2.  Arrasta a foto para a **Esquerda (Bloco 1)**.
3.  O sistema carrega a imagem e a **Direita (Bloco 3)** começa a piscar (skeleton) e preenche os dados de IA automaticamente.
4.  O lojista olha para a **Esquerda (Bloco 2)**, escolhe um manequim e clica em "Gerar Foto Catálogo".
5.  A nova imagem aparece em destaque na **Esquerda (Bloco 1)**.
6.  O lojista vai para a **Direita (Bloco 4)** e preenche o Preço e Estoque.
7.  Clica em "Salvar" no cabeçalho.

---

**Instruções para o Cursor:**
1.  Crie o layout base de 2 colunas (`ProductEditorLayout.tsx`) que será usado tanto na rota `/new` quanto na `/edit/[id]`.
2.  Implemente a **Coluna Esquerda** agrupando o componente de Upload/Galeria e o componente de Estúdio (geração). Garanta que o upload de uma imagem dispare a análise da IA.
3.  Implemente a **Coluna Direita** com dois Cards distintos visulamente: um para os dados da IA (read-only ou editáveis com destaque) e outro para o formulário padrão (React Hook Form).
4.  Conecte os estados: a imagem selecionada na esquerda deve ser salva como a URL principal do produto ao submeter o formulário da direita.    