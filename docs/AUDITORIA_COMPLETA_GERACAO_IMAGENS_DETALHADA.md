# AUDITORIA COMPLETA - GERAÇÃO DE IMAGENS
## Documentação Detalhada de Todos os Botões que Geram Imagens

**Data:** 2025-01-XX  
**Versão:** 3.0  
**Última Atualização:** Após implementação do Bloco de Fotografia Profissional

---

## ÍNDICE

1. [Visão Geral do Sistema](#visão-geral)
2. [Botão "Criar Look" (Experimentar/Refino)](#botão-criar-look)
3. [Botão "Remixar Look"](#botão-remixar-look)
4. [Botão "Trocar Produto"](#botão-trocar-produto)
5. [Composition Orchestrator - Prompt Completo](#composition-orchestrator)
6. [Fluxo de Processamento Assíncrono](#fluxo-assíncrono)
7. [Configurações e Parâmetros](#configurações)

---

## VISÃO GERAL DO SISTEMA {#visão-geral}

### Arquitetura

```
Frontend (apps-cliente/modelo-2)
  ↓
API Route (Frontend) → /api/generate-looks ou /api/generate-looks/remix
  ↓
Backend (paineladm) → /api/lojista/composicoes/generate
  ↓
Process Job (Assíncrono) → /api/internal/process-job
  ↓
Composition Orchestrator → Gemini 2.5 Flash Image
```

### Componentes Principais

1. **Frontend Pages:**
   - `experimentar/page.tsx` - Tela de seleção de produtos e foto
   - `resultado/page.tsx` - Tela de visualização e ações (remix, trocar produto)

2. **Frontend API Routes:**
   - `/api/generate-looks/route.ts` - Endpoint para criar look
   - `/api/generate-looks/remix/route.ts` - Endpoint para remixar look

3. **Backend API Routes:**
   - `/api/lojista/composicoes/generate/route.ts` - Processamento principal
   - `/api/internal/process-job/route.ts` - Processamento assíncrono de jobs

4. **AI Services:**
   - `composition-orchestrator.ts` - Orquestrador principal
   - `gemini-flash-image.ts` - Serviço Gemini 2.5 Flash Image

---

## BOTÃO "CRIAR LOOK" (EXPERIMENTAR/REFINO) {#botão-criar-look}

### Localização
- **Tela:** `/[lojistaId]/experimentar`
- **Arquivo:** `apps-cliente/modelo-2/src/app/[lojistaId]/experimentar/page.tsx`
- **Função:** `handleVisualize()` (linha ~1333)

### Fluxo Completo

#### 1. Preparação da Foto

```typescript
// Prioridade 1: Buscar foto original do sessionStorage
const originalPhotoUrl = sessionStorage.getItem(`original_photo_${lojistaId}`)

// Se for blob: ou data:, converter para File e fazer upload
if (originalPhotoUrl.startsWith('blob:') || originalPhotoUrl.startsWith('data:')) {
  const response = await fetch(originalPhotoUrl)
  const blob = await response.blob()
  const file = new File([blob], fileName, { type: blob.type })
  personImageUrl = await uploadPersonPhoto(file) // Upload para Firebase Storage
} else {
  personImageUrl = originalPhotoUrl // URL HTTP já existente
}
```

#### 2. Preparação dos Produtos

```typescript
// Buscar produtos selecionados do sessionStorage
const selectedProducts = JSON.parse(sessionStorage.getItem(`products_${lojistaId}`))
const productIds = selectedProducts.map((p) => p.id).filter(Boolean)
```

#### 3. Payload Enviado

```typescript
const payload = {
  original_photo_url: personImageUrl, // Foto original (Source of Truth)
  personImageUrl: personImageUrl,     // Compatibilidade
  productIds: productIds,              // Array de IDs dos produtos
  lojistaId: lojistaId,
  customerId: clienteId,
  customerName: clienteNome,
  options: {
    quality: "high",
    skipWatermark: true,
    lookType: "creative",              // Sempre "creative" para multi-produto
  },
  sceneInstructions: "IMPORTANT: The scene must be during DAYTIME..."
}
```

#### 4. Chamada da API

```typescript
// POST /api/generate-looks
const response = await fetch("/api/generate-looks", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
  signal: controller.signal, // Timeout: 2min desktop, 3min mobile
})
```

#### 5. Resposta Assíncrona (202 Accepted)

```typescript
if (response.status === 202 && responseData.jobId) {
  // Iniciar polling
  const pollJobStatus = async () => {
    while (Date.now() - startTime < 180000) { // 3 minutos máximo
      const statusResponse = await fetch(`/api/jobs/${jobId}`)
      const statusData = await statusResponse.json()
      
      if (statusData.status === "COMPLETED") {
        return {
          imageUrl: statusData.result.imageUrl,
          compositionId: statusData.result.compositionId,
        }
      }
      await new Promise(resolve => setTimeout(resolve, 2000)) // Poll a cada 2s
    }
  }
}
```

#### 6. Salvar Resultados

```typescript
sessionStorage.setItem(`looks_${lojistaId}`, JSON.stringify([generatedLook]))
sessionStorage.setItem(`photo_${lojistaId}`, personImageUrl)
sessionStorage.setItem(`products_${lojistaId}`, JSON.stringify(selectedProducts))
sessionStorage.setItem(`original_photo_${lojistaId}`, personImageUrl) // Preservar original
router.push(`/${lojistaId}/resultado`)
```

### Rota Backend: `/api/generate-looks/route.ts`

#### Processamento

1. **Reservar Crédito:**
```typescript
const creditReservation = await reserveCredit(body.lojistaId)
```

2. **Validar Dados:**
```typescript
if (!originalPhotoUrl || !body.productIds || body.productIds.length === 0) {
  return NextResponse.json({ error: "..." }, { status: 400 })
}
```

3. **Criar Job Assíncrono:**
```typescript
const jobData = {
  lojistaId: body.lojistaId,
  status: "PENDING",
  reservationId: creditReservation.reservationId,
  personImageUrl: finalPersonImageUrl,
  productIds: body.productIds,
  options: {
    ...body.options,
    original_photo_url: finalPersonImageUrl,
    sceneInstructions: body.sceneInstructions,
  },
}
await jobsRef.doc(jobId).set(sanitizedJobData)
```

4. **Disparar Processamento:**
```typescript
fetch(`${backendUrl}/api/internal/process-job`, {
  method: "POST",
  body: JSON.stringify({ jobId }),
}) // Fire and forget
```

5. **Retornar 202 Accepted:**
```typescript
return NextResponse.json({
  jobId,
  status: "PENDING",
  reservationId: creditReservation.reservationId,
}, { status: 202 })
```

### Características Específicas

- ✅ **Sempre usa foto ORIGINAL** (não foto gerada anteriormente)
- ✅ **Suporta múltiplos produtos** (até 2 produtos simultâneos)
- ✅ **Look Type:** `"creative"` (sempre)
- ✅ **Watermark:** Desabilitado por padrão (`skipWatermark: true`)
- ✅ **Cenário:** Determinado pelo backend via `getSmartScenario`
- ✅ **Framing:** Forçado para "Full body shot" (exceto apenas acessórios)

---

## BOTÃO "REMIXAR LOOK" {#botão-remixar-look}

### Localização
- **Tela:** `/[lojistaId]/resultado`
- **Arquivo:** `apps-cliente/modelo-2/src/app/[lojistaId]/resultado/page.tsx`
- **Função:** `handleRegenerate()` (linha ~1355)

### Fluxo Completo

#### 1. Preparação da Foto (MESMA LÓGICA DO CRIAR LOOK)

```typescript
// Prioridade 1: Buscar foto original do sessionStorage
const originalPhotoUrl = sessionStorage.getItem(`original_photo_${lojistaId}`)

// Converter blob/data para HTTP se necessário
if (originalPhotoUrl.startsWith('blob:') || originalPhotoUrl.startsWith('data:')) {
  const file = await convertBlobToFile(originalPhotoUrl)
  personImageUrl = await uploadPersonPhoto(file)
} else {
  personImageUrl = originalPhotoUrl
}
```

#### 2. Preparação dos Produtos

```typescript
// Buscar produtos do último look gerado
const storedProducts = sessionStorage.getItem(`products_${lojistaId}`)
const products = JSON.parse(storedProducts)
const productIds = products.map((p: any) => p.id).filter(Boolean)
```

#### 3. Payload Enviado

```typescript
const payload = {
  original_photo_url: personImageUrl,
  products: products,              // Array completo de produtos (não apenas IDs)
  productIds: productIds,          // Array de IDs
  lojistaId: lojistaId,
  customerId: clienteId,
  customerName: clienteNome,
  options: {
    quality: "high",
    skipWatermark: true,
    lookType: "creative",
  },
}
```

#### 4. Chamada da API

```typescript
// POST /api/generate-looks/remix
const response = await fetch("/api/generate-looks/remix", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
  signal: controller.signal, // Timeout: 45-60s (apenas criação do job)
})
```

#### 5. Resposta Assíncrona (202 Accepted)

```typescript
if (response.status === 202 && responseData.jobId) {
  // Polling (MESMA LÓGICA DO CRIAR LOOK)
  const pollJobStatus = async () => {
    const maxPollingTime = 300000 // 5 minutos (aumentado para remix)
    while (Date.now() - startTime < maxPollingTime) {
      const statusResponse = await fetch(`/api/jobs/${jobId}`)
      // ... mesmo processo de polling
    }
  }
}
```

#### 6. Salvar Resultados e Recarregar

```typescript
sessionStorage.setItem(`looks_${lojistaId}`, JSON.stringify([generatedLook]))
sessionStorage.setItem(`new_looks_generated_${lojistaId}`, "true")
// Resetar votação
sessionStorage.removeItem(`hasVoted_${lojistaId}`)
sessionStorage.removeItem(`votedType_${lojistaId}`)
window.location.reload() // Recarregar para mostrar novo look
```

### Rota Backend: `/api/generate-looks/remix/route.ts`

#### Diferenças do Criar Look

1. **Geração de Prompt de Pose:**
```typescript
const poses = [
  "Walking confidently towards camera...",
  "Leaning against wall casually...",
  "Standing with hands in pockets...",
  // ... 10 poses diferentes
]
const randomPose = poses[Math.floor(Math.random() * poses.length)]
const randomSeed = Math.floor(Math.random() * 999999)

const remixPrompt = `${subjectDescription} ${randomPose} wearing ${productPrompt}...`
```

2. **Opções Específicas:**
```typescript
options: {
  ...body.options,
  gerarNovoLook: true,        // CRÍTICO: Sempre ativar no remix
  seed: randomSeed,            // Seed aleatório para variar
  scenePrompts: [remixPrompt], // Prompt de pose específico
}
```

3. **Validação de URL:**
```typescript
// Rejeitar blob: URLs - frontend deve converter antes
if (photoUrl.startsWith('blob:')) {
  return NextResponse.json({ error: "..." }, { status: 400 })
}
```

### Características Específicas

- ✅ **Sempre usa foto ORIGINAL** (mesma lógica do criar look)
- ✅ **Gera nova pose aleatória** (10 poses diferentes)
- ✅ **Seed aleatório** para variar geração
- ✅ **Flag `gerarNovoLook: true`** ativa mudança de pose
- ✅ **Cenário variado** pelo backend via `getSmartScenario`
- ✅ **Timeout de polling:** 5 minutos (vs 3 minutos do criar look)
- ✅ **Recarrega página** após sucesso para mostrar novo look

---

## BOTÃO "TROCAR PRODUTO" {#botão-trocar-produto}

### Localização
- **Tela:** `/[lojistaId]/resultado`
- **Arquivo:** `apps-cliente/modelo-2/src/app/[lojistaId]/resultado/page.tsx`
- **Função:** `handleAddAccessory()` (linha ~1974)

### Fluxo Completo

#### 1. Preparação para Modo Refinamento

```typescript
// Preservar foto original
const originalPhoto = sessionStorage.getItem(`original_photo_${lojistaId}`)
if (!originalPhoto) {
  const uploadPhoto = sessionStorage.getItem(`photo_${lojistaId}`)
  if (uploadPhoto) {
    sessionStorage.setItem(`original_photo_${lojistaId}`, uploadPhoto)
  }
}

// Salvar imagem base para refinamento (última foto gerada)
sessionStorage.setItem(`refine_baseImage_${lojistaId}`, currentLook.imagemUrl)
sessionStorage.setItem(`refine_compositionId_${lojistaId}`, currentLook.compositionId)

// Marcar modo refinamento
sessionStorage.setItem(`refine_mode_${lojistaId}`, "true")

// Redirecionar para experimentar em modo refine
router.push(`/${lojistaId}/experimentar?mode=refine`)
```

#### 2. Na Tela Experimentar (Modo Refine)

```typescript
// Carregar produtos selecionados anteriormente
const storedProducts = sessionStorage.getItem(`products_${lojistaId}`)
if (storedProducts) {
  const parsedProducts = JSON.parse(storedProducts)
  setSelectedProducts(parsedProducts) // Produtos aparecem como selecionados
}

// Mostrar imagem base ao invés de permitir upload
setUserPhotoUrl(baseImageUrl) // Última foto gerada
```

#### 3. Seleção de Novo Produto

```typescript
// Usuário seleciona 1 produto para trocar
// Máximo 2 produtos simultâneos (mesma regra do criar look)
toggleProductSelection(produto)
```

#### 4. Geração (Função `handleRefine`)

```typescript
// SEMPRE usar foto ORIGINAL (não a imagem gerada)
const originalPhotoUrl = sessionStorage.getItem(`original_photo_${lojistaId}`)

// Converter blob/data se necessário
if (originalPhotoUrl.startsWith('blob:') || originalPhotoUrl.startsWith('data:')) {
  const file = await convertBlobToFile(originalPhotoUrl)
  personImageUrl = await uploadPersonPhoto(file)
} else {
  personImageUrl = originalPhotoUrl
}

// Preparar payload (MESMA LÓGICA DO CRIAR LOOK)
const payload = {
  personImageUrl: personImageUrl,
  productIds: productIds, // Novos produtos selecionados
  lojistaId: lojistaId,
  original_photo_url: personImageUrl,
  options: {
    skipWatermark: true,
    lookType: "creative",
  },
  sceneInstructions: "IMPORTANT: The scene must be during DAYTIME...",
}

// POST /api/generate-looks (MESMA ROTA DO CRIAR LOOK)
const response = await fetch("/api/generate-looks", { ... })
```

#### 5. Salvar Resultados

```typescript
// IMPORTANTE: Preservar foto original para futuras trocas
sessionStorage.setItem(`original_photo_${lojistaId}`, originalPhotoUrl)

// Limpar modo refinamento
sessionStorage.removeItem(`refine_mode_${lojistaId}`)
sessionStorage.removeItem(`refine_baseImage_${lojistaId}`)
sessionStorage.removeItem(`refine_compositionId_${lojistaId}`)

router.push(`/${lojistaId}/resultado`)
```

### Características Específicas

- ✅ **Usa MESMA rota do Criar Look** (`/api/generate-looks`)
- ✅ **Sempre usa foto ORIGINAL** (não a imagem gerada)
- ✅ **Preserva produtos anteriores** no sessionStorage
- ✅ **Modo Refine:** Flag no sessionStorage para UI diferenciada
- ✅ **Permite múltiplas trocas** mantendo foto original
- ✅ **Limpa modo refine** após geração

---

## COMPOSITION ORCHESTRATOR - PROMPT COMPLETO {#composition-orchestrator}

### Arquivo
`paineladm/src/lib/ai-services/composition-orchestrator.ts`

### Estrutura do Prompt

O prompt é construído em **6 blocos principais** (ordem crítica):

#### 1. ROLE BLOCK
```typescript
ROLE: You are the world's best AI Fashion Photographer and Retoucher.

TASK: Create a Hyper-Realistic Virtual Try-On composition with GENERATIVE BACKGROUND.

INPUTS:
- Image 1: PERSON (The reference identity).
- Image 2..N: PRODUCTS (The clothes to wear).
- NO BACKGROUND IMAGE: You must GENERATE the background based on product context.
```

#### 2. ANATOMICAL SAFETY BLOCK
```typescript
⚠️ ANATOMICAL SAFETY RULES (CRITICAL - HIGHEST PRIORITY):
- PROTECT THE HEAD: You must NEVER crop, remove, or obscure the person's head.
- FRAMING: Ensure the composition includes the full head and body down to the knees/feet.
- The person's COMPLETE HEAD must ALWAYS be fully visible from top of hair to chin.
- NEVER crop, cut, or hide the person's head, face, or hair.
- Always include space above the person's head (at least 10% of image height).
```

#### 3. IDENTITY LOCK BLOCK
```typescript
🔒 IDENTITY LOCK (PRIORITY #1):
- The output person must be a PIXEL-PERFECT clone of the input person in [Image 1].
- Maintain exact: Ethnicity, Age, Body Shape, Skin Texture, and Facial Features.
- Do not 'beautify' or change the person into a generic model.
- Preserve exact facial features, body shape, and skin tone.
```

#### 4. PRODUCT FIDELITY BLOCK
```typescript
🛡️ PRODUCT FIDELITY (CRITICAL):
- VISUAL CLONING: The clothing worn by the person MUST match the Product Image inputs 100%.
- TEXTURE & PATTERNS: Preserve exact fabric texture, prints, and patterns.
- LOGOS & DETAILS: If the product has a logo, text, or buttons, they MUST be visible and unchanged.
- COLOR ACCURACY: Maintain the exact hue/saturation of the product photo.
- The new products must REPLACE (not overlay) the original garments entirely.
```

#### 5. CLOTHING PHYSICS BLOCK
```typescript
👕 CLOTHING PHYSICS:
- GRAVITY & TENSION: The clothes must pull and fold according to the person's pose.
- VOLUME: The clothes must wrap AROUND the 3D volume of the body.
- TUCK/UNTUCK: If it's a shirt + pants, create a natural waistline interaction.
- FIT: The clothes must drape naturally over the person's specific body curves.
- LAYERING: If multiple products, layer them logically.
```

#### 6. PRO PHOTOGRAPHY STANDARDS BLOCK (NOVO)
```typescript
📸 PRO PHOTOGRAPHY STANDARDS (MANDATORY - HIGHEST PRIORITY):

⚠️⚠️⚠️ THIS BLOCK HAS PRIORITY OVER ANY GENERIC SCENARIO INSTRUCTIONS ⚠️⚠️⚠️

1. TIME OF DAY (THE GOLDEN HOUR RULE):
   - For ALL outdoor/external scenarios, simulate 'Golden Hour' (5:00 PM or 7:00 AM).
   - Sun Position: Low angle sun, roughly 45 degrees relative to the subject.
   - Color Temperature: Warm, golden tones (3500K-4500K).

2. ADVANCED LIGHTING TECHNIQUE (RIM LIGHTING):
   - Apply a subtle RIM LIGHT on the subject's hair and shoulders.
   - Key Light: Soft, diffused sunlight hitting the face gently.
   - Shadows: Long, soft shadows on the ground, consistent with 45-degree sun angle.

3. OPTICAL PHYSICS (THE 85MM LOOK):
   - Simulate a Professional Portrait Lens (85mm at f/1.8 aperture).
   - Depth of Field: The subject MUST be razor-sharp.
   - The background MUST have a creamy, optical BOKEH (blur).

4. SCENE COMPOSITION:
   - Clean Backgrounds: Avoid visual clutter behind the head.
   - Color Harmony: Apply a subtle 'Teal and Orange' or 'Warm Cinema' color grading.

5. SHADOW INTEGRATION:
   - CAST SHADOWS: The person MUST cast a realistic shadow on the floor/ground.
   - Shadows must connect naturally to the person's feet (no floating).

6. COLOR GRADING & ATMOSPHERE:
   - Warm, golden color temperature (3500K-4500K) throughout the entire scene.
   - The person must look like they are physically present in the scene.
```

#### 7. FORMAT & COMPOSITION BLOCK
```typescript
📱 FORMAT RULE (MANDATORY - CRITICAL - QUALIDADE REMIX):
- The output image MUST be Vertical (Aspect Ratio 9:16).
- FULL BODY VISIBILITY: The person's COMPLETE BODY must be visible from HEAD to FEET.
- NEVER crop, cut, or hide ANY part of the person's body.
- POSE: The person MUST be facing the camera or at MOST slightly to the side (3/4 view).
- NEVER from behind (back view) - the face and frontal body MUST be visible.
- NEVER sitting, kneeling, or on a chair - always standing, walking, or leaning.
```

#### 8. NEGATIVE CONSTRAINTS BLOCK
```typescript
🚫 NEGATIVE CONSTRAINTS:
- (deformed, distorted, disfigured:1.3)
- (head cut off:3.0), (headless:3.0), (no head:3.0)
- (body cut off:2.5), (torso cut off:2.5), (legs cut off:2.5)
- (cropped body:2.5), (partial body:2.5), (tight crop:2.0)
- (sitting:1.5), (seated:1.5), (kneeling:1.5)
- (back view:1.8), (person facing away:1.8)
- (different face:2.0), (different person:2.0)
- (original clothes visible:1.6), (two layers of clothing:1.6)
- (no shadows:2.0), (floating person:1.6)
- text, watermark, bad composition, duplicate
```

### Lógica Condicional

#### Detecção de Cenário Indoor/Outdoor
```typescript
const isIndoorContext = smartContext.toLowerCase().includes("office") || 
                        smartContext.toLowerCase().includes("bedroom") || 
                        smartContext.toLowerCase().includes("studio") || 
                        // ... outros cenários indoor
```

#### Smart Framing
```typescript
// Forçar Full Body Shot (exceto apenas acessórios)
if (!hasOnlyAccessories) {
  smartFraming = "Full body shot, feet fully visible, standing on floor"
} else {
  smartFraming = "close-up portrait, focus on face and neck"
}
```

#### Leg Extension (se houver calçados)
```typescript
if (hasShoes) {
  // Adicionar instrução de extensão de pernas mantendo semelhança física
  legExtensionInstruction = `⚠️⚠️⚠️ CRITICAL BODY EXTENSION...`
}
```

### Parâmetros Gemini Flash Image

```typescript
const geminiParams = {
  prompt: creativePrompt,           // Prompt completo construído
  imageUrls: [
    personImageUrl,                 // Imagem 1: Pessoa
    ...allProductImageUrls,         // Imagens 2..N: Produtos
    // scenarioImageUrl: undefined  // NUNCA incluir (background é gerado via prompt)
  ],
  aspectRatio: '9:16',              // Sempre vertical
  temperature: 0.75,                // Unificado para todos os modos
  safetySettings: [
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  ],
}
```

---

## FLUXO DE PROCESSAMENTO ASSÍNCRONO {#fluxo-assíncrono}

### 1. Criação do Job

```typescript
// Frontend API Route
const jobData = {
  lojistaId: body.lojistaId,
  status: "PENDING",
  reservationId: creditReservation.reservationId,
  personImageUrl: finalPersonImageUrl,
  productIds: body.productIds,
  options: { ...body.options },
  createdAt: FieldValue.serverTimestamp(),
}

await jobsRef.doc(jobId).set(sanitizedJobData)

// Disparar processamento (fire and forget)
fetch(`${backendUrl}/api/internal/process-job`, {
  method: "POST",
  body: JSON.stringify({ jobId }),
})

// Retornar 202 Accepted
return NextResponse.json({ jobId, status: "PENDING" }, { status: 202 })
```

### 2. Processamento do Job

```typescript
// Backend: /api/internal/process-job/route.ts

// 1. Atualizar status para PROCESSING
await jobsRef.doc(jobId).update({
  status: "PROCESSING",
  startedAt: new Date().toISOString(),
})

// 2. Buscar dados do job
const jobData = await jobsRef.doc(jobId).get()

// 3. Converter data: URLs para HTTP (se necessário)
if (jobData.personImageUrl.startsWith('data:image/')) {
  jobData.personImageUrl = await uploadBase64ToStorage(
    jobData.personImageUrl,
    jobData.lojistaId,
    jobId
  )
}

// 4. Buscar produtos do Firestore
const productsData = await fetchProducts(jobData.productIds, jobData.lojistaId)

// 5. Determinar cenário via getSmartScenario
const { smartContext, forbiddenScenarios } = getSmartScenario(productsData)

// 6. Calcular smartFraming
let smartFraming = "Full body shot, feet fully visible, standing on floor"
if (hasOnlyAccessories) {
  smartFraming = "close-up portrait, focus on face and neck"
}

// 7. Chamar Composition Orchestrator
const orchestrator = new CompositionOrchestrator()
const result = await orchestrator.createComposition({
  personImageUrl: jobData.personImageUrl,
  productId: productsData[0].id,
  productImageUrl: productsData[0].imagemUrl,
  lojistaId: jobData.lojistaId,
  productIds: jobData.productIds,
  options: {
    ...jobData.options,
    smartContext,
    smartFraming,
    forbiddenScenarios,
    productsData,
  },
})

// 8. Atualizar job com resultado
await jobsRef.doc(jobId).update({
  status: "COMPLETED",
  completedAt: new Date().toISOString(),
  result: {
    imageUrl: result.tryonImageUrl,
    compositionId: result.compositionId,
  },
})
```

### 3. Polling do Frontend

```typescript
// Frontend: Polling a cada 2 segundos
const pollJobStatus = async () => {
  const maxPollingTime = 180000 // 3 minutos
  const pollInterval = 2000      // 2 segundos
  
  while (Date.now() - startTime < maxPollingTime) {
    const statusResponse = await fetch(`/api/jobs/${jobId}`)
    const statusData = await statusResponse.json()
    
    if (statusData.status === "COMPLETED") {
      return statusData.result
    } else if (statusData.status === "FAILED") {
      throw new Error(statusData.error)
    }
    
    await new Promise(resolve => setTimeout(resolve, pollInterval))
  }
  
  throw new Error("Tempo de processamento excedido")
}
```

---

## CONFIGURAÇÕES E PARÂMETROS {#configurações}

### Configurações Unificadas (Todos os Modos)

| Parâmetro | Valor | Descrição |
|-----------|-------|-----------|
| `temperature` | `0.75` | Unificado para todos os modos (experimentar, refino, trocar produto, remix) |
| `aspectRatio` | `'9:16'` | Sempre vertical |
| `smartFraming` | `"Full body shot, feet fully visible, standing on floor"` | Forçado (exceto apenas acessórios) |
| `posturaRule` | `"Facing camera or 3/4 view, standing, no sitting/kneeling"` | Unificado |
| `skipWatermark` | `true` | Desabilitado por padrão |
| `lookType` | `"creative"` | Sempre criativo para multi-produto |

### Diferenças por Modo

| Modo | `gerarNovoLook` | `seed` | `scenePrompts` | Timeout Polling |
|------|------------------|--------|----------------|-----------------|
| **Criar Look** | `undefined` | `undefined` | `undefined` | 3 minutos |
| **Remixar Look** | `true` | Aleatório | Prompt de pose | 5 minutos |
| **Trocar Produto** | `undefined` | `undefined` | `undefined` | 3 minutos |

### Regras de Cenário (getSmartScenario)

- **Bikini Law:** Produtos de praia → Cenário de praia obrigatório
- **Gym Integrity:** Produtos de academia → Cenário de academia obrigatório
- **Smart Context:** Baseado em categorias dos produtos
- **Forbidden Scenarios:** Lista de cenários proibidos para negative prompt

### Regras de Framing

- **Full Body Shot:** Forçado para todos os modos (exceto apenas acessórios)
- **Portrait Shot:** Apenas quando só acessórios (óculos, joias, relógios)
- **Medium Shot:** Não usado (removido para evitar cortes)

---

## RESUMO DAS DIFERENÇAS PRINCIPAIS

### Botão "Criar Look"
- ✅ Usa `/api/generate-looks`
- ✅ Foto original do upload
- ✅ Produtos selecionados pelo usuário
- ✅ Cenário determinado pelo backend
- ✅ Timeout: 3 minutos

### Botão "Remixar Look"
- ✅ Usa `/api/generate-looks/remix`
- ✅ Foto original preservada
- ✅ Mesmos produtos do último look
- ✅ **Nova pose aleatória** (10 opções)
- ✅ **Seed aleatório** para variar
- ✅ **Flag `gerarNovoLook: true`**
- ✅ Timeout: 5 minutos
- ✅ Recarrega página após sucesso

### Botão "Trocar Produto"
- ✅ Usa `/api/generate-looks` (mesma rota do criar look)
- ✅ Foto original preservada
- ✅ **Novos produtos selecionados** (substituição)
- ✅ Modo refine no sessionStorage
- ✅ Timeout: 3 minutos

---

## CONCLUSÃO

Todos os três botões compartilham:
- ✅ Mesma lógica de preparação de foto (sempre original)
- ✅ Mesmo sistema de processamento assíncrono (jobs)
- ✅ Mesmos prompts de segurança e qualidade
- ✅ Mesmas configurações de temperatura e framing
- ✅ Mesmo bloco de fotografia profissional

**Diferenças principais:**
- Remix: Gera nova pose e seed aleatório
- Trocar Produto: Permite substituir produtos mantendo foto original
- Criar Look: Geração inicial com produtos selecionados

---

**Documento gerado automaticamente**  
**Última atualização:** Após implementação do Bloco de Fotografia Profissional



