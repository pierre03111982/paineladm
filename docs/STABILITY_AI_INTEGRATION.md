# Integração Stability.ai - Documentação

## Visão Geral

Este documento descreve a integração do Stability.ai no fluxo de geração de imagens, combinando com o modelo Try-On do Google Vertex AI.

## Modelos Stability.ai Utilizados

### 1. Stable Diffusion XL (SDXL)
- **Modelo**: `stable-diffusion-xl-1024-v1-0` ou `stable-diffusion-xl-beta-v2-2-2`
- **Uso**: Geração de imagens de alta qualidade (1024x1024)
- **Capacidades**:
  - Text-to-Image: Geração a partir de prompt
  - Image-to-Image: Transformação de imagens existentes
  - Suporta prompts detalhados e negative prompts
- **Preço**: **$0.04 por imagem** (USD)
- **Documentação**: https://platform.stability.ai/docs/api-reference#tag/Generate

### 2. Stable Image Upscale (Conservative)
- **Modelo**: `stable-image-upscale-conservative`
- **Uso**: Aumento de resolução mantendo fidelidade
- **Preço**: **$0.05 por imagem** (USD)
- **Documentação**: https://platform.stability.ai/docs/api-reference#tag/Upscale/paths/~1v2beta~1stable-image~1upscale~1conservative/post

### 3. Stable Image Upscale (Creative)
- **Modelo**: `stable-image-upscale-creative`
- **Uso**: Aumento de resolução com melhorias criativas
- **Preço**: **$0.05 por imagem** (USD)

## Preços (2024)

| Operação | Preço (USD) | Preço (BRL)* |
|----------|-------------|--------------|
| Geração SDXL | $0.04 | ~R$ 0.21 |
| Upscale Conservative | $0.05 | ~R$ 0.26 |
| Upscale Creative | $0.05 | ~R$ 0.26 |

*Cotação USD/BRL ~5.25 (atualizar conforme necessário)

## Novo Fluxo de Geração

### Fluxo Completo: Try-On + Stability.ai

```
1. Upload da Foto da Pessoa
   ↓
2. URL do Produto (ou produto do catálogo)
   ↓
3. Try-On (Vertex AI)
   - Aplica o produto na pessoa
   - Custo: $0.04 por imagem
   ↓
4. Stability.ai Image-to-Image
   - Refina a imagem gerada pelo Try-On
   - Aplica melhorias de qualidade e realismo
   - Custo: $0.04 por imagem
   ↓
5. (Opcional) Upscale com Stability.ai
   - Aumenta resolução para melhor qualidade
   - Custo: $0.05 por imagem
   ↓
6. Aplicação de Watermark
   ↓
7. Imagem Final
```

### Fluxo Alternativo: Stability.ai Direto (quando Try-On não suporta)

Para produtos como óculos e acessórios que o Try-On não suporta:

```
1. Upload da Foto da Pessoa
   ↓
2. URL do Produto
   ↓
3. Stability.ai Image-to-Image
   - Usa foto da pessoa como base
   - Prompt detalhado com características do produto
   - Custo: $0.04 por imagem
   ↓
4. (Opcional) Upscale
   - Custo: $0.05 por imagem
   ↓
5. Aplicação de Watermark
   ↓
6. Imagem Final
```

## Configuração

### Variáveis de Ambiente

Adicione ao `.env.local`:

```env
# Stability.ai
STABILITY_AI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Obter API Key

1. Acesse: https://platform.stability.ai/
2. Crie uma conta ou faça login
3. Vá em "API Keys"
4. Gere uma nova chave
5. Copie e adicione ao `.env.local`

## Uso no Código

### Exemplo: Geração Simples

```typescript
import { getStabilityAIService } from "@/lib/ai-services/stability-ai";

const stabilityService = getStabilityAIService();

const result = await stabilityService.generateImage({
  prompt: "A person wearing stylish sunglasses, professional photography, high quality",
  width: 1024,
  height: 1024,
  steps: 30,
  cfgScale: 7,
});
```

### Exemplo: Composição Pessoa + Produto

```typescript
const result = await stabilityService.generateComposition({
  personImageUrl: "https://...", // URL da foto da pessoa
  productImageUrl: "https://...", // URL do produto
  prompt: "A person wearing the exact sunglasses from the product image, natural lighting, professional photography",
  width: 1024,
  height: 1024,
  steps: 40,
  cfgScale: 8,
});
```

### Exemplo: Upscale

```typescript
const upscaled = await stabilityService.upscaleImage(
  imageUrl,
  "conservative" // ou "creative"
);
```

## Integração com Orchestrator

O `composition-orchestrator.ts` foi atualizado para usar Stability.ai quando apropriado:

1. **Produtos do catálogo (roupas)**: Try-On → Stability.ai refinement → Upscale (opcional)
2. **Produtos via URL (acessórios)**: Stability.ai direto → Upscale (opcional)

## Custos Totais Estimados

### Look Natural (sem upscale)
- Try-On: $0.04
- Stability.ai: $0.04
- **Total: $0.08 por look**

### Look Criativo (sem upscale)
- Try-On: $0.04
- Stability.ai: $0.04
- **Total: $0.08 por look**

### Com Upscale
- Adicionar $0.05 por look
- **Total: $0.13 por look**

### Produto via URL (sem Try-On)
- Stability.ai: $0.04
- Upscale (opcional): $0.05
- **Total: $0.04 - $0.09 por look**

## Limites e Considerações

1. **Rate Limits**: 150 requisições a cada 10 segundos
2. **Tamanho de Imagem**: Máximo 1024x1024 para geração, pode upscale depois
3. **Formato**: PNG ou JPEG
4. **Tempo de Processamento**: ~10-30 segundos por imagem

## Referências

- Documentação oficial: https://platform.stability.ai/docs/api-reference
- Preços: https://platform.stability.ai/pricing
- Status da API: https://status.stability.ai/



## Visão Geral

Este documento descreve a integração do Stability.ai no fluxo de geração de imagens, combinando com o modelo Try-On do Google Vertex AI.

## Modelos Stability.ai Utilizados

### 1. Stable Diffusion XL (SDXL)
- **Modelo**: `stable-diffusion-xl-1024-v1-0` ou `stable-diffusion-xl-beta-v2-2-2`
- **Uso**: Geração de imagens de alta qualidade (1024x1024)
- **Capacidades**:
  - Text-to-Image: Geração a partir de prompt
  - Image-to-Image: Transformação de imagens existentes
  - Suporta prompts detalhados e negative prompts
- **Preço**: **$0.04 por imagem** (USD)
- **Documentação**: https://platform.stability.ai/docs/api-reference#tag/Generate

### 2. Stable Image Upscale (Conservative)
- **Modelo**: `stable-image-upscale-conservative`
- **Uso**: Aumento de resolução mantendo fidelidade
- **Preço**: **$0.05 por imagem** (USD)
- **Documentação**: https://platform.stability.ai/docs/api-reference#tag/Upscale/paths/~1v2beta~1stable-image~1upscale~1conservative/post

### 3. Stable Image Upscale (Creative)
- **Modelo**: `stable-image-upscale-creative`
- **Uso**: Aumento de resolução com melhorias criativas
- **Preço**: **$0.05 por imagem** (USD)

## Preços (2024)

| Operação | Preço (USD) | Preço (BRL)* |
|----------|-------------|--------------|
| Geração SDXL | $0.04 | ~R$ 0.21 |
| Upscale Conservative | $0.05 | ~R$ 0.26 |
| Upscale Creative | $0.05 | ~R$ 0.26 |

*Cotação USD/BRL ~5.25 (atualizar conforme necessário)

## Novo Fluxo de Geração

### Fluxo Completo: Try-On + Stability.ai

```
1. Upload da Foto da Pessoa
   ↓
2. URL do Produto (ou produto do catálogo)
   ↓
3. Try-On (Vertex AI)
   - Aplica o produto na pessoa
   - Custo: $0.04 por imagem
   ↓
4. Stability.ai Image-to-Image
   - Refina a imagem gerada pelo Try-On
   - Aplica melhorias de qualidade e realismo
   - Custo: $0.04 por imagem
   ↓
5. (Opcional) Upscale com Stability.ai
   - Aumenta resolução para melhor qualidade
   - Custo: $0.05 por imagem
   ↓
6. Aplicação de Watermark
   ↓
7. Imagem Final
```

### Fluxo Alternativo: Stability.ai Direto (quando Try-On não suporta)

Para produtos como óculos e acessórios que o Try-On não suporta:

```
1. Upload da Foto da Pessoa
   ↓
2. URL do Produto
   ↓
3. Stability.ai Image-to-Image
   - Usa foto da pessoa como base
   - Prompt detalhado com características do produto
   - Custo: $0.04 por imagem
   ↓
4. (Opcional) Upscale
   - Custo: $0.05 por imagem
   ↓
5. Aplicação de Watermark
   ↓
6. Imagem Final
```

## Configuração

### Variáveis de Ambiente

Adicione ao `.env.local`:

```env
# Stability.ai
STABILITY_AI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Obter API Key

1. Acesse: https://platform.stability.ai/
2. Crie uma conta ou faça login
3. Vá em "API Keys"
4. Gere uma nova chave
5. Copie e adicione ao `.env.local`

## Uso no Código

### Exemplo: Geração Simples

```typescript
import { getStabilityAIService } from "@/lib/ai-services/stability-ai";

const stabilityService = getStabilityAIService();

const result = await stabilityService.generateImage({
  prompt: "A person wearing stylish sunglasses, professional photography, high quality",
  width: 1024,
  height: 1024,
  steps: 30,
  cfgScale: 7,
});
```

### Exemplo: Composição Pessoa + Produto

```typescript
const result = await stabilityService.generateComposition({
  personImageUrl: "https://...", // URL da foto da pessoa
  productImageUrl: "https://...", // URL do produto
  prompt: "A person wearing the exact sunglasses from the product image, natural lighting, professional photography",
  width: 1024,
  height: 1024,
  steps: 40,
  cfgScale: 8,
});
```

### Exemplo: Upscale

```typescript
const upscaled = await stabilityService.upscaleImage(
  imageUrl,
  "conservative" // ou "creative"
);
```

## Integração com Orchestrator

O `composition-orchestrator.ts` foi atualizado para usar Stability.ai quando apropriado:

1. **Produtos do catálogo (roupas)**: Try-On → Stability.ai refinement → Upscale (opcional)
2. **Produtos via URL (acessórios)**: Stability.ai direto → Upscale (opcional)

## Custos Totais Estimados

### Look Natural (sem upscale)
- Try-On: $0.04
- Stability.ai: $0.04
- **Total: $0.08 por look**

### Look Criativo (sem upscale)
- Try-On: $0.04
- Stability.ai: $0.04
- **Total: $0.08 por look**

### Com Upscale
- Adicionar $0.05 por look
- **Total: $0.13 por look**

### Produto via URL (sem Try-On)
- Stability.ai: $0.04
- Upscale (opcional): $0.05
- **Total: $0.04 - $0.09 por look**

## Limites e Considerações

1. **Rate Limits**: 150 requisições a cada 10 segundos
2. **Tamanho de Imagem**: Máximo 1024x1024 para geração, pode upscale depois
3. **Formato**: PNG ou JPEG
4. **Tempo de Processamento**: ~10-30 segundos por imagem

## Referências

- Documentação oficial: https://platform.stability.ai/docs/api-reference
- Preços: https://platform.stability.ai/pricing
- Status da API: https://status.stability.ai/

