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
* **CENÁRIO:** Fundo que sugira o ambiente de uso, mas extremamente desfocado (bokeh suave).
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