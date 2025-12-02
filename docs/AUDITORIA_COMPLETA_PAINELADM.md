# Relatório de Auditoria Completa - Painel Administrativo
## Backend e Sistema de Gerenciamento

**Data:** 2025-12-02 
**Versão:** PHASE 26  
**Escopo:** Estrutura completa, funcionalidades e código do paineladm

---

## 1. Visão Geral da Arquitetura

### 1.1 Estrutura de Diretórios

```
paineladm/
├── src/
│   ├── app/
│   │   ├── (admin)/              # Rotas administrativas (protegidas)
│   │   │   ├── custos/           # Gestão de custos
│   │   │   ├── lojistas/         # Gestão de lojistas
│   │   │   └── planos/           # Gestão de planos
│   │   ├── (lojista)/            # Rotas do lojista (protegidas)
│   │   │   ├── dashboard/        # Dashboard principal
│   │   │   ├── produtos/         # Gestão de produtos
│   │   │   ├── composicoes/      # Visualização de composições
│   │   │   ├── clientes/         # Gestão de clientes
│   │   │   ├── crm/              # CRM e segmentação
│   │   │   ├── display/          # Configuração de displays
│   │   │   ├── configuracoes/    # Configurações da loja
│   │   │   ├── pedidos/          # Gestão de pedidos
│   │   │   └── simulador/        # Simulador de app cliente
│   │   ├── admin/                # Painel admin (legado)
│   │   └── api/                  # Rotas de API
│   │       ├── lojista/          # APIs do lojista
│   │       ├── admin/            # APIs administrativas
│   │       ├── cliente/          # APIs do cliente
│   │       ├── ai/               # APIs de IA
│   │       └── display/          # APIs de display
│   ├── lib/
│   │   ├── ai-services/          # Serviços de IA
│   │   ├── auth/                 # Autenticação
│   │   ├── firestore/            # Queries Firestore
│   │   └── utils/                # Utilitários
│   └── components/                # Componentes React
├── docs/                         # Documentação
└── scripts/                      # Scripts utilitários
```

### 1.2 Fluxo de Dados Principal

```
[App Cliente] → [API Routes] → [Orchestrator] → [AI Services] → [AI APIs]
     ↓              ↓               ↓               ↓              ↓
  Request      Validação      Processamento    Chamada API    Resposta
  Frontend     Auth/CORS      Construção       Gemini/Vertex   Imagem
```

---

## 2. Sistema de Autenticação

### 2.1 Autenticação de Lojista

**Arquivo:** `src/lib/auth/lojista-auth.ts`

**Funções Principais:**

#### `getCurrentLojistaId(): Promise<string | null>`
- Verifica token nos cookies (`auth-token`)
- Valida token no Firebase Admin
- Busca lojista pelo email na coleção `lojas`
- Suporta impersonificação (admin pode se passar por lojista)
- Retorna `lojistaId` ou `null`

**Fluxo:**
1. Verifica se há token de impersonificação (prioridade)
2. Verifica token de autenticação nos cookies
3. Decodifica token no Firebase Admin
4. Busca loja pelo email: `lojas.where("email", "==", email)`
5. Retorna ID da loja encontrada

#### `getCurrentUserEmail(): Promise<string | null>`
- Extrai email do token de autenticação
- Retorna email ou `null`

#### `isImpersonating(): Promise<boolean>`
- Verifica se há sessão de impersonificação ativa
- Busca em cookies ou URL (`impersonation_session`)
- Valida expiração da sessão

**Coleção Firestore:**
- `impersonation_sessions/{sessionId}`: Sessões de impersonificação
  - `lojistaId`: string
  - `expiresAt`: Date
  - `createdAt`: Date

---

### 2.2 Autenticação de Admin

**Arquivo:** `src/lib/auth/admin-auth.ts`

**Funções Principais:**

#### `getCurrentAdmin(): Promise<string | null>`
- Verifica token nos cookies
- Valida token no Firebase Admin
- Verifica se email está na lista de admins
- Retorna email do admin ou `null`

**Lista de Admins:**
- Carregada de `process.env.ADMIN_EMAILS` (separado por vírgula)
- Fallback para desenvolvimento: `["admin@experimenteai.com", "pierre03111982@gmail.com"]`

#### `requireAdmin(): Promise<string>`
- Requer que usuário seja admin
- Redireciona para `/login?admin=true&error=unauthorized` se não for admin
- Retorna email do admin

#### `isAdminEmail(email: string): boolean`
- Verifica se email está na lista de admins
- Case-insensitive

---

### 2.3 Middleware de Proteção

**Arquivo:** `src/middleware.ts`

**Função:** Protege rotas `/admin/*`

**Fluxo:**
1. Verifica se pathname começa com `/admin`
2. Verifica token (`auth-token`) ou `admin-token` nos cookies
3. Se não houver token, redireciona para `/login?redirect={pathname}`
4. Se houver `admin-token === "true"`, permite acesso
5. Caso contrário, verifica token normal

**Config:**
```typescript
{
  matcher: ["/admin/:path*"]
}
```

---

## 3. Serviços de IA

### 3.1 Composition Orchestrator

**Arquivo:** `src/lib/ai-services/composition-orchestrator.ts`

**Classe:** `CompositionOrchestrator`

**Responsabilidades:**
- Orquestra todo o fluxo de geração de composições
- Gerencia múltiplos provedores de IA
- Aplica watermark
- Registra custos

**Provedores Integrados:**
1. **Vertex Try-On** (`vertex-tryon.ts`): Try-on de roupas
2. **Gemini Flash Image** (`gemini-flash-image.ts`): Geração criativa com múltiplas imagens
3. **Stability.ai** (`stability-ai.ts`): Geração e upscale
4. **Imagen 3.0** (`nano-banana.ts`): Geração de cenários
5. **Watermark** (`watermark.ts`): Aplicação de marca d'água

**Interface: `CreateCompositionParams`**
```typescript
{
  personImageUrl: string
  productId: string
  productImageUrl: string
  lojistaId: string
  customerId?: string
  productName?: string
  productPrice?: string
  storeName: string
  logoUrl?: string
  scenePrompts?: string[]
  options?: {
    skipWatermark?: boolean
    quality?: "low" | "medium" | "high"
    lookType?: "natural" | "creative"
    allProductImageUrls?: string[]
    productCategory?: string
    gerarNovoLook?: boolean
    smartContext?: string
    smartFraming?: string
    forbiddenScenarios?: string[]
    productsData?: any[]
    // PHASE 26: Dados do cenário
    scenarioImageUrl?: string
    scenarioLightingPrompt?: string
    scenarioCategory?: string
    scenarioInstructions?: string
  }
}
```

**Método Principal: `createComposition(params: CreateCompositionParams)`**

**Fluxo de Geração (Look Criativo):**
1. Valida `personImageUrl` e `allProductImageUrls`
2. Constrói array de imagens:
   - 1ª: `personImageUrl` (IMAGEM_PESSOA)
   - 2ª+: `allProductImageUrls` (IMAGEM_PRODUTO_1, IMAGEM_PRODUTO_2, ...)
   - Última: `scenarioImageUrl` (IMAGEM_CENARIO) - se fornecido (PHASE 26)
3. Constrói prompt mestre com:
   - Identity Anchor Block (sandwich method)
   - Instruções de composição
   - Instruções de cenário (PHASE 26)
   - Context rules (smartContext)
   - Framing rules (smartFraming)
   - Postura rules (gerarNovoLook)
   - Product integration
   - Negative prompt
4. Chama `geminiFlashImageService.generateImage()`
5. Processa resposta e faz upload para Firebase Storage
6. Retorna `CompositionResult`

**Retorno: `CompositionResult`**
```typescript
{
  compositionId: string
  tryonImageUrl: string
  sceneImageUrls: string[]
  totalCost: number
  processingTime: number
  status: CompositionProcessingStatus
}
```

---

### 3.2 Gemini Flash Image Service

**Arquivo:** `src/lib/ai-services/gemini-flash-image.ts`

**Classe:** `GeminiFlashImageService`

**Configuração:**
- Modelo: `gemini-2.5-flash-image`
- Endpoint: `https://{location}-aiplatform.googleapis.com/v1/projects/{projectId}/locations/{location}/publishers/google/models/{modelId}:generateContent`
- Custo: `$0.02` por requisição (configurável via `GEMINI_FLASH_IMAGE_COST`)

**Método Principal: `generateImage(params: GeminiFlashImageParams)`**

**Parâmetros:**
```typescript
{
  prompt: string
  imageUrls: string[]  // Array de URLs (pessoa, produtos, cenário)
  negativePrompt?: string
  aspectRatio?: "1:1" | "4:3" | "3:4" | "16:9" | "9:16"
  temperature?: number  // 0.0-1.0 (padrão 0.4)
  safetySettings?: {...}[]
}
```

**Fluxo:**
1. Valida configuração (`GOOGLE_CLOUD_PROJECT_ID`)
2. Obtém access token do Firebase Admin
3. Converte todas as imagens para base64
4. Constrói payload:
   ```typescript
   {
     contents: [{
       role: "user",
       parts: [
         ...imageParts,  // Array de imagens em base64
         { text: prompt }
       ]
     }],
     generationConfig: {
       temperature: 0.4,
       topP: 0.95,
       topK: 40,
       maxOutputTokens: 8192
     },
     safetySettings: [...]
   }
   ```
5. Envia POST para endpoint do Gemini
6. Implementa retry com backoff exponencial para erro 429
7. Extrai imagem gerada da resposta (base64 ou URL)
8. Retorna `APIResponse<GeminiFlashImageResult>`

**Retry Logic:**
- Máximo 3 tentativas
- Delay base: 2 segundos
- Backoff exponencial: `baseDelay * 2^attempt`
- Máximo delay: 30 segundos

---

### 3.3 Vertex Try-On Service

**Arquivo:** `src/lib/ai-services/vertex-tryon.ts`

**Classe:** `VertexTryOnService`

**Configuração:**
- Modelo: `virtual-try-on-preview-08-04`
- Endpoint: `https://{location}-aiplatform.googleapis.com/v1/projects/{projectId}/locations/{location}/publishers/google/models/virtual-try-on-preview-08-04:predict`
- Custo: `$0.04` por imagem

**Método Principal: `tryOn(params: TryOnParams)`**

**Parâmetros:**
```typescript
{
  personImageUrl: string
  productImageUrl: string
  productId?: string
}
```

**Fluxo:**
1. Valida configuração
2. Obtém access token
3. Converte imagens para base64
4. Constrói payload:
   ```typescript
   {
     instances: [{
       person_image: { bytesBase64Encoded: personBase64 },
       product_image: { bytesBase64Encoded: productBase64 }
     }],
     parameters: {
       sampleCount: 1
     }
   }
   ```
5. Envia POST para endpoint
6. Extrai imagem gerada
7. Retorna `APIResponse<TryOnResult>`

---

### 3.4 Stability.ai Service

**Arquivo:** `src/lib/ai-services/stability-ai.ts`

**Classe:** `StabilityAIService`

**Configuração:**
- Base URL: `https://api.stability.ai`
- API Key: `STABILITY_AI_API_KEY`
- Modelos:
  - `stable-diffusion-xl-1024-v1-0`: Geração
  - `stable-image-upscale-conservative`: Upscale conservativo
  - `stable-image-upscale-creative`: Upscale criativo

**Preços:**
- SDXL Generation: `$0.04` por imagem
- Upscale: `$0.05` por imagem

**Métodos Principais:**
- `generateImage(params: StabilityGenerationParams)`: Geração de imagens
- `upscaleImage(imageUrl: string, mode: "conservative" | "creative")`: Upscale
- `generateComposition(params: StabilityCompositionParams)`: Composição pessoa + produto

---

### 3.5 Imagen Service (Nano Banana)

**Arquivo:** `src/lib/ai-services/nano-banana.ts`

**Classe:** `ImagenService`

**Responsabilidades:**
- Geração de cenários usando Google Imagen 3.0
- Integração com Vertex AI

**Métodos:**
- `generateScene(params: SceneGenerationParams)`: Gera cenário
- `generateImage(prompt: string, ...)`: Gera imagem genérica

---

### 3.6 Watermark Service

**Arquivo:** `src/lib/ai-services/watermark.ts`

**Classe:** `WatermarkService`

**Responsabilidades:**
- Aplica marca d'água em imagens usando Sharp
- Suporta logo e texto
- Posições: `bottom-right`, `bottom-left`, `top-right`, `top-left`, `bottom-center`

**Método Principal: `applyWatermark(imageUrl: string, config: WatermarkConfig)`**

**Fluxo:**
1. Baixa imagem original
2. Baixa logo (se fornecido)
3. Cria SVG para texto (se fornecido)
4. Aplica marca d'água usando Sharp
5. Faz upload para Firebase Storage
6. Retorna URL pública

**Tecnologia:**
- Sharp: Processamento de imagens
- SVG: Geração de texto
- Firebase Storage: Armazenamento

---

### 3.7 Cost Logger

**Arquivo:** `src/lib/ai-services/cost-logger.ts`

**Responsabilidades:**
- Registra custos de APIs no Firestore
- Calcula totais acumulados
- Fornece relatórios de custos

**Funções Principais:**

#### `logAPICost(params: LogCostParams): Promise<string>`
- Registra custo individual
- Salva em `/lojas/{lojistaId}/custos_api/{id}`
- Atualiza total acumulado do lojista

**Estrutura do Log:**
```typescript
{
  lojistaId: string
  compositionId?: string | null
  provider: AIProvider
  operation: "tryon" | "scene-generation" | "background-removal" | "creative-look" | "other"
  cost: number
  currency: "USD" | "BRL"
  timestamp: string
  metadata?: Record<string, unknown>
}
```

#### `getLojistaAPICosts(lojistaId: string, startDate?: Date, endDate?: Date)`
- Busca custos de um lojista em um período
- Agrupa por provedor e operação
- Calcula totais

#### `getCostSummaryByProvider(lojistaId: string, period: "day" | "week" | "month")`
- Resumo de custos por provedor
- Agrupa por período

#### `getTotalAPICost(lojistaId: string): Promise<number>`
- Retorna custo total acumulado (USD)

#### `checkCostLimit(lojistaId: string, limit: number): Promise<boolean>`
- Verifica se lojista excedeu limite de custos

#### `getAPIUsageStats(lojistaId: string)`
- Estatísticas de uso de APIs
- Contagem por operação
- Custo total

#### `getAllLojistasCosts()`
- Lista custos de todos os lojistas
- Para painel administrativo

#### `getGlobalCostSummary()`
- Resumo global de custos
- Total por provedor
- Total geral

---

## 4. Rotas de API Principais

### 4.1 Geração de Composições

**Rota:** `POST /api/lojista/composicoes/generate`

**Arquivo:** `src/app/api/lojista/composicoes/generate/route.ts`

**Função:** Endpoint principal para geração de looks

**Fluxo Completo:**

1. **Validação de Entrada**
   - Aceita FormData ou JSON
   - Valida `personImageUrl` ou faz upload de foto
   - Valida `productIds` ou `productUrl`
   - Valida `lojistaId`

2. **Conversão de Data URL (se necessário)**
   - Se `personImageUrl` for `data:`, converte para URL HTTP
   - Faz upload para Firebase Storage
   - Obtém URL pública

3. **Busca de Produtos**
   - Busca produtos do Firestore usando `productIds`
   - Cria produto virtual se `productUrl` fornecido
   - Valida que pelo menos um produto tem imagem

4. **Busca de Dados da Loja**
   - Busca perfil da loja no Firestore
   - Obtém `nome`, `logoUrl`, etc.

5. **Determinação de Cenário (getSmartScenario)**
   - Analisa categorias dos produtos
   - Aplica regras de conflito (Bikini Law, Gym Integrity, etc.)
   - Seleciona cenário apropriado
   - Gera `smartContext` e `forbiddenScenarios`

6. **Smart Framing**
   - Detecta se há calçados → força full body
   - Detecta se há apenas acessórios → força portrait
   - Caso contrário → medium-full shot

7. **Chamada ao Orchestrator**
   ```typescript
   await orchestrator.createComposition({
     personImageUrl,
     productId: primaryProduct.id,
     productImageUrl: finalProductImageUrl,
     lojistaId,
     customerId,
     productName: productsData.map(p => p.nome).join(" + "),
     productPrice: totalPrice,
     storeName: lojaData.nome,
     logoUrl: lojaData.logoUrl,
     options: {
       quality: "high",
       skipWatermark: options?.skipWatermark,
       allProductImageUrls: allProductImageUrls,
       productCategory: productCategoryForPrompt,
       gerarNovoLook: options?.gerarNovoLook,
       smartContext: smartContext,
       smartFraming: smartFraming,
       forbiddenScenarios: forbiddenScenarios,
       productsData: productsData,
       // PHASE 26: Dados do cenário
       scenarioImageUrl: scenarioImageUrl,
       scenarioLightingPrompt: scenarioLightingPrompt,
       scenarioCategory: scenarioCategory,
       scenarioInstructions: scenarioInstructions,
     }
   });
   ```

8. **Upload e Salvamento**
   - Faz upload da imagem gerada para Firebase Storage
   - Salva composição no Firestore: `/lojas/{lojistaId}/composicoes/{composicaoId}`
   - Atualiza estatísticas do cliente (se `customerId` fornecido)

9. **Cálculo de Custos**
   - Busca taxa de câmbio USD/BRL
   - Calcula custo total em BRL
   - Retorna custos na resposta

10. **Resposta**
    ```typescript
    {
      success: true
      composicaoId: string
      looks: GeneratedLook[]
      totalCost: number
      totalCostBRL: number
      exchangeRate: number
      productsProcessed: number
      primaryProductId: string
      primaryProductName: string
    }
    ```

**Tratamento de Erros:**
- 400: Parâmetros inválidos
- 402: Créditos insuficientes (não aplicado aqui, validado no frontend)
- 404: Produto/loja não encontrado
- 500: Erro interno
- 503: Erro de conexão
- 504: Timeout

**CORS:**
- Headers CORS aplicados em todas as respostas
- Suporta `OPTIONS` para preflight

---

### 4.2 Gestão de Produtos

**Rotas Principais:**

#### `GET /api/lojista/products`
- Lista produtos de um lojista
- Filtra por categoria (opcional)
- Retorna array de `ProdutoDoc`

#### `POST /api/lojista/products`
- Cria novo produto
- Valida dados
- Salva no Firestore: `/lojas/{lojistaId}/produtos/{productId}`

#### `GET /api/lojista/products/[productId]`
- Busca produto específico
- Retorna `ProdutoDoc`

#### `PUT /api/lojista/products/[productId]`
- Atualiza produto
- Valida dados
- Atualiza no Firestore

#### `DELETE /api/lojista/products/[productId]`
- Arquiva produto (soft delete)
- Define `arquivado: true`

#### `POST /api/lojista/products/import`
- Importa catálogo de produtos
- Suporta CSV/JSON
- Valida e cria múltiplos produtos

#### `POST /api/lojista/products/upload-image`
- Upload de imagem de produto
- Processa e otimiza imagem
- Salva no Firebase Storage
- Atualiza `imagemUrl` do produto

#### `GET /api/lojista/products/quality`
- Análise de qualidade de produtos
- Calcula métricas: `compatibilityScore`, `conversionRate`, `complaintRate`
- Retorna relatório de qualidade

---

### 4.3 Gestão de Clientes

**Rotas Principais:**

#### `GET /api/lojista/clientes`
- Lista clientes de um lojista
- Filtra por segmentação (opcional)
- Retorna array de `ClienteDoc`

#### `GET /api/lojista/clientes/[clienteId]`
- Busca cliente específico
- Inclui histórico e estatísticas
- Retorna `ClienteDoc` completo

#### `GET /api/lojista/clientes/[clienteId]/history`
- Histórico de tentativas do cliente
- Produtos experimentados
- Likes/dislikes
- Compartilhamentos

#### `GET /api/lojista/clientes/[clienteId]/shares`
- Histórico de compartilhamentos
- Links gerados
- Métricas de compartilhamento

#### `GET /api/lojista/clientes/[clienteId]/referrals`
- Referências/indicações do cliente
- Clientes que vieram através deste

#### `GET /api/lojista/clientes/segmentation`
- Segmentação automática de clientes
- Tipos: `abandonou-carrinho`, `fa-vestidos`, `high-spender`, `somente-tryon`, `comprador-frequente`, `novo-cliente`
- Retorna clientes agrupados por segmento

---

### 4.4 Gestão de Composições

**Rotas Principais:**

#### `GET /api/lojista/composicoes`
- Lista composições de um lojista
- Filtra por cliente (opcional)
- Ordena por data (mais recente primeiro)
- Retorna array de `ComposicaoDoc`

#### `POST /api/lojista/composicoes/upload-photo`
- Upload de foto do cliente
- Processa e otimiza
- Salva no Firebase Storage
- Retorna URL pública

#### `GET /api/lojista/composicoes/high-conversion`
- Composições com alta conversão
- Filtra por taxa de like > threshold
- Ordena por conversão

#### `POST /api/lojista/composicoes/generate-variations`
- Gera variações de uma composição existente
- Usa `look-variations.ts`
- Cria múltiplas versões com diferentes estilos

#### `POST /api/lojista/composicoes/bulk-promotion`
- Promove múltiplas composições
- Aplica desconto em lote
- Atualiza status de promoção

#### `POST /api/lojista/composicoes/send-whatsapp`
- Envia composição via WhatsApp
- Usa API do WhatsApp Business
- Gera link de compartilhamento

---

### 4.5 Gestão de Display

**Rotas Principais:**

#### `POST /api/lojista/connect-display`
- Conecta display a uma loja
- Cria sessão de display
- Retorna link de conexão

#### `GET /api/lojista/scan-displays`
- Escaneia displays disponíveis
- Busca displays próximos (via QR code)
- Retorna lista de displays

#### `GET /api/display/heartbeat`
- Heartbeat do display
- Mantém sessão ativa
- Atualiza última atividade

#### `GET /api/display/session`
- Obtém sessão ativa do display
- Retorna dados da sessão atual

#### `POST /api/display/update`
- Atualiza conteúdo do display
- Envia nova composição para exibir
- Sincroniza com display

#### `POST /api/display/upload-photo`
- Upload de foto via display
- Processa foto do display
- Salva no Firebase Storage

---

### 4.6 APIs Administrativas

**Rotas Principais:**

#### `GET /api/admin/lojistas`
- Lista todos os lojistas
- Filtra por status (opcional)
- Retorna array de lojistas

#### `GET /api/admin/lojistas/[lojistaId]`
- Busca lojista específico
- Inclui dados financeiros
- Retorna dados completos

#### `POST /api/admin/lojistas/criar`
- Cria novo lojista
- Valida dados
- Cria conta no Firebase Auth
- Cria documento no Firestore

#### `PUT /api/admin/lojistas/[lojistaId]`
- Atualiza dados do lojista
- Pode atualizar financials
- Pode bloquear/desbloquear conta

#### `POST /api/admin/lojistas/[lojistaId]/editar`
- Edição completa do lojista
- Atualiza múltiplos campos
- Valida permissões

#### `GET /api/admin/stats`
- Estatísticas globais
- Total de lojistas
- Total de composições
- Custos totais
- Métricas de uso

#### `GET /api/admin/logs`
- Logs de sistema
- Filtra por tipo de erro
- Filtra por período
- Retorna logs paginados

#### `GET /api/admin/custos`
- Custos globais de APIs
- Agrupa por provedor
- Agrupa por período
- Retorna relatórios

#### `GET /api/admin/planos`
- Lista planos disponíveis
- Retorna configurações de planos

#### `PUT /api/admin/planos/[planoId]`
- Atualiza plano
- Modifica limites e preços

---

### 4.7 APIs de Cliente

**Rotas Principais:**

#### `POST /api/cliente/auth`
- Autenticação do cliente
- Cria/atualiza perfil
- Retorna token de sessão

#### `GET /api/cliente/check-session`
- Verifica sessão ativa
- Retorna dados do cliente

#### `POST /api/cliente/logout`
- Encerra sessão
- Limpa cookies

#### `GET /api/cliente/favoritos`
- Lista favoritos do cliente
- Filtra por lojista (opcional)

#### `POST /api/cliente/share`
- Compartilha composição
- Gera link de compartilhamento
- Rastreia compartilhamentos

#### `POST /api/cliente/share/track`
- Rastreia visualização de link compartilhado
- Registra métricas

#### `GET /api/cliente/find`
- Busca cliente por telefone
- Retorna perfil se encontrado

---

### 4.8 APIs de IA

**Rotas Principais:**

#### `POST /api/ai/generate`
- Geração genérica de imagens
- Usa múltiplos provedores
- Retorna imagem gerada

#### `POST /api/ai/catalog`
- Geração de imagens de catálogo
- Otimizado para produtos
- Aplica estilo consistente

#### `GET /api/ai/insights`
- Insights de IA sobre produtos
- Análise de compatibilidade
- Sugestões de melhoria

---

## 5. Estrutura de Dados (Firestore)

### 5.1 Coleção: `lojas`

**Estrutura do Documento:**
```typescript
{
  id: string                    // ID do documento
  nome: string                  // Nome da loja
  email: string                 // Email do lojista
  descricao?: string            // Descrição da loja
  logoUrl?: string              // URL do logo
  app_icon_url?: string         // Ícone do app PWA
  instagram?: string            // Instagram
  facebook?: string             // Facebook
  tiktok?: string               // TikTok
  whatsapp?: string             // WhatsApp
  appModel?: "modelo-1" | "modelo-2" | "modelo-3"
  displayOrientation?: "horizontal" | "vertical"
  descontoRedesSociais?: number
  descontoRedesSociaisExpiraEm?: string
  salesConfig?: {
    enabled: boolean
    payment_gateway: "mercadopago" | "manual_whatsapp"
    shipping_provider: "melhor_envio" | "fixed_price" | "none"
    origin_zip?: string
    manual_contact?: string
    fixed_shipping_price?: number
    checkout_url?: string
    integrations?: {
      melhor_envio_token?: string
      melhor_envio_client_id?: string
      melhor_envio_client_secret?: string
      mercadopago_public_key?: string
      mercadopago_access_token?: string
    }
  }
  financials?: {
    credits_balance: number
    overdraft_limit: number
    plan_tier: "micro" | "growth" | "enterprise"
    billing_status: "active" | "frozen"
  }
  totalAPICosts?: {
    USD?: number
    BRL?: number
    lastUpdated?: string
  }
  is_sandbox_mode?: boolean
  createdAt: Date
  updatedAt: Date
}
```

**Subcoleções:**
- `produtos/{productId}`: Produtos da loja
- `clientes/{clienteId}`: Clientes da loja
- `composicoes/{composicaoId}`: Composições geradas
- `custos_api/{costId}`: Logs de custos de APIs
- `perfil/dados`: Dados do perfil (prioridade)

---

### 5.2 Coleção: `lojas/{lojistaId}/produtos`

**Estrutura do Documento (`ProdutoDoc`):**
```typescript
{
  id: string
  nome: string
  preco: number
  imagemUrl: string                    // DEPRECATED
  imagemUrlOriginal?: string           // Foto original (upload)
  imagemUrlCatalogo?: string          // Foto gerada com IA
  categoria: string
  tamanhos: string[]
  cores?: string[]
  medidas?: string
  obs?: string
  estoque?: number
  tags?: string[]
  descontoProduto?: number
  arquivado?: boolean
  catalogGeneratedAt?: Date
  ecommerceSync?: {
    platform: "shopify" | "nuvemshop" | "woocommerce" | "other"
    productId?: string
    variantId?: string
    lastSyncedAt?: Date
    autoSync?: boolean
    syncPrice?: boolean
    syncStock?: boolean
    syncVariations?: boolean
  }
  qualityMetrics?: {
    compatibilityScore?: number        // 1-5
    conversionRate?: number           // Taxa de conversão
    complaintRate?: number            // Taxa de reclamações
    lastCalculatedAt?: Date
  }
  dimensions?: {
    weight_kg: number
    height_cm: number
    width_cm: number
    depth_cm: number
  }
  sku?: string
  stock_quantity?: number
  createdAt: Date
  updatedAt: Date
}
```

---

### 5.3 Coleção: `lojas/{lojistaId}/clientes`

**Estrutura do Documento (`ClienteDoc`):**
```typescript
{
  id: string
  nome: string
  whatsapp: string
  email?: string
  totalComposicoes: number
  totalLikes?: number
  totalDislikes?: number
  arquivado?: boolean
  acessoBloqueado?: boolean
  tags?: string[]                     // Tags automáticas
  segmentacao?: {
    tipo?: "abandonou-carrinho" | "fa-vestidos" | "high-spender" | 
           "somente-tryon" | "comprador-frequente" | "novo-cliente"
    ultimaAtualizacao?: Date
  }
  historicoTentativas?: {
    produtosExperimentados: Array<{
      produtoId: string
      produtoNome: string
      categoria: string
      dataTentativa: Date
      liked?: boolean
      compartilhado?: boolean
      checkout?: boolean
    }>
    ultimaAtualizacao?: Date
  }
  createdAt: Date
  updatedAt: Date
}
```

**Subcoleções:**
- `favoritos/{favoritoId}`: Produtos favoritados
- `composicoes/{composicaoId}`: Composições do cliente

---

### 5.4 Coleção: `lojas/{lojistaId}/composicoes`

**Estrutura do Documento (`ComposicaoDoc`):**
```typescript
{
  id: string
  customer: {
    id: string
    nome: string
  } | null
  products: Array<{
    id: string
    nome: string
  }>
  looks: Array<{
    id: string
    titulo: string
    descricao?: string
    imagemUrl: string
    produtoNome: string
    produtoPreco?: number
    watermarkText?: string
    compositionId?: string
  }>
  produtos: Array<{
    id: string
    nome: string
  }>
  primaryProductId: string
  primaryProductName: string
  totalCost: number                  // USD
  totalCostBRL: number               // BRL
  exchangeRate: number
  processingTime: number              // ms
  creativeCost: number               // USD
  creativeCostBRL: number            // BRL
  curtido: boolean
  compartilhado: boolean
  createdAt: Date
  updatedAt: Date
}
```

---

### 5.5 Coleção: `lojas/{lojistaId}/custos_api`

**Estrutura do Documento:**
```typescript
{
  lojistaId: string
  compositionId?: string | null
  provider: "vertex-tryon" | "imagen" | "nano-banana" | "stability-ai" | "gemini-flash-image"
  operation: "tryon" | "scene-generation" | "background-removal" | "creative-look" | "other"
  cost: number
  currency: "USD" | "BRL"
  timestamp: string
  metadata?: Record<string, unknown>
}
```

---

### 5.6 Coleção: `scenarios`

**Estrutura do Documento (PHASE 26):**
```typescript
{
  imageUrl: string                  // URL no Firebase Storage
  fileName: string                  // Nome do arquivo original
  category: string                  // urban, beach, fitness, etc.
  lightingPrompt: string            // Prompt de iluminação
  tags: string[]                    // Array de tags (PHASE 26)
  active: boolean                   // Se está ativo
  createdAt: Date
  updatedAt: Date
}
```

---

### 5.7 Coleção: `impersonation_sessions`

**Estrutura do Documento:**
```typescript
{
  lojistaId: string
  expiresAt: Date
  createdAt: Date
  createdBy: string                 // Email do admin
}
```

---

## 6. Lógica de Cenários (getSmartScenario)

**Localização:** `src/app/api/lojista/composicoes/generate/route.ts` (linha 564)

**Função:** `getSmartScenario(products: any[], isRemix: boolean = false)`

**Responsabilidades:**
- Detecta cenário apropriado baseado em produtos
- Resolve conflitos (ex: Vestido + Tênis)
- Aplica regras específicas (Bikini Law, Gym Integrity, etc.)

**Cenários Disponíveis:**

1. **Beach Scenarios (15 opções)**
   - Sunny tropical beach
   - Luxury pool deck
   - Golden hour sand dunes
   - Tropical garden
   - Infinity pool at sunset
   - Wooden pier
   - Beach bar
   - Rocky coastline
   - Yacht deck
   - Secluded beach
   - Natural waterfall
   - Resort pool
   - Beach at sunset
   - Modern infinity pool
   - Natural pool in forest

2. **Urban Scenarios (10 opções)**
   - Urban street
   - Minimalist studio
   - Coffee shop
   - City park
   - Industrial loft
   - Graffiti alleyway
   - Rooftop terrace
   - Subway station
   - Skate park
   - Neon-lit street

3. **Formal Scenarios (10 opções)**
   - Corporate office
   - Luxury hotel lobby
   - Minimalist apartment
   - Abstract architecture
   - Classic library
   - Conference room
   - Museum gallery
   - Upscale restaurant
   - Co-working space
   - Private jet interior

4. **Party Scenarios (10 opções)**
   - Red carpet event
   - Elegant ballroom
   - Rooftop bar
   - Luxury mansion
   - Opera house
   - Garden party
   - Champagne bar
   - VIP club
   - Wedding reception
   - Casino

5. **Fitness Scenarios (10 opções)**
   - Modern gym
   - Running track
   - Yoga studio
   - Urban stairs
   - Tennis court
   - Hiking trail
   - Crossfit box
   - Pilates studio
   - Basketball court
   - Soccer field

6. **Winter Scenarios (10 opções)**
   - Autumn street
   - Fireplace setting
   - Cloudy skyline
   - Snowy mountain
   - Winter cabin
   - Foggy forest
   - Christmas market
   - Ski resort
   - Rainy street
   - Library nook

**Regras de Prioridade:**

1. **REGRA 0: INVERNO/COURO (Prioridade ABSOLUTA)**
   - Se detecta: `couro`, `leather`, `casaco`, `sobretudo`, `bota`, `cachecol`, `inverno`, `winter`
   - Usa: Winter Scenarios
   - Proíbe: Beach, Pool, Summer, Tropical

2. **REGRA 1: BIKINI LAW (STRICT)**
   - Se detecta: `biquini`, `bikini`, `maiô`, `sunga`, `praia`, `beachwear`, `swimwear`
   - Usa: Beach Scenarios (obrigatório)
   - Proíbe: Office, City Street, Gym, Fitness, Indoor

3. **REGRA 2: GYM INTEGRITY (STRICT - Requer UNANIMIDADE)**
   - Se detecta: `legging`, `fitness`, `academia`, `sneaker`, `sport`
   - E NÃO detecta: `vestido`, `dress`, `jeans`, `alfaiataria`, `blazer`
   - E NÃO detecta: roupas de banho
   - Usa: Fitness Scenarios
   - Proíbe: Beach, Pool, Formal

4. **REGRA 3: PARTY/GALA**
   - Se detecta: `festa`, `gala`, `paetê`, `salto alto fino`, `clutch`, `vestido de festa`, `brilho`
   - Usa: Party Scenarios
   - Proíbe: Beach, Gym, Messy Room, Forest

5. **REGRA 4: FORMAL DOMINANCE**
   - Se detecta: `terno`, `blazer`, `social`, `alfaiataria`, `vestido longo`, `gravata`, `suit`
   - Usa: Formal Scenarios
   - Proíbe: Beach, Gym, Messy Room

6. **REGRA 5: FALLBACK (Conflitos)**
   - Se detecta: Sport + Non-Sport OU Beach + Winter
   - Usa: Urban Scenarios (neutro)
   - Proíbe: Gym, Beach, Swimming pool

7. **REGRA 6: CASUAL/STREET**
   - Se detecta: `jeans`, `t-shirt`, `moletom`, `tênis casual`, `street`
   - Usa: Urban Scenarios
   - Proíbe: Gym, Swimming pool, Formal wedding

8. **REGRA 7: LINGERIE/SLEEP**
   - Se detecta: `pijama`, `lingerie`, `robe`, `camisola`, `sleep`
   - Usa: Bedroom/Bathroom Scenarios
   - Proíbe: Street, Office, Gym, Public places

9. **REGRA 8: CALÇADOS**
   - Se detecta: `sandália`, `rasteirinha`, `sapatilha`, `calçado`, `shoe`
   - Usa: Paved/Wooden/Tiled floor Scenarios
   - Proíbe: Mud, Grass, Water

10. **REGRA 9: DEFAULT**
    - Se nenhuma regra se aplica
    - Usa: Urban Scenarios (aleatório)

**Seleção Aleatória:**
- Todas as regras selecionam cenário aleatório do array apropriado
- `Math.floor(Math.random() * scenarios.length)`

**Retorno:**
```typescript
{
  context: string              // Ex: "Background: Sunny tropical beach"
  forbidden: string[]          // Array de cenários proibidos
}
```

---

## 7. Smart Framing

**Localização:** `src/app/api/lojista/composicoes/generate/route.ts` (linha 856)

**Objetivo:** Determinar enquadramento apropriado baseado nos produtos

**Lógica:**

1. **Detecção de Calçados**
   ```typescript
   const hasShoes = allCategories.some(cat => 
     cat.includes("calçado") || cat.includes("calcado") || 
     cat.includes("sapato") || cat.includes("tênis") || 
     cat.includes("tenis") || cat.includes("shoe") || 
     cat.includes("footwear")
   );
   ```
   - Se detectado: `smartFraming = "Full body shot, feet fully visible, standing on floor"`
   - `productCategoryForPrompt = "Calçados"`

2. **Detecção de Acessórios (sem calçados)**
   ```typescript
   const hasOnlyAccessories = allCategories.length > 0 && 
     allCategories.every(cat => 
       cat.includes("acessório") || cat.includes("acessorio") ||
       cat.includes("óculos") || cat.includes("oculos") ||
       cat.includes("joia") || cat.includes("relógio")
     ) && !hasShoes;
   ```
   - Se detectado: `smartFraming = "close-up portrait, focus on face and neck"`
   - `productCategoryForPrompt = "Acessórios/Óculos/Joias"`

3. **Default (Roupas)**
   - `smartFraming = "medium-full shot, detailed fabric texture"`
   - `productCategoryForPrompt = "Roupas"`

**Uso no Prompt:**
- Adiciona instruções específicas de enquadramento
- Previne "cut legs" para calçados
- Otimiza para acessórios (close-up)

---

## 8. Sistema de Watermark

**Arquivo:** `src/lib/ai-services/watermark.ts`

**Classe:** `WatermarkService`

**Tecnologia:** Sharp (processamento de imagens)

**Funcionalidades:**

1. **Watermark com Logo**
   - Baixa logo da URL fornecida
   - Redimensiona logo proporcionalmente
   - Aplica com opacidade configurável
   - Posiciona conforme `position`

2. **Watermark com Texto**
   - Cria SVG com texto
   - Aplica estilo (fonte, cor, stroke)
   - Posiciona conforme `position`

3. **Watermark Combinado**
   - Logo + Texto
   - Posicionamento inteligente

**Posições Suportadas:**
- `bottom-right` (padrão)
- `bottom-left`
- `top-right`
- `top-left`
- `bottom-center`

**Configuração:**
```typescript
{
  logoUrl?: string
  storeName?: string
  productName?: string
  productPrice?: string | number
  legalNotice?: string
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left" | "bottom-center"
  opacity?: number  // 0-1
}
```

**Fluxo:**
1. Baixa imagem original
2. Baixa logo (se fornecido)
3. Cria SVG de texto (se fornecido)
4. Aplica marca d'água usando Sharp
5. Faz upload para Firebase Storage
6. Retorna URL pública

---

## 9. Sistema de Logging

**Arquivo:** `src/lib/logger.ts`

**Funções Principais:**

#### `logError(service: string, error: Error, metadata?: Record<string, unknown>)`
- Registra erro no Firestore
- Salva em `/errors/{errorId}`
- Inclui stack trace, metadata, timestamp

**Estrutura do Log:**
```typescript
{
  service: string
  message: string
  stack?: string
  metadata?: Record<string, unknown>
  timestamp: Date
  severity: "error" | "warning" | "info"
}
```

---

## 10. Queries Firestore

**Arquivo:** `src/lib/firestore/server.ts`

**Funções Principais:**

#### `fetchLojaPerfil(lojistaId: string)`
- Busca perfil da loja
- Prioridade: `perfil/dados` > documento raiz
- Retorna dados normalizados

#### `fetchProdutos(lojistaId: string, includeArchived?: boolean)`
- Lista produtos da loja
- Filtra arquivados (opcional)
- Retorna array de `ProdutoDoc`

#### `fetchCliente(lojistaId: string, clienteId: string)`
- Busca cliente específico
- Inclui estatísticas
- Retorna `ClienteDoc`

#### `updateClienteComposicoesStats(lojistaId: string, clienteId: string)`
- Atualiza estatísticas do cliente
- Calcula `totalComposicoes`, `totalLikes`, `totalDislikes`
- Atualiza `updatedAt`

#### `fetchComposicoes(lojistaId: string, customerId?: string)`
- Lista composições da loja
- Filtra por cliente (opcional)
- Ordena por data
- Retorna array de `ComposicaoDoc`

---

## 11. Validação de Dados

**Arquivos:**
- `src/lib/validators/products.ts`
- `src/lib/validators/loja.ts`
- `src/lib/validators/clients.ts`

**Funções:**
- Validação de produtos (nome, preço, categoria)
- Validação de loja (nome, email)
- Validação de clientes (nome, whatsapp)

---

## 12. Rate Limiting

**Arquivo:** `src/lib/rate-limit.ts`

**Função:** Limita requisições por IP/usuário

**Implementação:**
- Usa Firestore para armazenar contadores
- Limite configurável por rota
- Window de tempo configurável

---

## 13. Integração com E-commerce

**Arquivo:** `src/lib/ecommerce/sync.ts`

**Funcionalidades:**
- Sincronização com Shopify
- Sincronização com Nuvemshop
- Sincronização com WooCommerce
- Sincronização bidirecional (produtos, preços, estoque)

**Estrutura de Sincronização:**
```typescript
{
  platform: "shopify" | "nuvemshop" | "woocommerce" | "other"
  productId?: string
  variantId?: string
  lastSyncedAt?: Date
  autoSync?: boolean
  syncPrice?: boolean
  syncStock?: boolean
  syncVariations?: boolean
}
```

---

## 14. Segmentação de Clientes

**Arquivo:** `src/lib/firestore/client-segmentation.ts`

**Tipos de Segmentação:**

1. **abandonou-carrinho**
   - Cliente adicionou produtos ao carrinho mas não finalizou
   - Critério: `checkout === false` em histórico

2. **fa-vestidos**
   - Cliente experimenta principalmente vestidos
   - Critério: >50% das tentativas são vestidos

3. **high-spender**
   - Cliente gasta muito
   - Critério: Soma de preços experimentados > threshold

4. **somente-tryon**
   - Cliente apenas experimenta, nunca compra
   - Critério: `checkout === false` em todas as tentativas

5. **comprador-frequente**
   - Cliente compra frequentemente
   - Critério: Taxa de checkout > threshold

6. **novo-cliente**
   - Cliente recém-cadastrado
   - Critério: `createdAt` < 30 dias

**Atualização Automática:**
- Executada quando cliente interage
- Atualiza `segmentacao.tipo` e `segmentacao.ultimaAtualizacao`

---

## 15. Análise de Qualidade de Produtos

**Arquivo:** `src/lib/firestore/product-quality.ts`

**Métricas Calculadas:**

1. **compatibilityScore** (1-5)
   - Baseado em taxa de likes
   - Baseado em taxa de reclamações
   - Baseado em taxa de compartilhamentos

2. **conversionRate**
   - Taxa de likes / total de composições
   - Taxa de checkout / total de composições

3. **complaintRate**
   - Taxa de dislikes / total de composições
   - Taxa de reclamações específicas

**Atualização:**
- Calculada periodicamente
- Armazenada em `produto.qualityMetrics`
- Usada para ranking e sugestões

---

## 16. Sistema de Compartilhamento

**Arquivo:** `src/lib/firestore/shares.ts`

**Funcionalidades:**
- Gera links de compartilhamento únicos
- Rastreia visualizações
- Calcula métricas de compartilhamento
- Suporta múltiplos canais (WhatsApp, Instagram, etc.)

**Estrutura:**
```typescript
{
  id: string
  composicaoId: string
  clienteId: string
  lojistaId: string
  link: string
  channel?: "whatsapp" | "instagram" | "facebook" | "other"
  views: number
  clicks: number
  createdAt: Date
  expiresAt?: Date
}
```

---

## 17. Variáveis de Ambiente

### 17.1 Firebase
- `FIREBASE_PROJECT_ID`: ID do projeto Firebase
- `FIREBASE_CLIENT_EMAIL`: Email da service account
- `FIREBASE_PRIVATE_KEY`: Chave privada (com `\n` escapado)
- `FIREBASE_STORAGE_BUCKET`: Bucket do Storage
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: ID público (opcional)

### 17.2 Google Cloud / Vertex AI
- `GOOGLE_CLOUD_PROJECT_ID`: ID do projeto GCP
- `GOOGLE_CLOUD_LOCATION`: Localização (padrão: `us-central1`)

### 17.3 Stability.ai
- `STABILITY_AI_API_KEY`: Chave da API

### 17.4 Admin
- `ADMIN_EMAILS`: Lista de emails admin (separado por vírgula)

### 17.5 URLs
- `NEXT_PUBLIC_CLIENT_APP_URL`: URL do app cliente
- `NEXT_PUBLIC_APP_URL`: URL alternativa
- `NEXT_PUBLIC_BACKEND_URL`: URL do backend
- `NEXT_PUBLIC_PAINELADM_URL`: URL do paineladm

### 17.6 Custos (Opcional)
- `GEMINI_FLASH_IMAGE_COST`: Custo por requisição (padrão: 0.02)
- `TRYON_COST`: Custo por try-on (padrão: 0.04)

---

## 18. Fluxo Completo de Geração

### 18.1 Fluxo Padrão

```
1. Frontend (modelo-2) chama /api/generate-looks
   ↓
2. Frontend valida créditos
   ↓
3. Frontend busca produtos do Firestore
   ↓
4. Frontend chama findScenarioByProductTags()
   ↓
5. Frontend envia payload para paineladm
   ↓
6. Backend recebe em /api/lojista/composicoes/generate
   ↓
7. Backend valida entrada (FormData ou JSON)
   ↓
8. Backend converte data URL se necessário
   ↓
9. Backend busca produtos do Firestore
   ↓
10. Backend busca dados da loja
   ↓
11. Backend chama getSmartScenario()
   ↓
12. Backend determina Smart Framing
   ↓
13. Backend chama orchestrator.createComposition()
   ↓
14. Orchestrator constrói array de imagens:
    - pessoa + produtos + cenário (PHASE 26)
   ↓
15. Orchestrator constrói prompt mestre
   ↓
16. Orchestrator chama geminiFlashImageService.generateImage()
   ↓
17. Gemini Flash Image converte imagens para base64
   ↓
18. Gemini Flash Image envia para API do Gemini
   ↓
19. Gemini processa e retorna imagem gerada
   ↓
20. Orchestrator faz upload para Firebase Storage
   ↓
21. Orchestrator aplica watermark (se não skipWatermark)
   ↓
22. Orchestrator registra custo (logAPICost)
   ↓
23. Backend salva composição no Firestore
   ↓
24. Backend atualiza estatísticas do cliente
   ↓
25. Backend retorna resposta com URLs
   ↓
26. Frontend recebe e navega para página de resultados
```

### 18.2 Fluxo Remix

```
1. Frontend chama /api/generate-looks/remix
   ↓
2. Frontend seleciona pose aleatória
   ↓
3. Frontend busca cenário por tags (mesma lógica)
   ↓
4. Frontend envia com gerarNovoLook: true
   ↓
5. Backend processa (mesmo fluxo)
   ↓
6. Orchestrator usa temperatura 0.75 (mais variação)
   ↓
7. Prompt inclui instruções de remix
   ↓
8. Gemini gera com pose diferente
   ↓
9. Retorna nova imagem
```

---

## 19. Tratamento de Erros

### 19.1 Erros de Validação
- **400 Bad Request**: Parâmetros inválidos
- Mensagens específicas por tipo de erro

### 19.2 Erros de Autenticação
- **401 Unauthorized**: Token inválido ou expirado
- **403 Forbidden**: Sem permissão

### 19.3 Erros de Recursos
- **404 Not Found**: Recurso não encontrado
- **429 Too Many Requests**: Rate limit excedido

### 19.4 Erros de Processamento
- **500 Internal Server Error**: Erro interno
- **503 Service Unavailable**: Serviço indisponível
- **504 Gateway Timeout**: Timeout

### 19.5 Logging de Erros
- Todos os erros são logados no Firestore
- Inclui stack trace e metadata
- Facilita debugging

---

## 20. CORS e Segurança

### 20.1 CORS
- Headers CORS aplicados em todas as rotas de API
- Suporta `OPTIONS` para preflight
- Origin dinâmico (do header `origin`)

### 20.2 Autenticação
- Tokens validados no Firebase Admin
- Sessões de impersonificação com expiração
- Lista de admins configurável

### 20.3 Validação
- Validação de inputs em todas as rotas
- Sanitização de dados
- Validação de tipos TypeScript

---

## 21. Performance e Otimizações

### 21.1 Cache
- Cache de dados da loja (quando apropriado)
- Cache de produtos (com invalidação)
- Cache de cenários (em memória)

### 21.2 Lazy Loading
- Serviços de IA carregados sob demanda
- Firebase Admin inicializado apenas quando necessário

### 21.3 Batch Operations
- Múltiplas queries agrupadas quando possível
- Transações Firestore para atomicidade

### 21.4 Timeouts
- Timeout de 180 segundos para geração de imagens
- Retry com backoff exponencial

---

## 22. Monitoramento e Métricas

### 22.1 Logs
- Logs detalhados em todas as operações
- Timestamps e contexto
- Níveis: `info`, `warn`, `error`

### 22.2 Custos
- Registro de todos os custos de APIs
- Agregação por lojista
- Relatórios administrativos

### 22.3 Métricas
- Tempo de processamento
- Taxa de sucesso
- Taxa de erro
- Uso de recursos

---

## 23. Melhorias Implementadas (PHASE 26)

### 23.1 Integração de Cenários como Input Visual
- ✅ Backend recebe `scenarioImageUrl` do frontend
- ✅ Orchestrator inclui imagem do cenário no array enviado ao Gemini
- ✅ Prompt instrui Gemini a usar imagem como fundo
- ✅ Foco em identidade facial e produtos (não gerar cenário)

### 23.2 Matching Inteligente de Cenários
- ✅ Frontend busca cenários por tags de produtos
- ✅ Fallback para categoria se nenhum match por tags
- ✅ Seleção aleatória se múltiplos matches

---

## 24. Pontos de Atenção

### 24.1 Performance
- Busca de cenários em memória (pode ser lento com muitos cenários)
- Múltiplas queries Firestore (otimizar se necessário)
- Processamento de imagens (Sharp) pode ser pesado

### 24.2 Segurança
- Validação de URLs de imagens
- Sanitização de inputs
- Rate limiting (implementar se necessário)
- Proteção contra DDoS

### 24.3 Escalabilidade
- Processamento assíncrono para grandes volumes
- Queue system para gerações
- Cache inteligente
- CDN para imagens

### 24.4 Custos
- Monitoramento de custos de APIs
- Alertas de limite
- Otimização de uso de APIs

---

## 25. Próximos Passos Sugeridos

1. **Otimização de Queries**
   - Índices no Firestore para tags
   - Cache de cenários ativos
   - Batch queries

2. **Melhorias de Matching**
   - Peso por relevância de tags
   - Machine learning para matching
   - Histórico de matches bem-sucedidos

3. **Monitoramento**
   - Dashboard de métricas em tempo real
   - Alertas automáticos
   - Relatórios periódicos

4. **Testes**
   - Testes unitários para serviços
   - Testes de integração para APIs
   - Testes E2E para fluxos completos

5. **Documentação**
   - Documentação de APIs (OpenAPI/Swagger)
   - Guias de integração
   - Troubleshooting guides

---

## 26. Conclusão

O paineladm é um sistema robusto e bem estruturado, com:

- ✅ Arquitetura modular e escalável
- ✅ Separação clara de responsabilidades
- ✅ Integração com múltiplos provedores de IA
- ✅ Sistema completo de autenticação e autorização
- ✅ Gestão de custos e monitoramento
- ✅ Tratamento robusto de erros
- ✅ Logs detalhados para debug
- ✅ Integração com e-commerce
- ✅ Segmentação automática de clientes
- ✅ Análise de qualidade de produtos
- ✅ Sistema de compartilhamento
- ✅ Integração de cenários como input visual (PHASE 26)

O sistema suporta geração de looks, gestão de produtos, gestão de clientes, CRM, displays, e-commerce, e muito mais, com uma base sólida para crescimento e evolução.

---

**Documento gerado automaticamente em:** 2025-01-27  
**Última atualização:** PHASE 26

