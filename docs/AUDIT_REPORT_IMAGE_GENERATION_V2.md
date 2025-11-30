# 📋 RELATÓRIO DE AUDITORIA: LÓGICA DE GERAÇÃO DE IMAGENS (V2)

**Data:** 28 de Novembro de 2025  
**Versão do Sistema:** Phase 22 (Maximum Similarity) + Phase 21 (Product Fidelity) + Phase 20 (Master Logic)  
**Status:** ✅ ATIVO E IMPLEMENTADO

---

## 1. ESTRUTURA DO PROMPT (Prompt Structure)

### 1.1. Arquitetura Base

**Localização:** `src/lib/ai-services/composition-orchestrator.ts` (linhas 366-497)

**Estrutura Hierárquica:**

```
⚠️⚠️⚠️ PRIORIDADE MÁXIMA ABSOLUTA - PRESERVAÇÃO 100% DA APARÊNCIA (FACE E CORPO)
├── ⚠️ INSTRUÇÃO CRÍTICA ABSOLUTA E IMPLACÁVEL
│   ├── Context Rule (smartContext) - MANDATORY
│   ├── Remix Pose Instructions (se remix)
│   ├── Framing Rule (smartFraming)
│   └── Postura Rule (gerarNovoLook)
├── META (objetivo principal)
├── ⚠️⚠️⚠️ CRITICAL FACE & BODY IDENTITY PRESERVATION RULE (PHASE 22)
│   ├── FACE PRESERVATION (100% IDENTICAL)
│   │   ├── EYES: Exact same shape, size, color, spacing, expression
│   │   ├── NOSE: Exact same shape, size, width, profile
│   │   ├── MOUTH: Exact same shape, size, lip thickness
│   │   ├── FACE SHAPE: Exact same facial structure, jawline, cheekbones
│   │   ├── SKIN: Exact same skin tone, texture, complexion
│   │   └── FACIAL FEATURES: Every detail preserved (eyebrows, eyelashes, moles, freckles)
│   └── BODY PRESERVATION (100% IDENTICAL)
│       ├── BODY SHAPE: Exact same body type, proportions, height, build
│       ├── BODY STRUCTURE: Exact same bone structure, muscle definition
│       ├── PROPORTIONS: Exact same body proportions
│       ├── SKIN TONE: Exact same skin tone and texture
│       └── PHYSICAL CHARACTERISTICS: All unique features preserved (tattoos, scars, etc.)
├── ⚠️ CRITICAL PRODUCT TRANSFER RULE (PHASE 21 - CLONE THE CLOTHES)
├── ⚠️ CRITICAL BODY STRUCTURE RULE (PHASE 21 - IGNORE MANNEQUIN BODY)
├── 🎯 PRIORIZAÇÃO ABSOLUTA E INEGOCIÁVEL
│   ├── PRIORIDADE 1: IDENTIDADE INALTERÁVEL E SAGRADA DA PESSOA
│   └── PRIORIDADE 2: FIDELIDADE ABSOLUTA DOS PRODUTOS
├── 1. PRESERVAÇÃO MÁXIMA E ABSOLUTA DA SEMELHANÇA DA PESSOA
│   ├── ROSTO - PRESERVAÇÃO INTEGRAL (100% IDÊNTICO)
│   ├── CORPO - MÁXIMA FIDELIDADE (100% IDÊNTICO)
│   └── CABELO - APLICAÇÃO NATURAL DE TINTURA
├── 2. INTEGRAÇÃO INTELIGENTE E NATURAL DE PRODUTOS E VESTUÁRIO
│   ├── PHASE 21: CLONE THE CLOTHES RULE
│   └── PHASE 21: IGNORE MANNEQUIN BODY RULE
├── 3. CENÁRIO E ILUMINAÇÃO DINÂMICOS
│   └── REGRA MESTRA DE ENQUADRAMENTO
└── 4. QUALIDADE FOTOGRÁFICA PROFISSIONAL
    ├── Sombras Realistas Obrigatórias
    ├── Resolução 8K
    └── Bokeh Óptico e Realista
```

### 1.2. Componentes do Prompt

#### **Base Prompt (Creative Mode)**
- **Tipo:** Look Criativo (Gemini 2.5 Flash Image)
- **Estrutura:** Prompt mestre definitivo v2.2 (Phase 14 + Phase 22)
- **Comprimento:** ~3.500 caracteres
- **Prioridade Máxima:** Preservação 100% da aparência (FACE E CORPO)

#### **Modificadores Dinâmicos:**

1. **`categorySpecificPrompt`** (linha 214)
   - Base: `, ${smartFraming}`
   - **Se Full Body:** `, wide angle, camera low angle, feet fully visible, standing on floor, showing complete shoes, ground visible`
   - **Se Close-up:** `, focus on face and neck, high detail accessory, shallow depth of field`
   - **Se Medium:** `, detailed fabric texture, professional fashion photography, perfect fit`

2. **`contextRule`** (linha 217)
   - **Normal:** `⚠️ CRITICAL SCENE CONTEXT (MANDATORY): ${smartContext}. THE BACKGROUND MUST MATCH THIS EXACT CONTEXT. DO NOT USE ANY OTHER BACKGROUND.`
   - **Remix:** Mantém `smartContext` do backend + adiciona instruções de pose do remix

3. **`framingRule`** (linha 215)
   - **Normal:** `FORCE CONTEXT: ${smartFraming.toUpperCase()}.`
   - **Remix:** `⚠️ CRITICAL: DRAMATIC SCENE AND POSE CHANGE REQUIRED...`

4. **`posturaRule`** (linhas 260-262)
   - **Se `gerarNovoLook = true`:** Permite mudança completa de pose (NUNCA sentada, ajoelhada ou em cadeira)
   - **Se `gerarNovoLook = false`:** Preserva postura original (ajustes gentis apenas para calçados/relógios)
   - **CRÍTICO:** A pessoa DEVE estar de FRENTE ou no MÁXIMO um pouco de lado (3/4 view). NUNCA de costas.

5. **`completeTheLookPrompt`** (PHASE 20 - linhas 269-273)
   - **Se `hasTop && !hasBottom`:** Adiciona ` wearing neutral blue denim jeans`
   - **Log:** `👖 PHASE 20: Complete the Look ativado - Adicionando jeans automático`

6. **`accessoryPrompt`** (PHASE 20 - linhas 286-290)
   - **Se `hasGlasses`:** Adiciona ` wearing sunglasses ON EYES, wearing glasses ON FACE`
   - **Log:** `👓 PHASE 20: Óculos detectado - Forçando no rosto`

7. **`beachFootwearPrompt`** (PHASE 21 - linhas 276-283)
   - **Se `hasBeach && !hasShoes`:** Adiciona ` barefoot or wearing simple flip-flops/sandals, NO boots, NO sneakers, NO closed shoes`
   - **Log:** `🏖️ PHASE 21 FIX: Roupas de banho detectadas - Forçando chinelo ou pés descalços`

### 1.3. Instruções de Sombras Realistas (Phase 16)

**Localização:** `composition-orchestrator.ts` (linhas 450-456)

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

**Localização:** `src/app/api/lojista/composicoes/generate/route.ts` (linhas 853-888)

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

**Localização:** `composition-orchestrator.ts` (linhas 241-250)

- **Full Body:** Adiciona `, wide angle, camera low angle, feet fully visible, standing on floor, showing complete shoes, ground visible`
- **Close-up:** Adiciona `, focus on face and neck, high detail accessory, shallow depth of field`
- **Medium:** Adiciona `, detailed fabric texture, professional fashion photography, perfect fit`

---

## 3. CONTEXT/BACKGROUND (Cenário e Fundo)

### 3.1. Smart Context Engine (Phase 20/21)

**Localização:** `src/app/api/lojista/composicoes/generate/route.ts` (linhas 564-822)

**Função:** `getSmartScenario(products: any[], isRemix: boolean)`

**Retorno:** `{ context: string; forbidden: string[] }`

**Total de Cenários:** 60 cenários de alta qualidade distribuídos em 6 categorias

### 3.2. Cenários Disponíveis (60 High-Quality Scenarios)

#### **Beach/Summer (15 cenários)**
- Sunny tropical beach with turquoise water and white sand
- Luxury wooden pool deck with lounge chairs, bright sunlight
- Golden hour sand dunes with soft shadows, warm lighting
- Tropical garden with palm trees and vibrant flowers
- Infinity pool overlooking the ocean at sunset
- Wooden pier extending into calm blue water
- Beach bar with thatched roof and tropical drinks
- Rocky coastline with crashing waves, dramatic sunlight
- Private yacht deck on open sea
- Hammock between two palm trees on a secluded beach
- Natural waterfall with crystal clear water and tropical vegetation
- Resort swimming pool with palm trees and blue water
- Tropical beach at sunset with warm golden light
- Modern infinity pool with ocean view
- Natural pool in a tropical forest

#### **Urban/Street (10 cenários)**
- Busy urban street with blurred crowd and city lights
- Modern minimalist concrete studio with soft shadows
- Trendy coffee shop exterior with brick walls and outdoor seating
- City park pathway with green trees and benches
- Industrial loft with exposed brick walls and large windows
- Graffiti art wall in a vibrant alleyway
- Rooftop terrace with city skyline view at dusk
- Subway station platform with modern architecture
- Skate park with concrete ramps and graffiti
- Neon-lit city street at night, cyberpunk aesthetic

#### **Formal/Social (10 cenários)**
- Modern corporate office with glass walls and city view
- Luxury Hotel Lobby with marble floors and chandeliers
- High-end minimalist apartment living room
- Abstract architectural background with clean lines
- Classic library with wooden shelves and leather chairs
- Conference room with sleek table and modern chairs
- Museum gallery with white walls and soft spotlighting
- Upscale restaurant interior with elegant table setting
- Modern co-working space with plants and natural light
- Executive private jet interior

#### **Party/Gala (10 cenários)**
- Red carpet event with bokeh lights and paparazzi flashes
- Elegant ballroom with crystal chandeliers and grand staircase
- Rooftop bar at night with sparkling city lights background
- Marble staircase in a luxury mansion
- Opera house foyer with velvet curtains and gold details
- Garden party at twilight with string lights
- Champagne bar with dim, romantic lighting
- VIP club lounge with neon accents and velvet sofas
- Wedding reception hall with floral arrangements
- Casino interior with vibrant lights and excitement

#### **Fitness/Sport (10 cenários)**
- Modern bright gym interior with mirrors and equipment
- Outdoor running track in a park with morning sun
- Yoga studio with wood floor, plants, and soft morning light
- Urban concrete stairs for street workout
- Tennis court with green surface and white lines
- Hiking trail in a forest with dappled sunlight
- Crossfit box with industrial look and weights
- Pilates studio with reformer machines and calm vibe
- Basketball court outdoor with chain-link fence
- Soccer field with green grass and stadium lights

#### **Winter/Cold (10 cenários)**
- Autumn city street with falling orange leaves
- Cozy indoor fireplace setting with rug and armchair
- Cloudy urban skyline with grey tones
- Snowy mountain landscape with pine trees
- Winter cabin porch with wood details and snow
- Foggy forest path with mysterious atmosphere
- Christmas market with festive lights and stalls
- Ski resort lodge with panoramic snow view
- Rainy city street with reflections on wet pavement
- Library reading nook with warm lamp light

### 3.3. Regras de Resolução de Conflitos (Veto Logic) - PHASE 20/21

#### **REGRA 0: INVERNO/COURO (Prioridade ABSOLUTA - Verificada PRIMEIRO)**

**Trigger:** `hasWinter` (detecta: `couro|leather|casaco|sobretudo|bota|cachecol|inverno|winter|coat|pérola|veludo|lã|wool|woollen|boot`)

**Cenários:** Seleciona aleatoriamente de `winterScenarios` (10 opções)

**Forbidden:**
```javascript
[
  "Tropical Beach", "Beach", "Pool", "Swimming pool", "Sunny summer park",
  "Ocean", "Sand", "Palm trees", "Summer", "Hot weather",
  "Beach resort", "Seaside", "Tropical", "Paradise beach", "Sunny beach", "Beach scene"
]
```

**Log:** `🧥 PHASE 21 FIX: INVERNO/COURO detectado (PRIORIDADE) - PROIBINDO PRAIA`

---

#### **REGRA 1: "BIKINI LAW" (STRICT - Prioridade ABSOLUTA após inverno)**

**Trigger:** `hasBeach` (detecta: `biqu|bikini|maiô|maio|sunga|praia|beachwear|saída de praia|swimwear|moda praia|banho|nado|piscina|swim|beach|biquini|biquíni`)

**Condição:** Se tem roupas de banho, SEMPRE usar cenário aquático (Beach/Pool/Cachoeira)

**Cenários:** Seleciona aleatoriamente de `beachScenarios` (15 opções)

**Forbidden:**
```javascript
[
  "Office", "City Street", "Snow", "Gym", "Shopping Mall", "Bedroom",
  "Urban", "Night", "Winter", "Indoor", "Corporate", "Formal",
  "Street", "City", "Urban street", "Busy street", "Neon-lit city",
  "Subway", "Skate park", "Coffee shop", "Rooftop terrace",
  "Fitness center", "Gym", "Academia", "Workout", "Exercise", "Training",
  "Modern fitness center", "Fitness", "Sport", "Athletic", "Running track",
  "Yoga studio", "Crossfit", "Basketball court", "Soccer field"
]
```

**Log:** `🏖️ PHASE 21 FIX: BIKINI LAW - MODA PRAIA detectado - FORÇANDO Beach/Pool/Cachoeira`

**Exemplo de Veto:**
- ✅ `Bikini` → Beach permitido (obrigatório)
- ❌ `Bikini + Gym` → Gym BANIDO (Beach forçado)

---

#### **REGRA 2: GYM INTEGRITY (STRICT - Requer UNANIMIDADE)**

**Trigger:** `hasSport && !hasNonSport && !hasBeach`

**Condição:** TODOS os produtos devem ser esportivos. Se houver UM produto não-esportivo (ex: Vestido), Gym é BANIDO. Se houver roupas de banho, NUNCA usar fitness.

**Detecção:**
- **Sport:** `legging|fitness|academia|tênis esportivo|tênis|sneaker|short corrida|dry fit|sport|atividade física|moda fitness|workout|gym|treino|esportivo`
- **Non-Sport:** `vestido|dress|jeans|alfaiataria|blazer|camisa|saia|skirt|salto|heels|terno|suit|formal`

**Cenários:** Seleciona aleatoriamente de `fitnessScenarios` (10 opções)

**Forbidden:**
```javascript
[
  "Bedroom", "Luxury Lobby", "Beach (sand)", "Formal Event", "Restaurant",
  "City Street", "Urban street", "Office", "Shopping Mall",
  "Beach", "Pool", "Swimming pool", "Ocean", "Tropical", "Resort"
]
```

**Log:** `💪 PHASE 21 FIX: FITNESS/SPORT (UNANIMIDADE) - Gym/Academia permitido`

**Exemplo de Veto:**
- ✅ `Sneakers + Legging` → Gym permitido
- ❌ `Sneakers + Dress` → Gym BANIDO (Fallback para Urban Street)
- ❌ `Bikini + Sneakers` → Gym BANIDO (Beach forçado pela Bikini Law)

---

#### **REGRA 3: PARTY/GALA (Prioridade sobre Formal)**

**Trigger:** `hasParty` (detecta: `festa|gala|paetê|salto alto fino|clutch|vestido de festa|brilho|noite|night|evening`)

**Cenários:** Seleciona aleatoriamente de `partyScenarios` (10 opções)

**Forbidden:**
```javascript
["Beach", "Gym", "Messy Room", "Forest", "Dirt road", "Office", "Daylight"]
```

**Log:** `🎉 PHASE 21 FIX: FESTA/GALA detectado - Party forçado`

---

#### **REGRA 4: FORMAL DOMINANCE (Dominante - força contexto formal)**

**Trigger:** `hasFormal` (detecta: `terno|blazer|social|alfaiataria|vestido longo|gravata|suit|formal|festa|gala|paetê|salto alto fino|clutch|vestido de festa|brilho`)

**Cenários:** Seleciona aleatoriamente de `formalScenarios` (10 opções)

**Forbidden:**
```javascript
["Beach", "Gym", "Messy Room", "Forest", "Dirt road"]
```

**Log:** `👔 PHASE 21 FIX: SOCIAL/FORMAL (DOMINANTE) - Formal forçado`

**Lógica:** Um item formal (ex: Terno) força contexto formal, mesmo se houver outros itens casuais.

---

#### **REGRA 5: FALLBACK (Safe Zone - para conflitos)**

**Trigger:** `(hasSport && hasNonSport) || (hasBeach && hasWinter)`

**Condição:** Conflito detectado (ex: Vestido + Tênis, Bikini + Casaco).

**Cenários:** Seleciona aleatoriamente de `urbanScenarios` (10 opções)

**Forbidden:**
```javascript
["Gym", "Beach", "Swimming pool"]
```

**Log:** `🏙️ PHASE 21 FIX: CONFLITO DETECTADO - Usando FALLBACK (Urban/Studio)`

**Exemplo:**
- `Dress + Sneakers` → Fallback (Urban Street/Studio)
- `Bikini + Boots` → Fallback (Studio) - **NOTA:** Na prática, Bikini Law força Beach, então este caso não ocorre

---

#### **REGRA 6: CASUAL / STREET (se não houver conflito)**

**Trigger:** `hasCasual` (detecta: `jeans|t-shirt|moletom|tênis casual|jaqueta jeans|casual|street`)

**Cenários:** Seleciona aleatoriamente de `urbanScenarios` (10 opções)

**Forbidden:**
```javascript
["Gym", "Swimming pool", "Formal wedding"]
```

**Log:** `👕 PHASE 21 FIX: CASUAL/STREET detectado`

---

#### **REGRA 7: LINGERIE / SLEEP**

**Trigger:** `pijama|lingerie|robe|camisola|sleep|nightwear`

**Cenários:**
- Cozy bright bedroom with white sheets, soft morning light
- Minimalist bathroom with marble, clean design
- Soft morning light window with elegant interior

**Forbidden:**
```javascript
["Street", "Office", "Gym", "Public places", "Crowd"]
```

**Log:** `🛏️ PHASE 21 FIX: LINGERIE/SLEEP detectado`

---

#### **REGRA 8: CALÇADOS (Geral - apenas se não houver conflito)**

**Trigger:** `sandália|rasteirinha|sapatilha|calçado|shoe|footwear` (sem conflitos)

**Cenários:**
- Paved street surface with clean background
- Wooden floor with elegant interior
- Tiled clean floor with modern design
- Modern minimalist concrete studio
- City park pathway with green trees

**Forbidden:**
```javascript
["Mud", "Grass (hiding the shoe)", "Water"]
```

**Log:** `👠 PHASE 21 FIX: CALÇADOS detectado`

---

#### **DEFAULT: Urban/Studio**

**Fallback Final:** Seleciona aleatoriamente de `urbanScenarios` (10 opções)

**Log:** `🎬 PHASE 21 FIX: DEFAULT (Urban/Studio) - Nenhuma regra específica aplicada`

---

### 3.4. Aplicação do Context no Prompt

**Localização:** `composition-orchestrator.ts` (linha 217)

```typescript
let contextRule = `⚠️ CRITICAL SCENE CONTEXT (MANDATORY): ${smartContext}. THE BACKGROUND MUST MATCH THIS EXACT CONTEXT. DO NOT USE ANY OTHER BACKGROUND.`;
```

**Remix Mode:** Mantém `smartContext` do backend + adiciona instruções de pose do remix (linha 224)

**PHASE 21 FIX:** SEMPRE usar `smartContext` do backend (não substituir por `scenePrompts`)

---

### 3.5. Forbidden Scenarios no Negative Prompt

**Localização:** `composition-orchestrator.ts` (linhas 324-346)

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

**Localização:** `composition-orchestrator.ts` (linha 299)

**String Completa (PHASE 22 atualizado):**
```
(deformed, distorted, disfigured:1.3), poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, (mutated hands and fingers:1.4), disconnected limbs, mutation, mutated, ugly, blurry, amputation, (head cut off:1.5), text, watermark, bad composition, duplicate, (original clothes visible:1.6), (two layers of clothing:1.6), (multiple outfits:1.6), (old outfit:1.4), (no shadows:1.8), (person without shadow:1.8), (floating person:1.6), (unrealistic lighting:1.5), (flat lighting:1.5), (no depth:1.4), (sitting:1.5), (seated:1.5), (chair:1.5), (bench:1.5), (kneeling:1.5), (mannequin body:1.8), (plastic skin:1.6), (artificial pose:1.6), (stiff pose:1.5), (artificial body shape:1.6), (wrong proportions:1.5), (mismatched body:1.5), (back view:1.8), (person facing away:1.8), (back turned:1.8), (rear view:1.8), (different face:2.0), (different person:2.0), (face changed:2.0), (altered facial features:2.0), (different eye color:2.0), (different nose shape:2.0), (different mouth shape:2.0), (different face shape:2.0), (different skin tone:2.0), (different body shape:2.0), (different body proportions:2.0), (altered body:2.0), (face swap:2.0), (different person's face:2.0), (face replacement:2.0)
```

### 4.2. Reforço para Calçados

**Localização:** `composition-orchestrator.ts` (linhas 302-307)

**Se detectar calçados:**
```
${baseNegativePrompt}, (feet cut off:1.8), (cropped legs:1.6), (legs cut off:1.6), close up portrait, portrait shot, upper body only
```

**Se não detectar calçados:**
```
${baseNegativePrompt}, (feet cut off:1.5)
```

### 4.3. Phantom Boots Fix (PHASE 20)

**Localização:** `composition-orchestrator.ts` (linhas 310-314)

**Se `isBeachContext && !hasShoes`:**
```
, (boots:2.0), (shoes:1.5), (sneakers:1.5)
```

**Log:** `🏖️ PHASE 20: Phantom Boots Fix - Beach sem sapatos, banindo boots/sneakers`

### 4.4. Glasses Placement Fix (PHASE 20)

**Localização:** `composition-orchestrator.ts` (linhas 317-321)

**Se `hasGlasses`:**
```
, (glasses on floor:2.0), (glasses in hand:2.0)
```

**Log:** `👓 PHASE 20: Glasses Placement Fix - Banindo óculos no chão/mão`

### 4.5. Forbidden Scenarios (Phase 15/20/21)

**Aplicação:** Adicionado ao negative prompt com peso 2.0 (linha 326)

**Exemplo:**
```
, (Beach:2.0), (Gym:2.0), (Swimming pool:2.0)
```

### 4.6. Negative Prompt Final

**Localização:** `composition-orchestrator.ts` (linha 338)

```typescript
const strongNegativePrompt = `${feetNegativePrompt}${phantomBootsNegative}${glassesNegative}${forbiddenPrompt}${additionalForbiddenReinforcement}`;
```

**Estrutura:**
1. Base negative prompt (anatomia, qualidade, sombras, mannequin, face/body preservation)
2. Reforço para calçados (se aplicável)
3. Phantom Boots Fix (se Beach sem sapatos)
4. Glasses Placement Fix (se óculos)
5. Forbidden scenarios (peso 2.0)
6. Reforço adicional praia/piscina (peso 2.5, se aplicável)

---

## 5. MULTI-PRODUCT STRATEGY (Estratégia Multi-Produto)

### 5.1. Source of Truth (Phase 13)

**Localização Frontend:** `src/app/api/generate-looks/route.ts` (linhas 62-90)

**Localização Backend:** `src/app/api/lojista/composicoes/generate/route.ts` (linhas 156-174)

**Regra:** Sempre usar `original_photo_url` se fornecido, senão `personImageUrl`.

**Código Frontend:**
```typescript
const originalPhotoUrl = body.original_photo_url || body.personImageUrl;
const finalPersonImageUrl = originalPhotoUrl;
```

**Código Backend:**
```typescript
const originalPhotoUrl = body.original_photo_url || body.personImageUrl;
personImageUrl = originalPhotoUrl; // PHASE 13: Sempre usar original_photo_url se fornecido
```

**Log:** `PHASE 13: Source of Truth - Usando foto ORIGINAL`

**Comportamento:**
- Ignora `previous_image` ou `generated_image`
- Garante que sempre usa a foto original do usuário
- Valida que não está usando uma imagem gerada anteriormente

---

### 5.2. Estrutura de Imagens (Look Criativo)

**Localização:** `composition-orchestrator.ts` (linhas 499-503)

**Array de Imagens:**
```typescript
const imageUrls = [
  params.personImageUrl,        // IMAGEM_PESSOA (primeira) - FOTO ORIGINAL
  ...allProductImageUrls,       // IMAGEM_PRODUTO_1, IMAGEM_PRODUTO_2, etc.
];
```

**Limite:** Máximo 3 produtos (conforme prompt mestre)

**Validação:**
- Pelo menos 1 imagem de produto obrigatória
- `personImageUrl` deve ser HTTP válida (ou blob/data convertida)

---

### 5.3. Detecção de Produtos

**Localização:** `src/app/api/lojista/composicoes/generate/route.ts` (linhas 853-888)

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

**Detecção para "Complete the Look" (PHASE 20):**
```typescript
const allText = productsData.map(p => `${p?.categoria || ""} ${p?.nome || ""}`).join(" ").toLowerCase();
const hasTop = allText.match(/camisa|blusa|blouse|shirt|top|jaqueta|jacket|moletom|hoodie/i);
const hasBottom = allText.match(/calça|pants|jeans|saia|skirt|shorts|vestido|dress/i);
```

---

### 5.4. Integração no Prompt

**Localização:** `composition-orchestrator.ts` (linha 377)

**Instrução:**
```
META: Gerar uma FOTOGRAFIA PROFISSIONAL ULTRA-REALISTA da pessoa da IMAGEM_PESSOA que é ABSOLUTAMENTE A MESMA PESSOA (100% IDÊNTICA, RECONHECÍVEL E ORIGINAL), integrando de forma IMPECÁVEL, FOTORREALISTA E NATURAL ATÉ O MÁXIMO DE 3 PRODUTOS${completeTheLookPrompt}${accessoryPrompt}${beachFootwearPrompt}.
```

**Priorização:**
1. **P1:** Identidade da pessoa (inalterável - 100% idêntica)
2. **P2:** Fidelidade dos produtos (máximo 3)

**Regra de Integração:**
- **Roupas:** Substituição completa da roupa original (CLONE THE CLOTHES)
- **Acessórios:** Adição (joias, óculos, relógios) - posicionamento correto
- **Calçados:** Integração física (caimento, proporção)
- **Cosméticos:** Substituição da maquiagem original
- **Tintura de Cabelo:** Substituição completa da cor do cabelo
- **"Complete the Look":** Se tem Top mas não tem Bottom, adiciona jeans automaticamente

---

### 5.5. Remix Strategy

**Localização:** `src/app/api/generate-looks/remix/route.ts` (linhas 236-256)

**Estratégia:**
1. Usa `original_photo_url` (foto original) - **CRÍTICO**
2. Mantém os mesmos produtos
3. Muda pose aleatoriamente (10 poses disponíveis, NUNCA sentada)
4. **PHASE 21 FIX:** NÃO gera cenário no frontend - deixa backend usar `getSmartScenario`
5. Gera `randomSeed` para variação
6. Flag `gerarNovoLook: true` sempre ativo

**Prompt de Remix:**
```typescript
const remixPrompt = `${subjectDescription} ${randomPose} wearing ${productPrompt}${beachFootwearPrompt}, harmonious outfit combination. 

⚠️ CRITICAL REMIX INSTRUCTION: This is a REMIX generation. The scene MUST be DRAMATICALLY DIFFERENT from any previous generation. 
- POSE: The person must be in a ${randomPose.toLowerCase()} position, which is DIFFERENT from the original photo's pose. ⚠️ CRITICAL: The person MUST face the camera or at MOST slightly to the side (3/4 view). NEVER from behind (back view). The face and frontal body MUST be visible.
- LIGHTING: Adapt lighting to match the new scene context.
- CAMERA ANGLE: Use a different camera angle or perspective to emphasize the new pose and scene.

Photorealistic, 8k, highly detailed, professional fashion photography, distinct visual style. The final image must look like a COMPLETELY NEW PHOTOSHOOT in a DIFFERENT LOCATION with a DIFFERENT POSE, while maintaining the person's exact identity and the products' fidelity.`;
```

**Payload:**
```typescript
{
  original_photo_url: finalPhotoUrl, // PHASE 14: Source of Truth
  personImageUrl: finalPhotoUrl,
  productIds: productIds,
  // PHASE 21 FIX: NÃO passar scenePrompts - deixar backend usar getSmartScenario
  options: {
    gerarNovoLook: true, // CRÍTICO: Sempre ativar no remix
    lookType: "creative",
    productCategory: hasShoes ? "Calçados" : undefined,
    seed: randomSeed,
  },
}
```

---

## 6. PRESERVAÇÃO DE SEMELHANÇA (PHASE 22)

### 6.1. Instruções de Preservação Facial

**Localização:** `composition-orchestrator.ts` (linhas 382-389)

**Regras:**
- **EYES:** Exact same shape, size, color, spacing, and expression. DO NOT change eye color, shape, or position.
- **NOSE:** Exact same shape, size, width, and profile. DO NOT alter nose structure.
- **MOUTH:** Exact same shape, size, lip thickness, and natural expression. DO NOT change lip shape or size.
- **FACE SHAPE:** Exact same facial structure, jawline, cheekbones, and overall face proportions. DO NOT modify face shape.
- **SKIN:** Exact same skin tone, texture, and complexion. DO NOT lighten, darken, or change skin color.
- **FACIAL FEATURES:** Every detail of the face (eyebrows, eyelashes, facial hair, moles, freckles) must be PRESERVED EXACTLY as in [IMAGEM_PESSOA].
- **EXPRESSION:** Maintain the natural expression from [IMAGEM_PESSOA] unless the pose requires a different expression, but keep it subtle and natural.

### 6.2. Instruções de Preservação Corporal

**Localização:** `composition-orchestrator.ts` (linhas 391-396)

**Regras:**
- **BODY SHAPE:** Exact same body type, proportions, height, and build. DO NOT change body shape or size.
- **BODY STRUCTURE:** Exact same bone structure, muscle definition, and physical characteristics. DO NOT alter body structure.
- **PROPORTIONS:** Exact same body proportions (shoulder width, waist, hips, limb length). DO NOT modify proportions.
- **SKIN TONE:** Exact same skin tone and texture on the entire body. DO NOT change body skin color.
- **PHYSICAL CHARACTERISTICS:** All unique physical features (tattoos, scars, birthmarks, etc.) must be PRESERVED if visible in [IMAGEM_PESSOA].

### 6.3. Negative Prompt para Preservação

**Localização:** `composition-orchestrator.ts` (linha 299)

**Termos Adicionados (PHASE 22):**
```
(different face:2.0), (different person:2.0), (face changed:2.0), (altered facial features:2.0), (different eye color:2.0), (different nose shape:2.0), (different mouth shape:2.0), (different face shape:2.0), (different skin tone:2.0), (different body shape:2.0), (different body proportions:2.0), (altered body:2.0), (face swap:2.0), (different person's face:2.0), (face replacement:2.0)
```

---

## 7. RESUMO DE IMPLEMENTAÇÃO

### ✅ Regras Ativas

1. **Prompt Structure:** ✅ Implementado (Phase 14 v2.2 + Phase 22)
2. **Smart Framing:** ✅ Implementado (Full Body / Close-up / Medium)
3. **Context/Background:** ✅ Implementado (Phase 20/21 - 60 cenários, 8 regras + fallback)
4. **Veto Logic:** ✅ Implementado (Bikini Law, Gym Integrity, Winter Priority)
5. **Safety/Quality:** ✅ Implementado (Negative prompt com reforços Phase 22)
6. **Multi-Product:** ✅ Implementado (até 3 produtos, source of truth)
7. **Sombras Realistas:** ✅ Implementado (Phase 16)
8. **Preservação de Semelhança:** ✅ Implementado (Phase 22 - 100% idêntico)
9. **Clone the Clothes:** ✅ Implementado (Phase 21)
10. **Ignore Mannequin Body:** ✅ Implementado (Phase 21)
11. **Complete the Look:** ✅ Implementado (Phase 20 - Auto-Jeans)
12. **Smart Accessory Placement:** ✅ Implementado (Phase 20 - Óculos no rosto)
13. **Beach Footwear:** ✅ Implementado (Phase 21 - Chinelo ou pés descalços)
14. **Ban Sitting Poses:** ✅ Implementado (Phase 20)
15. **Ban Back Views:** ✅ Implementado (Phase 21)

### 📊 Estatísticas

- **Total de Regras de Contexto:** 8 (+ 1 default)
- **Total de Cenários:** 60 (15 Beach, 10 Urban, 10 Formal, 10 Party, 10 Fitness, 10 Winter)
- **Peso Máximo no Negative Prompt:** 2.5 (reforço praia)
- **Limite de Produtos:** 3
- **Temperatura (Remix):** 0.75
- **Temperatura (Normal):** 0.4
- **Poses Disponíveis (Remix):** 10 (todas em pé, NUNCA sentadas)

### 🔍 Pontos de Verificação

1. **Bikini Law:** ✅ Funciona (Bikini → Beach obrigatório, Gym BANIDO)
2. **Gym Integrity:** ✅ Funciona (Vestido + Tênis → Fallback, não Gym)
3. **Winter Priority:** ✅ Funciona (Casaco → Winter, Beach BANIDO)
4. **Formal Dominance:** ✅ Funciona (Terno força contexto formal)
5. **Smart Framing:** ✅ Funciona (Calçados → Full Body)
6. **Forbidden Scenarios:** ✅ Aplicado no negative prompt (peso 2.0)
7. **Source of Truth:** ✅ Sempre usa `original_photo_url`
8. **Preservação de Semelhança:** ✅ Instruções explícitas + negative prompt (peso 2.0)
9. **Clone the Clothes:** ✅ Instruções explícitas no prompt
10. **Ignore Mannequin Body:** ✅ Instruções explícitas no prompt
11. **Complete the Look:** ✅ Auto-Jeans se tem Top mas não tem Bottom
12. **Smart Accessory Placement:** ✅ Óculos no rosto, não no chão/mão
13. **Beach Footwear:** ✅ Chinelo ou pés descalços se Beach sem sapatos
14. **Ban Sitting Poses:** ✅ Negative prompt + instruções explícitas
15. **Ban Back Views:** ✅ Negative prompt + instruções explícitas

---

## 8. CONCLUSÃO

**Status Geral:** ✅ **TODAS AS REGRAS ESTÃO IMPLEMENTADAS E ATIVAS**

O sistema possui:
- ✅ Lógica de resolução de conflitos (Veto Logic) com 8 regras hierárquicas
- ✅ Smart Framing baseado em categoria (3 níveis)
- ✅ Smart Context com 60 cenários de alta qualidade
- ✅ Negative prompt reforçado com forbidden scenarios e preservação de semelhança
- ✅ Estratégia multi-produto com source of truth (original_photo_url)
- ✅ Instruções de sombras realistas
- ✅ Remix engine com variação de cenário/pose (backend determina cenário)
- ✅ Preservação 100% da semelhança facial e corporal (Phase 22)
- ✅ Clone the Clothes (Phase 21)
- ✅ Ignore Mannequin Body (Phase 21)
- ✅ Complete the Look (Phase 20)
- ✅ Smart Accessory Placement (Phase 20)
- ✅ Beach Footwear (Phase 21)
- ✅ Ban Sitting Poses (Phase 20)
- ✅ Ban Back Views (Phase 21)

**Nenhuma funcionalidade está faltando conforme os requisitos documentados.**

---

**Última Atualização:** 28 de Novembro de 2025  
**Versão do Relatório:** V2 (Phase 22 - Maximum Similarity)

