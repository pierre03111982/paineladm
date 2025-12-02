# 🔒 Segurança de Chaves de API e Credenciais

## ⚠️ ALERTA CRÍTICO

Este documento descreve as práticas de segurança para proteger chaves de API, tokens e credenciais sensíveis no projeto.

## 📋 Índice

1. [Problema Identificado](#problema-identificado)
2. [Boas Práticas](#boas-práticas)
3. [Como Regenerar Chaves Comprometidas](#como-regenerar-chaves-comprometidas)
4. [Verificação de Segurança](#verificação-de-segurança)
5. [Checklist de Segurança](#checklist-de-segurança)

---

## 🚨 Problema Identificado

### Alerta do Google Cloud Platform

Foi detectado que uma chave de API do Google Cloud Platform foi exposta publicamente no GitHub:

- **Chave comprometida**: `AIzaSyDATnJJmvdSTTApuIQK56IRJGDPxgg1YRs`
- **Projeto**: `paineladmexperimenteai`
- **Localização**: Repositório `apps-cliente-modelo1` (histórico do Git)
- **Arquivo**: `.env.local`

### ⚡ Ação Imediata Necessária

1. **Regenerar a chave comprometida** no Google Cloud Console
2. **Remover a chave do histórico do Git** (se possível)
3. **Atualizar todas as variáveis de ambiente** com a nova chave
4. **Verificar uso não autorizado** no Google Cloud Console

---

## ✅ Boas Práticas

### 1. Nunca Commitar Arquivos de Ambiente

**❌ NUNCA faça:**
```bash
git add .env
git add .env.local
git add .env.production
git commit -m "Adicionar configurações"
```

**✅ SEMPRE faça:**
- Use `.env.example` ou `.env.template` como modelo
- Adicione valores de exemplo (não reais)
- Documente quais variáveis são necessárias

### 2. Usar Variáveis de Ambiente

**✅ Correto:**
```typescript
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
const gcpKey = process.env.GCP_SERVICE_ACCOUNT_KEY
```

**❌ Incorreto:**
```typescript
const apiKey = "AIzaSyDATnJJmvdSTTApuIQK56IRJGDPxgg1YRs" // NUNCA!
```

### 3. Arquivos que DEVEM estar no .gitignore

```
# Arquivos de ambiente
.env
.env.local
.env.*.local
.env.production
.env.development

# Chaves e credenciais
*service-account*.json
*credentials*.json
*gcp-key*.json
*firebase-admin*.json
*-key.json
*.pem
*.key
```

### 4. Verificar Antes de Commitar

```bash
# Verificar se há arquivos sensíveis sendo rastreados
git ls-files | grep -E "\.(env|key|pem|json)$"

# Verificar se há chaves hardcoded no código
grep -r "AIzaSy" src/
grep -r "sk-" src/
grep -r "Bearer " src/
```

---

## 🔄 Como Regenerar Chaves Comprometidas

### Google Cloud Platform

1. **Acesse o Google Cloud Console**
   - URL: https://console.cloud.google.com/
   - Projeto: `paineladmexperimenteai`

2. **Navegue até Credentials**
   - Menu: **APIs & Services** > **Credentials**

3. **Encontre a chave comprometida**
   - Procure pela chave: `AIzaSyDATnJJmvdSTTApuIQK56IRJGDPxgg1YRs`

4. **Regenere a chave**
   - Clique em **Edit** (ícone de lápis)
   - Clique em **Regenerate key**
   - Confirme a ação

5. **Atualize as variáveis de ambiente**
   - Vercel: Settings > Environment Variables
   - Local: `.env.local` (não commitar!)

6. **Adicione restrições à nova chave**
   - **Application restrictions**: Restringir por HTTP referrer ou IP
   - **API restrictions**: Limitar quais APIs podem ser usadas

### Firebase

1. **Acesse Firebase Console**
   - URL: https://console.firebase.google.com/

2. **Vá para Project Settings**
   - Ícone de engrenagem > **Project settings**

3. **Regenere a API Key**
   - Aba **General** > **Your apps**
   - Clique no app > **Regenerate key**

---

## 🔍 Verificação de Segurança

### Script de Verificação

Crie um script para verificar se há credenciais expostas:

```bash
#!/bin/bash
# verify-secrets.sh

echo "🔍 Verificando credenciais expostas..."

# Verificar arquivos .env sendo rastreados
if git ls-files | grep -q "\.env"; then
  echo "❌ ERRO: Arquivos .env estão sendo rastreados pelo Git!"
  git ls-files | grep "\.env"
  exit 1
fi

# Verificar chaves hardcoded
if grep -r "AIzaSy[A-Za-z0-9_-]\{35\}" src/ 2>/dev/null; then
  echo "❌ ERRO: Chaves do Google Cloud encontradas no código!"
  exit 1
fi

# Verificar tokens
if grep -r "sk-[A-Za-z0-9]\{32,\}" src/ 2>/dev/null; then
  echo "❌ ERRO: Tokens secretos encontrados no código!"
  exit 1
fi

echo "✅ Nenhuma credencial exposta encontrada!"
```

### Verificação Manual

Antes de cada commit, verifique:

```bash
# 1. Verificar arquivos modificados
git status

# 2. Verificar se há arquivos sensíveis
git diff --cached --name-only | grep -E "\.(env|key|pem|json)$"

# 3. Verificar conteúdo dos arquivos
git diff --cached | grep -E "(AIzaSy|sk-|Bearer |password|secret|key)"
```

---

## ✅ Checklist de Segurança

Antes de fazer commit, verifique:

- [ ] Nenhum arquivo `.env*` está sendo commitado
- [ ] Nenhuma chave de API está hardcoded no código
- [ ] Todas as credenciais estão em variáveis de ambiente
- [ ] `.gitignore` está atualizado e funcionando
- [ ] Arquivos de exemplo (`.env.example`) não contêm valores reais
- [ ] Chaves antigas foram regeneradas se comprometidas
- [ ] Variáveis de ambiente foram atualizadas em produção

---

## 📚 Recursos Adicionais

### Documentação Oficial

- [Google Cloud - Handling Compromised GCP Credentials](https://cloud.google.com/iam/docs/credentials-best-practices)
- [GitHub - Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [OWASP - Secrets Management](https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_cryptographic_key)

### Ferramentas Úteis

- **git-secrets**: Previne commits com credenciais
- **truffleHog**: Scanner de credenciais em repositórios
- **gitleaks**: Detecta vazamentos de credenciais

---

## 🆘 Em Caso de Vazamento

1. **Regenere imediatamente** todas as credenciais comprometidas
2. **Revise logs** de uso para detectar atividade não autorizada
3. **Atualize** todas as variáveis de ambiente
4. **Notifique** a equipe sobre o incidente
5. **Documente** o que aconteceu e as ações tomadas

---

**Última atualização**: Dezembro 2024  
**Mantido por**: Equipe de Desenvolvimento




