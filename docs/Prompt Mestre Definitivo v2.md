🚀 Prompt Mestre Definitivo (VTO) - Gemini 2.5 Flash Image
Este documento contém o prompt completo, otimizado para a API Gemini 2.5 Flash Image, com foco em fidelidade inalterável da pessoa (PRIORIDADE 1), integração fotorrealista de produtos (PRIORIDADE 2) e lógica modular de enquadramento/pose para o "Gerar Novo Look".
Última Versão
Versão: 2.0 (Final VTO Modular) Data de Compilação: 17 de Novembro de 2025
________________________________________
I. Estrutura de Entrada
O prompt é enviado junto com as imagens na seguinte ordem fixa:
1.	IMAGEM_PESSOA (primeira imagem)
o	Função: Fonte única e inalterável de todas as características faciais, corporais e proporções da pessoa.
2.	IMAGEM_PRODUTO_1, IMAGEM_PRODUTO_2, IMAGEM_PRODUTO_3
o	Função: Produtos selecionados para integração (Máximo 3).
o	Categorias Suportadas: Roupas, Calçados, Acessórios, Bolsas, Óculos, Joias, Relógios, Perfumes, Cosméticos, Tintura (Cabelo), Outros.
________________________________________
II. Prompt Mestre Completo (Para Inserção na API)
⚠️ INSTRUÇÃO CRÍTICA ABSOLUTA E IMPLACÁVEL: COMPOSIÇÃO "VIRTUAL TRY-ON" COM FIDELIDADE EXTREMA E REALISMO FOTOGRÁFICO INALTERÁVEL.

META: Gerar uma FOTOGRAFIA PROFISSIONAL ULTRA-REALISTA da pessoa da IMAGEM_PESSOA que é ABSOLUTAMENTE A MESMA PESSOA (100% IDÊNTICA, RECONHECÍVEL E ORIGINAL), integrando de forma IMPECÁVEL, FOTORREALISTA E NATURAL ATÉ O MÁXIMO DE 3 PRODUTOS. O resultado final DEVE parecer uma FOTO REAL, não gerada.

A IMAGEM_PESSOA É UMA LEI DE FIDELIDADE INEGOCIÁVEL. QUALQUER INTEGRAÇÃO DE PRODUTO QUE COMPROMETA A IDENTIDADE VISUAL DA PESSOA SERÁ CONSIDERADA UMA FALHA CRÍTICA.

🎯 PRIORIZAÇÃO ABSOLUTA E INEGOCIÁVEL (ORDEM DE PRIORIDADE CRÍTICA E INALTERÁVEL):

    PRIORIDADE 1 - IDENTIDADE INALTERÁVEL E SAGRADA DA PESSOA (MÁXIMA PRIORIDADE ABSOLUTA. NADA PODE COMPROMETER ISSO):
    * A IMAGEM_PESSOA (primeira imagem) é o DNA VISUAL INTOCÁVEL. TODAS as características do ROSTO e do CORPO devem ser preservadas com 100% DE FIDELIDADE EXATA E UM PARA UM.
    * A semelhança da pessoa DEVE ser IMUTÁVEL, INSTANTANEAMENTE RECONHECÍVEL e PRESERVADA ACIMA DE QUALQUER OUTRA INSTRUÇÃO, PRODUTO OU CENÁRIO.
    * REPLICAÇÃO DE TEMPLATE DNA: A IA DEVE REPLICAR O PONTO DE VISTA, A ANGULAÇÃO E A PERSPECTIVA DA CÂMERA da IMAGEM_PESSOA, adaptando a pose e o enquadramento SOMENTE se permitido pela "REGRA DE POSTURA CONDICIONAL" e pela "Regra Mestra de Enquadramento".

    PRIORIDADE 2 - FIDELIDADE ABSOLUTA DOS PRODUTOS E INTEGRAÇÃO FÍSICA E NATURAL:
    * APÓS GARANTIR A PRIORIDADE 1, priorizar a fidelidade EXATA E REPLICADA de CADA PRODUTO/OBJETO (Máximo 3 produtos).

1. PRESERVAÇÃO MÁXIMA E ABSOLUTA DA SEMELHANÇA DA PESSOA (Lei Inegociável - PRIORIDADE 1 - CRÍTICO ANTI-ARTIFICIALIDADE):

    * ROSTO - PRESERVAÇÃO INTEGRAL COM REFINAMENTO ESTÉTICO MÍNIMO:
        * MAQUIAGEM/COSMÉTICOS (Condicionalidade de Preservação): A maquiagem ou cosméticos **originais** da IMAGEM_PESSOA devem ser preservados e mantidos **IDÊNTICOS**, A MENOS QUE um produto da categoria 'COSMÉTICOS' seja fornecido na lista de produtos.

    * CORPO - MÁXIMA FIDELIDADE E PROPORÇÕES FÍSICAS INALTERADAS: Manter o tipo físico, estrutura óssea, musculatura e PROPORÇÕES CORPORAIS EXATAMENTE E SEM NENHUMA ALTERAÇÃO.
        * REFORÇO DE FOCO: Para garantir a P1, a IA DEVE **IGNORAR O CONTEÚDO ESTRUTURAL DO FUNDO/CENÁRIO** da IMAGEM_PESSOA ao analisar a semelhança.
        * **⚠️ REGRA DE POSTURA CONDICIONAL (GERAR NOVO LOOK):**
            * **POSTURA PRESERVADA (Padrão):** A postura da IMAGEM_PESSOA DEVE ser preservada, com ajustes gentis apenas para integrar Calçados ou Relógios.
            * **MUDANÇA DE POSE (SE 'GERAR NOVO LOOK' Ativado):** SE a instrução explícita de "GERAR NOVO LOOK" for fornecida (via prompt de texto), a IA **PODE MUDAR A POSE DA PESSOA COMPLETAMENTE** (postura e ângulo corporal) mantendo a P1 (proporções físicas inalteradas) e a P2 (visibilidade dos produtos). A nova pose DEVE ser natural, fotorrealista e otimizar a exibição de todos os produtos selecionados e o novo enquadramento.

    * CABELO - APLICAÇÃO NATURAL DE TINTURA E APRIMORAMENTO (Condicionalidade e Substituição):
        * SE um produto de tintura de cabelo for fornecido: A cor do cabelo original DEVE ser **SUBSTITUÍDA** pela cor identificada do produto de tintura. O resultado final DEVE ser o de um cabelo REALMENTE TINGIDO, não uma sobreposição digital.
        * SE NENHUM produto de tintura de cabelo for fornecido: Preservar a cor EXATA, textura IDÊNTICA, volume e estilo **IDÊNTICOS** aos da IMAGEM_PESSOA.

2. INTEGRAÇÃO INTELIGENTE E NATURAL DE PRODUTOS E VESTUÁRIO (PRIORIDADE 2 - FIDELIDADE E REALISMO IMPLACÁVEL DO PRODUTO):

    * A IA DEVE ANALISAR CADA IMAGEM_PRODUTO_X (Máximo 3) para inferir sua categoria.

    * SUBSTITUIÇÃO DE VESTUÁRIO: Se um produto da categoria 'ROUPA' for fornecido: A roupa original DEVE ser **INTEIRAMENTE SUBSTITUÍDA**. O caimento fotorrealista e físico do tecido **(Caimento, Forma, Cor, Tamanho, Proporção)** DEVE ser meticulosamente replicado.

    * Outros Acessórios/Itens (Adição e Substituição Condicional):
        * SE a categoria for JOIAS, RELÓGIOS ou ÓCULOS: A composição fotográfica DEVE priorizar um CLOSE-UP, **A MENOS QUE** a Regra Mestra de Enquadramento (Seção 3) exija um Cenário de Contexto.
        * SE a categoria for COSMÉTICOS: O produto fornecido deve ser aplicado na pessoa com **MÁXIMA FIDELIDADE TÉCNICA** e aplicação SUAVE, NATURAL E FOTORREALISTA, **SUBSTITUINDO** a maquiagem original.

3. CENÁRIO E ILUMINAÇÃO DINÂMICOS (Adaptação Contextual e Coesa):

    **⚠️ REGRA MESTRA DE ENQUADRAMENTO (PRIORIDADE CRÍTICA DE CENA):**
    * O ENQUADRAMENTO FINAL DA CENA DEVE SER SEMPRE DINÂMICO E DETERMINADO PELOS PRODUTOS SELECIONADOS.
    * **CENÁRIO DE DETALHE (Close-up/Plano Médio):** SE a lista de produtos for composta **EXCLUSIVAMENTE** por itens que exigem close-up (Óculos, Joias, Relógios, Cosméticos, Tintura (Cabelo), Perfumes) E o número total de produtos for 1 ou 2, o enquadramento DEVE se aproximar para focar no detalhe e realce.
    * **CENÁRIO DE CONTEXTO (Corpo Inteiro/Plano Americano):** SE a lista de produtos incluir qualquer item de GRANDE VOLUME (Roupas, Calçados, Bolsas), OU o número de produtos for 3, o enquadramento DEVE se afastar para garantir que TODOS os itens sejam exibidos de forma COESA.

    * **MUDANÇA DE AMBIENTE:** O cenário e a iluminação DEVEM ser AUTOMATICAMENTE ADAPTADOS para complementar o look. **MUDANÇAS SUTIS NO AMBIENTE** (ex: alteração de objetos de fundo, cor da parede, luz ambiente) são permitidas para criar uma sensação de "Novo Look" ao lado da nova pose.

4. QUALIDADE FOTOGRÁFICA PROFISSIONAL (ULTRA-REALISTA E SEM ARTIFICIALIDADE DE IA):

    * Estilo: Fotografia de moda ou lifestyle.
    * Iluminação: Natural ou de estúdio, cinematográfica, REFLITANDO O CENÁRIO ADAPTADO E COM SOMBRAS/REFLEXOS FISICAMENTE CORRETOS.
    * Resolução: Ultra alta definição 8K.
    * Foco/Profundidade de Campo: Foco nítido na pessoa e no(s) produto(s), com um fundo suavemente desfocado (bokeh ÓPTICO E REALISTA).

RESULTADO ESPERADO FINAL (CRÍTICO): Uma FOTOGRAFIA PROFISSIONAL ULTRA-REALISTA onde a pessoa é 100% IDÊNTICA (P1), todos os produtos fornecidos são FIÉIS (P2) e a cena completa é COESA, FOTORREALISTA E TOTALMENTE LIVRE DE QUALQUER INDÍCIO DE GERAÇÃO POR INTELIGÊNCIA ARTIFICIAL.

