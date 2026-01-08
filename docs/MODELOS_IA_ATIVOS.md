# Modelos de IA Ativos - Painel ADM e App Modelo 2

**Data de Atualização:** 07/01/2026  
**Versão:** 1.0

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Modelos Google Vertex AI](#modelos-google-vertex-ai)
3. [Modelos Stability.ai](#modelos-stabilityai)
4. [Serviços de Análise e Processamento](#serviços-de-análise-e-processamento)
5. [Orquestração e Composição](#orquestração-e-composição)
6. [Resumo de Uso por Funcionalidade](#resumo-de-uso-por-funcionalidade)

---

## 🎯 Visão Geral

O sistema utiliza múltiplos modelos de IA para diferentes funcionalidades, focando principalmente em:
- **Análise de imagens de produtos** (visão computacional)
- **Geração de imagens** (catálogo, looks combinados, try-on)
- **Análise de texto e insights** (dados de clientes, produtos, métricas)
- **Composição de looks** (combinação de produtos em cenários)

---

## 🤖 Modelos Google Vertex AI

### 1. **Gemini 2.5 Flash** (`gemini-2.5-flash`)

**Localização:** `paineladm/src/lib/ai-services/product-analyzer.ts`

**Função:**
- Análise de imagens de produtos com visão computacional
- Geração automática de metadados de produtos (nome, descrição SEO, categoria, tipo, tecido, cores)
- Extração de características visuais de roupas (ignorando acessórios)

**Uso:**
- Endpoint: `/api/lojista/products/analyze`
- Análise automática ao fazer upload de imagem de produto
- Análise em massa de produtos existentes
- Geração de tags contextuais para seleção de cenários

**Características:**
- Suporta análise de imagens (multimodal)
- Retorna JSON estruturado
- Limite de descrição: 500 caracteres
- Foco exclusivo na peça de roupa (ignora acessórios)

---

### 2. **Gemini 2.5 Flash Image** (`gemini-2.5-flash-image`)

**Localização:** `paineladm/src/lib/ai-services/gemini-flash-image.ts`

**Função:**
- Geração de imagens criativas com múltiplas imagens de entrada
- Criação de looks combinados (composições de roupas)
- Geração de imagens de catálogo com manequins

**Uso:**
- Endpoint: `/api/lojista/products/generate-studio`
- Geração de foto de catálogo (produto em manequim)
- Geração de look combinado (múltiplos produtos juntos)
- Integrado no `CompositionOrchestrator` para looks criativos

**Características:**
- Suporta múltiplas imagens de entrada
- Gera imagens em formato 9:16 (vertical, mobile-first)
- Aspect ratio fixo para evitar cortes
- Custo estimado: $0.02 por imagem

**Documentação:**
- https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash-image

---

### 3. **Gemini 1.5 Flash (Texto)** (`gemini-1.5-flash`)

**Localização:** `paineladm/src/lib/ai-services/gemini-text.ts`

**Função:**
- Análise de dados e geração de insights proativos
- Análise de estilo do cliente (Style DNA)
- Geração de recomendações estratégicas
- Análise de performance de produtos

**Uso:**
- Endpoint: `/api/ai/generate-insights-v2`
- Endpoint: `/api/ai/client-style-analysis`
- Endpoint: `/api/ai/product-performance`
- Análise diária automática de dados

**Características:**
- Processamento de texto e dados estruturados
- Geração de insights acionáveis
- Análise comportamental de clientes
- Custo estimado: $0.0001 por requisição

**Documentação:**
- https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini

---

### 4. **Gemini 1.5 Pro (Agente Ana)** (`gemini-1.5-pro`)

**Localização:** 
- `paineladm/src/lib/ai-services/gemini-agent.ts` (SDK Google Generative AI)
- `paineladm/src/lib/ai-services/vertex-agent.ts` (Vertex AI SDK)

**Função:**
- Assistente virtual "Ana" com raciocínio empático
- Consulta dados reais do Firestore via Function Calling
- Respostas inteligentes sobre produtos, clientes e métricas
- Integração com Google Search 2.0 para informações externas

**Uso:**
- Chat interativo no painel administrativo
- Consultas sobre performance de produtos
- Análise de dados de clientes
- Recomendações estratégicas

**Características:**
- Function Calling para acesso a dados reais
- Grounding com Google Search 2.0
- Contexto injetado diretamente no system prompt
- Tratamento robusto de respostas

---

### 5. **Google Imagen 3.0** (`imagen-3.0-capability-001` / `imagegeneration@006`)

**Localização:** `paineladm/src/lib/ai/imagen-generate.ts`

**Função:**
- Geração de imagens de alta qualidade a partir de texto
- Customização de imagens com referências
- Edição de imagens
- Geração de imagens de catálogo e looks

**Uso:**
- Integrado no `CompositionOrchestrator`
- Geração alternativa de imagens quando outros modelos falham
- Subject customization e Style customization

**Características:**
- Suporta customização com imagens de referência
- Geração pura de texto (modelo `imagegeneration@006`)
- Edição de imagens existentes
- Alta qualidade de saída

**Documentação:**
- https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-generate

---

### 6. **Google Vertex AI Try-On**

**Localização:** `paineladm/src/lib/ai-services/vertex-tryon.ts`

**Função:**
- Virtual try-on de roupas (prova virtual)
- Colocação de produtos em pessoas/manequins
- Geração de imagens realistas de produtos vestidos

**Uso:**
- Endpoint: `/api/refine-tryon`
- Integrado no `CompositionOrchestrator`
- Geração de looks combinados com try-on

**Características:**
- Custo oficial: $0.04 por imagem
- Suporta múltiplas peças de roupa
- Geração realista de caimento e ajuste

**Documentação:**
- https://cloud.google.com/vertex-ai/docs/generative-ai/image/try-on

---

## 🎨 Modelos Stability.ai

### 7. **Stable Diffusion XL** (`stable-diffusion-xl-1024-v1-0`)

**Localização:** `paineladm/src/lib/ai-services/stability-ai.ts`

**Função:**
- Geração de imagens de alta qualidade
- Composição de looks criativos
- Geração alternativa quando outros modelos falham

**Uso:**
- Integrado no `CompositionOrchestrator`
- Geração de looks combinados
- Fallback para geração de imagens

**Características:**
- Modelo: `stable-diffusion-xl-1024-v1-0`
- Versão beta: `stable-diffusion-xl-beta-v2-2-2`
- Suporta Image-to-Image
- Upscale disponível (conservativo e criativo)

**Modelos de Upscale:**
- `stable-image-upscale-conservative`: Upscale conservativo
- `stable-image-upscale-creative`: Upscale criativo

**Documentação:**
- https://platform.stability.ai/docs/api-reference

---

## 🔧 Serviços de Análise e Processamento

### 8. **Insights Generator**

**Localização:** `paineladm/src/lib/ai-services/insights-generator.ts`

**Função:**
- Agregação de dados reais (composições, métricas)
- Geração de insights estratégicos usando Gemini 1.5 Flash
- Análise de performance de produtos
- Recomendações acionáveis

**Modelo Utilizado:** Gemini 1.5 Flash (Texto)

**Uso:**
- Endpoint: `/api/ai/generate-insights-v2`
- Dashboard de insights
- Análise diária automática

---

### 9. **Client Style Analysis**

**Localização:** `paineladm/src/app/api/ai/client-style-analysis/route.ts`

**Função:**
- Análise de perfil comportamental do cliente
- Geração de "Style DNA" (DNA de Estilo)
- Recomendações personalizadas baseadas em interações

**Modelo Utilizado:** Gemini 1.5 Flash (Texto)

**Uso:**
- Endpoint: `/api/ai/client-style-analysis`
- Perfil de cliente
- Recomendações personalizadas

---

## 🎭 Orquestração e Composição

### 10. **Composition Orchestrator**

**Localização:** `paineladm/src/lib/ai-services/composition-orchestrator.ts`

**Função:**
- Orquestra múltiplos modelos de IA para criar composições completas
- Coordena Try-On, geração de imagens, cenários e watermark
- Gerencia fallbacks entre diferentes provedores

**Modelos Utilizados:**
- **Vertex Try-On**: Prova virtual de roupas
- **Gemini 2.5 Flash Image**: Geração de looks combinados
- **Imagen 3.0**: Geração alternativa de imagens
- **Stability.ai SDXL**: Geração alternativa de imagens

**Fluxo de Trabalho:**
1. Try-On inicial (Vertex AI)
2. Geração de look combinado (Gemini 2.5 Flash Image ou Imagen 3.0)
3. Fallback para Stability.ai se necessário
4. Aplicação de watermark
5. Salvamento no Firebase Storage

**Uso:**
- Endpoint: `/api/lojista/composicoes/generate`
- Geração de looks completos
- App Modelo 2 (via proxy)

---

## 📊 Resumo de Uso por Funcionalidade

### **Análise de Produtos**
- **Modelo:** Gemini 2.5 Flash (GA - General Availability)
- **Função:** Análise de imagens, extração de metadados
- **Endpoints:**
  - `/api/lojista/products/analyze`
  - `/api/lojista/products/bulk-analyze`

### **Geração de Imagens de Catálogo**
- **Modelos:** Gemini 2.5 Flash Image, Imagen 3.0, Stability.ai SDXL
- **Função:** Geração de imagens de produtos em manequins
- **Endpoint:** `/api/lojista/products/generate-studio`

### **Geração de Looks Combinados**
- **Modelos:** Gemini 2.5 Flash Image, Vertex Try-On, Imagen 3.0, Stability.ai SDXL
- **Função:** Composição de múltiplos produtos em um look
- **Endpoint:** `/api/lojista/composicoes/generate`

### **Análise de Clientes e Insights**
- **Modelo:** Gemini 1.5 Flash (Texto)
- **Função:** Análise comportamental, geração de insights
- **Endpoints:**
  - `/api/ai/generate-insights-v2`
  - `/api/ai/client-style-analysis`
  - `/api/ai/product-performance`

### **Assistente Virtual (Ana)**
- **Modelo:** Gemini 1.5 Pro
- **Função:** Chat interativo, consultas inteligentes
- **Endpoints:**
  - `/api/ai/chat` (via Vertex Agent)
  - `/api/ai/generate` (via Gemini Agent)

---

## 🔐 Configuração e Variáveis de Ambiente

### **Google Cloud / Vertex AI**
```env
GOOGLE_CLOUD_PROJECT_ID=seu-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GEMINI_API_KEY=sua-api-key
GOOGLE_API_KEY=sua-api-key
```

### **Stability.ai**
```env
STABILITY_AI_API_KEY=sua-api-key
```

### **Custos Estimados (por requisição)**
```env
GEMINI_FLASH_IMAGE_COST=0.02
GEMINI_TEXT_COST=0.0001
TRYON_COST=0.04
```

---

## 📝 Notas Importantes

1. **Fallbacks:** O sistema implementa fallbacks automáticos entre modelos quando um falha
2. **Custos:** Todos os custos são estimados e podem variar conforme a região e uso
3. **Limites:** Alguns modelos têm limites de caracteres (ex: descrição SEO = 500 caracteres)
4. **Cache:** Alguns resultados são cacheados para reduzir custos
5. **Monitoramento:** O sistema inclui logging de custos e métricas de uso

---

## 🔄 Atualizações Futuras

- Monitoramento de custos em tempo real
- Otimização de prompts para reduzir tokens
- Implementação de cache mais agressivo
- Suporte a novos modelos conforme disponibilidade

---

**Documento criado em:** 07/01/2026  
**Última atualização:** 07/01/2026  
**Versão:** 1.0

