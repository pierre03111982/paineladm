# 📚 Documentação Gemini 2.5 Flash Image - Vertex AI

Este documento contém links e informações essenciais sobre o modelo **Gemini 2.5 Flash Image** usado para geração de imagens no sistema de Virtual Try-On.

## 🔗 Links Oficiais de Documentação

### Documentação Principal
- **Modelo Gemini 2.5 Flash Image**: [https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash-image?hl=pt_br](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash-image?hl=pt_br)
  - Visão geral do modelo
  - Especificações técnicas
  - Limites e capacidades
  - Regiões disponíveis

### Preços e Custos
- **Preços do Vertex AI**: [https://cloud.google.com/vertex-ai/generative-ai/pricing?hl=pt-br](https://cloud.google.com/vertex-ai/generative-ai/pricing?hl=pt-br)
  - Tabela de preços atualizada
  - Cálculo de custos por região
  - Comparação entre modelos

### Documentação Adicional
- **Geração Multimodal de Imagens**: [https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/image-generation](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/image-generation)
- **API Reference**: [https://cloud.google.com/vertex-ai/generative-ai/docs/reference/rest](https://cloud.google.com/vertex-ai/generative-ai/docs/reference/rest)

---

## 💰 Cálculo de Custos

### Informações do Modelo

**Modelo**: `gemini-2.5-flash-image`  
**Versão**: GA (General Availability)  
**Data de Lançamento**: 2 de outubro de 2025  
**Versão Preview**: `gemini-2.5-flash-image-preview` (descontinuada em 31 de outubro de 2025)

### Estrutura de Preços

⚠️ **IMPORTANTE**: Os preços podem variar por região e são atualizados regularmente. Sempre consulte a [página oficial de preços](https://cloud.google.com/vertex-ai/generative-ai/pricing?hl=pt-br) para valores atualizados.

#### Custo por Requisição (Estimativa)

Baseado na documentação oficial do Google Cloud:

1. **Input (Entrada)**:
   - Imagens de entrada: Calculado por tokens de imagem
   - Texto do prompt: Calculado por tokens de texto
   - **Custo**: Variável conforme região e volume

2. **Output (Saída)**:
   - Imagem gerada: Calculado por imagem gerada
   - **Custo**: Variável conforme região

#### Exemplo de Cálculo (Estimativa)

Para uma geração de imagem Virtual Try-On típica:

```
Entrada:
- 1 imagem da pessoa (IMAGEM_PESSOA)
- 1-3 imagens de produtos (IMAGEM_PRODUTO_X)
- Prompt de texto (~500-1000 tokens)

Saída:
- 1 imagem gerada (1024x1024 ou maior)

Custo estimado por geração: $0.01 - $0.05 USD
```

**Nota**: Valores são estimativas. Consulte a página de preços oficial para valores exatos.

### Fórmula de Cálculo

```typescript
// Exemplo de função para calcular custo estimado
function calcularCustoGeracao(
  numImagensEntrada: number,
  tamanhoPromptTokens: number,
  regiao: string = "us-central1"
): number {
  // Valores são exemplos - consultar documentação oficial
  const custoPorImagemEntrada = 0.001; // USD por imagem
  const custoPorTokenTexto = 0.00001; // USD por token
  const custoPorImagemGerada = 0.02; // USD por imagem
  
  const custoEntrada = (numImagensEntrada * custoPorImagemEntrada) + 
                       (tamanhoPromptTokens * custoPorTokenTexto);
  const custoSaida = custoPorImagemGerada;
  
  return custoEntrada + custoSaida;
}
```

---

## 📊 Especificações Técnicas

### Limites e Capacidades

- **Tamanho máximo de imagem de entrada**: 7 MB (antes da codificação)
- **Formatos suportados de entrada**: 
  - `image/png`
  - `image/jpeg`
  - `image/webp`
  - `image/heic`
  - `image/heif`
- **Máximo de imagens por prompt**: 3.000 imagens
- **Resolução de saída**: Variável (geralmente 1024x1024 ou maior)
- **Marcação SynthID**: Todas as imagens geradas incluem marca d'água digital invisível

### Regiões Disponíveis

O modelo está disponível globalmente, com suporte específico em:
- **Estados Unidos**: `us-central1`, `us-east1`, `us-west1`
- **Europa**: `europe-west1`, `europe-west4`
- **Ásia-Pacífico**: `asia-southeast1`, `asia-northeast1`

### Data de Limite de Conhecimento

**Junho de 2025**

---

## 🔧 Implementação no Sistema

### Endpoint da API

```
POST https://{location}-aiplatform.googleapis.com/v1/projects/{projectId}/locations/{location}/publishers/google/models/gemini-2.5-flash-image:generateContent
```

### Estrutura da Requisição

```typescript
{
  contents: [
    {
      role: "user",
      parts: [
        // Imagens de entrada (base64)
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: "base64_string..."
          }
        },
        // Prompt de texto
        {
          text: "PROMPT_MESTRE_VTO..."
        }
      ]
    }
  ],
  generationConfig: {
    temperature: 0.4,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192
  },
  safetySettings: [...]
}
```

### Estrutura da Resposta

```typescript
{
  candidates: [
    {
      content: {
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: "base64_string..." // Imagem gerada
            }
          }
        ]
      },
      finishReason: "STOP"
    }
  ]
}
```

---

## 📝 Notas de Implementação

### Campo `responseModalities`

⚠️ **IMPORTANTE**: O campo `responseModalities` **NÃO** é suportado pelo endpoint do Vertex AI para `gemini-2.5-flash-image`. 

O modelo detecta automaticamente que deve gerar imagens quando recebe:
- Imagens de entrada (`inlineData`)
- Um prompt de texto descrevendo a geração

**Não incluir** `responseModalities` no `requestBody` para evitar erro 400.

### Ordem das Imagens

A ordem das imagens na requisição é crítica:

1. **Primeira imagem**: `IMAGEM_PESSOA` (obrigatória)
2. **Imagens seguintes**: `IMAGEM_PRODUTO_1`, `IMAGEM_PRODUTO_2`, `IMAGEM_PRODUTO_3` (máximo 3 produtos)

### Prompt Mestre VTO

O prompt usado está documentado em: `docs/PROMPT_LOOK_CRIATIVO.md`

---

## 🔍 Monitoramento e Logs

### Logs Importantes

O sistema registra os seguintes eventos:

- `[GeminiFlashImage] Iniciando geração de imagem`
- `[GeminiFlashImage] 📤 Enviando requisição para: {endpoint}`
- `[GeminiFlashImage] ✅ Resposta da API recebida`
- `[GeminiFlashImage] ✅ Imagem gerada com sucesso`
- `[GeminiFlashImage] ❌ Erro ao gerar imagem`

### Métricas a Monitorar

- Tempo de processamento por geração
- Taxa de sucesso/falha
- Custo acumulado por lojista
- Tamanho médio das imagens geradas

---

## 🚨 Troubleshooting

### Erro 400: "Invalid JSON payload"

**Causa**: Campo não suportado no `requestBody`  
**Solução**: Remover `responseModalities` do payload

### Erro 429: "Resource Exhausted"

**Causa**: Rate limit atingido  
**Solução**: Implementar retry com backoff exponencial (já implementado)

### Erro 500: "Internal Server Error"

**Causa**: Problema no processamento da imagem  
**Solução**: Verificar logs detalhados e validar formato das imagens de entrada

---

## 📅 Atualizações

- **Última atualização**: 19 de outubro de 2025 (conforme documentação oficial)
- **Versão do documento**: 1.0
- **Próxima revisão**: Quando houver mudanças significativas nos preços ou na API

---

## 📞 Suporte

Para questões técnicas ou atualizações:
- Consulte a [documentação oficial](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash-image?hl=pt_br)
- Verifique a [página de preços](https://cloud.google.com/vertex-ai/generative-ai/pricing?hl=pt-br) para valores atualizados
- Entre em contato com o suporte do Google Cloud se necessário







