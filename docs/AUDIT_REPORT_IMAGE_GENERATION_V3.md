# 📋 RELATÓRIO DE AUDITORIA: LÓGICA DE GERAÇÃO DE IMAGENS (V3)

**Data:** 28 de Novembro de 2025  
**Versão do Sistema:** Phase 24 (Identity Anchor) + Phase 23 (Identity & Fit) + Phase 22 (Maximum Similarity) + Phase 21 (Product Fidelity) + Phase 20 (Master Logic)  
**Status:** ✅ ATIVO E IMPLEMENTADO

---

## 1. ESTRUTURA DO PROMPT (Prompt Structure)

### 1.1. Arquitetura Base (PHASE 24 - Condensada)

**Localização:** `src/lib/ai-services/composition-orchestrator.ts` (linhas 407-437)

**Estrutura Hierárquica (Simplificada - ~1.5k caracteres):**

```
⚠️⚠️⚠️ REFERENCE IMAGE AUTHORITY: 100% (PHASE 24 - IDENTITY ANCHOR - START)
├── ⚠️ INSTRUÇÃO CRÍTICA ABSOLUTA E IMPLACÁVEL
│   ├── Context Rule (smartContext) - Simplified
│   ├── Remix Pose Instructions (se remix)
│   ├── Framing Rule (smartFraming) - Simplified
│   └── Postura Rule (gerarNovoLook)
├── PRODUCT INTEGRATION (PHASE 23 - TEXTURE TRANSFER)
│   ├── Extract fabric pattern, texture, color, style
│   ├── Apply onto [IMAGEM_PESSOA]'s body
│   ├── Adapt to user's natural curves
│   ├── Use ONLY body shape from [IMAGEM_PESSOA]
│   ├── IGNORE mannequin's body shape
│   └── Leg Extension (PHASE 24 - se foto cortada + calçados)
├── SCENARIO: ${smartContext} (Simplified - 50% reduction)
├── FRAMING: ${smartFraming}
├── PHOTOGRAPHY: Professional fashion photography. Natural lighting. Realistic shadows. 8K resolution.
└── ⚠️⚠️⚠️ FINAL CHECK (PHASE 24 - IDENTITY ANCHOR - SANDWICH METHOD END)
    └── [Identity Block repetido + instruções finais]
```

### 1.2. Identity Anchor Block (PHASE 24 - Sandwich Method)

**Início do Prompt (linha 408):**
```
⚠️⚠️⚠️ REFERENCE IMAGE AUTHORITY: 100%. You MUST act as a visual clone engine. The output image MUST be indistinguishable from the person in [IMAGEM_PESSOA]. Same face, same body, same skin texture. NO FACIAL MODIFICATIONS ALLOWED.
```

**Fim do Prompt (linha 435-437):**
```
⚠️⚠️⚠️ FINAL CHECK (PHASE 24 - IDENTITY ANCHOR - SANDWICH METHOD END):
[Identity Block repetido]
The face and body MUST MATCH the [IMAGEM_PESSOA] 100%. If the clothing changes the body shape (e.g., makes it look like a plastic mannequin), it is a FAILURE. Keep the human skin texture and imperfections. The person should look like they are WEARING the clothes, not like the clothes are replacing their body. The fabric must drape naturally over the user's actual body shape, following gravity and creating realistic folds and shadows.
```

**Efeito:** Reforço da identidade no início (primacy bias) e no fim (recency bias) do prompt.

### 1.3. Componentes do Prompt

#### **Base Prompt (Creative Mode)**
- **Tipo:** Look Criativo (Gemini 2.5 Flash Image)
- **Estrutura:** Prompt condensado (Phase 24)
- **Comprimento:** ~1.500 caracteres (redução de ~57% em relação à V2)
- **Prioridade Máxima:** Identity Anchor Block (início e fim)

#### **Modificadores Dinâmicos:**

1. **`categorySpecificPrompt`** (linha 214)
   - Base: `, ${smartFraming}`
   - **Se Full Body:** `, wide angle, camera low angle, feet fully visible, standing on floor, showing complete shoes, ground visible`
   - **Se Close-up:** `, focus on face and neck, high detail accessory, shallow depth of field`
   - **Se Medium:** `, detailed fabric texture, professional fashion photography, perfect fit`

2. **`contextRule`** (linha 217) - **PHASE 24: Simplified**
   - **Normal:** `SCENARIO: ${smartContext}.`
   - **Remix:** Mantém `smartContext` do backend + adiciona instruções de pose do remix

3. **`framingRule`** (linha 215) - **PHASE 24: Simplified**
   - **Normal:** `FRAMING: ${smartFraming}.`
   - **Remix:** `REMIX: Dramatic scene and pose change. New location, new pose.`

4. **`posturaRule`** (linhas 260-262)
   - **Se `gerarNovoLook = true`:** Permite mudança completa de pose (NUNCA sentada, ajoelhada ou em cadeira)
   - **Se `gerarNovoLook = false`:** Preserva postura original (ajustes gentis apenas para calçados/relógios)
   - **CRÍTICO:** A pessoa DEVE estar de FRENTE ou no MÁXIMO um pouco de lado (3/4 view). NUNCA de costas.

5. **`completeTheLookPrompt`** (PHASE 20 - linhas 269-273)
   - **Se `hasTop && !hasBottom`:** Adiciona ` wearing neutral blue denim jeans`
   - **Log:** `👖 PHASE 20: Complete the Look ativado - Adicionando jeans automático`

6. **`accessoryPrompt`** (PHASE 20 - linhas 325-329)
   - **Se `hasGlasses`:** Adiciona ` wearing sunglasses ON EYES, wearing glasses ON FACE`
   - **Log:** `👓 PHASE 20: Óculos detectado - Forçando no rosto`

7. **`beachFootwearPrompt`** (PHASE 21 - linhas 314-322)
   - **Se `hasBeach && !hasShoes`:** Adiciona ` barefoot or wearing simple flip-flops/sandals, NO boots, NO sneakers, NO closed shoes`
   - **Log:** `🏖️ PHASE 21 FIX: Roupas de banho detectadas - Forçando chinelo ou pés descalços`

8. **`spatialProductInstructions`** (PHASE 23 - linhas 275-312)
   - **Se `productsData.length > 1`:** Adiciona instruções espaciais explícitas
   - **Exemplo:** `⚠️ PHASE 23: SPATIAL PRODUCT ASSIGNMENT: The user is wearing [Shirt] on torso/upper body AND [Pants] on legs/lower body AND [Shoes] on feet. Each product must be placed on its correct body part without blending into a mutant outfit.`

9. **`legExtensionInstruction`** (PHASE 24 - linhas 410-415)
   - **Se `hasShoes && productCategory.includes("calçado")`:** Adiciona instrução de extensão de corpo
   - **Conteúdo:** `⚠️ PHASE 24: BODY EXTENSION: If the original photo is cropped (knee-up or upper body only), EXTEND THE BODY NATURALLY. Generate the missing legs and feet to match the user's existing anatomy exactly. Do not invent a new body type. The legs must follow the same proportions, skin tone, and structure as the visible body parts.`
   - **Log:** `🦵 PHASE 24: Leg Extension ativado - Foto pode estar cortada, estendendo corpo naturalmente`

### 1.4. Product Integration Rule (PHASE 23 - Texture Transfer)

**Localização:** Linha 427

**Instrução:**
```
PRODUCT INTEGRATION: Apply up to 3 products${completeTheLookPrompt}${accessoryPrompt}${beachFootwearPrompt}${spatialProductInstructions}. Extract fabric pattern, texture, color, and style from [IMAGEM_PRODUTO_X]. Apply onto [IMAGEM_PESSOA]'s body. Adapt clothing to user's natural curves. Fabric must drape naturally with realistic folds and shadows. Use ONLY body shape from [IMAGEM_PESSOA]. IGNORE mannequin's body shape.${legExtensionInstruction}
```

**Mudança da PHASE 23:** Substituiu "CLONE EXACTLY" por "TEXTURE TRANSFER / ADAPT TO BODY" para evitar cópia da forma rígida do manequim.

---

## 2. SMART FRAMING

### 2.1. Lógica de Detecção

**Localização:** `src/app/api/lojista/composicoes/generate/route.ts` (linhas 855-890)

**Regras:**

1. **Full Body Shot** (se houver calçados):
   - **Trigger:** `hasShoes = true`
   - **Framing:** `"Full body shot, feet fully visible, standing on floor"`
   - **Motivo:** Prevenir "cut legs" (PHASE 11-B)

2. **Close-up Portrait** (se apenas acessórios):
   - **Trigger:** `hasOnlyAccessories = true` (Óculos, Joias, Relógios, Cosméticos)
   - **Framing:** `"Close-up portrait, focus on face and neck, high detail accessory"`
   - **Motivo:** Otimizar visualização de acessórios pequenos

3. **Medium-Full Shot** (padrão para roupas):
   - **Trigger:** Roupas (Camisas, Blusas, Calças, Vestidos) sem calçados
   - **Framing:** `"Medium-full shot, detailed fabric texture, professional fashion photography, perfect fit"`
   - **Motivo:** Mostrar roupas com detalhes de tecido

### 2.2. Aplicação no Prompt

**Localização:** `src/lib/ai-services/composition-orchestrator.ts` (linhas 240-249)

```typescript
if (smartFraming.includes("Full body") || smartFraming.includes("feet")) {
  categorySpecificPrompt += ", wide angle, camera low angle, feet fully visible, standing on floor, showing complete shoes, ground visible";
} else if (smartFraming.includes("close-up") || smartFraming.includes("portrait")) {
  categorySpecificPrompt += ", focus on face and neck, high detail accessory, shallow depth of field";
} else {
  categorySpecificPrompt += ", detailed fabric texture, professional fashion photography, perfect fit";
}
```

---

## 3. CONTEXT/BACKGROUND (Cenários e Resolução de Conflitos)

### 3.1. 60 Cenários de Alta Qualidade (PHASE 20 + PHASE 24)

**Localização:** `src/app/api/lojista/composicoes/generate/route.ts` (linhas 576-657)

**PHASE 24: Simplificação (50% redução de texto):**

#### **Beach/Summer (15 cenários):**
- `"Background: Sunny tropical beach"`
- `"Background: Luxury pool deck"`
- `"Background: Golden hour sand dunes"`
- `"Background: Tropical garden"`
- `"Background: Infinity pool at sunset"`
- `"Background: Wooden pier"`
- `"Background: Beach bar"`
- `"Background: Rocky coastline"`
- `"Background: Yacht deck"`
- `"Background: Secluded beach"`
- `"Background: Natural waterfall"`
- `"Background: Resort pool"`
- `"Background: Beach at sunset"`
- `"Background: Modern infinity pool"`
- `"Background: Natural pool in forest"`

#### **Urban/Street (10 cenários):**
- `"Background: Urban street"`
- `"Background: Minimalist studio"`
- `"Background: Coffee shop"`
- `"Background: City park"`
- `"Background: Industrial loft"`
- `"Background: Graffiti alleyway"`
- `"Background: Rooftop terrace"`
- `"Background: Subway station"`
- `"Background: Skate park"`
- `"Background: Neon-lit street"`

#### **Formal/Social (10 cenários):**
- `"Background: Corporate office"`
- `"Background: Luxury hotel lobby"`
- `"Background: Minimalist apartment"`
- `"Background: Abstract architecture"`
- `"Background: Classic library"`
- `"Background: Conference room"`
- `"Background: Museum gallery"`
- `"Background: Upscale restaurant"`
- `"Background: Co-working space"`
- `"Background: Private jet interior"`

#### **Party/Gala (10 cenários):**
- `"Background: Red carpet event"`
- `"Background: Elegant ballroom"`
- `"Background: Rooftop bar"`
- `"Background: Luxury mansion"`
- `"Background: Opera house"`
- `"Background: Garden party"`
- `"Background: Champagne bar"`
- `"Background: VIP club"`
- `"Background: Wedding reception"`
- `"Background: Casino"`

#### **Fitness/Sport (10 cenários):**
- `"Background: Modern gym"`
- `"Background: Running track"`
- `"Background: Yoga studio"`
- `"Background: Urban stairs"`
- `"Background: Tennis court"`
- `"Background: Hiking trail"`
- `"Background: Crossfit box"`
- `"Background: Pilates studio"`
- `"Background: Basketball court"`
- `"Background: Soccer field"`

#### **Winter/Cold (10 cenários):**
- `"Background: Autumn street"`
- `"Background: Fireplace setting"`
- `"Background: Cloudy skyline"`
- `"Background: Snowy mountain"`
- `"Background: Winter cabin"`
- `"Background: Foggy forest"`
- `"Background: Christmas market"`
- `"Background: Ski resort"`
- `"Background: Rainy street"`
- `"Background: Library nook"`

### 3.2. Regras de Resolução de Conflitos (8 Regras Ativas)

**Localização:** `src/app/api/lojista/composicoes/generate/route.ts` (linha 659-824)

#### **REGRA 0: INVERNO/COURO (Prioridade ABSOLUTA)**
- **Trigger:** `hasWinter = true` (couro, casaco, sobretudo, bota, cachecol, inverno, winter, coat, pérola, veludo, lã, wool, boot)
- **Cenário:** Seleciona aleatoriamente de `winterScenarios`
- **Forbidden:** `["Tropical Beach", "Beach", "Pool", "Swimming pool", "Sunny summer park", "Ocean", "Sand", "Palm trees", "Summer", "Hot weather", "Beach resort", "Seaside", "Tropical", "Paradise beach", "Sunny beach", "Beach scene"]`
- **Log:** `🧥 PHASE 21 FIX: INVERNO/COURO detectado (PRIORIDADE) - PROIBINDO PRAIA`

#### **REGRA 1: "BIKINI LAW" (STRICT - Prioridade após Inverno)**
- **Trigger:** `hasBeach = true` (biquíni, bikini, maiô, maio, sunga, praia, beachwear, saída de praia, swimwear, moda praia, banho, nado, piscina, swim, beach, biquini, biquíni)
- **Cenário:** Seleciona aleatoriamente de `beachScenarios` (15 opções)
- **Forbidden:** `["Office", "City Street", "Snow", "Gym", "Shopping Mall", "Bedroom", "Urban", "Night", "Winter", "Indoor", "Corporate", "Formal", "Street", "City", "Urban street", "Busy street", "Neon-lit city", "Subway", "Skate park", "Coffee shop", "Rooftop terrace", "Fitness center", "Gym", "Academia", "Workout", "Exercise", "Training", "Modern fitness center", "Fitness", "Sport", "Athletic", "Running track", "Yoga studio", "Crossfit", "Basketball court", "Soccer field"]`
- **Log:** `🏖️ PHASE 21 FIX: BIKINI LAW - MODA PRAIA detectado - FORÇANDO Beach/Pool/Cachoeira`
- **CRÍTICO:** Se houver roupas de banho, SEMPRE usar cenário aquático, mesmo que haja outros produtos.

#### **REGRA 2: GYM INTEGRITY (STRICT - Requer UNANIMIDADE)**
- **Trigger:** `hasSport && !hasNonSport && !hasBeach`
- **Cenário:** Seleciona aleatoriamente de `fitnessScenarios` (10 opções)
- **Forbidden:** `["Bedroom", "Luxury Lobby", "Beach (sand)", "Formal Event", "Restaurant", "City Street", "Urban street", "Office", "Shopping Mall", "Beach", "Pool", "Swimming pool", "Ocean", "Tropical", "Resort"]`
- **Log:** `💪 PHASE 21 FIX: FITNESS/SPORT (UNANIMIDADE) - Gym/Academia permitido`
- **CRÍTICO:** Gym SÓ é permitido se TODOS os produtos forem esportivos/fitness. Se houver qualquer produto não-esportivo (ex: Vestido), usar Fallback.

#### **REGRA 3: PARTY/GALA (Prioridade sobre Formal)**
- **Trigger:** `hasParty = true` (festa, gala, paetê, salto alto fino, clutch, vestido de festa, brilho, noite, night, evening)
- **Cenário:** Seleciona aleatoriamente de `partyScenarios` (10 opções)
- **Forbidden:** `["Beach", "Gym", "Messy Room", "Forest", "Dirt road", "Office", "Daylight"]`
- **Log:** `🎉 PHASE 21 FIX: FESTA/GALA detectado - Party forçado`

#### **REGRA 4: FORMAL DOMINANCE (Dominante)**
- **Trigger:** `hasFormal = true` (terno, blazer, social, alfaiataria, vestido longo, gravata, suit, formal, festa, gala, paetê, salto alto fino, clutch, vestido de festa, brilho)
- **Cenário:** Seleciona aleatoriamente de `formalScenarios` (10 opções)
- **Forbidden:** `["Beach", "Gym", "Messy Room", "Forest", "Dirt road"]`
- **Log:** `👔 PHASE 21 FIX: SOCIAL/FORMAL (DOMINANTE) - Formal forçado`

#### **REGRA 5: FALLBACK (Safe Zone - para conflitos)**
- **Trigger:** `(hasSport && hasNonSport) || (hasBeach && hasWinter)`
- **Cenário:** Seleciona aleatoriamente de `urbanScenarios` (10 opções)
- **Forbidden:** `["Gym", "Beach", "Swimming pool"]`
- **Log:** `🏙️ PHASE 21 FIX: CONFLITO DETECTADO - Usando FALLBACK (Urban/Studio)`
- **Exemplo:** Vestido + Tênis → Urban/Studio (NÃO Gym)

#### **REGRA 6: CASUAL/STREET**
- **Trigger:** `hasCasual = true` (jeans, t-shirt, moletom, tênis casual, jaqueta jeans, casual, street)
- **Cenário:** Seleciona aleatoriamente de `urbanScenarios` (10 opções)
- **Forbidden:** `["Gym", "Swimming pool", "Formal wedding"]`
- **Log:** `👕 PHASE 21 FIX: CASUAL/STREET detectado`

#### **REGRA 7: LINGERIE/SLEEP**
- **Trigger:** `allText.match(/pijama|lingerie|robe|camisola|sleep|nightwear/i)`
- **Cenário:** Seleciona aleatoriamente de `lingerieScenarios` (3 opções: "Background: Bright bedroom", "Background: Minimalist bathroom", "Background: Morning light window")
- **Forbidden:** `["Street", "Office", "Gym", "Public places", "Crowd"]`
- **Log:** `🛏️ PHASE 21 FIX: LINGERIE/SLEEP detectado`

#### **REGRA 8: CALÇADOS (Geral - apenas se não houver conflito)**
- **Trigger:** `allText.match(/sandália|rasteirinha|sapatilha|calçado|shoe|footwear/i)`
- **Cenário:** Seleciona aleatoriamente de `shoesScenarios` (5 opções: "Background: Paved street", "Background: Wooden floor", "Background: Tiled floor", "Background: Minimalist studio", "Background: City park")
- **Forbidden:** `["Mud", "Grass (hiding the shoe)", "Water"]`
- **Log:** `👠 PHASE 21 FIX: CALÇADOS detectado`

#### **DEFAULT: Urban/Studio (Fallback Final)**
- **Trigger:** Nenhuma regra específica aplicada
- **Cenário:** Seleciona aleatoriamente de `urbanScenarios` (10 opções)
- **Forbidden:** `[]`
- **Log:** `🎬 PHASE 24: DEFAULT (Urban/Studio - cenário selecionado)`

### 3.3. Aplicação de Cenários Proibidos no Negative Prompt

**Localização:** `src/lib/ai-services/composition-orchestrator.ts` (linhas 365-388)

**Lógica:**
- Todos os cenários em `forbiddenScenarios` são adicionados ao negative prompt com peso **2.0**
- Se houver cenários proibidos relacionados a praia/piscina, adiciona reforço adicional com peso **2.5**

**Exemplo:**
```typescript
const forbiddenPrompt = forbiddenScenarios.length > 0
  ? `, ${forbiddenScenarios.map(s => `(${s}:2.0)`).join(", ")}`
  : "";
```

---

## 4. SAFETY/QUALITY (Negative Prompt)

### 4.1. Negative Prompt Completo

**Localização:** `src/lib/ai-services/composition-orchestrator.ts` (linha 341)

**Base Negative Prompt:**
```
(deformed, distorted, disfigured:1.3), poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, (mutated hands and fingers:1.4), disconnected limbs, mutation, mutated, ugly, blurry, amputation, (head cut off:1.5), text, watermark, bad composition, duplicate, (original clothes visible:1.6), (two layers of clothing:1.6), (multiple outfits:1.6), (old outfit:1.4), (no shadows:1.8), (person without shadow:1.8), (floating person:1.6), (unrealistic lighting:1.5), (flat lighting:1.5), (no depth:1.4), (sitting:1.5), (seated:1.5), (chair:1.5), (bench:1.5), (kneeling:1.5), (mannequin body:2.0), (plastic skin:2.0), (rigid clothing:1.8), (stiff pose:1.8), (neck stand:2.0), (ghost mannequin:2.0), (artificial pose:1.6), (artificial body shape:1.6), (wrong proportions:1.5), (mismatched body:1.5), (back view:1.8), (person facing away:1.8), (back turned:1.8), (rear view:1.8), (different face:2.0), (different person:2.0), (face changed:2.0), (altered facial features:2.0), (different eye color:2.0), (different nose shape:2.0), (different mouth shape:2.0), (different face shape:2.0), (different skin tone:2.0), (different body shape:2.0), (different body proportions:2.0), (altered body:2.0), (face swap:2.0), (different person's face:2.0), (face replacement:2.0), (cgi face:1.5), (filter:1.5), (smooth skin:1.5), (instagram face:1.5)
```

### 4.2. Modificadores Condicionais

#### **Feet Negative Prompt (PHASE 11-B):**
- **Se há calçados:** Adiciona `, (feet cut off:1.8), (cropped legs:1.6), (legs cut off:1.6), close up portrait, portrait shot, upper body only`
- **Se não há calçados:** Adiciona apenas `, (feet cut off:1.5)`

#### **Phantom Boots Negative (PHASE 20):**
- **Se `isBeachContext && !hasShoes`:** Adiciona `, (boots:2.0), (shoes:1.5), (sneakers:1.5)`
- **Motivo:** Evitar "phantom boots" em cenários de praia sem sapatos

#### **Glasses Negative (PHASE 20):**
- **Se `hasGlasses`:** Adiciona `, (glasses on floor:2.0), (glasses in hand:2.0)`
- **Motivo:** Forçar óculos no rosto, não no chão ou na mão

#### **Forbidden Scenarios Negative (PHASE 15):**
- **Se `forbiddenScenarios.length > 0`:** Adiciona cada cenário proibido com peso 2.0
- **Exemplo:** `, (Gym:2.0), (Academia:2.0), (Workout:2.0)`

#### **Additional Forbidden Reinforcement (PHASE 15):**
- **Se `hasBeachForbidden`:** Adiciona reforço adicional com peso 2.5
- **Conteúdo:** `, (beach scene:2.5), (ocean background:2.5), (sand:2.5), (palm trees:2.5), (tropical:2.5), (summer beach:2.5), (swimming pool:2.5), (beach resort:2.5), (seaside:2.5), (paradise beach:2.5), (sunny beach:2.5)`

### 4.3. Strong Negative Prompt Final

**Localização:** Linha 380

```typescript
const strongNegativePrompt = `${feetNegativePrompt}${phantomBootsNegative}${glassesNegative}${forbiddenPrompt}${additionalForbiddenReinforcement}`;
```

**Enviado para a IA:** `negativePrompt: strongNegativePrompt` (linha 482)

---

## 5. MULTI-PRODUCT STRATEGY

### 5.1. Source of Truth (PHASE 13)

**Localização:** 
- Frontend: `src/app/api/generate-looks/route.ts` (linhas 62-90)
- Frontend Remix: `src/app/api/generate-looks/remix/route.ts` (linhas 37-70)
- Backend: `src/app/api/lojista/composicoes/generate/route.ts` (linhas 200-250)

**Regra:**
- **Sempre usar `original_photo_url`** se fornecido
- **Fallback:** `personImageUrl` se `original_photo_url` não estiver disponível
- **CRÍTICO:** Ignorar qualquer `previous_image` ou `generated_image` - sempre usar a foto original do upload

**Logs:**
```
[modelo-2/api/generate-looks] PHASE 13: Source of Truth - Usando foto ORIGINAL
[remix] PHASE 13: Enviando requisição para backend com foto ORIGINAL
```

### 5.2. Estrutura do Array de Imagens

**Localização:** `src/lib/ai-services/composition-orchestrator.ts` (linhas 439-443)

**Estrutura:**
```typescript
const imageUrls = [
  params.personImageUrl, // Primeira imagem: IMAGEM_PESSOA (Source of Truth)
  ...allProductImageUrls, // Seguintes: IMAGEM_PRODUTO_1, IMAGEM_PRODUTO_2, IMAGEM_PRODUTO_3 (máximo 3)
];
```

**Validação:**
- Mínimo: 1 produto (linha 446-448)
- Máximo: 3 produtos (conforme especificação)

### 5.3. Detecção de Produtos

**Localização:** `src/lib/ai-services/composition-orchestrator.ts` (linhas 201-210)

**Lógica:**
```typescript
const productsData = params.options?.productsData || [];
const allText = productsData.map(p => `${p?.categoria || ""} ${p?.nome || ""}`).join(" ").toLowerCase();
const hasGlasses = allText.match(/óculos|oculos|glasses|sunglasses/i);
const hasTop = allText.match(/camisa|blusa|blouse|shirt|top|jaqueta|jacket|moletom|hoodie/i);
const hasBottom = allText.match(/calça|pants|jeans|saia|skirt|shorts|vestido|dress/i);
const hasShoes = allText.match(/calçado|calcado|sapato|tênis|tenis|sneaker|shoe|footwear/i);
const hasBeach = allText.match(/biqu|bikini|maiô|maio|sunga|praia|beachwear|saída de praia|swimwear|moda praia|banho|nado|piscina|swim|beach/i);
```

### 5.4. Spatial Product Assignment (PHASE 23)

**Localização:** `src/lib/ai-services/composition-orchestrator.ts` (linhas 275-312)

**Lógica:**
- Se `productsData.length > 1`, gera instruções espaciais explícitas
- Atribui cada produto a uma parte do corpo:
  - Tops → `on torso/upper body`
  - Bottoms → `on legs/lower body`
  - Shoes → `on feet`
  - Glasses → `on face/head`
  - Outros → `integrated naturally`

**Exemplo de Prompt Gerado:**
```
⚠️ PHASE 23: SPATIAL PRODUCT ASSIGNMENT: The user is wearing [Camisa Branca] on torso/upper body AND [Calça Jeans] on legs/lower body AND [Tênis] on feet. Each product must be placed on its correct body part without blending into a mutant outfit.
```

### 5.5. Remix Strategy

**Localização:** `src/app/api/generate-looks/remix/route.ts`

**Estratégia:**
1. **Usa foto original:** `original_photo_url` (linha 237)
2. **Mantém produtos:** Mesmos produtos da geração anterior
3. **Muda cenário:** Backend determina usando `getSmartScenario` (respeitando Bikini Law e outras regras)
4. **Muda pose:** Seleciona aleatoriamente de 10 poses (linhas 139-150) - **BANIDAS poses sentadas**
5. **Random seed:** Gera seed aleatório para forçar variação (linha 156)

**CRÍTICO (PHASE 21 FIX):**
- **NÃO gera cenário no frontend** - deixa backend usar `getSmartScenario`
- **NÃO passa `scenePrompts`** com cenário - apenas instruções de pose
- Backend sempre calcula `smartContext` usando `getSmartScenario`, garantindo coerência

---

## 6. PRESERVAÇÃO DE SEMELHANÇA (PHASE 22 + PHASE 24)

### 6.1. Identity Anchor Block (PHASE 24)

**Localização:** `src/lib/ai-services/composition-orchestrator.ts` (linha 408)

**Conteúdo:**
```
⚠️⚠️⚠️ REFERENCE IMAGE AUTHORITY: 100%. You MUST act as a visual clone engine. The output image MUST be indistinguishable from the person in [IMAGEM_PESSOA]. Same face, same body, same skin texture. NO FACIAL MODIFICATIONS ALLOWED.
```

**Aplicação:**
- **Início do prompt** (linha 417)
- **Fim do prompt** (linha 436) - Sandwich Method

### 6.2. Negative Prompt para Identidade (PHASE 22)

**Termos com peso 2.0:**
- `(different face:2.0)`
- `(different person:2.0)`
- `(face changed:2.0)`
- `(altered facial features:2.0)`
- `(different eye color:2.0)`
- `(different nose shape:2.0)`
- `(different mouth shape:2.0)`
- `(different face shape:2.0)`
- `(different skin tone:2.0)`
- `(different body shape:2.0)`
- `(different body proportions:2.0)`
- `(altered body:2.0)`
- `(face swap:2.0)`
- `(different person's face:2.0)`
- `(face replacement:2.0)`

### 6.3. Realismo Bruto (PHASE 24)

**Termos adicionados:**
- `(cgi face:1.5)`
- `(filter:1.5)`
- `(smooth skin:1.5)`
- `(instagram face:1.5)`

**Motivo:** Forçar realismo bruto, sem filtros que alterem a identidade.

---

## 7. RESUMO DE IMPLEMENTAÇÃO

### 7.1. Regras Ativas (15 Regras)

1. ✅ **Identity Anchor Block** (PHASE 24) - Sandwich Method
2. ✅ **Texture Transfer / Adapt to Body** (PHASE 23) - Substituiu "Clone Exactly"
3. ✅ **Leg Extension Logic** (PHASE 24) - Para fotos cortadas com calçados
4. ✅ **Spatial Product Assignment** (PHASE 23) - Instruções explícitas para multi-produto
5. ✅ **Bikini Law** (PHASE 20/21) - STRICT: Swimwear → Beach/Pool obrigatório
6. ✅ **Gym Integrity** (PHASE 20/21) - STRICT: Requer unanimidade esportiva
7. ✅ **Winter/Leather Priority** (PHASE 20) - Prioridade absoluta
8. ✅ **Formal Dominance** (PHASE 15) - Dominante sobre casual
9. ✅ **Party/Gala Priority** (PHASE 20) - Prioridade sobre formal
10. ✅ **Fallback Logic** (PHASE 15) - Para conflitos (ex: Vestido + Tênis → Urban)
11. ✅ **Smart Framing** (PHASE 14) - Full Body / Close-up / Medium
12. ✅ **Complete the Look** (PHASE 20) - Auto-Jeans se apenas Top
13. ✅ **Smart Accessory Placement** (PHASE 20) - Óculos no rosto
14. ✅ **Beach Footwear** (PHASE 21) - Chinelo ou pés descalços para roupas de banho
15. ✅ **Source of Truth** (PHASE 13) - Sempre usar `original_photo_url`

### 7.2. Estatísticas do Sistema

- **Cenários Disponíveis:** 60 (15 Beach, 10 Urban, 10 Formal, 10 Party, 10 Fitness, 10 Winter)
- **Regras de Conflito:** 8 regras ativas
- **Comprimento do Prompt:** ~1.500 caracteres (PHASE 24 - redução de 57%)
- **Negative Prompt Base:** ~1.200 caracteres
- **Produtos Máximos:** 3 produtos por geração
- **Rotas Ativas:** 3 (experimentar, refino, remix) - todas usam mesmo endpoint backend

### 7.3. Pontos de Verificação

✅ **Todas as rotas usam `original_photo_url` como Source of Truth**
✅ **Backend sempre calcula `smartContext` usando `getSmartScenario`**
✅ **Bikini Law aplicada em todas as gerações (incluindo remix)**
✅ **Identity Anchor Block no início e fim do prompt (Sandwich Method)**
✅ **Cenários simplificados (50% redução) para focar atenção na identidade**
✅ **Negative prompt inclui termos anti-manequim com peso 2.0**
✅ **Negative prompt inclui termos de preservação de identidade com peso 2.0**
✅ **Negative prompt inclui termos de realismo bruto (sem filtros)**

---

## 8. ROTAS E ENDPOINTS

### 8.1. Frontend → Backend

**Rota Frontend:** `POST /api/generate-looks` (modelo-2)
- **Proxy para:** `POST /api/lojista/composicoes/generate` (paineladm)
- **Uso:** Experimentar, Refino, Trocar Produto

**Rota Frontend:** `POST /api/generate-looks/remix` (modelo-2)
- **Proxy para:** `POST /api/lojista/composicoes/generate` (paineladm)
- **Uso:** Remix (variação de cenário/pose)

### 8.2. Backend → IA

**Orchestrator:** `src/lib/ai-services/composition-orchestrator.ts`
- **Função:** `createComposition(params)`
- **IA:** Gemini 2.5 Flash Image
- **Tipo:** Look Criativo

---

**FIM DO RELATÓRIO**







