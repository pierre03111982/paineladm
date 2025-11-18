# Configuração do Subdomínio app.experimenteai.com.br

Este documento explica como configurar o subdomínio `app.experimenteai.com.br` para o `appmelhorado` e garantir que todos os fluxos funcionem corretamente.

## 📋 O que foi implementado

Todas as funções que geram URLs do `appmelhorado` foram atualizadas para usar o subdomínio `app.experimenteai.com.br` em produção, mantendo os fluxos funcionando:

- ✅ Simulador do lojista (`/simulador`)
- ✅ Simulador do admin (`/admin/simulador`)
- ✅ Display da loja (`/display`)
- ✅ Compartilhamento (`/compartilhamento`)
- ✅ Links gerados automaticamente

## 🔧 Configuração

### 1. Variáveis de Ambiente (Opcional)

Você pode configurar variáveis de ambiente para personalizar o subdomínio:

```env
# Opção 1: URL completa (prioridade máxima)
NEXT_PUBLIC_CLIENT_APP_URL=https://app.experimenteai.com.br

# Opção 2: Subdomínio customizado
NEXT_PUBLIC_APP_SUBDOMAIN=app.experimenteai.com.br
NEXT_PUBLIC_APP_PROTOCOL=https

# Desenvolvimento: porta do appmelhorado
NEXT_PUBLIC_APPMELHORADO_PORT=3001
```

### 2. Prioridade de Resolução

As URLs são construídas na seguinte ordem de prioridade:

1. **`NEXT_PUBLIC_CLIENT_APP_URL`** - URL completa (se definida)
2. **`NEXT_PUBLIC_APP_SUBDOMAIN`** - Subdomínio customizado (se definido)
3. **Subdomínio padrão** - `https://app.experimenteai.com.br` (em produção)
4. **Localhost** - `http://localhost:3001` (em desenvolvimento)

### 3. Como Funciona

#### Simulador da Loja X
- URL gerada: `https://app.experimenteai.com.br/{lojistaId}?simulator=1&backend={painelUrl}`
- O `lojistaId` é passado no path
- Os parâmetros `simulator` e `backend` são adicionados automaticamente

#### Display da Loja X
- URL gerada: `https://app.experimenteai.com.br/display?lojista={lojistaId}&display=1&backend={painelUrl}`
- O `lojistaId` é passado como query parameter

#### Compartilhamento
- URL gerada: `https://app.experimenteai.com.br/{lojistaId}`
- URL direta para o app da loja

## 🚀 Deploy do appmelhorado no Vercel

### 1. Configurar Domínio no Vercel

1. Acesse o projeto `appmelhorado` no Vercel
2. Vá em **Settings** → **Domains**
3. Adicione o domínio: `app.experimenteai.com.br`
4. Configure o DNS conforme instruções do Vercel

### 2. Configurar Variáveis de Ambiente

No projeto `appmelhorado` no Vercel, adicione:

```env
# URL do painel administrativo (para API backend)
NEXT_PUBLIC_BACKEND_URL=https://experimenteai.com.br
# ou
NEXT_PUBLIC_BACKEND_URL=https://paineladm.experimenteai.com.br
```

### 3. Verificar Configuração

Após o deploy, teste:

1. Acesse o simulador de uma loja no painel
2. Verifique se a URL gerada é: `https://app.experimenteai.com.br/{lojistaId}`
3. Teste se o app abre corretamente com os produtos da loja

## ✅ Garantias

- ✅ Todos os links mantêm o `lojistaId` correto
- ✅ Parâmetros `simulator`, `display`, `backend` são preservados
- ✅ QR Codes gerados com URLs corretas
- ✅ Funciona em desenvolvimento (localhost) e produção (subdomínio)
- ✅ Fallback automático se houver erro

## 🔍 Troubleshooting

### URLs não estão usando o subdomínio

1. Verifique se `NODE_ENV=production` está definido
2. Verifique se não há `NEXT_PUBLIC_CLIENT_APP_URL` definida com valor antigo
3. Limpe o cache do Next.js: `rm -rf .next`

### Links quebrados

1. Verifique se o subdomínio está configurado no DNS
2. Verifique se o `appmelhorado` está rodando no subdomínio
3. Verifique os logs do servidor para erros de URL

### Desenvolvimento local

Em desenvolvimento, as URLs usam `http://localhost:3001` (ou a porta configurada em `NEXT_PUBLIC_APPMELHORADO_PORT`).

## 📝 Notas

- O subdomínio padrão é `app.experimenteai.com.br`
- Em desenvolvimento, sempre usa `localhost`
- Todos os fluxos mantêm o `lojistaId` para garantir que a loja correta seja exibida

