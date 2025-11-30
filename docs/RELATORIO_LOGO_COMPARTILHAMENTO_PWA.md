# 📋 RELATÓRIO COMPLETO: IMPLEMENTAÇÃO DE LOGO NO COMPARTILHAMENTO E ÍCONE PWA

**Data:** 28 de Novembro de 2025  
**Versão:** PHASE 17 (Dynamic PWA Manifest) + PHASE 18 (Dynamic Open Graph Image)  
**Status:** ✅ IMPLEMENTADO E ATIVO

---

## 1. VISÃO GERAL

Este relatório documenta a implementação completa de duas funcionalidades críticas:

1. **Logo no Compartilhamento Social (Open Graph)**: Permite que a logo da loja apareça quando o link é compartilhado no WhatsApp, Facebook, Instagram, etc.
2. **Ícone PWA Dinâmico**: Permite que cada lojista configure seu próprio ícone do aplicativo quando clientes instalam o app no celular.

---

## 2. IMPLEMENTAÇÃO DA LOGO NO COMPARTILHAMENTO (OPEN GRAPH)

### 2.1. Arquitetura

**Localização Principal:** `apps-cliente/modelo-2/src/app/[lojistaId]/layout.tsx`

**Fluxo:**
```
Layout Dinâmico → generateMetadata() → Busca logoUrl do Firestore → Gera meta tags Open Graph
```

### 2.2. Busca de Dados da Loja

**Função:** `generateMetadata()` (linhas 13-151)

**Estratégia de Busca (Prioridade):**
1. **PRIORIDADE 1:** `lojas/{lojistaId}/perfil/dados` (onde salvamos os dados)
2. **PRIORIDADE 2:** `lojas/{lojistaId}` (documento direto da loja)

**Código:**
```typescript
const perfilDadosDoc = await db.collection("lojas").doc(lojistaId).collection("perfil").doc("dados").get();

let lojaData: any = null;
if (perfilDadosDoc.exists) {
  lojaData = perfilDadosDoc.data();
} else {
  const lojaDoc = await db.collection("lojas").doc(lojistaId).get();
  if (lojaDoc.exists) {
    lojaData = lojaDoc.data();
  }
}
```

### 2.3. Seleção da Imagem Open Graph

**Lógica (linhas 57-73):**

1. **Se `logoUrl` existe:**
   - Usa `logoUrl` diretamente como `og:image`
   - Converte para URL absoluta se necessário
   - **Vantagem:** Mais rápido e confiável (sem processamento adicional)

2. **Se `logoUrl` não existe:**
   - Usa rota dinâmica: `/api/og-image/${lojistaId}`
   - Esta rota gera uma imagem Open Graph com o nome da loja

**Código:**
```typescript
let ogImage: string;
if (logoUrl) {
  if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
    ogImage = logoUrl;
  } else {
    ogImage = logoUrl.startsWith('/') ? `${baseUrl}${logoUrl}` : `${baseUrl}/${logoUrl}`;
  }
} else {
  ogImage = `${baseUrl}/api/og-image/${lojistaId}`;
}
```

### 2.4. Meta Tags Open Graph Geradas

**Localização:** `layout.tsx` (linhas 77-111)

**Meta Tags Incluídas:**

#### **No campo `other` (explícitas para Facebook):**
```typescript
other: {
  'theme-color': themeColor,
  'msapplication-navbutton-color': themeColor,
  'og:image': ogImage,
  'og:image:width': '1200',
  'og:image:height': '630',
  'og:image:alt': `${nome} - Provador Virtual`,
  'og:url': `${baseUrl}/${lojistaId}/login`,
}
```

#### **No campo `openGraph` (padrão Next.js):**
```typescript
openGraph: {
  title: `${nome} | Provador Virtual com IA`,
  description: `Experimente as roupas da ${nome} sem sair de casa. Tecnologia de Provador Virtual Inteligente.`,
  url: `${baseUrl}/${lojistaId}/login`,
  images: [
    {
      url: ogImage,
      width: 1200,
      height: 630,
      alt: `${nome} - Provador Virtual`,
    },
  ],
  type: 'website',
  siteName: nome,
}
```

#### **No campo `twitter` (para Twitter/X):**
```typescript
twitter: {
  card: 'summary_large_image',
  title: `${nome} | Provador Virtual com IA`,
  description: `Experimente as roupas da ${nome} sem sair de casa. Tecnologia de Provador Virtual Inteligente.`,
  images: [ogImage],
}
```

### 2.5. Geração Dinâmica de Imagem Open Graph (Fallback)

**Localização:** `apps-cliente/modelo-2/src/app/api/og-image/[lojistaId]/route.tsx`

**Função:** Gera uma imagem Open Graph 1200x630px quando a loja não tem logo.

**Estrutura da Imagem:**
- **Background:** Gradiente roxo/azul (`linear-gradient(135deg, #667eea 0%, #764ba2 100%)`)
- **Logo (se disponível):** 200x200px, centralizada, com padding e background semi-transparente
- **Nome da Loja:** Fonte grande (64px), branca, negrito
- **Subtítulo:** "Provador Virtual com IA" (32px, cinza claro)

**Prioridade de Logo:**
1. `logoUrl` (prioridade)
2. `app_icon_url` (fallback)

**Código:**
```typescript
const logoToUse = logoUrl || appIconUrl;

if (logoToUse) {
  if (logoToUse.startsWith('http://') || logoToUse.startsWith('https://')) {
    logoImageUrl = logoToUse;
  } else {
    logoImageUrl = logoToUse.startsWith('/') ? `${baseUrl}${logoToUse}` : `${baseUrl}/${logoToUse}`;
  }
}
```

**Runtime:** `nodejs` (porque Firebase Admin SDK não funciona no edge runtime)

### 2.6. Favicon Dinâmico

**Localização:** `layout.tsx` (linhas 153-201)

**Função:** `LojistaLayout()` - Renderiza favicon dinâmico usando logo da loja

**Lógica:**
- Busca `logoUrl` ou `app_icon_url` do Firestore
- Gera múltiplos tamanhos de favicon:
  - `32x32` (padrão)
  - `16x16` (pequeno)
  - `180x180` (Apple Touch Icon)

**Código:**
```typescript
let faviconUrl: string | null = null;
// ... busca do Firestore ...

{faviconUrl ? (
  <>
    <link rel="icon" type="image/png" sizes="32x32" href={faviconUrl} />
    <link rel="icon" type="image/png" sizes="16x16" href={faviconUrl} />
    <link rel="apple-touch-icon" sizes="180x180" href={faviconUrl} />
    <link rel="shortcut icon" href={faviconUrl} />
  </>
) : null}
```

---

## 3. IMPLEMENTAÇÃO DO ÍCONE PWA DINÂMICO

### 3.1. Arquitetura

**Localização Principal:** `apps-cliente/modelo-2/src/app/[lojistaId]/manifest.ts`

**Fluxo:**
```
Cliente acessa /{lojistaId}/manifest.json → GET /[lojistaId]/manifest.ts → Busca app_icon_url do Firestore → Gera manifest.json dinâmico
```

### 3.2. Manifest Dinâmico

**Função:** `GET()` (linhas 28-122)

**Estratégia de Busca (Prioridade):**
1. **PRIORIDADE 1:** `lojas/{lojistaId}/perfil/dados`
2. **PRIORIDADE 2:** `lojas/{lojistaId}`

**Seleção do Ícone:**
```typescript
const appIconUrl = lojaData?.app_icon_url || lojaData?.logoUrl || '/icons/default-icon.png';
```

**Prioridade:**
1. `app_icon_url` (específico para PWA)
2. `logoUrl` (fallback)
3. `/icons/default-icon.png` (fallback final)

### 3.3. Estrutura do Manifest Gerado

**Interface:**
```typescript
interface Manifest {
  name: string;                    // Nome completo da loja
  short_name: string;              // Nome curto (máx 12 caracteres)
  description: string;             // Descrição da loja
  start_url: string;               // URL inicial: /{lojistaId}/experimentar
  display: 'standalone';           // Modo standalone (sem barra de navegação do browser)
  background_color: string;        // #000000 (preto para barra inferior)
  theme_color: string;             // Cor do tema (geralmente #000000)
  icons: Array<{
    src: string;                   // URL do ícone
    sizes: string;                  // '192x192' ou '512x512'
    type: string;                   // 'image/png'
    purpose?: string;               // 'any maskable'
  }>;
}
```

**Exemplo de Manifest Gerado:**
```json
{
  "name": "Loja da Maria",
  "short_name": "Loja da Ma",
  "description": "Experimente as roupas sem sair de casa",
  "start_url": "/loja-maria/experimentar",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "https://storage.googleapis.com/.../app-icon.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "https://storage.googleapis.com/.../app-icon.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### 3.4. Link do Manifest no Layout

**Localização:** `layout.tsx` (linha 188)

**Código:**
```typescript
<link rel="manifest" href={`/${lojistaId}/manifest.json`} />
```

**Comportamento:**
- Next.js automaticamente roteia `/{lojistaId}/manifest.json` para `/[lojistaId]/manifest.ts`
- O arquivo `manifest.ts` retorna JSON com `Content-Type: application/manifest+json`

### 3.5. Cache do Manifest

**Headers Configurados:**
```typescript
headers: {
  'Content-Type': 'application/manifest+json',
  'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache de 1 hora
}
```

**Motivo:** Manifest não muda frequentemente, então cache de 1 hora reduz carga no servidor.

---

## 4. UPLOAD DO ÍCONE PWA (PAINEL ADMIN)

### 4.1. Interface do Usuário

**Localização:** `paineladm/src/app/(lojista)/configuracoes/settings-form.tsx`

**Seção:** "Ícone do Aplicativo (PWA)" (linhas ~400-500)

**Componentes:**
- **Preview:** Mostra preview do ícone atual ou upload
- **Upload Button:** Abre seletor de arquivo
- **Remove Button:** Remove ícone atual
- **Validação Visual:** Mostra dimensões e formato

### 4.2. Validações do Upload

**Validações Implementadas (linhas 209-244):**

1. **Tipo de Arquivo:**
   ```typescript
   if (!file.type.startsWith("image/")) {
     alert("Por favor, selecione uma imagem válida");
     return;
   }
   ```

2. **Tamanho Máximo:**
   ```typescript
   if (file.size > 5 * 1024 * 1024) {
     alert("A imagem deve ter no máximo 5MB");
     return;
   }
   ```

3. **Formato Quadrado:**
   ```typescript
   const isSquare = Math.abs(img.width - img.height) <= 5;
   if (!isSquare) {
     alert(`O ícone do aplicativo deve ser quadrado...`);
     return;
   }
   ```

4. **Tamanho Mínimo:**
   ```typescript
   if (minSize < 192) {
     alert(`O ícone deve ter pelo menos 192x192 pixels...`);
     return;
   }
   ```

**Recomendação:** 512x512px (tamanho ideal para PWA)

### 4.3. API de Upload

**Localização:** `paineladm/src/app/api/lojista/perfil/upload-app-icon/route.ts`

**Endpoint:** `POST /api/lojista/perfil/upload-app-icon`

**Parâmetros:**
- `appIcon` (File): Arquivo de imagem
- `lojistaId` (string): ID do lojista

**Processo:**

1. **Validação:**
   - Tipo de arquivo (deve ser imagem)
   - Tamanho máximo (5MB)

2. **Upload para Firebase Storage:**
   ```typescript
   const fileName = `lojas/${lojistaId}/app-icon/${Date.now()}-${appIcon.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
   const file = bucket.file(fileName);
   await file.save(buffer, { metadata: { contentType: appIcon.type || "image/png" } });
   ```

3. **Tornar Público:**
   ```typescript
   await file.makePublic();
   const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
   ```

4. **Salvar no Firestore:**
   ```typescript
   await updateLojaPerfil(lojistaId, {
     app_icon_url: publicUrl,
     app_icon_storage_path: fileName,
   });
   ```

**Resposta:**
```json
{
  "success": true,
  "appIconUrl": "https://storage.googleapis.com/.../app-icon.png",
  "storagePath": "lojas/{lojistaId}/app-icon/{timestamp}-{filename}"
}
```

### 4.4. Atualização do Perfil

**Localização:** `paineladm/src/app/api/lojista/perfil/route.ts`

**Campo Aceito:** `app_icon_url` (linha 68)

**Processamento:**
```typescript
if (app_icon_url !== undefined) {
  updateData.app_icon_url = app_icon_url || null;
  if (!app_icon_url) {
    updateData.app_icon_storage_path = null;
  }
}
```

**Função de Atualização:** `updateLojaPerfil()` em `src/lib/firestore/server.ts`

**Caminho no Firestore:**
- `lojas/{lojistaId}/perfil/dados` (prioridade)
- `lojas/{lojistaId}` (fallback)

---

## 5. ESTRUTURA DE DADOS NO FIRESTORE

### 5.1. Campos Relacionados

**Documento:** `lojas/{lojistaId}/perfil/dados` (ou `lojas/{lojistaId}`)

**Campos:**
```typescript
{
  nome: string;                    // Nome da loja
  descricao: string;               // Descrição da loja
  logoUrl: string;                 // URL da logo (usada em Open Graph e fallback PWA)
  app_icon_url: string;            // URL do ícone PWA (específico para PWA)
  app_icon_storage_path: string;   // Caminho no Firebase Storage
  themeColor: string;              // Cor do tema (padrão: #000000)
  backgroundColor: string;          // Cor de fundo (padrão: #000000)
}
```

### 5.2. Busca de Dados

**Função:** `fetchLojaPerfil()` em `src/lib/firestore/server.ts`

**Estratégia (Prioridade):**
1. `lojas/{lojistaId}/perfil/dados`
2. `lojas/{lojistaId}`
3. `lojas/{lojistaId}/perfil/publico`

**Campos Retornados:**
```typescript
{
  logoUrl?: string | null;
  app_icon_url?: string | null;
  // ... outros campos
}
```

---

## 6. FLUXO COMPLETO

### 6.1. Fluxo de Upload do Ícone PWA

```
1. Lojista acessa Configurações → Seção "Ícone do Aplicativo"
2. Clica em "Upload" → Seleciona arquivo (512x512px recomendado)
3. Validação no frontend (tipo, tamanho, formato quadrado, tamanho mínimo)
4. POST /api/lojista/perfil/upload-app-icon
   ├── Validação no backend
   ├── Upload para Firebase Storage (lojas/{lojistaId}/app-icon/{timestamp}-{filename})
   ├── Tornar arquivo público
   └── Salvar app_icon_url no Firestore (lojas/{lojistaId}/perfil/dados)
5. Atualizar preview no frontend
6. Recarregar página após 500ms para garantir sincronização
```

### 6.2. Fluxo de Compartilhamento (Open Graph)

```
1. Cliente compartilha link: https://experimente.ai/{lojistaId}/experimentar
2. Plataforma social (WhatsApp/Facebook) faz requisição GET
3. Next.js renderiza layout dinâmico
4. generateMetadata() é executado:
   ├── Busca lojaData do Firestore
   ├── Extrai logoUrl
   ├── Se logoUrl existe: usa diretamente como og:image
   └── Se logoUrl não existe: usa /api/og-image/{lojistaId}
5. Meta tags Open Graph são injetadas no HTML
6. Plataforma social lê meta tags e exibe preview com logo
```

### 6.3. Fluxo de Instalação PWA

```
1. Cliente acessa app no navegador móvel
2. Navegador detecta manifest.json via <link rel="manifest">
3. GET /{lojistaId}/manifest.json
4. manifest.ts é executado:
   ├── Busca lojaData do Firestore
   ├── Extrai app_icon_url (ou logoUrl como fallback)
   ├── Gera manifest.json com nome, ícone, cores
   └── Retorna JSON com Content-Type: application/manifest+json
5. Navegador exibe prompt "Adicionar à Tela Inicial"
6. Cliente instala → Ícone aparece na tela com nome da loja
```

---

## 7. TESTES E VALIDAÇÃO

### 7.1. Teste de Open Graph

**Ferramentas:**
- **Facebook Sharing Debugger:** https://developers.facebook.com/tools/debug/
- **Twitter Card Validator:** https://cards-dev.twitter.com/validator
- **LinkedIn Post Inspector:** https://www.linkedin.com/post-inspector/

**Checklist:**
- ✅ Logo aparece no preview
- ✅ Título correto (nome da loja)
- ✅ Descrição correta
- ✅ URL correta
- ✅ Dimensões da imagem (1200x630px recomendado)

### 7.2. Teste de PWA Manifest

**Ferramentas:**
- **Chrome DevTools:** Application → Manifest
- **Lighthouse:** PWA audit

**Checklist:**
- ✅ Manifest.json acessível
- ✅ Ícone carrega corretamente
- ✅ Nome da loja aparece
- ✅ Cores corretas (background_color e theme_color)
- ✅ start_url correto

### 7.3. Teste de Instalação PWA

**Dispositivos:**
- Android (Chrome)
- iOS (Safari)

**Checklist:**
- ✅ Prompt "Adicionar à Tela Inicial" aparece
- ✅ Ícone aparece na tela após instalação
- ✅ Nome da loja aparece abaixo do ícone
- ✅ App abre em modo standalone (sem barra do navegador)

---

## 8. PROBLEMAS CONHECIDOS E SOLUÇÕES

### 8.1. Logo não aparece no compartilhamento

**Causas Possíveis:**
1. Logo não foi salva no Firestore
2. URL da logo é inválida (não é HTTP/HTTPS)
3. Facebook não consegue acessar a URL (CORS, autenticação)
4. Cache do Facebook (precisa limpar com Sharing Debugger)

**Soluções:**
- Verificar se `logoUrl` existe em `lojas/{lojistaId}/perfil/dados`
- Garantir que URL é absoluta (começa com http:// ou https://)
- Tornar logo pública no Firebase Storage
- Usar Facebook Sharing Debugger para limpar cache

### 8.2. Ícone PWA não aparece

**Causas Possíveis:**
1. `app_icon_url` não foi salvo no Firestore
2. URL do ícone é inválida
3. Manifest não está sendo carregado
4. Cache do navegador

**Soluções:**
- Verificar se `app_icon_url` existe em `lojas/{lojistaId}/perfil/dados`
- Verificar se arquivo está público no Firebase Storage
- Verificar console do navegador para erros de manifest
- Limpar cache do navegador e reinstalar PWA

### 8.3. Favicon não aparece

**Causas Possíveis:**
1. `logoUrl` ou `app_icon_url` não existe
2. URL inválida
3. Cache do navegador

**Soluções:**
- Verificar se logo existe no Firestore
- Limpar cache do navegador (Ctrl+Shift+Delete)
- Verificar console do navegador para erros de carregamento

---

## 9. MELHORIAS FUTURAS

### 9.1. Otimização de Imagens

- **Compressão automática:** Reduzir tamanho de logos/ícones antes de salvar
- **Múltiplos tamanhos:** Gerar automaticamente 192x192, 512x512, etc.
- **Formato WebP:** Usar WebP para melhor compressão

### 9.2. Validação Avançada

- **Validação de proporção:** Garantir que logo é quadrada ou retangular adequado
- **Validação de transparência:** Verificar se ícone PWA tem fundo transparente ou sólido
- **Validação de contraste:** Garantir que logo é visível em diferentes fundos

### 9.3. Cache Inteligente

- **Cache de manifest:** Implementar cache mais agressivo (24h)
- **Cache de OG Image:** Gerar e cachear imagens Open Graph
- **CDN:** Usar CDN para servir logos/ícones

---

## 10. RESUMO TÉCNICO

### 10.1. Arquivos Principais

**Frontend (apps-cliente/modelo-2):**
- `src/app/[lojistaId]/layout.tsx` - Metadata e favicon dinâmico
- `src/app/[lojistaId]/manifest.ts` - Manifest PWA dinâmico
- `src/app/api/og-image/[lojistaId]/route.tsx` - Geração de imagem Open Graph

**Backend (paineladm):**
- `src/app/(lojista)/configuracoes/settings-form.tsx` - UI de upload
- `src/app/api/lojista/perfil/upload-app-icon/route.ts` - API de upload
- `src/app/api/lojista/perfil/route.ts` - API de atualização de perfil
- `src/lib/firestore/server.ts` - Funções de busca/atualização

### 10.2. Endpoints

- `GET /{lojistaId}/manifest.json` - Manifest PWA dinâmico
- `GET /api/og-image/{lojistaId}` - Imagem Open Graph dinâmica
- `POST /api/lojista/perfil/upload-app-icon` - Upload de ícone PWA
- `POST /api/lojista/perfil` - Atualização de perfil (inclui app_icon_url)

### 10.3. Campos Firestore

- `logoUrl` - URL da logo (usada em Open Graph e fallback PWA)
- `app_icon_url` - URL do ícone PWA (específico para PWA)
- `app_icon_storage_path` - Caminho no Firebase Storage
- `nome` - Nome da loja (usado em manifest e Open Graph)
- `descricao` - Descrição (usada em Open Graph)
- `themeColor` - Cor do tema (usada em manifest)
- `backgroundColor` - Cor de fundo (usada em manifest)

---

**FIM DO RELATÓRIO**

