# 🔧 Variáveis de Ambiente - Vercel (paineladm)

## ✅ Variáveis que você JÁ TEM (corretas)

### Firebase (públicas)
- `NEXT_PUBLIC_FIREBASE_API_KEY` ✅
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` ✅
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` ✅
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` ✅
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` ✅
- `NEXT_PUBLIC_FIREBASE_APP_ID` ✅
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` ✅

### Firebase Admin (privadas)
- `FIREBASE_PROJECT_ID` ✅
- `FIREBASE_CLIENT_EMAIL` ✅
- `FIREBASE_PRIVATE_KEY` ✅
- `FIREBASE_STORAGE_BUCKET` ✅

### WhatsApp
- `WHATSAPP_PHONE_ID` ✅ (você acabou de adicionar)
- `WHATSAPP_TOKEN` ✅ (você acabou de adicionar)

### URLs
- `NEXT_PUBLIC_CLIENT_APP_URL` ✅
- `NEXT_PUBLIC_APP_URL` ✅

### Outras
- `STABILITY_AI_API_KEY` ✅
- `ADMIN_EMAIL` ✅

---

## ❌ Variáveis FALTANDO (importantes)

### Google Cloud (para IA - Vertex AI, Imagen, Try-On, Gemini)
- `GOOGLE_CLOUD_PROJECT_ID` ❌ **FALTANDO**
- `GOOGLE_CLOUD_LOCATION` ❌ **FALTANDO** (padrão: `us-central1`)

### URLs
- `NEXT_PUBLIC_BACKEND_URL` ❌ **FALTANDO** (deve ser: `https://www.experimenteai.com.br`)

### Admin
- `ADMIN_EMAILS` ❌ **FALTANDO** (você tem `ADMIN_EMAIL`, mas o código usa `ADMIN_EMAILS` no plural)

---

## ⚠️ Variáveis com ERRO DE DIGITAÇÃO (typos)

Você tem estas variáveis com typos. O código procura pelos nomes corretos:

### Erros encontrados:
1. `NEXT_PUBLIC_LAJISTA_ID` → deveria ser `NEXT_PUBLIC_LOJISTA_ID` (tem "LAJISTA" em vez de "LOJISTA")
2. `NEXT_PUBLIC_LAJA_NOME` → deveria ser `NEXT_PUBLIC_LOJA_NOME` (tem "LAJA" em vez de "LOJA")
3. `NEXT_PUBLIC_LAJA_LOGO_URL` → deveria ser `NEXT_PUBLIC_LOJA_LOGO_URL` (tem "LAJA" em vez de "LOJA")
4. `NEXT_PUBLIC_LAJA_INSTAGRAM` → deveria ser `NEXT_PUBLIC_LOJA_INSTAGRAM` (tem "LAJA" em vez de "LOJA")
5. `NEXT_PUBLIC_LAJA_FACEBOOK` → deveria ser `NEXT_PUBLIC_LOJA_FACEBOOK` (tem "LAJA" em vez de "LOJA")
6. `NEXT_PUBLIC_LAJA_TIKTOK` → deveria ser `NEXT_PUBLIC_LOJA_TIKTOK` (tem "LAJA" em vez de "LOJA")
7. `NEXT_PUBLIC_LAJA_SITE` → deveria ser `NEXT_PUBLIC_LOJA_SITE` (tem "LAJA" em vez de "LOJA")

---

## 📋 Ações Necessárias

### 1. Adicionar variáveis faltantes:
```
GOOGLE_CLOUD_PROJECT_ID = (mesmo valor do FIREBASE_PROJECT_ID)
GOOGLE_CLOUD_LOCATION = us-central1
NEXT_PUBLIC_BACKEND_URL = https://www.experimenteai.com.br
ADMIN_EMAILS = (mesmo valor do ADMIN_EMAIL, ou lista separada por vírgula)
```

### 2. Corrigir typos:
- Renomear `NEXT_PUBLIC_LAJISTA_ID` → `NEXT_PUBLIC_LOJISTA_ID`
- Renomear `NEXT_PUBLIC_LAJA_*` → `NEXT_PUBLIC_LOJA_*` (todas as 6 variáveis)

### 3. Variáveis opcionais (não críticas):
- `NEXT_PUBLIC_APPMELHORADO_PORT` (só para desenvolvimento local)
- `NEXT_PUBLIC_APP_SUBDOMAIN` (opcional)
- `NEXT_PUBLIC_APP_PROTOCOL` (opcional, padrão: `https`)
- `IMAGEN_MODEL_VERSION` (opcional, padrão: `imagen-4.0-generate-001`)
- `IMAGEN_COST` (opcional, padrão: `0.04`)
- `TRYON_COST` (opcional, padrão: `0.04`)
- `GEMINI_FLASH_IMAGE_COST` (opcional, padrão: `0.02`)

---

## 🎯 Prioridade

**ALTA PRIORIDADE:**
1. `GOOGLE_CLOUD_PROJECT_ID` - necessário para geração de imagens
2. `GOOGLE_CLOUD_LOCATION` - necessário para geração de imagens
3. `NEXT_PUBLIC_BACKEND_URL` - necessário para comunicação entre apps
4. `ADMIN_EMAILS` - necessário para autenticação de admin

**MÉDIA PRIORIDADE:**
5. Corrigir typos das variáveis `NEXT_PUBLIC_LOJA_*` e `NEXT_PUBLIC_LOJISTA_ID`

**BAIXA PRIORIDADE:**
6. Variáveis opcionais (só se precisar customizar)

