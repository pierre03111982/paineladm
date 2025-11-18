# Teste de Geração de Imagem com Óculos

## Endpoint de Teste

**POST** `/api/test/oculos`

## Objetivo

Gerar uma imagem combinando a pessoa da foto upload com o produto óculos de forma:
- **Orgânica e natural**
- **Fotorrealista**
- **Mantendo fidelidade total ao rosto** (detalhes, formato, características)
- **Mantendo fidelidade total à forma física** (proporções, postura, corpo)
- **Mantendo total semelhança com o produto** (formato, cor, estilo, detalhes)

## Como Usar

### Opção 1: FormData (Recomendado)

```javascript
const formData = new FormData();
formData.append("personPhoto", filePerson); // Arquivo da foto da pessoa
formData.append("oculosPhoto", fileOculos); // Arquivo da foto do óculos
formData.append("lojistaId", "seu-lojista-id"); // Opcional

const response = await fetch("http://localhost:3000/api/test/oculos", {
  method: "POST",
  body: formData,
});

const data = await response.json();
console.log("Imagem gerada:", data.imageUrl);
```

### Opção 2: JSON

```javascript
const response = await fetch("http://localhost:3000/api/test/oculos", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    personImageUrl: "https://...", // URL da foto da pessoa
    oculosImageUrl: "https://...", // URL da foto do óculos
    lojistaId: "seu-lojista-id", // Opcional
  }),
});

const data = await response.json();
console.log("Imagem gerada:", data.imageUrl);
```

## Fluxo de Geração

**IMPORTANTE**: Try-On **NÃO** aceita acessórios como óculos. Usamos **APENAS Imagen 3.0**.

### Processo
1. **Entrada**: 2 imagens (pessoa + óculos)
2. **Processamento**: Imagen 3.0 usa a imagem da pessoa como base
3. **Prompt**: Descreve detalhadamente o óculos que deve ser aplicado
4. **Saída**: 1 imagem (pessoa usando exatamente o óculos do produto)

## Prompt Utilizado

O prompt é otimizado para máxima fidelidade:

```
Uma pessoa usando óculos de forma completamente natural e orgânica. 

REQUISITOS CRÍTICOS DE FIDELIDADE:
- Manter FIELMENTE todos os detalhes do rosto: formato exato, estrutura óssea, características faciais, expressão, pele, cabelo
- Manter FIELMENTE a forma física completa: proporções corporais, postura, altura, estrutura física
- Manter FIELMENTE a semelhança total com o produto óculos: formato exato da armação, cor, estilo, detalhes, tamanho, proporções
- Aplicação natural e realista dos óculos no rosto, posicionamento correto sobre o nariz e orelhas
- Iluminação natural e realista que preserve os detalhes
- Qualidade fotográfica profissional, fotorrealista
- Sem distorções, sem alterações na aparência da pessoa
- Estilo editorial de moda, alta fidelidade, precisão máxima
```

## Resposta da API

```json
{
  "success": true,
  "imageUrl": "https://...",
  "method": "imagen-only",
  "metadata": {
    "personImageUrl": "https://...",
    "oculosImageUrl": "https://...",
    "processingTime": 5000,
    "cost": 0.04,
    "costBRL": 0.20
  }
}
```

## Método Utilizado

- **`imagen-only`**: Apenas Imagen 3.0 (Try-On não suporta acessórios como óculos)

## Custo Estimado

- Imagen 3.0: ~US$ 0,04
- **Total**: ~US$ 0,04 (aproximadamente R$ 0,20 a R$ 0,24)

## Observações

1. O endpoint faz upload automático das imagens para Firebase Storage
2. A imagem final também é salva no Storage
3. O prompt é otimizado especificamente para óculos
4. O aspect ratio é 3:4 (portrait) para melhor adequação




## Endpoint de Teste

**POST** `/api/test/oculos`

## Objetivo

Gerar uma imagem combinando a pessoa da foto upload com o produto óculos de forma:
- **Orgânica e natural**
- **Fotorrealista**
- **Mantendo fidelidade total ao rosto** (detalhes, formato, características)
- **Mantendo fidelidade total à forma física** (proporções, postura, corpo)
- **Mantendo total semelhança com o produto** (formato, cor, estilo, detalhes)

## Como Usar

### Opção 1: FormData (Recomendado)

```javascript
const formData = new FormData();
formData.append("personPhoto", filePerson); // Arquivo da foto da pessoa
formData.append("oculosPhoto", fileOculos); // Arquivo da foto do óculos
formData.append("lojistaId", "seu-lojista-id"); // Opcional

const response = await fetch("http://localhost:3000/api/test/oculos", {
  method: "POST",
  body: formData,
});

const data = await response.json();
console.log("Imagem gerada:", data.imageUrl);
```

### Opção 2: JSON

```javascript
const response = await fetch("http://localhost:3000/api/test/oculos", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    personImageUrl: "https://...", // URL da foto da pessoa
    oculosImageUrl: "https://...", // URL da foto do óculos
    lojistaId: "seu-lojista-id", // Opcional
  }),
});

const data = await response.json();
console.log("Imagem gerada:", data.imageUrl);
```

## Fluxo de Geração

**IMPORTANTE**: Try-On **NÃO** aceita acessórios como óculos. Usamos **APENAS Imagen 3.0**.

### Processo
1. **Entrada**: 2 imagens (pessoa + óculos)
2. **Processamento**: Imagen 3.0 usa a imagem da pessoa como base
3. **Prompt**: Descreve detalhadamente o óculos que deve ser aplicado
4. **Saída**: 1 imagem (pessoa usando exatamente o óculos do produto)

## Prompt Utilizado

O prompt é otimizado para máxima fidelidade:

```
Uma pessoa usando óculos de forma completamente natural e orgânica. 

REQUISITOS CRÍTICOS DE FIDELIDADE:
- Manter FIELMENTE todos os detalhes do rosto: formato exato, estrutura óssea, características faciais, expressão, pele, cabelo
- Manter FIELMENTE a forma física completa: proporções corporais, postura, altura, estrutura física
- Manter FIELMENTE a semelhança total com o produto óculos: formato exato da armação, cor, estilo, detalhes, tamanho, proporções
- Aplicação natural e realista dos óculos no rosto, posicionamento correto sobre o nariz e orelhas
- Iluminação natural e realista que preserve os detalhes
- Qualidade fotográfica profissional, fotorrealista
- Sem distorções, sem alterações na aparência da pessoa
- Estilo editorial de moda, alta fidelidade, precisão máxima
```

## Resposta da API

```json
{
  "success": true,
  "imageUrl": "https://...",
  "method": "imagen-only",
  "metadata": {
    "personImageUrl": "https://...",
    "oculosImageUrl": "https://...",
    "processingTime": 5000,
    "cost": 0.04,
    "costBRL": 0.20
  }
}
```

## Método Utilizado

- **`imagen-only`**: Apenas Imagen 3.0 (Try-On não suporta acessórios como óculos)

## Custo Estimado

- Imagen 3.0: ~US$ 0,04
- **Total**: ~US$ 0,04 (aproximadamente R$ 0,20 a R$ 0,24)

## Observações

1. O endpoint faz upload automático das imagens para Firebase Storage
2. A imagem final também é salva no Storage
3. O prompt é otimizado especificamente para óculos
4. O aspect ratio é 3:4 (portrait) para melhor adequação

