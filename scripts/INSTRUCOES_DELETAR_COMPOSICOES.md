# 🗑️ Instruções para Deletar Composições Antigas

## ⚠️ ATENÇÃO
Esta ação é **IRREVERSÍVEL**! As composições serão deletadas permanentemente do banco de dados.

## 📋 Pré-requisitos

Antes de executar o script, você precisa configurar as credenciais do Firebase Admin:

### 1. Criar arquivo `.env.local`

Crie um arquivo `.env.local` na raiz do projeto (`E:\projetos\paineladm\.env.local`) com as seguintes variáveis:

```env
# Firebase Admin SDK (obrigatório para scripts)
FIREBASE_PROJECT_ID=seu-project-id
FIREBASE_CLIENT_EMAIL=seu-service-account@seu-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSua chave privada aqui\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=seu-bucket.appspot.com
```

### 2. Onde encontrar essas variáveis?

**Opção A: No Vercel (Produção)**
1. Acesse: https://vercel.com/dashboard
2. Vá em: Seu projeto → Settings → Environment Variables
3. Copie os valores de:
   - `FIREBASE_PROJECT_ID` ou `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
   - `FIREBASE_STORAGE_BUCKET` ou `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`

**Opção B: No Firebase Console**
1. Acesse: https://console.firebase.google.com
2. Vá em: Project Settings → Service Accounts
3. Clique em "Generate New Private Key"
4. Baixe o arquivo JSON
5. Use os valores do JSON:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`

## 🚀 Como Executar

### Caminho completo do comando:

```powershell
cd E:\projetos\paineladm
npx tsx scripts/delete-old-compositions.ts thais-moda
```

Ou simplesmente (se já estiver no diretório):

```powershell
npx tsx scripts/delete-old-compositions.ts thais-moda
```

### O que o script faz:

1. ✅ Busca todas as composições da subcoleção
2. ✅ Ordena por data (mais antigas primeiro)
3. ✅ Seleciona as 500 mais antigas
4. ✅ Mostra preview do que será deletado
5. ✅ Deleta em lotes de 500
6. ✅ Mostra progresso e resultado final

## 📊 O que você verá:

```
================================================================================
🗑️  DELETAR COMPOSIÇÕES ANTIGAS
================================================================================
📌 Lojista ID: thais-moda
📊 Quantidade a deletar: 500 composições mais antigas
⚠️  ATENÇÃO: Esta ação é IRREVERSÍVEL!

📥 Buscando todas as composições...
  📦 Lote 1: 1000 composições encontradas (total: 1000)
  📦 Lote 2: 1000 composições encontradas (total: 2000)
  ...

✅ Total de composições encontradas: 1021

────────────────────────────────────────────────────────────────────────────────
📋 RESUMO DAS COMPOSIÇÕES A SEREM DELETADAS (500):
────────────────────────────────────────────────────────────────────────────────

🕐 Primeiras 5 (mais antigas):
   1. ID: abc123... | Cliente: Cliente X | Data: 01/12/2024 10:30
   ...

🗑️  Data da mais antiga: 01/12/2024
🗑️  Data da mais recente (a ser deletada): 05/12/2024

⚠️  Você está prestes a DELETAR 500 composições!
⚠️  Esta ação é IRREVERSÍVEL!

🗑️  Iniciando exclusão...

✅ Lote 1: 500 composições deletadas (total: 500/500)

================================================================================
✅ CONCLUÍDO! 500 composições deletadas com sucesso.
📊 Restam 521 composições no banco.
================================================================================
```

## ⚠️ IMPORTANTE

- **NUNCA** commite o arquivo `.env.local` no Git!
- Ele já está no `.gitignore`
- Mantenha essas credenciais seguras

## ❓ Solução de Problemas

### Erro: "Firebase Admin: Credenciais não encontradas"

**Solução:** Verifique se o arquivo `.env.local` existe e contém todas as variáveis necessárias.

### Erro: "Cannot read properties of null"

**Solução:** As credenciais do Firebase Admin não estão configuradas corretamente. Verifique:
1. Se o arquivo `.env.local` existe na raiz do projeto
2. Se todas as variáveis estão preenchidas corretamente
3. Se a chave privada está entre aspas e com `\n` para quebras de linha

## 📞 Precisa de ajuda?

Se ainda tiver problemas, verifique:
1. Se o arquivo `.env.local` está na raiz do projeto (`E:\projetos\paineladm\.env.local`)
2. Se todas as variáveis estão configuradas
3. Se as credenciais do Firebase Admin estão corretas


