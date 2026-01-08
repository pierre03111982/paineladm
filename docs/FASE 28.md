# PHASE 28: Implementação de Auto-Tagging e SEO Description com IA

**Contexto:**
Atualmente, o cadastro de produtos (`manual-product-form.tsx`) exige muito input manual. Já possuímos o `GeminiFlashImageService` integrado. O objetivo é usar o Gemini Vision para analisar a foto do produto no momento do upload e preencher automaticamente 80% dos campos, focando em SEO e na lógica de `Smart Scenarios`.

**Objetivos:**
1.  Ao fazer upload da foto no formulário, disparar análise via Gemini.
2.  Gerar **Título** e **Descrição SEO** (Copywriting persuasivo).
3.  Gerar **Tags Automáticas** que alimentem a lógica do `scenarioMatcher.ts`.
4.  Preencher **Categoria**, **Cor** e **Tecido** sugeridos.

---

## 1. Backend: Novo Serviço de Análise

**Arquivo Alvo:** `src/lib/ai-services/product-analyzer.ts` (Criar novo)
**Referência:** `src/lib/ai-services/gemini-flash-image.ts`

Crie uma função `analyzeProductImage(imageUrl: string)` que reutilize a configuração do Gemini Flash.

**Prompt do Sistema (System Instruction):**
"Você é um especialista em E-commerce de Moda e SEO. Analise a imagem fornecida e retorne APENAS um JSON (sem markdown) com a seguinte estrutura:
{
  'nome_sugerido': 'Título curto e comercial (ex: Vestido Longo Floral de Verão)',
  'descricao_seo': 'Descrição persuasiva de 2 parágrafos focada em venda, mencionando tecido, caimento e ocasião de uso. Use keywords relevantes.',
  'categoria_sugerida': 'Uma das categorias padrão (Vestidos, Calças, Blusas, Fitness, Praia, Acessórios)',
  'tags': ['array de strings com 5-8 tags. IMPORTANTE: Inclua tags de contexto como "praia", "inverno", "fitness", "festa", "casual" para ativar os cenários corretos'],
  'cor_predominante': 'Nome da cor principal',
  'tecido_estimado': 'Ex: Algodão, Linho, Poliéster, Seda',
  'detalhes': ['lista curta de features visuais, ex: decote em V, manga longa']
}"

**Requisitos:**
- Usar `response_mime_type: "application/json"` na config do Gemini para garantir integridade.
- Garantir que as `tags` incluam palavras-chave que ativem as regras do `src/lib/scenarioMatcher.ts` (ex: garantir que biquínis recebam a tag "praia" ou "swimwear").

---

## 2. Backend: API Route

**Arquivo Alvo:** `src/app/api/lojista/products/analyze/route.ts` (Criar novo)

- **Método:** `POST`
- **Body:** `{ imageUrl: string }`
- **Fluxo:**
  1. Validar autenticação do lojista.
  2. Chamar `analyzeProductImage`.
  3. Retornar o JSON estruturado.
- **Tratamento de Erro:** Se o Gemini falhar, retornar erro suave para que o front permita preenchimento manual.

---

## 3. Frontend: Integração no Formulário

**Arquivo Alvo:** `src/app/(lojista)/produtos/manual-product-form.tsx`

**Alterações:**
1.  Localizar a função de sucesso do upload da imagem (`handleImageUpload` ou similar).
2.  Adicionar um estado `isAnalyzing` (boolean) para mostrar feedback visual ("IA analisando produto...").
3.  Após o upload da imagem (quando tivermos a URL do Firebase), fazer chamada para `/api/lojista/products/analyze`.
4.  Ao receber o retorno:
    - Preencher automaticamente o campo `nome`.
    - Preencher o campo `descricao` (textarea).
    - Preencher o campo `categoria` (select).
    - Preencher o array de `tags` (Input de tags).
    - Preencher `detalhes` ou `obs` com as informações de tecido/cor.
5.  **UX:** Adicionar um botão "✨ Regenerar com IA" caso o usuário queira tentar outra descrição, e ícones mágicos (sparkles) nos campos preenchidos automaticamente.

---

## 4. Integração com Smart Scenarios (Crítico)

**Arquivo de Referência:** `src/lib/scenarioMatcher.ts` e `src/app/api/lojista/composicoes/generate/route.ts` (Lógica de `getSmartScenario`)

**Regra de Ouro:**
O prompt do Gemini no passo 1 deve ser instruído explicitamente a detectar os seguintes contextos para garantir que o `scenarioMatcher` funcione sem edição manual:
- Se for roupa de banho -> Tag "praia" ou "swimwear" (Ativa `Bikini Law`).
- Se for roupa de frio/couro -> Tag "inverno" ou "winter" (Ativa `Winter Rule`).
- Se for roupa de ginástica -> Tag "fitness" ou "gym" (Ativa `Gym Integrity`).
- Se for roupa social -> Tag "social" ou "office".

**Ação:** Implemente e teste se o upload de uma foto de biquíni gera automaticamente a tag "praia".

---

**Comando para o Cursor:**
"Analise a estrutura atual baseada nos arquivos citados acima. Implemente o serviço de backend primeiro, depois a rota da API, e por fim conecte ao formulário `manual-product-form.tsx`. Foque na qualidade do Prompt do Gemini para garantir descrições de alta conversão."
Por que este documento vai funcionar:

Contextualizado: Ele cita os arquivos exatos que o Cursor já leu na sua base de código (como gemini-flash-image.ts e manual-product-form.tsx ).
+1


Focado no Problema: Resolve especificamente a questão das Tags para os Cenários (scenarioMatcher ), garantindo que a "Regra do Biquíni" ou "Regra do Inverno"  funcionem automaticamente.
+1

JSON Mode: Instrui o uso de resposta JSON estruturada, o que evita erros de parsing no frontend.

UX Clara: Define exatamente onde o usuário vê o resultado (loading state, preenchimento automático).