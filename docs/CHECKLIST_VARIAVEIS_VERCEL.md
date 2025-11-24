# ✅ Checklist de Variáveis de Ambiente - Vercel

## 🔍 Variáveis Configuradas vs. Necessárias

### ⚠️ PROBLEMAS ENCONTRADOS

#### 1. Nomes Incorretos (CRÍTICO)

As seguintes variáveis estão com nomes em português, mas o código espera nomes em inglês:

| Nome no Vercel | Nome Correto no Código | Status |
|----------------|------------------------|--------|
| `ID_DE_TELEFONE_DO_WHATSAPP` | `WHATSAPP_PHONE_ID` | ❌ **CORRIGIR** |
| `E-MAILS_DO_ADMINISTRADOR` | `ADMIN_EMAILS` | ❌ **CORRIGIR** |
| `PRÓXIMA_URL_PÚBLICA_DE_BACKEND` | `NEXT_PUBLIC_BACKEND_URL` | ❌ **CORRIGIR** |
| `PRÓXIMA_CHAVE_DA_API_PÚBLICA_DO_FIREBASE` | `NEXT_PUBLIC_FIREBASE_API_KEY` | ❌ **CORRIGIR** |
| `PRÓXIMO_DOMÍNIO_PÚBLICO_DE_AUTENTICAÇÃO` | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | ❌ **CORRIGIR** |
| `PRÓXIMO ID DO PROJETO PÚBLICO DO FIREBASE` | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ❌ **CORRIGIR** |
| `PRÓXIMO_BUCKET_DE_ARMAZENAMENTO_PÚBLICO` | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | ❌ **CORRIGIR** |
| `PRÓXIMO ID DO APLICATIVO PÚBLICO DO FIREBASE` | `NEXT_PUBLIC_FIREBASE_APP_ID` | ❌ **CORRIGIR** |
| `PRÓXIMO ID DE MEDIÇÃO PÚBLICA DO FIREBASE` | `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | ❌ **CORRIGIR** |
| `PRÓXIMO ID_PÚBLICO_LOJISTA` | `NEXT_PUBLIC_LOJISTA_ID` | ❌ **CORRIGIR** |

### ✅ Variáveis Corretas

| Nome no Vercel | Status |
|----------------|--------|
| `NEXT_PUBLIC_MODELO_1_URL` | ✅ OK |
| `NEXT_PUBLIC_MODELO_2_URL` | ✅ OK |
| `NEXT_PUBLIC_MODELO_3_URL` | ✅ OK |
| `NEXT_PUBLIC_MODEL01_URL` | ✅ OK (alternativa) |
| `WHATSAPP_TOKEN` | ✅ OK |
| `NEXT_PUBLIC_CLIENT_APP_URL` | ✅ OK |
| `NEXT_PUBLIC_APP_URL` | ✅ OK |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ✅ OK |
| `NEXT_PUBLIC_LOJA_NOME` | ✅ OK |
| `NEXT_PUBLIC_LOJA_LOGO_URL` | ✅ OK |

### ✅ Variáveis Firebase Admin (CONFIGURADAS)

#### Firebase Admin (Server-side)

Estas variáveis estão configuradas corretamente:

- ✅ `FIREBASE_PROJECT_ID` - **CONFIGURADO** (valor: `paineladmexperimenteai`)
- ✅ `FIREBASE_CLIENT_EMAIL` - **CONFIGURADO** (email do service account)
- ✅ `FIREBASE_PRIVATE_KEY` - **CONFIGURADO** (chave privada completa)
- ✅ `FIREBASE_STORAGE_BUCKET` ou `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` - **VERIFICAR** (provavelmente configurado)

#### Google Cloud (Se usar Vertex AI)

- ❌ `GOOGLE_CLOUD_PROJECT_ID` - **FALTANDO** (se usar Vertex AI ou Gemini)
- ⚠️ `GOOGLE_CLOUD_LOCATION` - **OPCIONAL** (padrão: "us-central1")
- ⚠️ `GOOGLE_APPLICATION_CREDENTIALS` - **VERIFICAR** (pode não ser necessário se usar variáveis individuais)

#### URLs Adicionais

- ⚠️ `NEXT_PUBLIC_PAINELADM_URL` - **VERIFICAR** (usado em alguns lugares)
- ⚠️ `NEXT_PUBLIC_LOJA_SITE` - **VERIFICAR** (usado na página de login)
- ⚠️ `NEXT_PUBLIC_LOJA_INSTAGRAM` - **OPCIONAL**
- ⚠️ `NEXT_PUBLIC_LOJA_FACEBOOK` - **OPCIONAL**
- ⚠️ `NEXT_PUBLIC_LOJA_TIKTOK` - **OPCIONAL**

#### Stability AI (Se usar)

- ❌ `STABILITY_AI_API_KEY` - **FALTANDO** (se usar Stability AI)

## 🚨 AÇÕES URGENTES NECESSÁRIAS

### 1. Renomear Variáveis no Vercel

**IMPORTANTE:** Renomear as variáveis com nomes em português para os nomes corretos em inglês:

1. Acesse Vercel Dashboard → Settings → Environment Variables
2. Para cada variável com nome em português:
   - Clique nos três pontos (...)
   - Selecione "Edit"
   - Renomeie para o nome correto em inglês
   - Salve o valor
   - Delete a variável antiga

### 2. Adicionar Variáveis Faltantes (Firebase Admin)

**CRÍTICO:** Estas variáveis são necessárias para o Firebase Admin funcionar:

1. `FIREBASE_CLIENT_EMAIL`
   - Valor: Email do service account do Firebase
   - Exemplo: `firebase-adminsdk-xxxxx@projeto.iam.gserviceaccount.com`
   - **NÃO** usar `NEXT_PUBLIC_` (é privada)

2. `FIREBASE_PRIVATE_KEY`
   - Valor: Chave privada completa do service account
   - Deve incluir `-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----`
   - **NÃO** usar `NEXT_PUBLIC_` (é privada)
   - Manter quebras de linha (`\n`)

3. `FIREBASE_PROJECT_ID` (ou usar `NEXT_PUBLIC_FIREBASE_PROJECT_ID`)
   - Se já tiver `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, pode usar ela
   - O código aceita ambos

### 3. Adicionar Variáveis Opcionais (Se Necessário)

- `GOOGLE_CLOUD_PROJECT_ID` - Se usar Vertex AI ou Gemini
- `NEXT_PUBLIC_LOJA_SITE` - Para página de login
- `STABILITY_AI_API_KEY` - Se usar Stability AI

## 📋 Checklist de Correção

### Passo 1: Renomear Variáveis

- [ ] `ID_DE_TELEFONE_DO_WHATSAPP` → `WHATSAPP_PHONE_ID`
- [ ] `E-MAILS_DO_ADMINISTRADOR` → `ADMIN_EMAILS`
- [ ] `PRÓXIMA_URL_PÚBLICA_DE_BACKEND` → `NEXT_PUBLIC_BACKEND_URL`
- [ ] `PRÓXIMA_CHAVE_DA_API_PÚBLICA_DO_FIREBASE` → `NEXT_PUBLIC_FIREBASE_API_KEY`
- [ ] `PRÓXIMO_DOMÍNIO_PÚBLICO_DE_AUTENTICAÇÃO` → `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- [ ] `PRÓXIMO ID DO PROJETO PÚBLICO DO FIREBASE` → `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- [ ] `PRÓXIMO_BUCKET_DE_ARMAZENAMENTO_PÚBLICO` → `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- [ ] `PRÓXIMO ID DO APLICATIVO PÚBLICO DO FIREBASE` → `NEXT_PUBLIC_FIREBASE_APP_ID`
- [ ] `PRÓXIMO ID DE MEDIÇÃO PÚBLICA DO FIREBASE` → `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- [ ] `PRÓXIMO ID_PÚBLICO_LOJISTA` → `NEXT_PUBLIC_LOJISTA_ID`

### Passo 2: Verificar Variáveis Firebase Admin

- [x] `FIREBASE_PROJECT_ID` ✅ **CONFIGURADO**
- [x] `FIREBASE_CLIENT_EMAIL` ✅ **CONFIGURADO**
- [x] `FIREBASE_PRIVATE_KEY` ✅ **CONFIGURADO**

### Passo 3: Adicionar Variáveis Opcionais (Se Necessário)

- [ ] `GOOGLE_CLOUD_PROJECT_ID` (se usar Vertex AI)
- [ ] `NEXT_PUBLIC_LOJA_SITE` (para página de login)
- [ ] `STABILITY_AI_API_KEY` (se usar Stability AI)

## 🔧 Como Corrigir no Vercel

1. **Acesse:** https://vercel.com/dashboard
2. **Vá em:** Seu projeto → Settings → Environment Variables
3. **Para cada variável com nome errado:**
   - Clique nos três pontos (...)
   - Clique em "Edit"
   - Copie o valor
   - Delete a variável antiga
   - Clique em "Add New"
   - Cole o nome correto
   - Cole o valor
   - Selecione "All Environments"
   - Clique em "Save"
4. **Adicione as variáveis faltantes:**
   - Clique em "Add New"
   - Adicione `FIREBASE_CLIENT_EMAIL`
   - Adicione `FIREBASE_PRIVATE_KEY`
   - Configure para "All Environments"

## ⚠️ IMPORTANTE

- **NÃO** use `NEXT_PUBLIC_` em variáveis privadas (Firebase Admin)
- **SEMPRE** use nomes em inglês (padrão do código)
- **VERIFIQUE** se os valores estão corretos após renomear
- **TESTE** após fazer as alterações

---

**Status:** ⚠️ **CORREÇÕES NECESSÁRIAS**  
**Prioridade:** 🔴 **ALTA** - Variáveis com nomes incorretos podem causar erros

