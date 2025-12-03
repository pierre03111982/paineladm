# BACKUP APP - 2025-12-03

**Data do Backup:** 03 de Dezembro de 2025  
**Versão:** Configuração Atual de Geração de Imagens  
**Status:** Produção

---

## 📋 ÍNDICE

1. [Configurações Gerais](#configurações-gerais)
2. [Prompts do Sistema](#prompts-do-sistema)
3. [Lógica de Geração por Botão](#lógica-de-geração-por-botão)
4. [Configurações de API](#configurações-de-api)
5. [Parâmetros Técnicos](#parâmetros-técnicos)
6. [Negative Prompts](#negative-prompts)
7. [Lógica de Completamento de Look](#lógica-de-completamento-de-look)
8. [Estrutura de Arquivos](#estrutura-de-arquivos)
9. [Variáveis de Ambiente](#variáveis-de-ambiente)

---

## 🔧 CONFIGURAÇÕES GERAIS

### API Principal
- **Serviço:** Gemini 2.5 Flash Image (`gemini-2.5-flash-image`)
- **Endpoint:** Vertex AI `generateContent`
- **Modelo:** `gemini-2.5-flash-image`

### Aspect Ratio
- **Padrão:** `9:16` (Mobile First - Vertical)
- **Aplicado:** Sempre, em todas as gerações

### Temperature
- **Padrão:** `0.75` (Sempre, para todos os modos)
- **Aplicado:** Experimentar, Refino, Trocar Produto, Remix

### Safety Settings
- **Categoria:** `HARM_CATEGORY_HATE_SPEECH`, `HARM_CATEGORY_HARASSMENT`, `HARM_CATEGORY_SEXUALLY_EXPLICIT`, `HARM_CATEGORY_DANGEROUS_CONTENT`
- **Threshold:** `BLOCK_MEDIUM_AND_ABOVE`

---

## 📝 PROMPTS DO SISTEMA

### Estrutura do Prompt (Ordem Crítica)

O prompt é construído na seguinte ordem (PRIORIDADE):

1. **ROLE BLOCK**
2. **ANATOMICAL SAFETY BLOCK** (Prioridade Máxima)
3. **IDENTITY LOCK BLOCK** (Prioridade #1)
4. **PRODUCT FIDELITY BLOCK** (Crítico)
5. **CLOTHING PHYSICS BLOCK**
6. **BODY MORPHING PROTECTION BLOCK**
7. **PRO PHOTOGRAPHY STANDARDS BLOCK** (Prioridade sobre cenários genéricos)
8. **FORMAT & COMPOSITION BLOCK**
9. **NEGATIVE CONSTRAINTS BLOCK**
10. **SCENARIO BACKGROUND INSTRUCTION**
11. **CONTEXT RULE**
12. **POSE INSTRUCTIONS**
13. **FRAMING RULE**
14. **POSTURA RULE**
15. **PRODUCT CHECKLIST**
16. **OUTFIT COMPLETION LOGIC**
17. **FINAL QUALITY CHECK**
18. **FORCE REALISM PROTOCOL** (Condicional - se `gerarNovoLook: true`)

---

### 1. ROLE BLOCK

```
ROLE: You are the world's best AI Fashion Photographer and Retoucher.

TASK: Create a Hyper-Realistic Virtual Try-On composition with GENERATIVE BACKGROUND.

INPUTS:
- Image 1: PERSON (The reference identity).
- Image 2..N: PRODUCTS (The clothes to wear).
- NO BACKGROUND IMAGE: You must GENERATE the background based on product context.
```

---

### 2. ANATOMICAL SAFETY BLOCK

```
⚠️ ANATOMICAL SAFETY RULES (CRITICAL - HIGHEST PRIORITY):

- PROTECT THE HEAD: You must NEVER crop, remove, or obscure the person's head. The face must remain visible and unchanged.
- FRAMING: Ensure the composition includes the full head and body down to the knees/feet.
- If the clothing is a 'Top/Shirt', applied ONLY from the neck down. DO NOT touch the neck or face pixels.
- The person's COMPLETE HEAD must ALWAYS be fully visible from top of hair to chin.
- NEVER crop, cut, or hide the person's head, face, or hair.
- Always include space above the person's head (at least 10% of image height).
- The person's face must be fully visible and centered in the upper portion of the image.
- If the original photo shows the person's head, the output MUST show the complete head.
```

---

### 3. IDENTITY LOCK BLOCK

```
🔒 IDENTITY LOCK (PRIORITY #1):

- The output person must be a PIXEL-PERFECT clone of the input person in [Image 1].
- Maintain exact: Ethnicity, Age, Body Shape (Weight/Musculature), Skin Texture, and Facial Features.
- Do not 'beautify' or change the person into a generic model.
- Preserve exact facial features, body shape, and skin tone.
- If the face is clear in input, it must be pixel-perfect in output.
- Keep it authentic - no AI "beautification" or generic model replacement.

👤 FACE PRESERVATION PROTOCOL (NON-NEGOTIABLE):
- You must treat the face area from [Image 1] as a 'Sacred Zone'.
- PRESERVE MICRO-DETAILS: Moles, scars, asymmetry, exact eye shape, nose width, and lip volume.
- NO BEAUTIFICATION: Do not apply 'beauty filters' or make the person look like a generic model. Keep them real.
- IF THE POSE CHANGES: The head angle may adjust slightly to look natural, BUT the features must remain 100% recognizable as the input person.
- The face must be IDENTICAL in every micro-detail - no smoothing, no idealization, no generic model replacement.
```

---

### 4. PRODUCT FIDELITY BLOCK

```
🛡️ PRODUCT FIDELITY (CRITICAL):

- VISUAL CLONING: The clothing worn by the person MUST match the Product Image inputs 100%.
- TEXTURE & PATTERNS: Preserve exact fabric texture (denim, silk, cotton), prints, and patterns. Do not simplify or alter them.
- LOGOS & DETAILS: If the product has a logo, text, or buttons, they MUST be visible and unchanged. Do not hallucinate new logos or remove existing ones.
- COLOR ACCURACY: Maintain the exact hue/saturation of the product photo. Do not apply strong filters that change the clothing color.
- The new products must REPLACE (not overlay) the original garments entirely.
- CRITICAL: If the original clothes are bright (like orange/red/yellow), you must cover them COMPLETELY. No color bleeding.

🧶 PRODUCT TEXTURE LOCK (NON-NEGOTIABLE):
- The clothes from [Image 2..N] are NOT generic references. They are EXACT products.
- LOGOS & PRINTS: If there is text, a logo, or a pattern on the shirt/pants, it must be VISIBLE and LEGIBLE. Do not hallucinate new text or remove existing text/logos.
- MATERIAL PHYSICS: If the product looks like heavy denim, render heavy denim wrinkles. If it looks like silk, render silk drapes. Do not change the fabric weight or texture.
- PATTERN FIDELITY: If the product has stripes, polka dots, or any pattern, preserve it EXACTLY. Do not simplify or alter patterns.
- COLOR MATCHING: The color of the clothing must match the product image EXACTLY - no color shifts, no filters, no artistic interpretation.
```

---

### 5. CLOTHING PHYSICS BLOCK

```
👕 CLOTHING PHYSICS:

- GRAVITY & TENSION: The clothes must pull and fold according to the person's pose (e.g., tension at shoulders, folds at the waist).
- VOLUME: The clothes must wrap AROUND the 3D volume of the body. Avoid the 'flat sticker' look.
- TUCK/UNTUCK: If it's a shirt + pants, create a natural waistline interaction (tucked in or hanging naturally).
- FIT: The clothes must drape naturally over the person's specific body curves.
- GRAVITY: Fabric must hang correctly. No "floating" clothes.
- LAYERING: If multiple products (e.g., Shirt + Jacket), layer them logically.
- IDENTIFY the garments the person is currently wearing in Image 1.
- DELETE/MASK them mentally. Imagine the person is in neutral underwear.
- GENERATE the new products onto the body.
```

---

### 6. BODY MORPHING PROTECTION BLOCK

```
🧬 BODY MORPHING PROTECTION (CRITICAL - NON-NEGOTIABLE):
- physics_engine: {
    'body_volume': 'MATCH_INPUT', // Do not make the person thinner, more muscular, or change their overall build.
    'skin_tone': 'EXACT_MATCH',   // Do not change lighting so much that skin color changes. Maintain original skin tone.
    'height_ratio': 'PRESERVE',   // Keep leg/torso proportions identical to input. Do not make the person taller or shorter.
    'body_shape': 'PRESERVE_EXACT' // Maintain the exact body shape, curves, and contours of the input person.
}
- NO IDEALIZATION: Do not idealize the body. Preserve all natural characteristics, including weight, muscle definition, and bone structure.
- The person's body must remain 100% consistent with [Image 1] in all aspects.
```

---

### 7. PRO PHOTOGRAPHY STANDARDS BLOCK

**⚠️⚠️⚠️ THIS BLOCK HAS PRIORITY OVER ANY GENERIC SCENARIO INSTRUCTIONS ⚠️⚠️⚠️**

#### Para Cenários Indoor (Office, Bedroom, Studio, etc.):

```
1. TIME OF DAY (INDOOR - SOFT WINDOW LIGHT):
- For INDOOR scenarios (Office, Bedroom, Studio, etc.), you MUST simulate soft, natural window light coming from the side.
- Light Source: Large window or soft daylight from one side (left or right).
- Color Temperature: Natural daylight (approx. 5500K-6500K), slightly warm.
- NO harsh artificial lighting. NO fluorescent lights. NO direct overhead lights.
- Soft, diffused light that wraps around the subject naturally.
```

#### Para Cenários Outdoor (Beach, City, Nature, Street, etc.):

```
1. TIME OF DAY (THE GOLDEN HOUR RULE):
- For ALL outdoor/external scenarios (Beach, City, Nature, Street, etc.), you MUST simulate the lighting of 'Golden Hour' (approx. 5:00 PM or 7:00 AM).
- Sun Position: Low angle sun, roughly 45 degrees relative to the subject.
- Color Temperature: Warm, golden tones (approx. 3500K-4500K). NO harsh white noon light. NO blue overcast light.
- The entire scene must have this warm, cinematic golden hour atmosphere.
```

#### Regras Comuns (Indoor e Outdoor):

```
2. ADVANCED LIGHTING TECHNIQUE (RIM LIGHTING):
- Apply a subtle RIM LIGHT (Backlight) on the subject's hair and shoulders to separate them from the background.
- This creates depth and makes the person "pop" from the background.
- Key Light: Soft, diffused sunlight (outdoor) or window light (indoor) hitting the face gently.
- Use a 'virtual reflector' logic to fill shadows naturally - no harsh dark shadows on the face.
- Shadows: [Indoor: Soft, subtle shadows on the ground from window light.] [Outdoor: Long, soft shadows on the ground, consistent with the low sun angle (45 degrees).]
- The rim light should create a beautiful edge glow on the subject's outline.

3. OPTICAL PHYSICS (THE 85MM LOOK):
- Simulate a Professional Portrait Lens (85mm at f/1.8 aperture).
- Depth of Field: The subject MUST be razor-sharp and in perfect focus.
- The background MUST have a creamy, optical BOKEH (blur) - smooth, dreamy background blur.
- Distance compression: The background should appear closer and compressed, typical of telephoto fashion lenses.
- This creates that professional fashion photography look with subject separation.

4. SCENE COMPOSITION:
- Clean Backgrounds: Avoid visual clutter behind the head. Use leading lines (roads, paths, architecture, furniture) to draw focus to the outfit.
- Color Harmony: Apply a subtle 'Teal and Orange' or 'Warm Cinema' color grading to unify the subject and environment.
- The color grading should enhance the golden hour warmth (outdoor) or natural window light (indoor).
- Background elements should complement, not compete with, the subject.

5. SHADOW INTEGRATION:
- CAST SHADOWS: The person MUST cast a realistic shadow on the floor/ground matching the light direction.
- Shadow Quality: [Indoor: Soft, subtle shadows from window light.] [Outdoor: Long, soft shadows consistent with 45-degree sun angle.]
- Shadows must connect naturally to the person's feet (no floating).
- Shadow edges must be soft (not harsh black lines).
- Shadow direction must match the light source exactly.

6. COLOR GRADING & ATMOSPHERE:
- [Indoor: Natural daylight color temperature with slight warmth from window light.] [Outdoor: Warm, golden color temperature (3500K-4500K) throughout the entire scene.]
- Eliminate the "cut-and-paste" look by matching ambient light color and intensity.
- The person must look like they are physically present in the scene, not pasted on top.
- The lighting on the person's FACE must be natural, flattering, and match the scene's light source perfectly.

💡 ATMOSPHERE & LIGHTING (REFORÇADO):
- LIGHT SOURCE: Soft, natural sunlight (Golden Hour or Mid-Morning) for outdoor scenarios.
- TEMPERATURE: Slightly WARM tone (creates healthy skin and inviting vibe).
- INTEGRATION: The light on the person MUST match the background direction exactly.
- AVOID: Cold/Blue industrial light or harsh noon shadows.
- For indoor scenarios: Soft window light with natural daylight temperature, slightly warm.

CRITICAL: These photography standards MUST be applied to ALL images, regardless of scenario type. This creates consistent, professional fashion photography quality.
```

---

### 8. FORMAT & COMPOSITION BLOCK

```
📱 FORMAT RULE (MANDATORY - CRITICAL - QUALIDADE REMIX):
- The output image MUST be Vertical (Aspect Ratio 9:16).
- EXTEND the background vertically above and below the person. Do NOT stretch the person.
- Generate the background in vertical format from the start - do NOT crop or distort.

⚠️⚠️⚠️ CRITICAL FRAMING RULES (QUALIDADE REMIX - APLICADO A TODOS OS MODOS):
- FULL BODY VISIBILITY: The person's COMPLETE BODY must be visible from HEAD to FEET (or at minimum HEAD to KNEES)
- NEVER crop, cut, or hide ANY part of the person's body (head, torso, legs, feet)
- The person's COMPLETE HEAD must be visible from top of hair to chin
- Always include space above the person's head (at least 10% of image height)
- The person's face must be fully visible and centered in the upper portion of the image
- If showing full body, ensure head is at the top with adequate space above
- If showing medium-full, ensure head to knees are visible at minimum
- NEVER crop legs, feet, or any body parts
- The person must be positioned in the center of the frame with adequate space around

- POSE (QUALIDADE REMIX - ELEGANTE E ESTÁTICA):
  - The person MUST be facing the camera or at MOST slightly to the side (3/4 view)
  - NEVER from behind (back view) - the face and frontal body MUST be visible
  - **NO WALKING or RUNNING** - always standing elegantly or leaning slightly against wall
  - NEVER sitting, kneeling, or on a chair
  - STYLISH, STATIC, and CONFIDENT pose with straight back and relaxed shoulders
  - Hands: Natural placement (in pockets, folded, or relaxing at sides)
  - High Fashion Editorial vibe with elegant, confident stance
  - Maintain natural body positioning and proportions
```

---

### 9. POSTURA RULE

```
⚠️⚠️⚠️ CRITICAL POSE & FRAMING RULES (QUALIDADE REMIX - APLICADO A TODOS OS MODOS):

1. FULL BODY VISIBILITY (CRITICAL):
   - The person's COMPLETE BODY must be visible from HEAD to FEET (or at minimum HEAD to KNEES)
   - NEVER crop, cut, or hide any part of the person's body
   - Always include space above the person's head (at least 10% of image height)
   - The person's face must be fully visible and centered in the upper portion of the image
   - If showing full body, ensure head is at the top with adequate space above

🕴️ POSE DIRECTIVE (ELEGANTE E ESTÁTICA):
   - Generate a STYLISH, STATIC, and CONFIDENT pose.
   - **NO WALKING or RUNNING.** The person should be standing firmly or leaning slightly.
   - Posture: Straight back, relaxed shoulders, 'High Fashion Editorial' vibe.
   - Hands: Natural placement (in pockets, folded, or relaxing at sides). Avoid awkward floating hands.
   - The person MUST be facing the camera or at MOST slightly to the side (3/4 view)
   - NEVER from behind (back view) - the face and frontal body MUST be visible
   - NEVER sitting, kneeling, or on a chair - always standing elegantly or leaning against wall
   - Maintain natural body posture and positioning with elegant, confident stance

3. FRAMING REQUIREMENTS:
   - Full body shot: Show complete person from head to feet
   - Medium-full shot: Show person from head to knees at minimum
   - Close-up portrait: Only for accessories (glasses, jewelry) - show head and neck
   - The person must be positioned in the center of the frame with adequate space around
```

---

### 10. OUTFIT COMPLETION LOGIC (FASHION INTELLIGENCE)

```
👗 OUTFIT COMPLETION LOGIC (AUTO-STYLING - FASHION INTELLIGENCE):

- IF only a TOP is provided: You MUST generate a matching BOTTOM and SHOES that fit the style.
  - E.g., Floral Shirt -> Chino shorts or Linen pants (Beach vibe) OR Jeans (City vibe).
  - NEVER leave the person in underwear or the original bottom if it clashes.
  - Choose complementary colors and styles that create a complete, coherent outfit.
  - The bottom and shoes should match the formality and style of the top.

- IF only a BOTTOM is provided: Generate a matching neutral T-shirt or Shirt.
  - Choose a top that complements the style and color of the bottom.
  - Create a complete, coherent outfit that looks intentional and stylish.
  - Avoid clashing colors or styles.

- IF only SHOES are provided: Generate appropriate matching TOP and BOTTOM.
  - Match the formality level: Sneakers -> Casual outfit, Dress shoes -> Formal outfit.
  - Create a complete, coherent outfit that showcases the shoes properly.

- IF SWIMWEAR (Bikini/Trunks) is provided:
  - If the input photo is NOT at a beach, DO NOT keep the original street clothes (jeans/jacket).
  - REPLACE the rest of the outfit with bare skin (appropriate for beach) or beach accessories (Sarong/Cover-up).
  - The goal is a complete, coherent beach outfit, not a mix-match of street clothes and swimwear.
  - Ensure the person looks naturally dressed for a beach/pool environment.

- If multiple products are provided, ensure they create a complete, coherent outfit.
- All pieces should complement each other in style, color, and formality level.
- The goal is a complete, intentional look, not a random mix of items.
```

---

### 11. FORCE REALISM PROTOCOL (Condicional)

**Ativado quando `gerarNovoLook: true`:**

```
⚠️⚠️⚠️ FORCE REALISM PROTOCOL (ACTIVATED - gerarNovoLook: true):
- Regardless of input pose, adjust the subject's stance slightly to look natural in the environment.
- RELIGHT the subject completely to match the background atmosphere - recalculate all lighting from scratch.
- NO 'cutout' effect - the person must be fully integrated into the scene with proper lighting, shadows, and depth.
- Allow micro-adjustments in pose (slight arm position, natural weight distribution) so the clothing drapes better.
- BUT MAINTAIN: Exact face, exact body proportions, exact skin tone - only lighting and subtle pose adjustments are allowed.
- The goal is natural integration while preserving 100% identity and product fidelity.
```

---

## 🎯 LÓGICA DE GERAÇÃO POR BOTÃO

### 1. BOTÃO "CRIAR LOOK" (Tela: Experimentar)

**Arquivo:** `apps-cliente/modelo-2/src/app/[lojistaId]/experimentar/page.tsx`  
**Função:** `handleVisualize`

**Payload enviado:**
```typescript
{
  lojistaId: string,
  original_photo_url: string, // HTTP URL (convertida de blob/data se necessário)
  products: Produto[],
  options: {
    gerarNovoLook: true, // SEMPRE true
    seed: Math.floor(Math.random() * 1000000), // Aleatório
    scenePrompts: ["Professional fashion photography, confident pose, natural lighting, looking at camera, high detail"]
  }
}
```

**Rota Backend:** `/api/generate-looks` (Frontend) → `/api/lojista/composicoes/generate` (Backend)

**Fluxo:**
1. Frontend converte `blob:` ou `data:` URLs para HTTP via `/api/upload-photo`
2. Frontend reserva crédito via `reserveCredit`
3. Frontend cria job no Firestore com status `PENDING`
4. Frontend retorna `202 Accepted` com `jobId` e `reservationId`
5. Frontend inicia polling em `/api/jobs/${jobId}`
6. Backend processa job via `/api/internal/process-job`
7. Backend usa `getSmartScenario` para determinar cenário
8. Backend chama `CompositionOrchestrator` com configurações unificadas
9. Backend atualiza job com resultado ou erro

**Configurações Aplicadas:**
- `temperature: 0.75`
- `aspectRatio: '9:16'`
- `gerarNovoLook: true`
- `smartFraming: "Full body shot, feet fully visible, standing on floor"` (exceto apenas acessórios)
- `smartContext`: Determinado por `getSmartScenario` baseado em categorias de produtos

---

### 2. BOTÃO "REMIXAR LOOK" (Tela: Resultado)

**Arquivo:** `apps-cliente/modelo-2/src/app/[lojistaId]/resultado/page.tsx`  
**Função:** `handleRegenerate`

**Payload enviado:**
```typescript
{
  lojistaId: string,
  original_photo_url: string, // HTTP URL (convertida de blob/data se necessário)
  products: Produto[],
  options: {
    gerarNovoLook: true, // SEMPRE true
    seed: Math.floor(Math.random() * 1000000), // Aleatório
    scenePrompts: [randomPose] // Uma das 10 poses elegantes e estáticas
  }
}
```

**Rota Backend:** `/api/generate-looks/remix` (Frontend) → `/api/lojista/composicoes/generate` (Backend)

**Poses Disponíveis (10 poses elegantes e estáticas):**
1. "Standing elegantly with straight back, relaxed shoulders, hands naturally at sides, confident high fashion editorial pose"
2. "Leaning against wall casually with relaxed posture, hands visible, one leg crossed, confident casual stance, static elegant pose"
3. "Standing with hands in pockets, relaxed body language, natural positioning, casual confident expression, stylish static pose"
4. "Looking over shoulder with engaging expression, elegant angle, direct eye contact, fashion editorial pose, static confident stance"
5. "Standing with one hand on hip, confident powerful pose, fashion model stance, strong presence, elegant static posture"
6. "Standing with arms crossed, confident assertive pose, strong body language, professional demeanor, elegant static stance"
7. "Standing with slight turn towards camera, elegant confident pose, engaging expression, professional photography style, static editorial pose"
8. "Standing with weight on one leg, relaxed confident pose, natural body language, fashion model stance, elegant static posture"
9. "Standing with hands on hips, powerful confident pose, strong presence, fashion editorial style, elegant static stance"
10. "Standing with hands folded in front, elegant sophisticated pose, confident expression, high fashion editorial style, static professional stance"

**Fluxo:**
1. Frontend converte `blob:` ou `data:` URLs para HTTP via `/api/upload-photo`
2. Frontend reserva crédito via `reserveCredit`
3. Frontend cria job no Firestore com status `PENDING`
4. Frontend retorna `202 Accepted` com `jobId` e `reservationId`
5. Frontend inicia polling em `/api/jobs/${jobId}`
6. Backend processa job via `/api/internal/process-job`
7. Backend usa `getSmartScenario` para determinar cenário
8. Backend chama `CompositionOrchestrator` com configurações unificadas
9. Backend atualiza job com resultado ou erro

**Configurações Aplicadas:**
- `temperature: 0.75`
- `aspectRatio: '9:16'`
- `gerarNovoLook: true`
- `smartFraming: "Full body shot, feet fully visible, standing on floor"` (exceto apenas acessórios)
- `smartContext`: Determinado por `getSmartScenario` baseado em categorias de produtos
- `scenePrompts`: Uma das 10 poses elegantes e estáticas (aleatória)

---

### 3. BOTÃO "TROCAR PRODUTO" (Tela: Resultado)

**Arquivo:** `apps-cliente/modelo-2/src/app/[lojistaId]/resultado/page.tsx`  
**Função:** `handleAddAccessory` ou `handleRefine`

**Payload enviado:**
```typescript
{
  lojistaId: string,
  original_photo_url: string, // HTTP URL (convertida de blob/data se necessário)
  products: Produto[], // Novos produtos a adicionar
  options: {
    gerarNovoLook: true, // SEMPRE true
    seed: Math.floor(Math.random() * 1000000), // Aleatório
    scenePrompts: ["Professional fashion photography, confident pose, natural lighting, looking at camera, high detail"]
  }
}
```

**Rota Backend:** `/api/generate-looks` (Frontend) → `/api/lojista/composicoes/generate` (Backend)

**Fluxo:**
1. Frontend converte `blob:` ou `data:` URLs para HTTP via `/api/upload-photo`
2. Frontend reserva crédito via `reserveCredit`
3. Frontend cria job no Firestore com status `PENDING`
4. Frontend retorna `202 Accepted` com `jobId` e `reservationId`
5. Frontend inicia polling em `/api/jobs/${jobId}`
6. Backend processa job via `/api/internal/process-job`
7. Backend usa `getSmartScenario` para determinar cenário
8. Backend chama `CompositionOrchestrator` com configurações unificadas
9. Backend atualiza job com resultado ou erro

**Configurações Aplicadas:**
- `temperature: 0.75`
- `aspectRatio: '9:16'`
- `gerarNovoLook: true`
- `smartFraming: "Full body shot, feet fully visible, standing on floor"` (exceto apenas acessórios)
- `smartContext`: Determinado por `getSmartScenario` baseado em categorias de produtos

---

## 🚫 NEGATIVE PROMPTS

### Base Negative Prompt

```
(deformed, distorted, disfigured:1.3), poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, (mutated hands and fingers:1.4), disconnected limbs, mutation, mutated, ugly, blurry, amputation, (head cut off:3.0), (headless:3.0), (no head:3.0), (missing head:3.0), (cropped head:3.0), (head cropped:3.0), (face cut off:3.0), (face missing:3.0), (headless person:3.0), (person without head:3.0), (decapitated:3.0), (head removed:3.0), (head obscured:3.0), (head hidden:3.0), (face obscured:3.0), (face hidden:3.0), (partial head:2.5), (head partially visible:2.5), (head out of frame:2.5), text, watermark, bad composition, duplicate, (original clothes visible:1.6), (two layers of clothing:1.6), (multiple outfits:1.6), (old outfit:1.4), (no shadows:2.0), (person without shadow:2.0), (floating person:1.6), (unrealistic lighting:2.0), (flat lighting:2.0), (no depth:1.4), (harsh shadows:1.5), (unnatural shadows:1.5), (wrong shadow direction:1.5), (sitting:1.5), (seated:1.5), (chair:1.5), (bench:1.5), (kneeling:1.5), (walking:2.0), (running:2.0), (dynamic movement:2.0), (person walking:2.0), (person running:2.0), (mid-stride:2.0), (in motion:2.0), (artificial walking:2.0), (awkward movement:2.0), (mannequin body:2.0), (plastic skin:2.0), (rigid clothing:1.8), (stiff pose:1.8), (neck stand:2.0), (ghost mannequin:2.0), (artificial pose:1.6), (artificial body shape:1.6), (wrong proportions:1.5), (mismatched body:1.5), (back view:1.8), (person facing away:1.8), (back turned:1.8), (rear view:1.8), (different face:2.0), (different person:2.0), (face changed:2.0), (altered facial features:2.0), (different eye color:2.0), (different nose shape:2.0), (different mouth shape:2.0), (different face shape:2.0), (different skin tone:2.0), (different body shape:2.0), (different body proportions:2.0), (altered body:2.0), (face swap:2.0), (different person's face:2.0), (face replacement:2.0), (cgi face:1.5), (filter:1.5), (smooth skin:1.5), (instagram face:1.5), (product not visible:1.5), (product missing:1.5), (product not applied:1.5)
```

### Body Cut Negative (Sempre Aplicado)

```
(body cut off:2.5), (torso cut off:2.5), (legs cut off:2.5), (arms cut off:2.5), (cropped body:2.5), (cropped torso:2.5), (cropped legs:2.5), (partial body:2.5), (body partially visible:2.5), (body out of frame:2.5), (tight crop:2.0), (close crop:2.0)
```

### Feet Negative (Condicional - Se Calçados)

Se produto é calçado:
```
(feet cut off:2.0), (cropped legs:2.0), (legs cut off:2.0), close up portrait, portrait shot, upper body only
```

Se produto não é calçado:
```
(feet cut off:1.8), (cropped legs:1.8), (legs cut off:1.8)
```

### Phantom Boots Negative (Condicional - Se Beach sem Sapatos)

```
(boots:2.0), (shoes:1.5), (sneakers:1.5)
```

### Glasses Negative (Condicional - Se Óculos)

```
(glasses on floor:2.0), (glasses in hand:2.0)
```

### Forbidden Scenarios Negative (Condicional)

Se `forbiddenScenarios` fornecido:
```
(${scenario}:2.0), ... (para cada cenário proibido)
```

### Additional Forbidden Reinforcement (Condicional - Se Beach Proibido)

```
(beach scene:2.5), (ocean background:2.5), (sand:2.5), (palm trees:2.5), (tropical:2.5), (summer beach:2.5), (swimming pool:2.5), (beach resort:2.5), (seaside:2.5), (paradise beach:2.5), (sunny beach:2.5)
```

### Virtual Try-On Negative (Sempre Aplicado)

```
(double clothing:2.0), (multiple shirts:2.0), (clothing overlap:2.0), (ghosting:2.0), (visible original clothes:2.0), (bad fit:2.0), (floating clothes:2.0), (sticker effect:2.0), (unnatural fabric folds:2.0), (distorted body:2.0), (wrong anatomy:2.0), (clothing on top of clothes:2.0), (overlay clothing:2.0), (transparent clothing:2.0)
```

### Night Scene Negative (Sempre Aplicado)

```
(night scene:2.5), (dark background:2.5), (evening:2.5), (sunset:2.5), (dusk:2.5), (nighttime:2.5), (neon lights:2.5), (cyberpunk:2.5), (artificial night lighting:2.5), (night street:2.5), (dark alley:2.5), (nightclub:2.5), (bad shadows:2.0), (wrong lighting:2.0), (floating person:2.0), (no shadows:2.0), (unnatural shadows:2.0)
```

---

## 🧠 LÓGICA DE COMPLETAMENTO DE LOOK

### Detecção de Produtos

O sistema detecta automaticamente:
- `hasTop`: Camisa, blusa, blouse, shirt, top, jaqueta, jacket, moletom, hoodie
- `hasBottom`: Calça, pants, jeans, saia, skirt, shorts, vestido, dress
- `hasShoes`: Calçado, calcado, sapato, tênis, tenis, sneaker, shoe, footwear
- `hasGlasses`: Óculos, oculos, glasses, sunglasses
- `hasBeach`: Biquíni, bikini, maiô, maio, sunga, praia, beachwear, saída de praia, swimwear, moda praia, banho, nado, piscina, swim, beach

### Regras de Completamento

1. **Apenas TOP fornecido:**
   - Gera BOTTOM e SHOES que combinam com o estilo
   - Exemplo: Floral Shirt → Chino shorts ou Linen pants (Beach vibe) OU Jeans (City vibe)
   - NUNCA deixa a pessoa em roupa íntima ou com a parte inferior original se não combinar

2. **Apenas BOTTOM fornecido:**
   - Gera TOP neutro (T-shirt ou Shirt) que complementa o estilo e cor

3. **Apenas SHOES fornecido:**
   - Gera TOP e BOTTOM apropriados
   - Nível de formalidade: Sneakers → Casual, Dress shoes → Formal

4. **SWIMWEAR fornecido:**
   - Se foto original NÃO for de praia, NÃO mantém roupas de rua (jeans/jacket)
   - SUBSTITUI o resto do outfit por pele nua (apropriado para praia) ou acessórios de praia (Sarong/Cover-up)
   - Objetivo: look completo e coerente de praia, não mix-match

---

## 📁 ESTRUTURA DE ARQUIVOS

### Backend (paineladm)

#### Arquivo Principal: `src/lib/ai-services/composition-orchestrator.ts`
- **Função Principal:** `createComposition`
- **Responsabilidade:** Orquestrar toda a geração de imagens
- **API Usada:** Gemini 2.5 Flash Image via Vertex AI

#### Rotas de API:

1. **`src/app/api/lojista/composicoes/generate/route.ts`**
   - Endpoint: `/api/lojista/composicoes/generate`
   - Método: POST
   - Função: Receber requisição de geração, criar job assíncrono
   - Retorna: `202 Accepted` com `jobId` e `reservationId`

2. **`src/app/api/internal/process-job/route.ts`**
   - Endpoint: `/api/internal/process-job`
   - Método: POST
   - Função: Processar job assíncrono, chamar orchestrator
   - Retorna: Atualiza job no Firestore com resultado

3. **`src/lib/scenarioMatcher.ts`**
   - Função: `getSmartScenario`
   - Responsabilidade: Determinar cenário inteligente baseado em categorias de produtos
   - Regras: Bikini Law, Gym Integrity, etc.

### Frontend (apps-cliente/modelo-2)

#### Telas:

1. **`src/app/[lojistaId]/experimentar/page.tsx`**
   - Função: `handleVisualize` (Criar Look)
   - Função: `handleRefine` (Trocar Produto)

2. **`src/app/[lojistaId]/resultado/page.tsx`**
   - Função: `handleRegenerate` (Remixar Look)
   - Função: `handleAddAccessory` (Trocar Produto)

#### Rotas de API Frontend:

1. **`src/app/api/generate-looks/route.ts`**
   - Endpoint: `/api/generate-looks`
   - Método: POST
   - Função: Receber requisição do frontend, criar job, retornar `jobId`

2. **`src/app/api/generate-looks/remix/route.ts`**
   - Endpoint: `/api/generate-looks/remix`
   - Método: POST
   - Função: Receber requisição de remix, criar job, retornar `jobId`

3. **`src/app/api/jobs/[jobId]/route.ts`**
   - Endpoint: `/api/jobs/${jobId}`
   - Método: GET
   - Função: Polling de status do job

4. **`src/app/api/upload-photo/route.ts`**
   - Endpoint: `/api/upload-photo`
   - Método: POST
   - Função: Converter `blob:` ou `data:` URLs para HTTP URLs

---

## 🔐 VARIÁVEIS DE AMBIENTE

### Backend (paineladm)

```env
# Google Cloud / Vertex AI
GOOGLE_CLOUD_PROJECT_ID=seu-projeto-id
GOOGLE_CLOUD_LOCATION=us-central1

# Firebase
FIREBASE_PROJECT_ID=seu-projeto-id
FIREBASE_CLIENT_EMAIL=seu-email@seu-projeto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Storage
FIREBASE_STORAGE_BUCKET=seu-bucket.appspot.com

# Backend URL (para process-job)
NEXT_PUBLIC_BACKEND_URL=https://paineladm.experimenteai.com.br
```

### Frontend (apps-cliente/modelo-2)

```env
# Backend URL
NEXT_PUBLIC_BACKEND_URL=https://paineladm.experimenteai.com.br
NEXT_PUBLIC_PAINELADM_URL=https://paineladm.experimenteai.com.br
```

---

## 🔄 FLUXO COMPLETO DE GERAÇÃO

### 1. Frontend Inicia Geração

1. Usuário clica em "Criar Look", "Remixar Look" ou "Trocar Produto"
2. Frontend converte `blob:` ou `data:` URLs para HTTP via `/api/upload-photo`
3. Frontend reserva crédito via `reserveCredit`
4. Frontend cria payload com:
   - `lojistaId`
   - `original_photo_url` (HTTP URL)
   - `products` ou `productIds`
   - `options.gerarNovoLook: true`
   - `options.seed: Math.floor(Math.random() * 1000000)`
   - `options.scenePrompts` (se remix, uma das 10 poses)

### 2. Frontend Cria Job

1. Frontend chama `/api/generate-looks` ou `/api/generate-looks/remix`
2. Backend valida payload
3. Backend rejeita `blob:` URLs (retorna erro)
4. Backend converte `data:` URLs para HTTP (se necessário)
5. Backend reserva crédito via `reserveCredit`
6. Backend cria job no Firestore:
   ```typescript
   {
     status: "PENDING",
     lojistaId: string,
     personImageUrl: string,
     productIds: string[],
     reservationId: string,
     options: {
       gerarNovoLook: true,
       seed: number,
       scenePrompts: string[]
     },
     createdAt: Timestamp,
     updatedAt: Timestamp
   }
   ```
7. Backend retorna `202 Accepted` com `jobId` e `reservationId`

### 3. Backend Processa Job

1. Backend chama `/api/internal/process-job` (via cron ou webhook)
2. Backend busca job do Firestore
3. Backend valida `personImageUrl` (rejeita `blob:`, converte `data:`)
4. Backend busca produtos do Firestore
5. Backend valida que todos os produtos têm URLs válidas
6. Backend usa `getSmartScenario` para determinar:
   - `smartContext` (ex: "Beach", "Office", "City Street")
   - `smartFraming` (ex: "Full body shot, feet fully visible, standing on floor")
   - `forbiddenScenarios` (ex: ["Beach", "Pool"] se produto é formal)
7. Backend chama `CompositionOrchestrator.createComposition` com:
   - `personImageUrl` (HTTP URL)
   - `allProductImageUrls` (HTTP URLs)
   - `options.gerarNovoLook: true`
   - `options.smartContext`
   - `options.smartFraming`
   - `options.forbiddenScenarios`
   - `options.scenePrompts` (se remix)
   - `options.seed`
   - `options.productsData`

### 4. Orchestrator Gera Imagem

1. Orchestrator constrói prompt completo (ordem crítica)
2. Orchestrator detecta produtos (hasTop, hasBottom, hasShoes, hasBeach)
3. Orchestrator aplica lógica de completamento de look
4. Orchestrator constrói negative prompt completo
5. Orchestrator chama Gemini 2.5 Flash Image API:
   ```typescript
   {
     prompt: creativePrompt,
     imageUrls: [personImageUrl, ...allProductImageUrls],
     negativePrompt: strongNegativePrompt,
     temperature: 0.75,
     aspectRatio: "9:16",
     safetySettings: [...]
   }
   ```
6. Gemini retorna imagem gerada
7. Orchestrator retorna `imageUrl`

### 5. Backend Atualiza Job

1. Backend atualiza job no Firestore:
   ```typescript
   {
     status: "COMPLETED",
     result: {
       imageUrl: string
     },
     updatedAt: Timestamp
   }
   ```
2. Backend consome crédito via `consumeGenerationCredit`

### 6. Frontend Recebe Resultado

1. Frontend faz polling em `/api/jobs/${jobId}`
2. Frontend recebe status `COMPLETED` com `result.imageUrl`
3. Frontend exibe imagem gerada
4. Frontend atualiza `sessionStorage` com novo look

---

## 📊 CONFIGURAÇÕES DE API

### Gemini 2.5 Flash Image

**Arquivo:** `src/lib/ai-services/gemini-flash-image.ts`

**Configurações:**
- **Modelo:** `gemini-2.5-flash-image`
- **Endpoint:** `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`
- **Temperature:** `0.75` (Sempre)
- **TopP:** `0.95`
- **TopK:** `40`
- **AspectRatio:** `9:16` (Sempre, forçado)
- **SafetySettings:** `BLOCK_MEDIUM_AND_ABOVE` para todas as categorias

**Request Body:**
```typescript
{
  contents: [{
    parts: [
      { text: creativePrompt },
      { inlineData: { mimeType: "image/jpeg", data: base64 } }, // Person
      { inlineData: { mimeType: "image/jpeg", data: base64 } }, // Product 1
      // ... mais produtos
    ]
  }],
  generationConfig: {
    temperature: 0.75,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192
  },
  safetySettings: [
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
  ]
}
```

---

## 🎨 DETALHES TÉCNICOS

### Smart Framing

**Lógica:**
- Se apenas acessórios (óculos, joias) → Close-up portrait permitido
- Caso contrário → SEMPRE "Full body shot, feet fully visible, standing on floor"

**Implementação:**
```typescript
const hasOnlyAccessories = productsData.length > 0 && 
  !hasTop && !hasBottom && !hasShoes && 
  (hasGlasses || allText.match(/relógio|relogio|watch|joia|jewelry|joias|cosmético|cosmetico/i));

if (!hasOnlyAccessories && !smartFraming.includes("Full body")) {
  finalFraming = "Full body shot, feet fully visible, standing on floor";
}
```

### Smart Context (getSmartScenario)

**Regras:**
- **Bikini Law:** Se produto é biquíni/maiô → Força cenário "Beach" e proíbe "Office", "Gym"
- **Gym Integrity:** Se produto é fitness → Força cenário "Gym" e proíbe "Beach", "Office"
- **Formal Wear:** Se produto é terno/vestido formal → Força cenário "Office" ou "City Street" e proíbe "Beach", "Gym"
- **Casual Wear:** Se produto é casual → Permite "City Street", "Park", "Café"
- **Beach Wear:** Se produto é praia → Força cenário "Beach" e proíbe "Office", "Gym"

**Implementação:** Ver `src/lib/scenarioMatcher.ts`

### Leg Extension Logic

**Ativado quando:** `hasShoes === true`

**Lógica:**
- Se foto original está cortada (sem pernas/pés)
- Estende pernas naturalmente mantendo:
  - Mesmas proporções corporais
  - Mesmo tom de pele (EXATO)
  - Mesma textura de pele
  - Mesma estrutura corporal
  - Mesmas curvas e contornos

**Prompt Adicionado:**
```
⚠️⚠️⚠️ CRITICAL BODY EXTENSION (PHASE 24 - SEMELHANÇA FÍSICA COMPLETA):
If the original photo [IMAGEM_PESSOA] is cropped (knee-up, upper body only, or missing legs), you MUST EXTEND THE BODY NATURALLY while maintaining 100% PHYSICAL RESEMBLANCE:
[... instruções detalhadas ...]
```

---

## 🔍 VALIDAÇÕES CRÍTICAS

### Validação de URLs

1. **Frontend:**
   - Rejeita `blob:` URLs → Converte via `/api/upload-photo`
   - Aceita `data:` URLs → Converte via `/api/upload-photo`
   - Aceita HTTP URLs → Usa diretamente

2. **Backend (generate/route.ts):**
   - Rejeita `blob:` URLs → Retorna erro 400
   - Aceita `data:` URLs → Converte para HTTP
   - Aceita HTTP URLs → Usa diretamente

3. **Backend (process-job/route.ts):**
   - Rejeita `blob:` URLs → Retorna erro
   - Aceita `data:` URLs → Converte para HTTP
   - Aceita HTTP URLs → Usa diretamente

### Validação de Produtos

1. Todos os produtos devem ter `id` válido
2. Todos os produtos devem ter pelo menos uma URL válida (`productUrl` ou `imagemUrl`)
3. URLs devem ser HTTP ou `data:image/`
4. Se nenhum produto válido encontrado → Erro 400

### Validação de Créditos

1. Reserva de crédito antes de criar job
2. Rollback de crédito se job falhar
3. Consumo de crédito apenas quando job completar com sucesso

---

## 📝 NOTAS IMPORTANTES

### Cenário Fixo NÃO É USADO

**IMPORTANTE:** O sistema NÃO usa `scenarioImageUrl` como input visual. O cenário é sempre GERADO via prompt.

**Implementação:**
```typescript
// SEMPRE undefined - forçar geração via prompt
scenarioImageUrl = undefined;

// Array de imagens contém APENAS:
const imageUrls = [
  finalPersonImageUrl, // FOTO ORIGINAL
  ...allProductImageUrls, // PRODUTOS
  // NÃO incluir scenarioImageUrl
];
```

### Ordem de Prioridade dos Blocos

1. **PRO PHOTOGRAPHY STANDARDS** tem prioridade sobre instruções genéricas de cenário
2. **ANATOMICAL SAFETY** tem prioridade máxima (proteção de cabeça)
3. **IDENTITY LOCK** tem prioridade #1 (preservação de identidade)
4. **PRODUCT FIDELITY** é crítico (preservação de produtos)

### Unificação de Qualidade

**TODOS os modos (Criar Look, Remix, Trocar Produto) usam:**
- `temperature: 0.75`
- `aspectRatio: '9:16'`
- `gerarNovoLook: true`
- `smartFraming: "Full body shot, feet fully visible, standing on floor"` (exceto apenas acessórios)
- Mesmas regras de postura (elegante e estática)
- Mesmos negative prompts
- Mesmos blocos de segurança

---

## 🔄 RESTAURAÇÃO DO BACKUP

Para restaurar esta configuração:

1. **Restaurar Prompts:**
   - Copiar todos os blocos de prompt para `composition-orchestrator.ts`
   - Manter a ordem crítica dos blocos

2. **Restaurar Configurações:**
   - `temperature: 0.75`
   - `aspectRatio: '9:16'`
   - `gerarNovoLook: true` (sempre)

3. **Restaurar Negative Prompts:**
   - Copiar `baseNegativePrompt` completo
   - Aplicar todas as regras condicionais

4. **Restaurar Lógica de Completamento:**
   - Copiar lógica de detecção de produtos
   - Copiar regras de completamento de look

5. **Restaurar Poses do Remix:**
   - Copiar as 10 poses elegantes e estáticas
   - Remover poses de movimento

6. **Verificar Variáveis de Ambiente:**
   - Configurar todas as variáveis listadas
   - Verificar credenciais do Google Cloud

---

## ✅ CHECKLIST DE RESTAURAÇÃO

- [ ] Prompts do sistema restaurados na ordem correta
- [ ] Configurações de API (temperature, aspectRatio) aplicadas
- [ ] Negative prompts completos restaurados
- [ ] Lógica de completamento de look implementada
- [ ] Poses do remix atualizadas (elegantes e estáticas)
- [ ] Validações de URL implementadas
- [ ] Fluxo assíncrono de jobs funcionando
- [ ] Variáveis de ambiente configuradas
- [ ] Testes de geração realizados
- [ ] Verificação de qualidade visual

---

**FIM DO BACKUP**

**Data:** 03 de Dezembro de 2025  
**Versão:** Configuração Atual de Produção  
**Status:** Completo e Testado

