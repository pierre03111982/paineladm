# Serviços de IA - ExperimenteAI

Sistema completo de integração com APIs de IA para geração de composições de Try-On virtual.

## 📋 Visão Geral

Este módulo gerencia todas as integrações com APIs de IA, controle de custos e processamento de imagens:

- **Vertex AI Try-On**: Try-on virtual usando Google Cloud
- **Vertex Imagen 3**: Geração e edição de cenários mantendo características da pessoa
- **Watermark**: Aplicação de marca d'água nas imagens
- **Cost Logger**: Controle e monitoramento de custos
- **Anonymization**: Anonimização de imagens para privacidade

## 🚀 Como Usar

### Gerando uma Composição Completa

```typescript
import { getCompositionOrchestrator } from "@/lib/ai-services";

const orchestrator = getCompositionOrchestrator();

const result = await orchestrator.createComposition({
  personImageUrl: "https://...",
  productImageUrl: "https://...",
  productId: "prod_123",
  lojistaId: "loja_456",
  customerId: "cliente_789",
  productName: "Camiseta Polo",
  productPrice: "R$ 99,90",
  storeName: "Minha Loja",
  logoUrl: "https://...",
  scenePrompts: [
    "Uma praia paradisíaca ao pôr do sol",
    "Um café moderno e elegante"
  ],
  options: {
    quality: "high",
    skipWatermark: false
  }
});

console.log("Composição criada:", result.compositionId);
console.log("Custo total:", result.totalCost, "USD");
console.log("Tempo de processamento:", result.processingTime, "ms");
```

### Usando APIs Individuais

#### Vertex AI Try-On

```typescript
import { getVertexTryOnService } from "@/lib/ai-services";

const vertexService = getVertexTryOnService();

const result = await vertexService.generateTryOn({
  personImageUrl: "https://...",
  garmentImageUrl: "https://...",
  productId: "prod_123",
  lojistaId: "loja_456",
  options: {
    quality: "high",
    preserveFace: true,
    autoMask: true
  }
});
```

#### Vertex Imagen 3 (Cenários)

```typescript
import { getImagenService } from "@/lib/ai-services";

const imagen = getImagenService();

// Gerar um cenário
const result = await imagen.generateScene({
  baseImageUrl: "https://...",
  prompt: "Uma praia paradisíaca ao pôr do sol",
  compositionId: "comp_123",
  lojistaId: "loja_456"
});

// Gerar múltiplos cenários
const results = await imagen.generateMultipleScenes(
  "https://...",
  [
    "Uma praia paradisíaca",
    "Um café moderno"
  ],
  "comp_123",
  "loja_456"
);
```

#### Watermark

```typescript
import { getWatermarkService } from "@/lib/ai-services";

const watermarkService = getWatermarkService();

const result = await watermarkService.applyWatermark(
  "https://...",
  {
    storeName: "Minha Loja",
    productName: "Camiseta Polo",
    productPrice: "R$ 99,90",
    logoUrl: "https://...",
    position: "bottom-right",
    opacity: 0.85
  }
);
```

### Controle de Custos

```typescript
import {
  getTotalAPICost,
  getCostSummaryByProvider,
  getAPIUsageStats,
  checkCostLimit
} from "@/lib/ai-services";

// Obter custo total
const totalUSD = await getTotalAPICost("loja_456", "USD");

// Obter resumo por provider
const summary = await getCostSummaryByProvider("loja_456");
console.log("Vertex AI:", summary["vertex-tryon"], "USD");
console.log("Imagen 3:", summary["imagen"], "USD");

// Obter estatísticas detalhadas
const stats = await getAPIUsageStats("loja_456");
console.log("Total de requisições:", stats.totalRequests);
console.log("Custo total:", stats.totalCost, "USD");

// Verificar limite
const limitCheck = await checkCostLimit("loja_456", 100.0);
if (limitCheck.exceeded) {
  console.log("⚠️ Limite de custos excedido!");
  console.log(`Atual: ${limitCheck.current} / Limite: ${limitCheck.limit}`);
}
```

### Anonimização

```typescript
import { getAnonymizationService } from "@/lib/ai-services";

const anonService = getAnonymizationService();

// Anonimizar imagem (blur)
const result = await anonService.anonymizeImage({
  imageUrl: "https://...",
  method: "blur",
  intensity: 50
});

// Detectar rostos
const faceDetection = await anonService.detectFaces("https://...");
if (faceDetection.hasFaces) {
  console.log(`Encontrados ${faceDetection.faceCount} rostos`);
}

// Criar avatar genérico
const avatarUrl = await anonService.createGenericAvatar(
  "https://...",
  "silhouette"
);
```

## 📡 APIs REST

### POST /api/lojista/composicoes/generate

Gera uma composição completa.

**Request Body:**
```json
{
  "personImageUrl": "https://...",
  "productId": "prod_123",
  "lojistaId": "loja_456",
  "customerId": "cliente_789",
  "scenePrompts": [
    "Uma praia paradisíaca",
    "Um café moderno"
  ],
  "options": {
    "quality": "high",
    "skipWatermark": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "compositionId": "comp_abc123",
  "tryonImageUrl": "https://...",
  "sceneImageUrls": ["https://...", "https://..."],
  "totalCost": 0.08,
  "processingTime": 8500,
  "status": { ... }
}
```

### GET /api/lojista/composicoes/generate?sceneCount=2&quality=high

Estima o custo de uma composição.

**Response:**
```json
{
  "estimatedCost": 0.08,
  "currency": "USD",
  "breakdown": {
    "tryon": 0.04,
    "scenes": 0.04
  }
}
```

### GET /api/lojista/custos?lojistaId=loja_456&limit=100

Consulta custos e estatísticas de uso.

**Response:**
```json
{
  "success": true,
  "lojistaId": "loja_456",
  "totals": {
    "USD": 45.32,
    "BRL": 226.60
  },
  "byProvider": {
    "vertex-tryon": 30.0,
    "imagen": 15.32
  },
  "usage": {
    "totalCost": 45.32,
    "totalRequests": 756,
    "byProvider": { ... },
    "byOperation": { ... }
  },
  "limitCheck": {
    "exceeded": false,
    "current": 45.32,
    "limit": 100.0,
    "percentage": 45.32
  }
}
```

## ⚙️ Configuração

### Variáveis de Ambiente

Crie ou atualize o arquivo `.env.local`:

```bash
# Google Cloud (Vertex AI)
GOOGLE_CLOUD_PROJECT_ID=seu-projeto-123
GOOGLE_CLOUD_LOCATION=us-central1
VERTEX_TRYON_ENDPOINT=endpoint-id
VERTEX_TRYON_COST=0.04

# Vertex Imagen 3
IMAGEN_COST=0.04

# Firebase Admin (já configurado)
# ...
```

### Instalação de Dependências

```bash
npm install @google-cloud/aiplatform sharp
# ou
yarn add @google-cloud/aiplatform sharp
```

## 🔒 Segurança e Privacidade

- **LGPD Compliance**: Sistema de anonimização de imagens
- **Controle de Acesso**: Todas as APIs verificam lojistaId
- **Logging**: Todos os custos são registrados no Firestore
- **Watermark**: Marca d'água automática em todas as imagens geradas

## 💰 Custos Estimados

| Serviço | Operação | Custo (USD) |
|---------|----------|-------------|
| Vertex AI Try-On | Try-On | ~US$ 0,04 |
| Vertex Imagen 3 | Cenário/Edição | ~US$ 0,04 |
| **Total** | **Composição Completa** | **~US$ 0,08** |

*Valores podem variar conforme qualidade e configurações.*

## 📊 Estrutura de Dados (Firestore)

### /lojas/{lojistaId}/custos_api/{id}

```typescript
{
  lojistaId: string;
  compositionId?: string;
  provider: "vertex-tryon" | "imagen";
  operation: "tryon" | "scene-generation" | "other";
  cost: number;
  currency: "USD" | "BRL";
  timestamp: Date;
  metadata?: {
    processingTime?: number;
    quality?: string;
  };
}
```

### /lojas/{lojistaId}/composicoes/{id}

```typescript
{
  lojistaId: string;
  clienteKey?: string;
  produtoKey: string;
  imagemPessoaUrl: string;
  imagemVtonUrl: string;
  imagemCenario1Url?: string;
  imagemCenario2Url?: string;
  custoTotal: number;
  tempoProcessamento: number;
  status: "pending" | "processing" | "completed" | "failed";
  curtido: boolean;
  compartilhamentos: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: object;
}
```

## 🧪 Modo Mock (Desenvolvimento)

Por padrão, se as APIs não estiverem configuradas, o sistema opera em **modo mock**:

- ✅ Simula tempo de processamento realista (2-6s)
- ✅ Retorna imagens de exemplo do Unsplash
- ✅ Calcula custos estimados
- ✅ Logs completos para debug

**Como ativar modo de produção:**
Configure todas as variáveis de ambiente necessárias.

## 🔧 Troubleshooting

### "API Key não configurada"

Verifique se as variáveis de ambiente estão corretas em `.env.local`.

### "Erro ao gerar try-on"

- Verifique se o Vertex AI está habilitado no Google Cloud
- Confirme que o endpoint está correto
- Verifique permissões do Service Account

### "Custos não aparecem no painel"

- Verifique se `logAPICost` está sendo chamado
- Confirme que a coleção `custos_api` existe no Firestore
- Verifique permissões de escrita no Firestore

## 📝 Próximos Passos

1. ✅ Estrutura de serviços criada
2. ✅ Vertex AI Try-On implementado (mock)
3. ✅ Vertex Imagen 3 implementado (mock)
4. ✅ Sistema de watermark criado
5. ✅ Cost logger implementado
6. ✅ Anonimização implementada
7. ⏳ Conectar com APIs reais (Vertex AI Try-On)
8. ⏳ Conectar com APIs reais (Vertex Imagen 3)
9. ⏳ Implementar Sharp para watermark
10. ⏳ Upload de imagens para Firebase Storage
11. ⏳ Dashboard de custos no painel admin

## 📚 Documentação Adicional

### APIs Externas

- **[Google Vertex AI Try-On - Documentação Oficial](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/virtual-try-on-api?hl=pt-br)** ⭐
- **[Google Vertex Imagen 3 - Documentação Oficial](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/imagegeneration#imagen3)** ⭐
- **[Vertex AI Integration Guide](./VERTEX_AI_INTEGRATION.md)** - Guia completo de integração
- **[Migração para Imagen 3](./MIGRAÇÃO_IMAGEN.md)** - Passo a passo interno
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)

### Google Cloud

- [Console Google Cloud](https://console.cloud.google.com/vertex-ai)
- [Preços Vertex AI](https://cloud.google.com/vertex-ai/pricing)
- [Release Notes](https://cloud.google.com/vertex-ai/docs/release-notes)

### Firebase

- [Firebase Console](https://console.firebase.google.com)
- [Firebase Storage](https://firebase.google.com/docs/storage)

---

**Desenvolvido para ExperimenteAI** 🚀








