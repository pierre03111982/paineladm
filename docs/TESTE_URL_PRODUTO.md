# Teste: Geração com URL do Produto

## Endpoint de Teste

**POST** `/api/test/oculos-url`

## Objetivo

Testar se o Imagen 3.0/4.0 consegue "ver" uma imagem de um link (URL) e incluir o produto na foto da pessoa.

## Como Funciona

1. **Entrada**:
   - Foto da pessoa (arquivo)
   - URL do produto (link para imagem do óculos)

2. **Processamento**:
   - Backend baixa a imagem do link
   - Analisa a imagem com Vision API (se disponível)
   - Inclui a URL no prompt para referência
   - Gera imagem usando Imagen 3.0/4.0

3. **Saída**:
   - Imagem da pessoa usando o óculos do link

## Como Usar

### Opção 1: Página HTML de Teste

1. Abra `test-oculos.html` no navegador
2. Selecione a foto da pessoa
3. Escolha "Usar URL (link)"
4. Cole o link da imagem do óculos
5. Clique em "Gerar Imagem"

### Opção 2: FormData

```javascript
const formData = new FormData();
formData.append('personPhoto', filePessoa);
formData.append('oculosUrl', 'https://exemplo.com/imagem-oculos.jpg');
formData.append('lojistaId', 'test');

const response = await fetch('http://localhost:3000/api/test/oculos-url', {
  method: 'POST',
  body: formData,
});
```

### Opção 3: JSON

```javascript
const response = await fetch('http://localhost:3000/api/test/oculos-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    personImageUrl: 'https://...',
    oculosUrl: 'https://exemplo.com/imagem-oculos.jpg',
    lojistaId: 'test'
  }),
});
```

## O Que Acontece

1. ✅ Backend baixa a imagem do link automaticamente
2. ✅ Salva no Firebase Storage
3. ✅ Analisa com Vision API (cores, objetos, labels)
4. ✅ Inclui URL no prompt: "A imagem do óculos está disponível neste link: [URL]"
5. ✅ Gera imagem com Imagen 3.0/4.0

## Limitação Importante

⚠️ **O Imagen 3.0/4.0 NÃO acessa URLs diretamente**

O que fazemos:
- ✅ Baixamos a imagem do link no backend
- ✅ Analisamos com Vision API
- ✅ Incluímos a URL no prompt (para referência)
- ✅ Usamos a imagem baixada para análise

O Imagen ainda recebe:
- 1 imagem base (pessoa)
- Prompt detalhado (descrevendo o óculos)

## Resultado Esperado

A IA deve gerar uma imagem da pessoa usando o óculos, baseada em:
- Análise da imagem baixada do link
- Descrição detalhada no prompt
- Referência à URL no prompt

## Teste Agora

1. Abra `test-oculos.html`
2. Selecione foto da pessoa
3. Escolha "Usar URL (link)"
4. Cole um link de imagem de óculos (ex: `https://exemplo.com/oculos.jpg`)
5. Clique em "Gerar Imagem"



## Endpoint de Teste

**POST** `/api/test/oculos-url`

## Objetivo

Testar se o Imagen 3.0/4.0 consegue "ver" uma imagem de um link (URL) e incluir o produto na foto da pessoa.

## Como Funciona

1. **Entrada**:
   - Foto da pessoa (arquivo)
   - URL do produto (link para imagem do óculos)

2. **Processamento**:
   - Backend baixa a imagem do link
   - Analisa a imagem com Vision API (se disponível)
   - Inclui a URL no prompt para referência
   - Gera imagem usando Imagen 3.0/4.0

3. **Saída**:
   - Imagem da pessoa usando o óculos do link

## Como Usar

### Opção 1: Página HTML de Teste

1. Abra `test-oculos.html` no navegador
2. Selecione a foto da pessoa
3. Escolha "Usar URL (link)"
4. Cole o link da imagem do óculos
5. Clique em "Gerar Imagem"

### Opção 2: FormData

```javascript
const formData = new FormData();
formData.append('personPhoto', filePessoa);
formData.append('oculosUrl', 'https://exemplo.com/imagem-oculos.jpg');
formData.append('lojistaId', 'test');

const response = await fetch('http://localhost:3000/api/test/oculos-url', {
  method: 'POST',
  body: formData,
});
```

### Opção 3: JSON

```javascript
const response = await fetch('http://localhost:3000/api/test/oculos-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    personImageUrl: 'https://...',
    oculosUrl: 'https://exemplo.com/imagem-oculos.jpg',
    lojistaId: 'test'
  }),
});
```

## O Que Acontece

1. ✅ Backend baixa a imagem do link automaticamente
2. ✅ Salva no Firebase Storage
3. ✅ Analisa com Vision API (cores, objetos, labels)
4. ✅ Inclui URL no prompt: "A imagem do óculos está disponível neste link: [URL]"
5. ✅ Gera imagem com Imagen 3.0/4.0

## Limitação Importante

⚠️ **O Imagen 3.0/4.0 NÃO acessa URLs diretamente**

O que fazemos:
- ✅ Baixamos a imagem do link no backend
- ✅ Analisamos com Vision API
- ✅ Incluímos a URL no prompt (para referência)
- ✅ Usamos a imagem baixada para análise

O Imagen ainda recebe:
- 1 imagem base (pessoa)
- Prompt detalhado (descrevendo o óculos)

## Resultado Esperado

A IA deve gerar uma imagem da pessoa usando o óculos, baseada em:
- Análise da imagem baixada do link
- Descrição detalhada no prompt
- Referência à URL no prompt

## Teste Agora

1. Abra `test-oculos.html`
2. Selecione foto da pessoa
3. Escolha "Usar URL (link)"
4. Cole um link de imagem de óculos (ex: `https://exemplo.com/oculos.jpg`)
5. Clique em "Gerar Imagem"

