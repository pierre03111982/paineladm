# ⚡ Otimizar Tempo de Build no Vercel

## 🎯 Objetivo
Reduzir o tempo de build e deploy no Vercel para o projeto modelo-2.

## 🔧 Otimizações Implementadas

### 1. Configuração do Next.js (`next.config.mjs`)

Adicionar as seguintes otimizações:

```javascript
const nextConfig = {
  // ... configurações existentes ...
  
  // Otimizações de build
  swcMinify: true, // Usar SWC para minificação (mais rápido que Terser)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production', // Remover console.log em produção
  },
  
  // Otimizar imagens
  images: {
    // ... configurações existentes ...
    formats: ['image/avif', 'image/webp'], // Usar formatos modernos
    minimumCacheTTL: 60, // Cache de 60 segundos
  },
  
  // Compressão
  compress: true,
  
  // Otimizações experimentais
  experimental: {
    optimizeCss: true, // Otimizar CSS
  },
}
```

### 2. Configuração do Vercel (`vercel.json`)

Adicionar configurações de build:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["gru1"],
  "functions": {
    "app/**/*.ts": {
      "maxDuration": 10
    }
  },
  "crons": []
}
```

### 3. Otimizar `package.json`

Adicionar script de build otimizado:

```json
{
  "scripts": {
    "build": "next build",
    "build:analyze": "ANALYZE=true next build",
    "postinstall": "next telemetry disable"
  }
}
```

### 4. Habilitar Build Cache no Vercel

No dashboard do Vercel:
1. Vá em **Settings** → **General**
2. Em **Build & Development Settings**:
   - ✅ Habilitar **Build Cache**
   - ✅ Habilitar **Function Logs**
   - ✅ Habilitar **Source Maps** (apenas para debug)

### 5. Otimizar Dependências

- Remover dependências não utilizadas
- Usar versões específicas (não `^` ou `~`)
- Considerar usar `npm ci` em vez de `npm install` (mais rápido)

### 6. Configurar Variáveis de Ambiente

No Vercel Dashboard:
- Adicionar `NEXT_TELEMETRY_DISABLED=1` para desabilitar telemetria
- Adicionar `NODE_ENV=production` para builds de produção

### 7. Usar Output Standalone (Opcional)

Para builds ainda mais rápidos, adicionar em `next.config.mjs`:

```javascript
output: 'standalone', // Apenas se não usar serverless functions
```

## 📊 Resultados Esperados

- **Antes:** ~2-3 minutos
- **Depois:** ~1-2 minutos (redução de 30-50%)

## ⚠️ Observações

- `swcMinify: true` já é padrão no Next.js 13+, mas é bom deixar explícito
- `removeConsole` remove todos os `console.log` em produção (útil para performance)
- Build cache do Vercel acelera builds subsequentes
- Região `gru1` (São Paulo) reduz latência

## 🔍 Monitoramento

Após aplicar as otimizações:
1. Verificar tempo de build no dashboard do Vercel
2. Comparar com builds anteriores
3. Ajustar conforme necessário



## 🎯 Objetivo
Reduzir o tempo de build e deploy no Vercel para o projeto modelo-2.

## 🔧 Otimizações Implementadas

### 1. Configuração do Next.js (`next.config.mjs`)

Adicionar as seguintes otimizações:

```javascript
const nextConfig = {
  // ... configurações existentes ...
  
  // Otimizações de build
  swcMinify: true, // Usar SWC para minificação (mais rápido que Terser)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production', // Remover console.log em produção
  },
  
  // Otimizar imagens
  images: {
    // ... configurações existentes ...
    formats: ['image/avif', 'image/webp'], // Usar formatos modernos
    minimumCacheTTL: 60, // Cache de 60 segundos
  },
  
  // Compressão
  compress: true,
  
  // Otimizações experimentais
  experimental: {
    optimizeCss: true, // Otimizar CSS
  },
}
```

### 2. Configuração do Vercel (`vercel.json`)

Adicionar configurações de build:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["gru1"],
  "functions": {
    "app/**/*.ts": {
      "maxDuration": 10
    }
  },
  "crons": []
}
```

### 3. Otimizar `package.json`

Adicionar script de build otimizado:

```json
{
  "scripts": {
    "build": "next build",
    "build:analyze": "ANALYZE=true next build",
    "postinstall": "next telemetry disable"
  }
}
```

### 4. Habilitar Build Cache no Vercel

No dashboard do Vercel:
1. Vá em **Settings** → **General**
2. Em **Build & Development Settings**:
   - ✅ Habilitar **Build Cache**
   - ✅ Habilitar **Function Logs**
   - ✅ Habilitar **Source Maps** (apenas para debug)

### 5. Otimizar Dependências

- Remover dependências não utilizadas
- Usar versões específicas (não `^` ou `~`)
- Considerar usar `npm ci` em vez de `npm install` (mais rápido)

### 6. Configurar Variáveis de Ambiente

No Vercel Dashboard:
- Adicionar `NEXT_TELEMETRY_DISABLED=1` para desabilitar telemetria
- Adicionar `NODE_ENV=production` para builds de produção

### 7. Usar Output Standalone (Opcional)

Para builds ainda mais rápidos, adicionar em `next.config.mjs`:

```javascript
output: 'standalone', // Apenas se não usar serverless functions
```

## 📊 Resultados Esperados

- **Antes:** ~2-3 minutos
- **Depois:** ~1-2 minutos (redução de 30-50%)

## ⚠️ Observações

- `swcMinify: true` já é padrão no Next.js 13+, mas é bom deixar explícito
- `removeConsole` remove todos os `console.log` em produção (útil para performance)
- Build cache do Vercel acelera builds subsequentes
- Região `gru1` (São Paulo) reduz latência

## 🔍 Monitoramento

Após aplicar as otimizações:
1. Verificar tempo de build no dashboard do Vercel
2. Comparar com builds anteriores
3. Ajustar conforme necessário



