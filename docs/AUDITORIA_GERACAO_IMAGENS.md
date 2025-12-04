# AUDITORIA COMPLETA: GERAÇÃO DE IMAGENS - APP MODELO-2

**Data de Criação:** 28 de Novembro de 2025  
**Versão:** 1.0  
**Última Atualização:** 28 de Novembro de 2025

---

## 📋 ÍNDICE

1. [Visão Geral](#visão-geral)
2. [Endpoints de Geração](#endpoints-de-geração)
3. [Arquitetura e Serviços](#arquitetura-e-serviços)
4. [Prompts e Instruções](#prompts-e-instruções)
5. [Lógica de Cenários (PHASE 26)](#lógica-de-cenários-phase-26)
6. [Preservação de Identidade](#preservação-de-identidade)
7. [Configurações de API](#configurações-de-api)
8. [Fluxos de Processamento](#fluxos-de-processamento)
9. [Regras e Validações](#regras-e-validações)
10. [Códigos e Localizações](#códigos-e-localizações)

---

## 1. VISÃO GERAL

### 1.1 Sistema de Geração de Imagens

O sistema de geração de imagens do App Modelo-2 utiliza **Google Gemini 2.5 Flash Image** como serviço principal para criar composições de Virtual Try-On (VTO) com alta fidelidade.

### 1.2 Princípios Fundamentais

1. **FOTO ORIGINAL OBRIGATÓRIA**: Sempre usar a foto original do upload (`personImageUrl`) como primeira imagem
2. **PRESERVAÇÃO DE IDENTIDADE**: Rosto, corpo e características físicas devem ser preservados 100%
3. **PROPORÇÃO 9:16**: Todas as imagens geradas devem ser verticais (mobile first)
4. **CENÁRIOS DO FIRESTORE**: Buscar cenários automaticamente baseado em tags de produtos
5. **REALISMO FOTOGRÁFICO**: Iluminação, sombras e integração devem ser fotorrealistas
6. **PROIBIÇÃO DE CENÁRIOS NOTURNOS**: Sempre usar ambientes diurnos com luz natural

### 1.3 Look Type Forçado

**IMPORTANTE**: Todos os looks são forçados para `"creative"` (Gemini Flash Image). O Look Natural foi desabilitado para garantir consistência.

```typescript
// Localização: src/lib/ai-services/composition-orchestrator.ts (linha ~133)
const lookType = "creative"; // FORÇAR creative para todos os looks
```

---

## 2. ENDPOINTS DE GERAÇÃO

### 2.1 `/api/lojista/composicoes/generate`

**Método:** POST  
**Localização:** `src/app/api/lojista/composicoes/generate/route.ts`

**Função:** Endpoint principal para geração de composições completas.

**Fluxo:**
1. Recebe `personImageUrl` (foto original), `productIds`, `lojistaId`
2. Busca produtos do Firestore
3. Busca cenário do Firestore baseado em tags (PHASE 26)
4. Chama `CompositionOrchestrator.createComposition()`
5. Retorna `compositionId` e URLs das imagens geradas

**Parâmetros Principais:**
```typescript
{
  personImageUrl: string;      // Foto original (obrigatória)
  productIds: string[];        // IDs dos produtos
  lojistaId: string;           // ID do lojista
  customerId?: string;         // ID do cliente (opcional)
  options?: {
    lookType?: "creative";    // Sempre "creative" (forçado)
    quality?: "high" | "medium" | "low";
    skipWatermark?: boolean;
  }
}
```

### 2.2 `/api/internal/process-job`

**Método:** POST  
**Localização:** `src/app/api/internal/process-job/route.ts`

**Função:** Processa jobs de geração em background (via cron job).

**Fluxo:**
1. Busca job pendente do Firestore
2. Extrai dados do job (`personImageUrl`, `productIds`, etc.)
3. Busca produtos e cenários do Firestore
4. Chama `CompositionOrchestrator.createComposition()`
5. Salva resultado no Firestore

**Características:**
- Processa jobs assíncronos
- Converte base64 para Firebase Storage antes de salvar
- Sanitiza dados antes de salvar no Firestore

### 2.3 `/api/refine-tryon`

**Método:** POST  
**Localização:** `src/app/api/refine-tryon/route.ts`

**Função:** Adiciona acessórios a uma composição já gerada (edição incremental).

**Fluxo:**
1. Recebe `baseImageUrl` (look completo anterior)
2. Recebe `newProductUrls` (1-2 novos produtos)
3. Chama Gemini Flash Image com prompt de refinamento
4. Retorna imagem refinada

**Parâmetros:**
```typescript
{
  baseImageUrl: string;        // Imagem base (look anterior)
  newProductUrls: string[];    // 1-2 novos produtos
  lojistaId: string;
  customerId?: string;
  compositionId?: string;       // ID da composição original
}
```

**Prompt Especial:** Usa `REFINEMENT_PROMPT` (preservação total da imagem base)

### 2.4 `/api/ai/generate`

**Método:** POST  
**Localização:** `src/app/api/ai/generate/route.ts`

**Função:** Geração direta usando prompt mestre VTO.

**Fluxo:**
1. Recebe `userImageUrl` e `productImageUrls`
2. Gera prompt usando `generateImagenPrompt()`
3. Chama Gemini Flash Image diretamente
4. Retorna imagem gerada

**Características:**
- Usa prompt mestre do `gemini-prompt.ts`
- Proporção 9:16 forçada
- Negative prompt para cenários noturnos

---

## 3. ARQUITETURA E SERVIÇOS

### 3.1 CompositionOrchestrator

**Localização:** `src/lib/ai-services/composition-orchestrator.ts`

**Classe Principal:** `CompositionOrchestrator`

**Método Principal:** `createComposition(params: CreateCompositionParams)`

**Serviços Utilizados:**
- `geminiFlashImageService`: Gemini 2.5 Flash Image (principal)
- `watermarkService`: Aplicação de watermark
- `vertexService`: Vertex Try-On (desabilitado)
- `stabilityService`: Stability.ai (desabilitado)

**Fluxo Interno:**
1. Valida `personImageUrl` (foto original)
2. Constrói array de imagens: `[fotoOriginal, ...produtos, cenario?]`
3. Constrói prompt completo com todas as regras
4. Chama Gemini Flash Image com `aspectRatio: "9:16"`
5. Aplica watermark (se não skipado)
6. Retorna resultado

### 3.2 ScenarioMatcher

**Localização:** `src/lib/scenarioMatcher.ts`

**Função:** Busca cenários do Firestore baseado em tags de produtos.

**Estratégia de Matching:**
1. **Estratégia 1**: Busca por tags (keywords do produto vs tags do cenário)
2. **Estratégia 2**: Fallback por categoria mapeada (primeiro produto)
3. **Estratégia 3**: Fallback final (cenário aleatório de todos os ativos)

**Cache:**
- Cache em memória (5 minutos TTL)
- Singleton pattern
- Carrega todos os cenários ativos do Firestore

**Função Principal:**
```typescript
findScenarioByProductTags(products: any[]): Promise<{
  imageUrl: string;
  lightingPrompt: string;
  category: string;
} | null>
```

**REFINAMENTO VISUAL:** Usa **APENAS o primeiro produto** para matching.

### 3.3 Gemini Flash Image Service

**Localização:** `src/lib/ai-services/gemini-flash-image.ts`

**Função:** Wrapper para API Gemini 2.5 Flash Image.

**Configurações:**
- `aspectRatio`: Sempre `"9:16"` (forçado)
- `temperature`: 0.4 (normal) ou 0.75 (remix)
- `negativePrompt`: Inclui termos de preservação de identidade e proibição de cenários noturnos

---

## 4. PROMPTS E INSTRUÇÕES

### 4.1 Prompt Mestre VTO

**Localização:** `src/lib/ai/gemini-prompt.ts`

**Template:** `MASTER_PROMPT_TEMPLATE`

**Estrutura:**

#### 4.1.1 Bloco de Preservação de Identidade (Início)
```
⚠️⚠️⚠️ IDENTITY LOCK: The input person's face, body shape, skin tone, and pose MUST BE PRESERVED EXACTLY.
- Do NOT generate a new model.
- Do NOT change ethnicity or age.
- Imagine you are dressing THIS specific person.
- If the face is visible in the input, the output face must match 100%.
- Maintain exact facial features, bone structure, and body proportions.
- Preserve all unique physical characteristics (scars, freckles, body shape, etc.).
```

#### 4.1.2 Bloco de Realismo Fotográfico
```
📸 PHOTOREALISM RULES:
- LIGHTING MATCH: Analyze the light source in the background scenario. Apply exactly the same lighting direction, temperature, and intensity to the person and clothes.
- SHADOWS: Cast realistic soft shadows on the floor/ground based on the scene's light. The person must look grounded, not floating.
- CLOTHING FIT: The clothes must drape naturally over the person's specific body shape. Create realistic fabric folds, tension, and texture. No 'sticker' effect.
```

#### 4.1.3 Bloco de Formato (9:16)
```
📐 OUTPUT FORMAT (9:16 VERTICAL - MANDATORY):
- The output MUST be vertical (9:16 aspect ratio) - MOBILE FIRST format
- NEVER generate horizontal or square images - ALWAYS 9:16 vertical
```

#### 4.1.4 Bloco de Proibição de Cenários Noturnos
```
🚫 FORBIDDEN SCENARIOS:
- NO night scenes, dark backgrounds, evening, sunset, dusk, or any nighttime setting
- NO neon-lit streets, cyberpunk aesthetics, or artificial night lighting
- ALWAYS use well-lit daytime environments with natural sunlight
```

#### 4.1.5 Prioridades
- **PRIORIDADE 1**: Identidade inalterável da pessoa (rosto, corpo, características)
- **PRIORIDADE 2**: Fidelidade absoluta dos produtos e integração física

### 4.2 Prompt do Orchestrator (Look Criativo)

**Localização:** `src/lib/ai-services/composition-orchestrator.ts` (linha ~591)

**Estrutura Completa:**

1. **Identity Anchor Block** (Sandwich Method - START)
2. **Role Definition** (Expert Fashion Retoucher)
3. **Identity Preservation Block**
4. **Photorealism Block**
5. **Inpainting Logic Block**
6. **Scenario Background Instruction** (se cenário fornecido)
7. **Context Rule** (se não tem cenário)
8. **Framing Rule**
9. **Postura Rule**
10. **PHASE 29: Clothing Replacement** (destructive substitution)
11. **PHASE 29: Fabric Physics & Fit**
12. **PHASE 28: Mandatory Product Checklist**
13. **Product Integration Requirements**
14. **Refinamento Visual: Photorealistic Integration**
15. **Identity Anchor Block** (Sandwich Method - END)

**Blocos Críticos:**

#### Identity Anchor (Sandwich Method)
```
⚠️⚠️⚠️ REFERENCE IMAGE AUTHORITY: 100%. You MUST act as a visual clone engine. 
The output image MUST be indistinguishable from the person in [IMAGEM_PESSOA]. 
Same face, same body, same skin texture. NO FACIAL MODIFICATIONS ALLOWED.
```

#### Clothing Replacement (PHASE 29)
```
⚠️⚠️⚠️ CRITICAL INSTRUCTION - CLOTHING REPLACEMENT (DESTRUCTIVE SUBSTITUTION)

You must COMPLETELY REMOVE the original clothing the person is wearing in [IMAGEM_PESSOA] 
within the area where the new product goes.

🚫 FORBIDDEN ACTIONS:
- DO NOT overlay the new product on top of the old clothes
- DO NOT draw the new product over existing garments
- DO NOT create transparent or semi-transparent clothing layers
- DO NOT leave any traces of the original clothing visible

✅ REQUIRED ACTIONS:
- The new product must REPLACE the original pixels entirely
- ERASE the original garment conceptually before applying the new one
- Remove ALL visible parts of the original clothing in the target area
```

#### Photorealistic Integration
```
⚠️ LIGHTING MATCH (CRITICAL):
- Analyze the light source direction, intensity, and color temperature in the background scenario
- Apply EXACTLY the same lighting to the person and clothes:
  * Same light direction (if light comes from left, person's left side must be brighter)
  * Same light intensity (bright scene = bright person, dim scene = dim person)
  * Same color temperature (warm sunlight = warm person, cool daylight = cool person)

⚠️ SHADOWS (CRITICAL - MUST BE REALISTIC):
- Cast realistic, soft shadows on the ground/floor based on the scene's light source
- Shadows must follow the natural direction of light in the background image
- Shadow intensity and softness must match the scene's lighting conditions
- The person's shadow must connect naturally to their feet - NO floating effect
- Shadow color must match the ground surface
```

### 4.3 Prompt de Refinamento

**Localização:** `src/app/api/refine-tryon/route.ts` (linha ~94)

**Template:** `REFINEMENT_PROMPT`

**Características:**
- Preservação total da `IMAGEM_BASE`
- Integração natural de novos produtos
- Manutenção de cenário e iluminação existentes
- Proporção 9:16 obrigatória

---

## 5. LÓGICA DE CENÁRIOS (PHASE 26)

### 5.1 Estrutura de Dados no Firestore

**Collection:** `scenarios`

**Documento:**
```typescript
{
  id: string;                    // Auto-ID
  imageUrl: string;             // Firebase Storage URL
  fileName: string;              // "praia_01.jpg"
  category: string;              // 'beach' | 'urban' | 'social' | 'fitness' | 'party' | 'winter'
  lightingPrompt: string;        // "Sunny day, hard shadows..."
  tags: string[];                // ["tenis", "bones", "roupas esportivas"]
  active: boolean;               // true/false
}
```

### 5.2 Processo de Matching

**Localização:** `src/lib/scenarioMatcher.ts`

**Função:** `findScenarioByProductTags(products: any[])`

**Passos:**

1. **Carregar Cache**: Carrega todos os cenários ativos do Firestore (cache 5min)

2. **Extrair Keywords do Primeiro Produto**:
   - Nome do produto → palavras individuais
   - Categoria → palavras individuais
   - Descrição → palavras individuais
   - Normalização: lowercase, remoção de duplicatas

3. **Estratégia 1 - Matching por Tags**:
   - Busca cenários onde `tags` array contém qualquer keyword do produto
   - Match parcial: `tag.includes(keyword) || keyword.includes(tag)`
   - Se encontrar: escolhe aleatório entre matches

4. **Estratégia 2 - Fallback por Categoria**:
   - Mapeia categoria do produto para categoria de cenário:
     - `calçados/tênis` → `urban`
     - `biquini/praia` → `beach`
     - `fitness/academia` → `fitness`
     - etc.
   - Busca cenários da categoria mapeada
   - Se encontrar: escolhe aleatório

5. **Estratégia 3 - Fallback Final**:
   - Se não encontrar por tags nem categoria: sorteia aleatório de TODOS os cenários ativos
   - Nunca retorna `null` (sempre usa um cenário)

### 5.3 Mapeamento de Categorias

**Localização:** `src/lib/scenarioMatcher.ts` (linha ~167)

```typescript
const categoryMap: Record<string, string> = {
  'calçados': 'urban',
  'calcados': 'urban',
  'tênis': 'urban',
  'tenis': 'urban',
  'sneaker': 'urban',
  'sneakers': 'urban',
  'bota': 'winter',
  'botas': 'winter',
  'praia': 'beach',
  'biquini': 'beach',
  'maio': 'beach',
  'sunga': 'beach',
  'fitness': 'fitness',
  'academia': 'fitness',
  'yoga': 'fitness',
  'treino': 'fitness',
  'festa': 'party',
  'balada': 'party',
  'gala': 'party',
  'noite': 'party',
  'inverno': 'winter',
  'frio': 'winter',
  'social': 'social',
  'formal': 'social',
  'trabalho': 'social',
  'executivo': 'social',
  'natureza': 'nature',
  'campo': 'nature',
  'urbano': 'urban',
  'streetwear': 'urban',
};
```

### 5.4 Uso do Cenário no Orchestrator

**Quando Cenário é Fornecido:**
- `scenarioImageUrl` é adicionado como **última imagem** no array
- Ordem: `[fotoOriginal, ...produtos, cenario]`
- Prompt inclui instrução: "Use [IMAGEM_CENARIO] EXATAMENTE como está"
- `smartContext` fica vazio (não gera cenário via prompt)

**Quando Cenário NÃO é Fornecido:**
- `smartContext` é usado para gerar cenário via prompt
- Exemplos: "Clean Studio", "Urban Street", "Beach with palm trees"

---

## 6. PRESERVAÇÃO DE IDENTIDADE

### 6.1 Regras Críticas

1. **FOTO ORIGINAL OBRIGATÓRIA**:
   - Sempre usar `personImageUrl` (foto original do upload)
   - Primeira imagem no array: `[fotoOriginal, ...produtos, cenario?]`
   - Validação: deve ser HTTP URL ou data URL

2. **IDENTITY LOCK**:
   - Rosto: 100% idêntico (features, bone structure, skin tone)
   - Corpo: proporções exatas, estrutura óssea, musculatura
   - Características únicas: cicatrizes, sardas, formato do corpo

3. **SANDWICH METHOD**:
   - Identity Anchor no início do prompt
   - Identity Anchor no final do prompt
   - Reforço constante de preservação

4. **NEGATIVE PROMPTS**:
   - `(different face:2.0)`
   - `(different person:2.0)`
   - `(face changed:2.0)`
   - `(altered facial features:2.0)`
   - `(different body shape:2.0)`
   - `(face swap:2.0)`

### 6.2 Validações no Código

**Localização:** `src/lib/ai-services/composition-orchestrator.ts` (linha ~151)

```typescript
// REFINAMENTO VISUAL: Validar que personImageUrl foi fornecida (FOTO ORIGINAL OBRIGATÓRIA)
if (!params.personImageUrl) {
  throw new Error(`❌ personImageUrl é OBRIGATÓRIA - deve ser a foto original do upload`);
}

// Converter data URL para HTTP se necessário
let finalPersonImageUrl = params.personImageUrl;
if (finalPersonImageUrl.startsWith("data:image/")) {
  console.warn("[Orchestrator] ⚠️ personImageUrl é data URL - pode causar problemas.");
}

// Usar finalPersonImageUrl como primeira imagem
const imageUrls = [
  finalPersonImageUrl, // Primeira imagem: FOTO ORIGINAL (Source of Truth)
  ...allProductImageUrls,
];
```

---

## 7. CONFIGURAÇÕES DE API

### 7.1 Gemini 2.5 Flash Image

**Localização:** `src/lib/ai-services/gemini-flash-image.ts`

**Configurações Fixas:**
```typescript
{
  aspectRatio: "9:16",           // SEMPRE vertical (mobile first)
  temperature: 0.4,              // Normal: 0.4, Remix: 0.75
  negativePrompt: "...",         // Inclui preservação de identidade e proibição de cenários noturnos
}
```

**Parâmetros da API:**
- `prompt`: Prompt completo construído pelo orchestrator
- `imageUrls`: Array de imagens `[fotoOriginal, ...produtos, cenario?]`
- `negativePrompt`: Termos proibidos (identidade, cenários noturnos, etc.)

### 7.2 Negative Prompts

**Base:**
```
(deformed, distorted, disfigured:1.3), poorly drawn, bad anatomy, wrong anatomy, 
extra limb, missing limb, floating limbs, (mutated hands and fingers:1.4), 
disconnected limbs, mutation, mutated, ugly, blurry, amputation, (head cut off:1.5), 
text, watermark, bad composition, duplicate, (original clothes visible:1.6), 
(two layers of clothing:1.6), (multiple outfits:1.6), (old outfit:1.4), 
(no shadows:1.8), (person without shadow:1.8), (floating person:1.6), 
(unrealistic lighting:1.5), (flat lighting:1.5), (no depth:1.4), 
(sitting:1.5), (seated:1.5), (chair:1.5), (bench:1.5), (kneeling:1.5), 
(mannequin body:2.0), (plastic skin:2.0), (rigid clothing:1.8), 
(stiff pose:1.8), (neck stand:2.0), (ghost mannequin:2.0), 
(artificial pose:1.6), (artificial body shape:1.6), 
(wrong proportions:1.5), (mismatched body:1.5), 
(back view:1.8), (person facing away:1.8), (back turned:1.8), (rear view:1.8), 
(different face:2.0), (different person:2.0), (face changed:2.0), 
(altered facial features:2.0), (different eye color:2.0), 
(different nose shape:2.0), (different mouth shape:2.0), 
(different face shape:2.0), (different skin tone:2.0), 
(different body shape:2.0), (different body proportions:2.0), 
(altered body:2.0), (face swap:2.0), (different person's face:2.0), 
(face replacement:2.0), (cgi face:1.5), (filter:1.5), 
(smooth skin:1.5), (instagram face:1.5)
```

**Adicionais (por contexto):**
- **Calçados**: `(feet cut off:1.8), (cropped legs:1.6), (legs cut off:1.6)`
- **Beach sem sapatos**: `(boots:2.0), (shoes:1.5), (sneakers:1.5)`
- **Óculos**: `(glasses on floor:2.0), (glasses in hand:2.0)`
- **Cenários proibidos**: `(${forbiddenScenario}:2.0)`
- **Virtual Try-On**: `(double clothing:2.0), (multiple shirts:2.0), (clothing overlap:2.0), (ghosting:2.0), (visible original clothes:2.0), (bad fit:2.0), (floating clothes:2.0), (sticker effect:2.0)`
- **Cenários noturnos**: `(night scene:2.5), (dark background:2.5), (evening:2.5), (sunset:2.5), (dusk:2.5), (nighttime:2.5), (neon lights:2.5), (cyberpunk:2.5), (artificial night lighting:2.5), (night street:2.5), (dark alley:2.5), (nightclub:2.5), (bad shadows:2.0), (wrong lighting:2.0), (floating person:2.0), (no shadows:2.0), (unnatural shadows:2.0)`

---

## 8. FLUXOS DE PROCESSAMENTO

### 8.1 Fluxo Principal (Generate)

```
1. Cliente → POST /api/lojista/composicoes/generate
   ├─ Recebe: personImageUrl, productIds, lojistaId
   ├─ Valida: personImageUrl obrigatória
   └─ Converte data URL para HTTP (se necessário)

2. Buscar Produtos
   ├─ Firestore: lojas/{lojistaId}/produtos/{productId}
   ├─ Extrair: nome, categoria, imagemUrl, productUrl
   └─ Validar: pelo menos 1 produto com imagem

3. Buscar Cenário (PHASE 26)
   ├─ findScenarioByProductTags(products)
   ├─ Estratégia 1: Matching por tags
   ├─ Estratégia 2: Fallback por categoria
   └─ Estratégia 3: Fallback aleatório

4. Calcular Smart Context (se não tem cenário)
   ├─ getSmartScenario(products, isRemix)
   ├─ Usa APENAS primeiro produto
   └─ Retorna: context, forbidden

5. Orchestrator.createComposition()
   ├─ Validar personImageUrl
   ├─ Construir array: [fotoOriginal, ...produtos, cenario?]
   ├─ Construir prompt completo
   ├─ Chamar Gemini Flash Image
   │  ├─ aspectRatio: "9:16"
   │  ├─ temperature: 0.4 (normal) ou 0.75 (remix)
   │  └─ negativePrompt: termos completos
   ├─ Aplicar watermark (se não skipado)
   └─ Retornar: compositionId, tryonImageUrl, sceneImageUrls

6. Salvar no Firestore
   ├─ Collection: lojas/{lojistaId}/composicoes/{compositionId}
   └─ Dados: imagemUrl, productIds, status, cost, etc.

7. Retornar ao Cliente
   └─ { compositionId, status: "processing" | "completed" }
```

### 8.2 Fluxo de Process Job (Background)

```
1. Cron Job → POST /api/triggers/process-pending-jobs
   └─ Busca jobs pendentes do Firestore

2. Para cada job:
   ├─ POST /api/internal/process-job
   ├─ Extrair: personImageUrl, productIds, options
   ├─ Buscar produtos do Firestore
   ├─ Buscar cenário (PHASE 26)
   ├─ Orchestrator.createComposition()
   ├─ Converter base64 → Firebase Storage (se necessário)
   ├─ Sanitizar dados (remover undefined)
   └─ Salvar resultado no Firestore
```

### 8.3 Fluxo de Refinamento

```
1. Cliente → POST /api/refine-tryon
   ├─ Recebe: baseImageUrl, newProductUrls (1-2)
   └─ Valida: baseImageUrl obrigatória, 1-2 produtos

2. Construir array de imagens
   ├─ [baseImageUrl, ...newProductUrls]
   └─ baseImageUrl = IMAGEM_BASE (look completo anterior)

3. Chamar Gemini Flash Image
   ├─ prompt: REFINEMENT_PROMPT
   ├─ aspectRatio: "9:16"
   └─ negativePrompt: cenários noturnos, etc.

4. Salvar no Storage (se base64)
   └─ Converter para HTTP URL

5. Criar nova composição no Firestore
   ├─ Collection: composicoes
   └─ Flag: isRefined: true

6. Retornar ao Cliente
   └─ { refinedImageUrl, compositionId, cost }
```

---

## 9. REGRAS E VALIDAÇÕES

### 9.1 Regras Obrigatórias

1. **FOTO ORIGINAL**: `personImageUrl` é obrigatória e deve ser HTTP URL ou data URL
2. **PRODUTOS**: Pelo menos 1 produto com imagem válida
3. **PROPORÇÃO**: Sempre `9:16` (vertical)
4. **IDENTIDADE**: Rosto e corpo devem ser preservados 100%
5. **CENÁRIOS**: Sempre diurnos (proibição de noturnos)
6. **SOMBRAS**: Devem ser realistas e conectadas aos pés

### 9.2 Validações de Entrada

**Generate Endpoint:**
```typescript
if (!personImageUrl || !lojistaId || (productIds.length === 0 && !productUrl)) {
  return error("Parâmetros obrigatórios: foto, lojistaId e (produtos OU productUrl)");
}
```

**Orchestrator:**
```typescript
if (!params.personImageUrl) {
  throw new Error(`❌ personImageUrl é OBRIGATÓRIA`);
}

if (allProductImageUrls.length === 0) {
  throw new Error("❌ Nenhuma imagem de produto fornecida");
}
```

**Refine Endpoint:**
```typescript
if (!baseImageUrl || typeof baseImageUrl !== 'string') {
  return error("baseImageUrl é obrigatório");
}

if (newProductUrls.length === 0 || newProductUrls.length > 2) {
  return error("newProductUrls deve conter entre 1 e 2 URLs");
}
```

### 9.3 Regras de Negócio

1. **PRIMEIRO PRODUTO**: Usado para determinar cenário (REFINAMENTO VISUAL)
2. **REMIX**: Não busca cenário do Firestore (força novo cenário)
3. **LOOK TYPE**: Sempre `"creative"` (Look Natural desabilitado)
4. **CENÁRIO**: Se fornecido, usa imagem; se não, gera via prompt
5. **WATERMARK**: Aplicado por padrão (pode ser skipado)

---

## 10. CÓDIGOS E LOCALIZAÇÕES

### 10.1 Arquivos Principais

| Arquivo | Localização | Função |
|---------|-------------|--------|
| `composition-orchestrator.ts` | `src/lib/ai-services/` | Orquestrador principal |
| `scenarioMatcher.ts` | `src/lib/scenarioMatcher.ts` | Matching de cenários |
| `gemini-flash-image.ts` | `src/lib/ai-services/` | Serviço Gemini Flash Image |
| `gemini-prompt.ts` | `src/lib/ai/` | Prompt mestre VTO |
| `generate/route.ts` | `src/app/api/lojista/composicoes/` | Endpoint principal |
| `process-job/route.ts` | `src/app/api/internal/` | Processamento background |
| `refine-tryon/route.ts` | `src/app/api/refine-tryon/` | Refinamento incremental |
| `ai/generate/route.ts` | `src/app/api/ai/` | Geração direta |

### 10.2 Estrutura de Dados

**CompositionResult:**
```typescript
{
  compositionId: string;
  tryonImageUrl: string;
  sceneImageUrls: string[];
  totalCost: number;
  processingTime: number;
  status: CompositionProcessingStatus;
}
```

**CreateCompositionParams:**
```typescript
{
  personImageUrl: string;        // OBRIGATÓRIA
  productId: string;
  productImageUrl: string;
  lojistaId: string;
  customerId?: string;
  productName?: string;
  productPrice?: string;
  storeName: string;
  logoUrl?: string;
  scenePrompts?: string[];
  options?: {
    skipWatermark?: boolean;
    quality?: "low" | "medium" | "high";
    lookType?: "creative";       // SEMPRE "creative"
    allProductImageUrls?: string[];
    productCategory?: string;
    gerarNovoLook?: boolean;
    smartContext?: string;
    smartFraming?: string;
    forbiddenScenarios?: string[];
    productsData?: any[];
    scenarioImageUrl?: string;   // PHASE 26
    scenarioLightingPrompt?: string;
    scenarioCategory?: string;
    scenarioInstructions?: string;
  };
}
```

### 10.3 Variáveis de Ambiente

```env
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
GOOGLE_APPLICATION_CREDENTIALS=...
```

### 10.4 Collections do Firestore

- `scenarios`: Cenários disponíveis (PHASE 26)
- `lojas/{lojistaId}/produtos`: Produtos do lojista
- `lojas/{lojistaId}/composicoes`: Composições geradas
- `composicoes`: Composições globais (refinamentos)

---

## 11. CHECKLIST DE AUDITORIA

### 11.1 Verificações de Código

- [x] Todos os endpoints usam foto original (`personImageUrl`)
- [x] Todos os endpoints buscam cenários do Firestore (PHASE 26)
- [x] Todos os endpoints usam proporção `9:16`
- [x] Todos os endpoints têm preservação de identidade nos prompts
- [x] Todos os endpoints proíbem cenários noturnos
- [x] Look Natural está desabilitado (forçado para `"creative"`)
- [x] ScenarioMatcher usa apenas primeiro produto para matching
- [x] Negative prompts incluem termos de preservação de identidade
- [x] Watermark é aplicado por padrão (pode ser skipado)

### 11.2 Verificações de Prompt

- [x] Identity Lock no início do prompt
- [x] Photorealism Rules incluídas
- [x] Inpainting Logic incluída
- [x] Output Format 9:16 reforçado
- [x] Forbidden Scenarios (noturnos) incluídos
- [x] Identity Anchor (Sandwich Method) no início e fim
- [x] Clothing Replacement (PHASE 29) incluído
- [x] Fabric Physics & Fit incluído
- [x] Mandatory Product Checklist incluído

### 11.3 Verificações de Fluxo

- [x] Generate endpoint busca cenários automaticamente
- [x] Process-job busca cenários automaticamente
- [x] Refine preserva imagem base completamente
- [x] Base64 é convertido para Storage antes de salvar
- [x] Dados são sanitizados antes de salvar no Firestore

---

## 12. NOTAS IMPORTANTES

### 12.1 REFINAMENTO VISUAL (Última Atualização)

- **FOTO ORIGINAL OBRIGATÓRIA**: Sempre usar `personImageUrl` como primeira imagem
- **PRIMEIRO PRODUTO**: Usado para determinar cenário (ignora produtos secundários)
- **LOOK TYPE FORÇADO**: Sempre `"creative"` (Look Natural desabilitado)
- **CENÁRIOS NOTURNOS**: Proibidos em todos os lugares
- **PROPORÇÃO 9:16**: Obrigatória em todos os caminhos

### 12.2 PHASE 26 (Cenários do Firestore)

- Cenários são buscados automaticamente baseado em tags
- Se não encontrar, usa fallback (categoria → aleatório)
- Cenário é adicionado como última imagem no array
- Se cenário fornecido, `smartContext` fica vazio

### 12.3 Preservação de Identidade

- Identity Anchor no início e fim do prompt (Sandwich Method)
- Negative prompts com peso 2.0 para alterações faciais/corporais
- Validação obrigatória de `personImageUrl`
- Logs indicam quando foto original está sendo usada

---

**FIM DA AUDITORIA**

*Documento gerado automaticamente - Última atualização: 28/11/2025*



