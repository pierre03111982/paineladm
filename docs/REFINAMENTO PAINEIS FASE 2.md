Documento de Implementação 1: Edição Incremental de Look (Back-End e API)
🎯 Objetivo da Fase
Criar um novo endpoint que suporta a adição de 1 ou 2 acessórios a uma composição de Try-On já gerada. O foco técnico é na otimização do Prompt de Refinamento para a API Gemini 2.5 Flash Image para garantir que a pessoa e a roupa de base permaneçam inalteradas, resolvendo problemas de distorção.

📝 Prompt de Requisito para o Cursor AI
CONTEXTO DO PROJETO: Sistema SaaS "EXPERIMENTE AI". O Back-End é a camada de comunicação com a API Google Gemini 2.5 Flash Image (Vertex AI, Image-to-Image).

REQUISITO: Implementar o Back-End para o recurso "Edição Incremental de Look" (Refinamento).

PASSOS DE IMPLEMENTAÇÃO (Back-End/API):

Criar Novo Endpoint: Crie um novo endpoint HTTP POST: /api/refine-tryon.

Estrutura de Entrada (Payload): O endpoint deve receber no corpo da requisição (JSON):

baseImageUrl: URL da imagem da composição anterior (o look gerado que será refinado).

newProductUrls: Um array contendo 1 ou 2 URLs de imagens de produtos (acessórios, joias, maquiagem, tintura de cabelo). Restrição: Não permitir mais que 2 URLs.

userId: ID do usuário e storeId: ID da loja (para rastreio e custos).

Lógica da Chamada à API Gemini (CRÍTICA):

O sistema deve enviar a IMAGEM_BASE (baseImageUrl) como a PRIMEIRA IMAGEM de entrada.

As IMAGENS_DE_PRODUTO_NOVO (newProductUrls) devem ser enviadas sequencialmente após a imagem base.

O sistema deve utilizar o PROMPT MESTRE DE EDIÇÃO (Anexado abaixo) para guiar a IA, priorizando a estabilidade do look existente.

Cálculo de Custo e Log:

Implemente a lógica para calcular o custo desta operação. Sugestão: Este refinamento consome um custo reduzido (Ex: 50% do custo de uma geração completa), registrando-o no log de custos.

Resposta: Retornar a URL da nova imagem gerada pela IA e o custo reduzido associado.

PROMPT MESTRE DE EDIÇÃO (Para Inserção na API):

Plaintext

INSTRUÇÃO CRÍTICA ABSOLUTA: EDIÇÃO INCREMENTAL DE ACESSÓRIOS.
META: Receber a IMAGEM_BASE (primeira imagem: contém a pessoa e o look completo) e adicionar de forma fotorrealista e natural o(s) PRODUTO(S)_NOVO(S) (imagens subsequentes).
🎯 PRIORIZAÇÃO ABSOLUTA E INEGOCIÁVEL (P0): ESTABILIDADE MÁXIMA.

A IMAGEM_BASE (pessoa, roupa, pose, caimento, cenário, iluminação) é o TEMPLATE FINAL INTOCÁVEL. A IA NÃO TEM PERMISSÃO para alterar a identidade da pessoa, nem a roupa, caimento, proporção de estampa ou fundo já presentes.

A única mudança permitida é a INTEGRAÇÃO FÍSICA E NATURAL do(s) PRODUTO(S)_NOVO(S) (Prioridade 1 - P1).

REGRAS:

PRESERVAR IDENTIDADE: A pessoa na IMAGEM_BASE deve ser 100% IDÊNTICA.

PRESERVAR LOOK: O vestuário, caimento e estampa na IMAGEM_BASE devem ser 100% IDÊNTICOS.

FIDELIDADE DO PRODUTO NOVO: O(s) produto(s) novo(s) deve(m) ser integrados com realismo fotorrealista, correta iluminação e sombras.

QUALIDADE: Fotografia profissional ultra-realista 8K.

Próxima Etapa: Após a implementação desta API, o próximo passo será o Documento 3 (Alterações de Interface - Front-End/UX) para integrar as duas novas funcionalidades ao seu Painel ADM e App Cliente