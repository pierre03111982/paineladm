Prompt para Fase 13: Implementação do Gerador de Catálogo com IA (Painel Lojista)

Contexto:
No formulário de cadastro/edição de produtos do Painel do Lojista, precisamos adicionar uma funcionalidade de "Estúdio IA". O objetivo é pegar a foto original do produto e transformá-la em uma imagem de catálogo profissional com etiqueta de preço integrada.

MOTIVAÇÃO ESTRATÉGICA (USO NO DISPLAY):
Crítico: As imagens geradas por esta ferramenta serão a fonte primária de conteúdo para o Modo Display (TV da Loja).

Objetivo Legal: Substituir o uso de fotos de clientes reais no display público para eliminar riscos de direitos de imagem e privacidade (LGPD).

Objetivo Visual: Garantir que a TV da loja exiba apenas imagens de "Padrão Estúdio", com preços legíveis e estética controlada.

Documentação de Referência:

Lógica de Prompt: Baseada na "Versão 6.0 - Promoção Visual Dinâmica" (Documento anexo).

Instruções para o Cursor:

Serviço de Prompt de Catálogo (paineladm/src/lib/ai/catalog-prompt.ts):

Crie uma função buildCatalogPrompt(produto, corManequim).

Passo A: Preparação de Variáveis (Lógica V6.0):

Verifique se há desconto (precoPromocional > 0 e precoPromocional < precoOriginal).

[COR_DO_MANEQUIM]: Default "branco fosco" ou o selecionado pelo usuário.

[NOME_DO_PRODUTO]: Nome do produto.

[PRECO_ORIGINAL_CHEIO]: Se tiver desconto, formatar "R$ XX,XX". Se não tiver desconto, deve ser uma string vazia "".

[PRECO_FINAL_ATUAL]: O preço que o cliente paga (seja promocional ou cheio).

[PORCENTAGEM_DESCONTO]: Se tiver desconto, calcular Math.round((1 - novo/velho) * 100) + "% OFF". Se não tiver, string vazia "".

[TAMANHOS_DISPONIVEIS]: Lista de tamanhos unidos por vírgula.

Passo B: O Prompt Mestre (Copie este texto EXATAMENTE):

**INSTRUÇÃO MESTRE (Prioridade Máxima: Extração, Fidelidade e Hierarquia Visual de Preço):**
Atue como um fotógrafo profissional de e-commerce de luxo e uma IA de análise visual forense.

Sua missão crítica é tripla:
1. **EXTRAÇÃO CIRÚRGICA:** Isole o produto da imagem anexada de qualquer contexto original com precisão absoluta.
2. **RÉPLICA EXATA:** Replique o produto com 100% de fidelidade em um NOVO suporte de exibição realista e cenário minimalista.
3. **INTEGRAÇÃO DINÂMICA DE PREÇO:** Adicionar uma etiqueta minimalista onde a hierarquia visual do preço muda drasticamente se houver um desconto aplicado.

**ETAPA 1: ANÁLISE FORENSE DO PRODUTO**
Analise a foto anexada milímetro por milímetro. Memorize: Categoria, Material (Textura/Brilho), Detalhes (Botões/Costuras).

**ETAPA 2: GERAÇÃO DA IMAGEM (Regras Rígidas)**
* **REGRA Nº1: FIDELIDADE TOTAL:** O produto na imagem final deve ser uma cópia carbono do produto anexado.
* **SUPORTE DE EXIBIÇÃO (Novo Manequim):**
    * Use um manequim de loja de alto padrão, cor: [COR_DO_MANEQUIM].
    * *Roupas (Look Completo):* Manequim de corpo inteiro, pose elegante.
    * *Roupas (Peça Parcial):* Enquadramento que valorize a peça, evitando manequim "vazio".
[DESCRICAO_DO_CENARIO]: (O backend deve injetar UMA das 10 descrições da lista abaixo).
Lista de Valores para [DESCRICAO_DO_CENARIO] (Para o seu formulário):
1.	Apartamento Parisiense: "Crie um fundo extremamente desfocado (bokeh cremoso) que sugira um apartamento parisiense clássico, com painéis de parede brancos ornamentados (boiserie), piso de madeira chevron e luz natural suave entrando por uma janela alta distante."
2.	Villa de Concreto Minimalista: "O fundo deve ser uma sugestão fortemente desfocada de arquitetura contemporânea de concreto polido e grandes painéis de vidro. Use uma luz fria e sofisticada que crie reflexos suaves e difusos no piso, sugerindo um ambiente de design exclusivo."
3.	Boutique Flagship de Luxo: "Gere um fundo que evoque o interior de uma loja de alta costura, mas mantenha-o completamente fora de foco. Use tons quentes de madeira escura, reflexos sutis de latão dourado e luzes de prateleira distantes transformadas em um bokeh suave e rico."
4.	Grand Hotel Lobby: "O cenário deve sugerir o saguão de um hotel cinco estrelas histórico. O fundo extremamente desfocado deve apresentar tons de mármore quente, brilhos distantes de lustres de cristal e uma atmosfera dourada e envolvente."
5.	Galeria de Arte Minimalista: "Use um fundo de galeria minimalista e etéreo. Paredes brancas imaculadas e piso de cimento claro, com formas indistintas e suaves de esculturas modernas ao longe, mantidas em um desfoque limpo com luz difusa de claraboia."
6.	Rooftop Urbano "Blue Hour": "O fundo deve capturar a atmosfera de um rooftop sofisticado durante a "hora azul". Crie um bokeh dramático com as luzes da cidade distante e tons profundos de azul e laranja no céu, sugerindo um evento noturno de luxo."
7.	Parede de Gesso Veneziano: "Crie um fundo focado na textura de uma parede de gesso veneziano (stucco) artesanal em um tom neutro e quente (como areia ou terracota pálida). Mantenha a textura extremamente desfocada para criar um pano de fundo orgânico, rico e tátil."
8.	Jardim Privado Noturno: "Sugira um jardim manicurado em uma propriedade privada logo após o pôr do sol. O fundo deve ser um mix de tons de verde escuro da folhagem e o azul profundo do céu, com pequenas luzes quentes (fairy lights) criando um bokeh cintilante e romântico ao longe."
9.	Pátio de Villa Toscana: "O fundo deve evocar um pátio de pedra antigo e ensolarado na Itália. Use paredes de pedra rústica bege e a sugestão de luz solar filtrada por oliveiras ou pérgolas, criando sombras suaves e um ambiente quente e desfocado."
10.	Estúdio com Sombra Arquitetônica: "Use um fundo de estúdio ciclorama em tom off-white. Adicione profundidade projetando uma grande sombra arquitetônica suave e difusa (como a forma de um arco ou janela grande) na parede de fundo curva, mantendo tudo em um desfoque artístico."

* **ETIQUETA DE INFORMAÇÃO COM LÓGICA DE PROMOÇÃO:**
    * Adicione uma etiqueta (tag) flutuante ao lado do produto, estilo minimalista.
    * **Conteúdo:**
        * Linha 1: [NOME_DO_PRODUTO] em negrito.
        * **BLOCO DE PREÇO:**
            * **SE** "[PRECO_ORIGINAL_CHEIO]" e "[PORCENTAGEM_DESCONTO]" tiverem dados:
                1. Exiba [PRECO_ORIGINAL_CHEIO] pequeno, cinza, com RISCO HORIZONTAL (strikethrough).
                2. Abaixo, exiba [PRECO_FINAL_ATUAL] MUITO MAIOR, negrito, cor de destaque (vermelho escuro ou preto forte).
                3. Ao lado, badge com [PORCENTAGEM_DESCONTO].
            * **SENÃO (Se estiverem vazios):**
                1. Exiba apenas [PRECO_FINAL_ATUAL] em tamanho de destaque padrão.
        * Linha Final: [TAMANHOS_DISPONIVEIS] em texto menor.
    * **Linha Conectora:** Uma linha fina conectando a etiqueta ao produto.
* **ILUMINAÇÃO:** Luz de estúdio para realçar texturas.


Rota de API (paineladm/src/app/api/ai/catalog/route.ts):

Método POST. Recebe { produtoId, imagemUrl, corManequim }.

Busca dados do produto no Firestore para pegar os preços reais.

Chama a função buildCatalogPrompt acima.

Envia para o Imagen 3 (ou Vertex AI) o prompt + a imagem original como referência.

Retorna a URL gerada.

Interface no Formulário (product-form.tsx):

Adicione o painel "Estúdio Virtual & Display".

Controles: Select de Cor do Manequim.

Botão: "✨ Gerar Imagem de Catálogo".

Preview: Mostre a imagem gerada.

Ações de Salvamento:

"Salvar como Principal" (Atualiza a foto do produto).

"Salvar para Display" (Salva em uma subcoleção display_assets ou marca metadata na imagem).

Ação Esperada:
O sistema deve gerar uma imagem onde, se o produto tiver desconto, a etiqueta mostre o preço antigo riscado. Se não tiver, mostra o preço normal limpo. Essa imagem será usada na TV da loja.