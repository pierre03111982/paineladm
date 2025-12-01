# 📋 RELATÓRIO DE AUDITORIA: LÓGICA DE GERAÇÃO DE IMAGENS

**Data:** 28 de Novembro de 2025  
**Versão do Sistema:** Phase 15 V2 + Phase 14 + Phase 13  
**Status:** ✅ ATIVO E IMPLEMENTADO

---

## 1. ESTRUTURA DO PROMPT (Prompt Structure)

### 1.1. Arquitetura Base

**Localização:** `src/lib/ai-services/composition-orchestrator.ts` (linhas 301-387)

**Estrutura Hierárquica:**

```
⚠️ INSTRUÇÃO CRÍTICA ABSOLUTA
├── Context Rule (smartContext)
├── Framing Rule (smartFraming)
├── Postura Rule (gerarNovoLook)
├── META (objetivo principal)
├── PRIORIZAÇÃO (P1: Identidade, P2: Produtos)
├── PRESERVAÇÃO DA SEMELHANÇA (rosto, corpo, cabelo)
├── INTEGRAÇÃO DE PRODUTOS (substituição/adição)
├── CENÁRIO E ILUMINAÇÃO (regra mestra de enquadramento)
└── QUALIDADE FOTOGRÁFICA (sombras realistas, 8K, bokeh)
```

### 1.2. Componentes do Prompt

#### **Base Prompt (Creative Mode)**
- **Tipo:** Look Criativo (Gemini 2.5 Flash Image)
- **Estrutura:** Prompt mestre definitivo v2.0 (Phase 14)
- **Versão:** 2.2 (Phase 14 - Master Fix Protocol)
- **Comprimento:** ~2.000 caracteres

#### **Modificadores Dinâmicos:**

1. **`categorySpecificPrompt`** (linha 201)
   - Base: `, ${smartFraming}`
   - **Se Full Body:** `, wide angle, camera low angle, feet fully visible, standing on floor, showing complete shoes, ground visible`
   - **Se Close-up:** `, focus on face and neck, high detail accessory, shallow depth of field`
   - **Se Medium:** `, detailed fabric texture, professional fashion photography, perfect fit`

2. **`contextRule`** (linha 204)
   - **Normal:** `⚠️ CRITICAL SCENE CONTEXT (MANDATORY): ${smartContext}. THE BACKGROUND MUST MATCH THIS EXACT CONTEXT. DO NOT USE ANY OTHER BACKGROUND.`
   - **Remix:** Incorpora `scenePrompts[0]` diretamente

3. **`framingRule`** (linha 202)
   - **Normal:** `FORCE CONTEXT: ${smartFraming.toUpperCase()}.`
   - **Remix:** `⚠️ CRITICAL: DRAMATIC SCENE AND POSE CHANGE REQUIRED...`

4. **`posturaRule`** (linhas 247-249)
   - **Se `gerarNovoLook = true`:** Permite mudança completa de pose
   - **Se `gerarNovoLook = false`:** Preserva postura original

### 1.3. Instruções de Sombras Realistas (Phase 16)

**Localização:** `composition-orchestrator.ts` (linhas 377-383)

```
⚠️ SOMBRAS REALISTAS OBRIGATÓRIAS (CRÍTICO):
- A pessoa DEVE projetar sombras NATURAIS E FISICAMENTE CORRETAS
- Sombras suaves, graduais, bordas difusas (soft shadows)
- Intensidade e direção correspondem à iluminação do ambiente
- Ausência de sombras = imagem artificial (CRÍTICO)
- Sombras seguem forma e postura da pessoa
- Múltiplas fontes de luz = sombras múltiplas sobrepostas
```

---

## 2. SMART FRAMING (Enquadramento Inteligente)

### 2.1. Lógica de Detecção

**Localização:** `src/app/api/lojista/composicoes/generate/route.ts` (linhas 729-764)

**Ordem de Prioridade:**

1. **Calçados (Prioridade Máxima)**
   - **Trigger:** Categoria contém: `calçado|calcado|sapato|tênis|tenis|shoe|footwear`
   - **Resultado:** `smartFraming = "Full body shot, feet fully visible, standing on floor"`
   - **`productCategoryForPrompt`:** `"Calçados"`
   - **Log:** `🦶 PHASE 14 Smart Framing: CALÇADOS detectado - FORÇANDO full body shot`

2. **Acessórios (Prioridade Média)**
   - **Trigger:** TODAS as categorias são: `acessório|acessorio|óculos|oculos|joia|relógio|relogio|glasses|jewelry` E não há calçados
   - **Resultado:** `smartFraming = "close-up portrait, focus on face and neck"`
   - **`productCategoryForPrompt`:** `"Acessórios/Óculos/Joias"`
   - **Log:** `👓 PHASE 14 Smart Framing: ACESSÓRIOS detectado - Forçando portrait shot`

3. **Roupas (Padrão)**
   - **Trigger:** Qualquer outra categoria
   - **Resultado:** `smartFraming = "medium-full shot, detailed fabric texture"`
   - **`productCategoryForPrompt`:** `"Roupas"`
   - **Log:** `👕 PHASE 14 Smart Framing: ROUPAS detectado - Usando shot médio`

### 2.2. Aplicação no Prompt

**Localização:** `composition-orchestrator.ts` (linhas 229-238)

- **Full Body:** Adiciona `, wide angle, camera low angle, feet fully visible, standing on floor, showing complete shoes, ground visible`
- **Close-up:** Adiciona `, focus on face and neck, high detail accessory, shallow depth of field`
- **Medium:** Adiciona `, detailed fabric texture, professional fashion photography, perfect fit`

---

## 3. CONTEXT/BACKGROUND (Cenário e Fundo)

### 3.1. Smart Context Engine (Phase 15 V2)

**Localização:** `src/app/api/lojista/composicoes/generate/route.ts` (linhas 564-711)

**Função:** `getSmartScenario(products: any[], isRemix: boolean)`

**Retorno:** `{ context: string; forbidden: string[] }`

### 3.2. Regras de Resolução de Conflitos (Veto Logic)

#### **REGRA 0: INVERNO/COURO (Prioridade ABSOLUTA - Verificada PRIMEIRO)**

**Trigger:** `hasWinter` (detecta: `couro|leather|casaco|sobretudo|bota|cachecol|inverno|winter|coat|pérola|veludo|lã|wool|woollen|boot`)

**Cenários:**
- `"Autumn city street with falling leaves, urban environment, natural lighting, photorealistic"`
- `"Cozy indoor fireplace setting with warm lighting, comfortable atmosphere, elegant interior"`
- `"Cloudy urban skyline with modern architecture, professional photography, sophisticated setting"`
- `"Modern concrete structure with architectural design, minimalist and contemporary, natural light"`

**Forbidden:**
```javascript
[
  "Tropical Beach", "Beach", "Pool", "Swimming pool", "Sunny summer park",
  "Ocean", "Sand", "Palm trees", "Summer", "Hot weather",
  "Beach resort", "Seaside", "Tropical", "Paradise beach", "Sunny beach", "Beach scene"
]
```

**Log:** `🧥 PHASE 15 V2: INVERNO/COURO detectado (PRIORIDADE) - PROIBINDO PRAIA`

---

#### **REGRA 1: GYM INTEGRITY (STRICT - Requer UNANIMIDADE)**

**Trigger:** `hasSport && !hasNonSport`

**Condição:** TODOS os produtos devem ser esportivos. Se houver UM produto não-esportivo (ex: Vestido), Gym é BANIDO.

**Detecção:**
- **Sport:** `legging|fitness|academia|tênis esportivo|tênis|sneaker|short corrida|dry fit|sport|atividade física`
- **Non-Sport:** `vestido|dress|jeans|alfaiataria|blazer|camisa|saia|skirt|salto|heels|terno|suit|formal`

**Cenários:**
- `"Modern bright gym with mirrors, professional equipment, high-end atmosphere, clean and spacious"`
- `"Outdoor running track in a park with natural lighting, urban environment, professional photography"`
- `"Yoga studio with wood floor, soft natural light, minimalist and peaceful atmosphere"`
- `"Urban concrete stairs for street workout, modern city setting, dynamic lighting"`

**Forbidden:**
```javascript
["Bedroom", "Luxury Lobby", "Beach (sand)", "Formal Event", "Restaurant"]
```

**Log:** `💪 PHASE 15 V2: FITNESS/SPORT (UNANIMIDADE) - Gym permitido`

**Exemplo de Veto:**
- ✅ `Sneakers + Legging` → Gym permitido
- ❌ `Sneakers + Dress` → Gym BANIDO (Fallback para Urban Street)

---

#### **REGRA 2: BEACH INTEGRITY (STRICT - Veto se houver inverno)**

**Trigger:** `hasBeach && !hasWinter`

**Condição:** Pelo menos um produto de praia E nenhum produto de inverno.

**Detecção:**
- **Beach:** `biqu|maiô|sunga|praia|beachwear|saída de praia|swimwear`
- **Winter:** `couro|leather|casaco|sobretudo|bota|cachecol|inverno|winter|coat|pérola|veludo|lã|wool|woollen|boot`

**Cenários:**
- `"Sunny tropical beach with turquoise water, white sand, clear blue sky, luxury resort atmosphere"`
- `"Luxury poolside resort with modern architecture, palm trees, golden hour lighting"`
- `"Wooden deck near ocean with sunset colors, elegant and sophisticated setting"`
- `"Golden hour sand dunes with soft natural lighting, minimalist and photorealistic"`

**Forbidden:**
```javascript
["Office", "City Street", "Snow", "Gym", "Shopping Mall", "Bedroom"]
```

**Log:** `🏖️ PHASE 15 V2: MODA PRAIA (SEM INVERNO) - Beach permitido`

**Exemplo de Veto:**
- ✅ `Bikini + Hat` → Beach permitido
- ❌ `Bikini + Leather Jacket` → Beach BANIDO (Fallback para Studio)

---

#### **REGRA 3: FORMAL DOMINANCE (Dominante - força contexto formal)**

**Trigger:** `hasFormal`

**Detecção:** `terno|blazer|social|alfaiataria|vestido longo|gravata|suit|formal|festa|gala|paetê|salto alto fino|clutch|vestido de festa|brilho`

**Cenários:**
- `"Modern corporate office with glass walls, minimalist architecture, professional lighting"`
- `"Luxury Hotel Lobby with elegant design, sophisticated atmosphere, premium materials"`
- `"High-end minimal apartment with contemporary furniture, clean lines, natural lighting"`
- `"Abstract architectural background with modern design, professional photography style"`

**Forbidden:**
```javascript
["Beach", "Gym", "Messy Room", "Forest", "Dirt road"]
```

**Log:** `👔 PHASE 15 V2: SOCIAL/FORMAL (DOMINANTE) - Formal forçado`

**Lógica:** Um item formal (ex: Terno) força contexto formal, mesmo se houver outros itens casuais.

---

#### **REGRA 4: FALLBACK (Safe Zone - para conflitos)**

**Trigger:** `(hasSport && hasNonSport) || (hasBeach && hasWinter)`

**Condição:** Conflito detectado (ex: Vestido + Tênis, Bikini + Casaco).

**Cenários (Neutros):**
- `"Sunny urban street with blurred city background, modern city atmosphere, natural lighting, professional photography"`
- `"Modern minimalist concrete studio with soft natural lighting, clean and contemporary"`
- `"Trendy coffee shop exterior with warm lighting, comfortable setting, contemporary design"`
- `"City park pathway with green spaces, natural lighting, relaxed atmosphere, professional style"`
- `"Brick wall loft with industrial style, modern and minimalist, soft natural light"`

**Forbidden:**
```javascript
["Gym", "Beach", "Swimming pool"]
```

**Log:** `🏙️ PHASE 15 V2: CONFLITO DETECTADO - Usando FALLBACK (Urban/Studio)`

**Exemplo:**
- `Dress + Sneakers` → Fallback (Urban Street/Studio)
- `Bikini + Boots` → Fallback (Studio)

---

#### **REGRA 5: CASUAL / STREET**

**Trigger:** `hasCasual` (se não houver conflito)

**Detecção:** `jeans|t-shirt|moletom|tênis casual|jaqueta jeans|casual|street`

**Cenários:**
- `"Busy urban street with blurred crowd, modern city atmosphere, natural lighting, professional photography"`
- `"Cozy Coffee Shop with warm lighting, comfortable setting, contemporary design"`
- `"Brick wall loft with industrial style, modern and minimalist, soft natural light"`
- `"Casual city park with green spaces, natural lighting, relaxed atmosphere, professional style"`

**Forbidden:**
```javascript
["Gym", "Swimming pool", "Formal wedding"]
```

**Log:** `👕 PHASE 15 V2: CASUAL/STREET detectado`

---

#### **REGRA 6: LINGERIE / SLEEP**

**Trigger:** `pijama|lingerie|robe|camisola|sleep|nightwear`

**Cenários:**
- `"Cozy bright bedroom with white sheets, soft morning light, minimalist and elegant"`
- `"Minimalist bathroom with marble, clean design, natural lighting, sophisticated atmosphere"`
- `"Soft morning light window with elegant interior, comfortable setting, professional photography"`

**Forbidden:**
```javascript
["Street", "Office", "Gym", "Public places", "Crowd"]
```

**Log:** `🛏️ PHASE 15 V2: LINGERIE/SLEEP detectado`

---

#### **REGRA 7: CALÇADOS (Geral - apenas se não houver conflito)**

**Trigger:** `sandália|rasteirinha|sapatilha|calçado|shoe|footwear` (sem conflitos)

**Cenários:**
- `"Paved street surface with clean background, professional photography, natural lighting"`
- `"Wooden floor with elegant interior, minimalist setting, soft natural light"`
- `"Tiled clean floor with modern design, professional photography, sophisticated atmosphere"`

**Forbidden:**
```javascript
["Mud", "Grass (hiding the shoe)", "Water"]
```

**Log:** `👠 PHASE 15 V2: CALÇADOS detectado`

---

#### **DEFAULT: Clean Studio**

**Fallback Final:** `"Clean professional studio background with soft lighting"`

**Log:** `🎬 PHASE 15 V2: DEFAULT (Clean Studio) - Nenhuma regra específica aplicada`

---

### 3.3. Aplicação do Context no Prompt

**Localização:** `composition-orchestrator.ts` (linha 204)

```typescript
let contextRule = `⚠️ CRITICAL SCENE CONTEXT (MANDATORY): ${smartContext}. THE BACKGROUND MUST MATCH THIS EXACT CONTEXT. DO NOT USE ANY OTHER BACKGROUND.`;
```

**Remix Mode:** Substitui `contextRule` pelo `scenePrompts[0]` completo (linha 212)

---

### 3.4. Forbidden Scenarios no Negative Prompt

**Localização:** `composition-orchestrator.ts` (linhas 269-292)

**Aplicação:**
```typescript
const forbiddenPrompt = forbiddenScenarios.length > 0
  ? `, ${forbiddenScenarios.map(s => `(${s}:2.0)`).join(", ")}` // Peso 2.0
  : "";
```

**Reforço Adicional (Praia/Piscina):**
```typescript
const additionalForbiddenReinforcement = hasBeachForbidden
  ? `, (beach scene:2.5), (ocean background:2.5), (sand:2.5), (palm trees:2.5), (tropical:2.5), (summer beach:2.5), (swimming pool:2.5), (beach resort:2.5), (seaside:2.5), (paradise beach:2.5), (sunny beach:2.5)`
  : "";
```

**Peso:** 2.0 (forbiddenScenarios) / 2.5 (reforço praia)

---

## 4. SAFETY/QUALITY (Negative Prompt)

### 4.1. Base Negative Prompt

**Localização:** `composition-orchestrator.ts` (linha 259)

**String Completa:**
```
(deformed, distorted, disfigured:1.3), poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, (mutated hands and fingers:1.4), disconnected limbs, mutation, mutated, ugly, blurry, amputation, (head cut off:1.5), text, watermark, bad composition, duplicate, (original clothes visible:1.6), (two layers of clothing:1.6), (multiple outfits:1.6), (old outfit:1.4), (no shadows:1.8), (person without shadow:1.8), (floating person:1.6), (unrealistic lighting:1.5), (flat lighting:1.5), (no depth:1.4)
```

### 4.2. Reforço para Calçados

**Localização:** `composition-orchestrator.ts` (linhas 262-267)

**Se detectar calçados:**
```
${baseNegativePrompt}, (feet cut off:1.8), (cropped legs:1.6), (legs cut off:1.6), close up portrait, portrait shot, upper body only
```

**Se não detectar calçados:**
```
${baseNegativePrompt}, (feet cut off:1.5)
```

### 4.3. Forbidden Scenarios (Phase 15)

**Aplicação:** Adicionado ao negative prompt com peso 2.0 (linha 272)

**Exemplo:**
```
, (Beach:2.0), (Gym:2.0), (Swimming pool:2.0)
```

### 4.4. Negative Prompt Final

**Localização:** `composition-orchestrator.ts` (linha 284)

```typescript
const strongNegativePrompt = `${feetNegativePrompt}${forbiddenPrompt}${additionalForbiddenReinforcement}`;
```

**Estrutura:**
1. Base negative prompt (anatomia, qualidade, sombras)
2. Reforço para calçados (se aplicável)
3. Forbidden scenarios (peso 2.0)
4. Reforço adicional praia/piscina (peso 2.5, se aplicável)

---

## 5. MULTI-PRODUCT STRATEGY (Estratégia Multi-Produto)

### 5.1. Source of Truth (Phase 13)

**Localização:** `src/app/api/lojista/composicoes/generate/route.ts` (linhas 62-90)

**Regra:** Sempre usar `original_photo_url` se fornecido, senão `personImageUrl`.

**Código:**
```typescript
const originalPhotoUrl = body.original_photo_url || body.personImageUrl;
const finalPersonImageUrl = originalPhotoUrl;
```

**Log:** `PHASE 13: Source of Truth - Usando foto ORIGINAL`

**Comportamento:**
- Ignora `previous_image` ou `generated_image`
- Garante que sempre usa a foto original do usuário

---

### 5.2. Estrutura de Imagens (Look Criativo)

**Localização:** `composition-orchestrator.ts` (linhas 389-393)

**Array de Imagens:**
```typescript
const imageUrls = [
  params.personImageUrl,        // IMAGEM_PESSOA (primeira)
  ...allProductImageUrls,       // IMAGEM_PRODUTO_1, IMAGEM_PRODUTO_2, etc.
];
```

**Limite:** Máximo 3 produtos (conforme prompt mestre)

**Validação:**
- Pelo menos 1 imagem de produto obrigatória
- `personImageUrl` deve ser HTTP válida

---

### 5.3. Detecção de Produtos

**Localização:** `src/app/api/lojista/composicoes/generate/route.ts` (linhas 729-745)

**Coleta de Categorias:**
```typescript
const allCategories = productsData.map(p => (p?.categoria || "").toLowerCase());
```

**Detecção de Calçados:**
```typescript
const hasShoes = allCategories.some(cat => 
  cat.includes("calçado") || cat.includes("calcado") || 
  cat.includes("sapato") || cat.includes("tênis") || 
  cat.includes("tenis") || cat.includes("shoe") || 
  cat.includes("footwear")
);
```

**Detecção de Acessórios:**
```typescript
const hasOnlyAccessories = allCategories.length > 0 && 
  allCategories.every(cat => 
    cat.includes("acessório") || cat.includes("acessorio") ||
    cat.includes("óculos") || cat.includes("oculos") ||
    cat.includes("joia") || cat.includes("relógio") ||
    cat.includes("relogio") || cat.includes("glasses") ||
    cat.includes("jewelry")
  ) && !hasShoes;
```

---

### 5.4. Integração no Prompt

**Localização:** `composition-orchestrator.ts` (linha 319)

**Instrução:**
```
META: Gerar uma FOTOGRAFIA PROFISSIONAL ULTRA-REALISTA da pessoa da IMAGEM_PESSOA que é ABSOLUTAMENTE A MESMA PESSOA (100% IDÊNTICA, RECONHECÍVEL E ORIGINAL), integrando de forma IMPECÁVEL, FOTORREALISTA E NATURAL ATÉ O MÁXIMO DE 3 PRODUTOS.
```

**Priorização:**
1. **P1:** Identidade da pessoa (inalterável)
2. **P2:** Fidelidade dos produtos (máximo 3)

**Regra de Integração:**
- **Roupas:** Substituição completa da roupa original
- **Acessórios:** Adição (joias, óculos, relógios)
- **Calçados:** Integração física (caimento, proporção)
- **Cosméticos:** Substituição da maquiagem original
- **Tintura de Cabelo:** Substituição completa da cor do cabelo

---

### 5.5. Remix Strategy

**Localização:** `src/app/api/generate-looks/remix/route.ts` (linhas 175-214)

**Estratégia:**
1. Usa `original_photo_url` (foto original)
2. Mantém os mesmos produtos
3. Muda cenário e pose aleatoriamente
4. Gera `randomSeed` para variação

**Prompt de Remix:**
```typescript
const remixPrompt = `${subjectDescription} ${randomPose} wearing ${productPrompt}, harmonious outfit combination, ${randomScenario}. 

⚠️ CRITICAL REMIX INSTRUCTION: This is a REMIX generation. The scene MUST be DRAMATICALLY DIFFERENT from any previous generation. 
- BACKGROUND: Completely change the background to ${randomScenario}. The environment must be visually distinct and different.
- POSE: The person must be in a ${randomPose.toLowerCase()} position, which is DIFFERENT from the original photo's pose.
- LIGHTING: Adapt lighting to match the new scene (${randomScenario}).
- CAMERA ANGLE: Use a different camera angle or perspective to emphasize the new pose and scene.

Photorealistic, 8k, highly detailed, professional fashion photography, distinct visual style. The final image must look like a COMPLETELY NEW PHOTOSHOOT in a DIFFERENT LOCATION with a DIFFERENT POSE, while maintaining the person's exact identity and the products' fidelity.`;
```

**Flag:** `gerarNovoLook: true` (sempre ativo em remix)

---

## 6. RESUMO DE IMPLEMENTAÇÃO

### ✅ Regras Ativas

1. **Prompt Structure:** ✅ Implementado (Phase 14 v2.2)
2. **Smart Framing:** ✅ Implementado (Full Body / Close-up / Medium)
3. **Context/Background:** ✅ Implementado (Phase 15 V2 - 7 regras + fallback)
4. **Veto Logic:** ✅ Implementado (Gym, Beach, Winter com veto)
5. **Safety/Quality:** ✅ Implementado (Negative prompt com reforços)
6. **Multi-Product:** ✅ Implementado (até 3 produtos, source of truth)
7. **Sombras Realistas:** ✅ Implementado (Phase 16)

### 📊 Estatísticas

- **Total de Regras de Contexto:** 7 (+ 1 default)
- **Peso Máximo no Negative Prompt:** 2.5 (reforço praia)
- **Limite de Produtos:** 3
- **Temperatura (Remix):** 0.75
- **Temperatura (Normal):** 0.4

### 🔍 Pontos de Verificação

1. **Gym Veto:** ✅ Funciona (Vestido + Tênis → Fallback)
2. **Beach Veto:** ✅ Funciona (Bikini + Casaco → Fallback)
3. **Formal Dominance:** ✅ Funciona (Terno força contexto formal)
4. **Smart Framing:** ✅ Funciona (Calçados → Full Body)
5. **Forbidden Scenarios:** ✅ Aplicado no negative prompt (peso 2.0)
6. **Source of Truth:** ✅ Sempre usa `original_photo_url`

---

## 7. CONCLUSÃO

**Status Geral:** ✅ **TODAS AS REGRAS ESTÃO IMPLEMENTADAS E ATIVAS**

O sistema possui:
- ✅ Lógica de resolução de conflitos (Veto Logic)
- ✅ Smart Framing baseado em categoria
- ✅ Smart Context com 7 regras hierárquicas
- ✅ Negative prompt reforçado com forbidden scenarios
- ✅ Estratégia multi-produto com source of truth
- ✅ Instruções de sombras realistas
- ✅ Remix engine com variação de cenário/pose

**Nenhuma funcionalidade está faltando conforme os requisitos documentados.**

---

**Última Atualização:** 28 de Novembro de 2025  
**Próxima Revisão:** Após Phase 17 (PWA Icons) - Concluída ✅




