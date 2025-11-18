# Fluxo de Geração de Imagens - Ajustado

## Resumo das Mudanças

### Quantidade de Imagens
- **Antes**: 4 imagens (2 looks × 2 produtos)
- **Agora**: **2 imagens apenas** (1 Look Natural + 1 Look Criativo IA)

### Produto Utilizado
- **Apenas o primeiro produto selecionado** é usado para gerar os 2 looks
- Os demais produtos selecionados são ignorados (podem ser usados como acessórios no futuro)

## Fluxo de Geração

### 1. Look Natural
- **Tecnologia**: Vertex AI Try-On apenas
- **Cenário**: Nenhum (fundo original da foto)
- **Descrição**: Visual natural com o produto aplicado de forma realista
- **Custo**: ~US$ 0,04 (apenas Try-On)

### 2. Look Criativo IA
- **Tecnologia**: Vertex AI Try-On + Google Imagen 3.0 (Cenário)
- **Cenário**: Gerado automaticamente baseado na categoria do produto
- **Descrição**: Versão criativa com cenário personalizado
- **Custo**: ~US$ 0,08 (Try-On + Cenário)

## Prompts de Cenário Inteligentes

Os prompts são gerados automaticamente baseados na **categoria do produto**:

### Praia/Bikini/Maiô
```
"Uma praia paradisíaca com areia branca, mar azul turquesa e palmeiras ao fundo, iluminação natural do sol, ambiente tropical e relaxante"
```

### Esporte/Academia/Fitness
```
"Um estúdio moderno com iluminação profissional, fundo neutro elegante, ambiente clean e minimalista, foco no produto"
```

### Casual/Dia a Dia
```
"Um ambiente urbano moderno, rua com arquitetura contemporânea, iluminação natural suave, estilo lifestyle"
```

### Social/Festa/Evento
```
"Um ambiente sofisticado e elegante, decoração moderna, iluminação ambiente suave, atmosfera premium"
```

### Padrão (Genérico)
```
"Um ambiente elegante e moderno, iluminação profissional de estúdio, fundo neutro que destaca o produto, estilo editorial de moda"
```

## Melhorias nos Prompts

Todos os prompts são **automaticamente aprimorados** com:
- "Estilo editorial de moda"
- "Alta qualidade"
- "Iluminação profissional"
- "Foco no produto e na pessoa"
- "Composição elegante"

## Aspect Ratio

- **Formato**: 3:4 (Portrait/Vertical)
- **Razão**: Melhor para moda/roupas, formato mais adequado para produtos de vestuário

## Custo Total Estimado

- **Look Natural**: ~US$ 0,04
- **Look Criativo**: ~US$ 0,08
- **Total por geração**: ~US$ 0,12 (aproximadamente R$ 0,60 a R$ 0,72)

## Estrutura de Resposta da API

```json
{
  "success": true,
  "looks": [
    {
      "id": "look-natural-...",
      "titulo": "Look Natural",
      "descricao": "Visual natural com [Nome do Produto]...",
      "imagemUrl": "...",
      "produtoNome": "...",
      "produtoPreco": 99.90,
      "watermarkText": "..."
    },
    {
      "id": "look-criativo-...",
      "titulo": "Look Criativo IA",
      "descricao": "Versão criativa gerada por IA...",
      "imagemUrl": "...",
      "produtoNome": "...",
      "produtoPreco": 99.90,
      "watermarkText": "..."
    }
  ],
  "totalCost": 0.12,
  "totalCostBRL": 0.72,
  "productsProcessed": 1,
  "primaryProductId": "...",
  "primaryProductName": "..."
}
```

## Observações Importantes

1. **Apenas 2 imagens** são geradas, independente de quantos produtos foram selecionados
2. **O primeiro produto** da lista é usado como produto principal
3. **Prompts inteligentes** são gerados automaticamente baseados na categoria
4. **Aspect ratio 3:4** é usado para melhor adequação ao formato de moda
5. **Custos reduzidos** - apenas 2 imagens ao invés de 4+



## Resumo das Mudanças

### Quantidade de Imagens
- **Antes**: 4 imagens (2 looks × 2 produtos)
- **Agora**: **2 imagens apenas** (1 Look Natural + 1 Look Criativo IA)

### Produto Utilizado
- **Apenas o primeiro produto selecionado** é usado para gerar os 2 looks
- Os demais produtos selecionados são ignorados (podem ser usados como acessórios no futuro)

## Fluxo de Geração

### 1. Look Natural
- **Tecnologia**: Vertex AI Try-On apenas
- **Cenário**: Nenhum (fundo original da foto)
- **Descrição**: Visual natural com o produto aplicado de forma realista
- **Custo**: ~US$ 0,04 (apenas Try-On)

### 2. Look Criativo IA
- **Tecnologia**: Vertex AI Try-On + Google Imagen 3.0 (Cenário)
- **Cenário**: Gerado automaticamente baseado na categoria do produto
- **Descrição**: Versão criativa com cenário personalizado
- **Custo**: ~US$ 0,08 (Try-On + Cenário)

## Prompts de Cenário Inteligentes

Os prompts são gerados automaticamente baseados na **categoria do produto**:

### Praia/Bikini/Maiô
```
"Uma praia paradisíaca com areia branca, mar azul turquesa e palmeiras ao fundo, iluminação natural do sol, ambiente tropical e relaxante"
```

### Esporte/Academia/Fitness
```
"Um estúdio moderno com iluminação profissional, fundo neutro elegante, ambiente clean e minimalista, foco no produto"
```

### Casual/Dia a Dia
```
"Um ambiente urbano moderno, rua com arquitetura contemporânea, iluminação natural suave, estilo lifestyle"
```

### Social/Festa/Evento
```
"Um ambiente sofisticado e elegante, decoração moderna, iluminação ambiente suave, atmosfera premium"
```

### Padrão (Genérico)
```
"Um ambiente elegante e moderno, iluminação profissional de estúdio, fundo neutro que destaca o produto, estilo editorial de moda"
```

## Melhorias nos Prompts

Todos os prompts são **automaticamente aprimorados** com:
- "Estilo editorial de moda"
- "Alta qualidade"
- "Iluminação profissional"
- "Foco no produto e na pessoa"
- "Composição elegante"

## Aspect Ratio

- **Formato**: 3:4 (Portrait/Vertical)
- **Razão**: Melhor para moda/roupas, formato mais adequado para produtos de vestuário

## Custo Total Estimado

- **Look Natural**: ~US$ 0,04
- **Look Criativo**: ~US$ 0,08
- **Total por geração**: ~US$ 0,12 (aproximadamente R$ 0,60 a R$ 0,72)

## Estrutura de Resposta da API

```json
{
  "success": true,
  "looks": [
    {
      "id": "look-natural-...",
      "titulo": "Look Natural",
      "descricao": "Visual natural com [Nome do Produto]...",
      "imagemUrl": "...",
      "produtoNome": "...",
      "produtoPreco": 99.90,
      "watermarkText": "..."
    },
    {
      "id": "look-criativo-...",
      "titulo": "Look Criativo IA",
      "descricao": "Versão criativa gerada por IA...",
      "imagemUrl": "...",
      "produtoNome": "...",
      "produtoPreco": 99.90,
      "watermarkText": "..."
    }
  ],
  "totalCost": 0.12,
  "totalCostBRL": 0.72,
  "productsProcessed": 1,
  "primaryProductId": "...",
  "primaryProductName": "..."
}
```

## Observações Importantes

1. **Apenas 2 imagens** são geradas, independente de quantos produtos foram selecionados
2. **O primeiro produto** da lista é usado como produto principal
3. **Prompts inteligentes** são gerados automaticamente baseados na categoria
4. **Aspect ratio 3:4** é usado para melhor adequação ao formato de moda
5. **Custos reduzidos** - apenas 2 imagens ao invés de 4+

