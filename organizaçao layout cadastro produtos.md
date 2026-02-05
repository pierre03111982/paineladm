# TASK: REESTRUTURAÇÃO DO LAYOUT DE PRODUTO (4-STEP FLOW)

**Objetivo:**
Refatorar a página de criação/edição de produtos para um layout organizado em 4 Containers (Cards) verticais, guiando o usuário do upload até a publicação.

**Estilo Visual:**
- Use componentes de `Card` (shadcn/ui ou similar) com bordas sutis e sombras leves.
- Cada Card deve ter um `CardHeader` com título em negrito e ícone.
- Espaçamento generoso entre os cards (`space-y-8`).

**ESTRUTURA OBRIGATÓRIA:**

**1. CONTAINER 1: DEFINIÇÃO & MÍDIA**
- **Título:** "1. Configuração Inicial"
- **Conteúdo:**
  - Seletores de Contexto (Público Alvo, Tipo de Grade) no topo. *Nota: Isso define a regra para o resto da página.*
  - Área de Upload (Dropzone) grande.
  - Grid de visualização das fotos carregadas (Raw Photos).

**2. CONTAINER 2: ESTÚDIO CRIATIVO**
- **Título:** "2. Tratamento de Imagem"
- **Conteúdo:**
  - Área visual para selecionar a "Foto de Capa".
  - Ferramentas de IA: Botões para "Remover Fundo", "Gerar Ghost Mannequin" ou "Usar Original".
  - Feedback visual do processamento da imagem.

**3. CONTAINER 3: ANÁLISE INTELIGENTE (O Cérebro)**
- **Título:** "3. Medidas & Ficha Técnica"
- **Conteúdo:**
  - Implementar o layout "Clean Studio" (Imagem à esquerda, Dados à direita).
  - Integração com `ABNT_STANDARDS`: Ao selecionar o tamanho, preencher inputs automaticamente.
  - Exibir Badges de origem: "🟢 ABNT" ou "🟣 IA Vision".
  - Campos de Texto Inteligente: Nome do Produto e Descrição (gerados via IA com base na foto).

**4. CONTAINER 4: DADOS COMERCIAIS (Ação Humana)**
- **Título:** "4. Preço e Estoque"
- **Conteúdo:**
  - Campos obrigatórios de negócio: SKU, Preço de Custo, Markup, Preço de Venda, Estoque por variação.
  - Botão de Ação Primária: "Salvar e Publicar" (Fixo no final ou flutuante).

**Comportamento:**
- O Container 3 (Medidas) deve reagir às escolhas do Container 1 (Público Alvo).
- Mantenha o design limpo, fundo branco/cinza claro, focando na legibilidade.


Aqui está como estruturar essa funcionalidade dentro do "Container 2: Estúdio Criativo" do seu layout:

1. O "Gerador de Ghost Mannequin" (Fotos 1 e 2)
Não é apenas "gerar". O processo é: Remover Fundo + Criar Volume 3D + Sombra de Contato.

Melhoria: Adicione uma opção de "Cor de Fundo" (Branco Puro para marketplace, Cinza Claro para site próprio).

2. O "Virtual Model" (Fotos 3 e 4)
Para o cenário combinar, a IA precisa ler a roupa.

Melhoria: Crie "Temas de Cenário" pré-definidos baseados na categoria da roupa.

Se for Biquíni: Cenário "Praia/Piscina".

Se for Terno: Cenário "Escritório/Urbano".

Se for Pijama: Cenário "Quarto/Interior Aconchegante".

Isso evita que a IA coloque um pijama no meio da rua.

3. O "Look Combinado" (Fotos 5 e 6) - A Joia da Coroa
Aqui está o dinheiro. Para selecionar os produtos combinados:

Melhoria: O sistema deve abrir um Modal de Seleção Inteligente que mostra apenas produtos que fazem sentido (ex: se o produto principal é uma Calça, mostrar apenas Camisetas, Blusas e Jaquetas, não outras calças).

📄 PROMPT PARA O CURSOR (Copie e Cole)
Este comando cria a interface específica para esse gerador de 6 imagens dentro do seu sistema.

Markdown

# TASK: UI DO GERADOR DE IMAGENS DE PRODUTO (6-SHOT AI STUDIO)

**Contexto:**
Dentro do "Container 2: Estúdio Criativo", precisamos de uma interface avançada para gerar um pack de 6 imagens de marketing utilizando IA.

**Estrutura da Interface (Grid de 3 Colunas x 2 Linhas):**

Crie um grid visual onde cada "Slot" de imagem tem um estado (Vazio/Gerando/Pronto) e controles específicos.

**LINHA 1: TÉCNICA E LIFESTYLE (FRENTE)**
1.  **Slot 1: Ghost Mannequin (Frente)**
    - *Status:* Gerado automaticamente ao remover fundo.
    - *Controle:* Toggle "Adicionar Sombra 3D".
2.  **Slot 2: Ghost Mannequin (Costas)**
    - *Input:* Se o usuário não fez upload da foto de costas, exibir botão "Gerar Costas via IA (Experimental)".
3.  **Slot 3: Modelo Virtual (Lifestyle Frente)**
    - *Controle:* Dropdown "Cenário" (Sugestões: Urbano, Estúdio, Praia, Casa).
    - *Controle:* Dropdown "Modelo" (Sugestões: Loura, Morena, Negra, Asiática).

**LINHA 2: DETALHE E CROSS-SELL (COSTAS & LOOK)**
4.  **Slot 4: Modelo Virtual (Meio-Perfil/Costas)**
    - *Regra:* Usa o mesmo modelo e cenário do Slot 3.
5.  **Slot 5: Look Combinado (Opção A)**
    - *Ação:* Botão "+ Adicionar Produto Complementar".
    - *Comportamento:* Abre um Modal para selecionar outro produto do catálogo (ex: Tênis para combinar com a Calça).
6.  **Slot 6: Look Combinado (Opção B - Zoom/Detalhe)**
    - *Foco:* Gera um close-up mostrando a textura dos dois produtos juntos.

**Componente de Seleção de Combo (Modal):**
- Ao clicar no Slot 5 ou 6, abrir modal "Montar Look".
- Exibir lista de produtos com busca.
- Permitir selecionar até 1 item adicional.

**Feedback Visual:**
- Enquanto a IA gera, mostre um "Skeleton Loader" com uma animação de brilho.
- Botão "Regenerar" em cada Slot individual caso o usuário não goste do resultado.
Visualização Prática
Imagine o Container 2 agora. Em vez de apenas uma foto, você tem esse Painel de Controle de Mídia.

O lojista sobe a foto da camiseta.

O sistema remove o fundo (Foto 1).

O lojista clica em "Gerar Modelo" -> Escolhe "Urbano". A IA cria a Foto 3.

O lojista clica em "Combinar" -> Seleciona uma Calça Jeans do catálogo. A IA cria a Foto 5 (Modelo usando a Camiseta + Calça Jeans).image.png