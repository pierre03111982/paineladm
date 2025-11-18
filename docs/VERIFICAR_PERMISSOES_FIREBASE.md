# 🔐 Como Verificar Permissões do Firebase Service Account

## 📋 Passo a Passo

### 1. Acessar o Firebase Console

1. Acesse: https://console.firebase.google.com/
2. Selecione o projeto: `paineladmexperimenteai` (ou o nome do seu projeto)

### 2. Verificar Service Account

1. No menu lateral, vá em **⚙️ Configurações do Projeto** (ícone de engrenagem)
2. Vá na aba **Contas de serviço**
3. Você verá a lista de Service Accounts

### 3. Verificar Permissões no Google Cloud Console

O Service Account do Firebase precisa ter permissões no **Google Cloud Console**:

1. Acesse: https://console.cloud.google.com/
2. Selecione o mesmo projeto (`paineladmexperimenteai`)
3. Vá em **IAM e administração** → **IAM**
4. Procure pelo email do Service Account (geralmente: `firebase-adminsdk-xxxxx@paineladmexperimenteai.iam.gserviceaccount.com`)
5. Verifique se tem estas **funções (roles)**:
   - ✅ **Firebase Admin SDK Administrator Service Agent**
   - ✅ **Cloud Datastore User** (para Firestore)
   - ✅ **Storage Admin** (se usar Firebase Storage)

### 4. Verificar Permissões do Firestore

1. No Google Cloud Console, vá em **Firestore** → **Regras**
2. As regras devem permitir acesso do Service Account
3. Exemplo de regra básica (para desenvolvimento):
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Permitir acesso do Service Account (Admin SDK)
       match /{document=**} {
         allow read, write: if request.auth != null || request.auth.token.firebase.sign_in_provider == 'custom';
       }
     }
   }
   ```

### 5. Verificar se o Service Account está sendo usado corretamente

O Service Account é usado através das variáveis de ambiente:
- `FIREBASE_PROJECT_ID` ou `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL` (email do Service Account)
- `FIREBASE_PRIVATE_KEY` (chave privada do Service Account)

## 🔍 Como Obter as Credenciais do Service Account

### Opção 1: Gerar Nova Chave (Recomendado)

1. No Firebase Console → **⚙️ Configurações do Projeto** → **Contas de serviço**
2. Clique em **Gerar nova chave privada**
3. Baixe o arquivo JSON
4. Extraia do JSON:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (copie completo, incluindo `-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----`)

### Opção 2: Usar Credenciais Existentes

Se você já tem o arquivo JSON do Service Account:
1. Abra o arquivo JSON
2. Copie os valores para as variáveis de ambiente no Vercel

## ⚠️ Problemas Comuns

### Erro: "Permission denied"
- **Causa**: Service Account não tem permissão no Firestore
- **Solução**: Adicione a role **Cloud Datastore User** no Google Cloud Console

### Erro: "Firebase Admin SDK não configurado"
- **Causa**: Variáveis de ambiente faltando ou incorretas
- **Solução**: Verifique se `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY` estão corretas no Vercel

### Erro: "Invalid private key"
- **Causa**: `FIREBASE_PRIVATE_KEY` está incorreta ou com formatação errada
- **Solução**: 
  - A chave deve incluir `\n` (quebras de linha)
  - No Vercel, você pode colar a chave completa (o Vercel converte automaticamente)
  - Ou substitua `\n` por quebras de linha reais

## 🧪 Testar Permissões

Para testar se o Service Account tem acesso:

1. No Vercel → projeto `paineladm` → **Logs**
2. Procure por logs que começam com `[FirebaseAdmin]`
3. Se ver `✅ Firebase Admin inicializado com sucesso`, está OK
4. Se ver erro sobre permissões, siga os passos acima

## 📝 Checklist

- [ ] Service Account existe no Firebase Console
- [ ] Service Account tem role **Cloud Datastore User** no Google Cloud Console
- [ ] Variáveis de ambiente configuradas no Vercel:
  - [ ] `FIREBASE_PROJECT_ID` ou `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - [ ] `FIREBASE_CLIENT_EMAIL`
  - [ ] `FIREBASE_PRIVATE_KEY`
- [ ] Firestore está habilitado no Firebase Console
- [ ] Regras do Firestore permitem acesso (ou estão em modo de desenvolvimento)

