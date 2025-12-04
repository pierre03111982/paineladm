# Como Configurar Variáveis de Ambiente Localmente

Para executar o script de conversão de imagens localmente, você precisa configurar as variáveis de ambiente do Firebase Admin.

## Opção 1: Criar arquivo `.env.local` (Recomendado)

Crie um arquivo `.env.local` na raiz do projeto `paineladm` com as seguintes variáveis:

```env
# Firebase Admin SDK (obrigatório para scripts)
FIREBASE_PROJECT_ID=seu-project-id
FIREBASE_CLIENT_EMAIL=seu-service-account@seu-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSua chave privada aqui\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=seu-bucket.appspot.com
```

## Opção 2: Configurar no PowerShell (Temporário)

Execute no PowerShell antes de rodar o script:

```powershell
$env:FIREBASE_PROJECT_ID="seu-project-id"
$env:FIREBASE_CLIENT_EMAIL="seu-service-account@seu-project.iam.gserviceaccount.com"
$env:FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSua chave privada aqui\n-----END PRIVATE KEY-----\n"
$env:FIREBASE_STORAGE_BUCKET="seu-bucket.appspot.com"
```

## Onde encontrar essas variáveis?

### 1. No Vercel (Produção)
- Acesse: https://vercel.com/dashboard
- Vá em: Seu projeto → Settings → Environment Variables
- Copie os valores de:
  - `FIREBASE_PROJECT_ID` ou `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`
  - `FIREBASE_STORAGE_BUCKET` ou `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`

### 2. No Firebase Console
- Acesse: https://console.firebase.google.com
- Vá em: Project Settings → Service Accounts
- Clique em "Generate New Private Key"
- Baixe o arquivo JSON
- Use os valores do JSON:
  - `project_id` → `FIREBASE_PROJECT_ID`
  - `client_email` → `FIREBASE_CLIENT_EMAIL`
  - `private_key` → `FIREBASE_PRIVATE_KEY`

## Importante

⚠️ **NUNCA** commite o arquivo `.env.local` no Git!
- Ele já está no `.gitignore`
- Mantenha essas credenciais seguras

## Testar a configuração

Após configurar, teste executando:

```bash
cd E:\projetos\paineladm
npm run convert-images
```

Se funcionar, você verá:
```
🔄 Iniciando conversão de imagens existentes...
📦 Processando loja: ...
```



Para executar o script de conversão de imagens localmente, você precisa configurar as variáveis de ambiente do Firebase Admin.

## Opção 1: Criar arquivo `.env.local` (Recomendado)

Crie um arquivo `.env.local` na raiz do projeto `paineladm` com as seguintes variáveis:

```env
# Firebase Admin SDK (obrigatório para scripts)
FIREBASE_PROJECT_ID=seu-project-id
FIREBASE_CLIENT_EMAIL=seu-service-account@seu-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSua chave privada aqui\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=seu-bucket.appspot.com
```

## Opção 2: Configurar no PowerShell (Temporário)

Execute no PowerShell antes de rodar o script:

```powershell
$env:FIREBASE_PROJECT_ID="seu-project-id"
$env:FIREBASE_CLIENT_EMAIL="seu-service-account@seu-project.iam.gserviceaccount.com"
$env:FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSua chave privada aqui\n-----END PRIVATE KEY-----\n"
$env:FIREBASE_STORAGE_BUCKET="seu-bucket.appspot.com"
```

## Onde encontrar essas variáveis?

### 1. No Vercel (Produção)
- Acesse: https://vercel.com/dashboard
- Vá em: Seu projeto → Settings → Environment Variables
- Copie os valores de:
  - `FIREBASE_PROJECT_ID` ou `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`
  - `FIREBASE_STORAGE_BUCKET` ou `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`

### 2. No Firebase Console
- Acesse: https://console.firebase.google.com
- Vá em: Project Settings → Service Accounts
- Clique em "Generate New Private Key"
- Baixe o arquivo JSON
- Use os valores do JSON:
  - `project_id` → `FIREBASE_PROJECT_ID`
  - `client_email` → `FIREBASE_CLIENT_EMAIL`
  - `private_key` → `FIREBASE_PRIVATE_KEY`

## Importante

⚠️ **NUNCA** commite o arquivo `.env.local` no Git!
- Ele já está no `.gitignore`
- Mantenha essas credenciais seguras

## Testar a configuração

Após configurar, teste executando:

```bash
cd E:\projetos\paineladm
npm run convert-images
```

Se funcionar, você verá:
```
🔄 Iniciando conversão de imagens existentes...
📦 Processando loja: ...
```




Para executar o script de conversão de imagens localmente, você precisa configurar as variáveis de ambiente do Firebase Admin.

## Opção 1: Criar arquivo `.env.local` (Recomendado)

Crie um arquivo `.env.local` na raiz do projeto `paineladm` com as seguintes variáveis:

```env
# Firebase Admin SDK (obrigatório para scripts)
FIREBASE_PROJECT_ID=seu-project-id
FIREBASE_CLIENT_EMAIL=seu-service-account@seu-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSua chave privada aqui\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=seu-bucket.appspot.com
```

## Opção 2: Configurar no PowerShell (Temporário)

Execute no PowerShell antes de rodar o script:

```powershell
$env:FIREBASE_PROJECT_ID="seu-project-id"
$env:FIREBASE_CLIENT_EMAIL="seu-service-account@seu-project.iam.gserviceaccount.com"
$env:FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSua chave privada aqui\n-----END PRIVATE KEY-----\n"
$env:FIREBASE_STORAGE_BUCKET="seu-bucket.appspot.com"
```

## Onde encontrar essas variáveis?

### 1. No Vercel (Produção)
- Acesse: https://vercel.com/dashboard
- Vá em: Seu projeto → Settings → Environment Variables
- Copie os valores de:
  - `FIREBASE_PROJECT_ID` ou `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`
  - `FIREBASE_STORAGE_BUCKET` ou `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`

### 2. No Firebase Console
- Acesse: https://console.firebase.google.com
- Vá em: Project Settings → Service Accounts
- Clique em "Generate New Private Key"
- Baixe o arquivo JSON
- Use os valores do JSON:
  - `project_id` → `FIREBASE_PROJECT_ID`
  - `client_email` → `FIREBASE_CLIENT_EMAIL`
  - `private_key` → `FIREBASE_PRIVATE_KEY`

## Importante

⚠️ **NUNCA** commite o arquivo `.env.local` no Git!
- Ele já está no `.gitignore`
- Mantenha essas credenciais seguras

## Testar a configuração

Após configurar, teste executando:

```bash
cd E:\projetos\paineladm
npm run convert-images
```

Se funcionar, você verá:
```
🔄 Iniciando conversão de imagens existentes...
📦 Processando loja: ...
```



Para executar o script de conversão de imagens localmente, você precisa configurar as variáveis de ambiente do Firebase Admin.

## Opção 1: Criar arquivo `.env.local` (Recomendado)

Crie um arquivo `.env.local` na raiz do projeto `paineladm` com as seguintes variáveis:

```env
# Firebase Admin SDK (obrigatório para scripts)
FIREBASE_PROJECT_ID=seu-project-id
FIREBASE_CLIENT_EMAIL=seu-service-account@seu-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSua chave privada aqui\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=seu-bucket.appspot.com
```

## Opção 2: Configurar no PowerShell (Temporário)

Execute no PowerShell antes de rodar o script:

```powershell
$env:FIREBASE_PROJECT_ID="seu-project-id"
$env:FIREBASE_CLIENT_EMAIL="seu-service-account@seu-project.iam.gserviceaccount.com"
$env:FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSua chave privada aqui\n-----END PRIVATE KEY-----\n"
$env:FIREBASE_STORAGE_BUCKET="seu-bucket.appspot.com"
```

## Onde encontrar essas variáveis?

### 1. No Vercel (Produção)
- Acesse: https://vercel.com/dashboard
- Vá em: Seu projeto → Settings → Environment Variables
- Copie os valores de:
  - `FIREBASE_PROJECT_ID` ou `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`
  - `FIREBASE_STORAGE_BUCKET` ou `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`

### 2. No Firebase Console
- Acesse: https://console.firebase.google.com
- Vá em: Project Settings → Service Accounts
- Clique em "Generate New Private Key"
- Baixe o arquivo JSON
- Use os valores do JSON:
  - `project_id` → `FIREBASE_PROJECT_ID`
  - `client_email` → `FIREBASE_CLIENT_EMAIL`
  - `private_key` → `FIREBASE_PRIVATE_KEY`

## Importante

⚠️ **NUNCA** commite o arquivo `.env.local` no Git!
- Ele já está no `.gitignore`
- Mantenha essas credenciais seguras

## Testar a configuração

Após configurar, teste executando:

```bash
cd E:\projetos\paineladm
npm run convert-images
```

Se funcionar, você verá:
```
🔄 Iniciando conversão de imagens existentes...
📦 Processando loja: ...
```




Para executar o script de conversão de imagens localmente, você precisa configurar as variáveis de ambiente do Firebase Admin.

## Opção 1: Criar arquivo `.env.local` (Recomendado)

Crie um arquivo `.env.local` na raiz do projeto `paineladm` com as seguintes variáveis:

```env
# Firebase Admin SDK (obrigatório para scripts)
FIREBASE_PROJECT_ID=seu-project-id
FIREBASE_CLIENT_EMAIL=seu-service-account@seu-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSua chave privada aqui\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=seu-bucket.appspot.com
```

## Opção 2: Configurar no PowerShell (Temporário)

Execute no PowerShell antes de rodar o script:

```powershell
$env:FIREBASE_PROJECT_ID="seu-project-id"
$env:FIREBASE_CLIENT_EMAIL="seu-service-account@seu-project.iam.gserviceaccount.com"
$env:FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSua chave privada aqui\n-----END PRIVATE KEY-----\n"
$env:FIREBASE_STORAGE_BUCKET="seu-bucket.appspot.com"
```

## Onde encontrar essas variáveis?

### 1. No Vercel (Produção)
- Acesse: https://vercel.com/dashboard
- Vá em: Seu projeto → Settings → Environment Variables
- Copie os valores de:
  - `FIREBASE_PROJECT_ID` ou `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`
  - `FIREBASE_STORAGE_BUCKET` ou `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`

### 2. No Firebase Console
- Acesse: https://console.firebase.google.com
- Vá em: Project Settings → Service Accounts
- Clique em "Generate New Private Key"
- Baixe o arquivo JSON
- Use os valores do JSON:
  - `project_id` → `FIREBASE_PROJECT_ID`
  - `client_email` → `FIREBASE_CLIENT_EMAIL`
  - `private_key` → `FIREBASE_PRIVATE_KEY`

## Importante

⚠️ **NUNCA** commite o arquivo `.env.local` no Git!
- Ele já está no `.gitignore`
- Mantenha essas credenciais seguras

## Testar a configuração

Após configurar, teste executando:

```bash
cd E:\projetos\paineladm
npm run convert-images
```

Se funcionar, você verá:
```
🔄 Iniciando conversão de imagens existentes...
📦 Processando loja: ...
```



Para executar o script de conversão de imagens localmente, você precisa configurar as variáveis de ambiente do Firebase Admin.

## Opção 1: Criar arquivo `.env.local` (Recomendado)

Crie um arquivo `.env.local` na raiz do projeto `paineladm` com as seguintes variáveis:

```env
# Firebase Admin SDK (obrigatório para scripts)
FIREBASE_PROJECT_ID=seu-project-id
FIREBASE_CLIENT_EMAIL=seu-service-account@seu-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSua chave privada aqui\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=seu-bucket.appspot.com
```

## Opção 2: Configurar no PowerShell (Temporário)

Execute no PowerShell antes de rodar o script:

```powershell
$env:FIREBASE_PROJECT_ID="seu-project-id"
$env:FIREBASE_CLIENT_EMAIL="seu-service-account@seu-project.iam.gserviceaccount.com"
$env:FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSua chave privada aqui\n-----END PRIVATE KEY-----\n"
$env:FIREBASE_STORAGE_BUCKET="seu-bucket.appspot.com"
```

## Onde encontrar essas variáveis?

### 1. No Vercel (Produção)
- Acesse: https://vercel.com/dashboard
- Vá em: Seu projeto → Settings → Environment Variables
- Copie os valores de:
  - `FIREBASE_PROJECT_ID` ou `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`
  - `FIREBASE_STORAGE_BUCKET` ou `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`

### 2. No Firebase Console
- Acesse: https://console.firebase.google.com
- Vá em: Project Settings → Service Accounts
- Clique em "Generate New Private Key"
- Baixe o arquivo JSON
- Use os valores do JSON:
  - `project_id` → `FIREBASE_PROJECT_ID`
  - `client_email` → `FIREBASE_CLIENT_EMAIL`
  - `private_key` → `FIREBASE_PRIVATE_KEY`

## Importante

⚠️ **NUNCA** commite o arquivo `.env.local` no Git!
- Ele já está no `.gitignore`
- Mantenha essas credenciais seguras

## Testar a configuração

Após configurar, teste executando:

```bash
cd E:\projetos\paineladm
npm run convert-images
```

Se funcionar, você verá:
```
🔄 Iniciando conversão de imagens existentes...
📦 Processando loja: ...
```




Para executar o script de conversão de imagens localmente, você precisa configurar as variáveis de ambiente do Firebase Admin.

## Opção 1: Criar arquivo `.env.local` (Recomendado)

Crie um arquivo `.env.local` na raiz do projeto `paineladm` com as seguintes variáveis:

```env
# Firebase Admin SDK (obrigatório para scripts)
FIREBASE_PROJECT_ID=seu-project-id
FIREBASE_CLIENT_EMAIL=seu-service-account@seu-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSua chave privada aqui\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=seu-bucket.appspot.com
```

## Opção 2: Configurar no PowerShell (Temporário)

Execute no PowerShell antes de rodar o script:

```powershell
$env:FIREBASE_PROJECT_ID="seu-project-id"
$env:FIREBASE_CLIENT_EMAIL="seu-service-account@seu-project.iam.gserviceaccount.com"
$env:FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSua chave privada aqui\n-----END PRIVATE KEY-----\n"
$env:FIREBASE_STORAGE_BUCKET="seu-bucket.appspot.com"
```

## Onde encontrar essas variáveis?

### 1. No Vercel (Produção)
- Acesse: https://vercel.com/dashboard
- Vá em: Seu projeto → Settings → Environment Variables
- Copie os valores de:
  - `FIREBASE_PROJECT_ID` ou `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`
  - `FIREBASE_STORAGE_BUCKET` ou `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`

### 2. No Firebase Console
- Acesse: https://console.firebase.google.com
- Vá em: Project Settings → Service Accounts
- Clique em "Generate New Private Key"
- Baixe o arquivo JSON
- Use os valores do JSON:
  - `project_id` → `FIREBASE_PROJECT_ID`
  - `client_email` → `FIREBASE_CLIENT_EMAIL`
  - `private_key` → `FIREBASE_PRIVATE_KEY`

## Importante

⚠️ **NUNCA** commite o arquivo `.env.local` no Git!
- Ele já está no `.gitignore`
- Mantenha essas credenciais seguras

## Testar a configuração

Após configurar, teste executando:

```bash
cd E:\projetos\paineladm
npm run convert-images
```

Se funcionar, você verá:
```
🔄 Iniciando conversão de imagens existentes...
📦 Processando loja: ...
```



Para executar o script de conversão de imagens localmente, você precisa configurar as variáveis de ambiente do Firebase Admin.

## Opção 1: Criar arquivo `.env.local` (Recomendado)

Crie um arquivo `.env.local` na raiz do projeto `paineladm` com as seguintes variáveis:

```env
# Firebase Admin SDK (obrigatório para scripts)
FIREBASE_PROJECT_ID=seu-project-id
FIREBASE_CLIENT_EMAIL=seu-service-account@seu-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSua chave privada aqui\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=seu-bucket.appspot.com
```

## Opção 2: Configurar no PowerShell (Temporário)

Execute no PowerShell antes de rodar o script:

```powershell
$env:FIREBASE_PROJECT_ID="seu-project-id"
$env:FIREBASE_CLIENT_EMAIL="seu-service-account@seu-project.iam.gserviceaccount.com"
$env:FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSua chave privada aqui\n-----END PRIVATE KEY-----\n"
$env:FIREBASE_STORAGE_BUCKET="seu-bucket.appspot.com"
```

## Onde encontrar essas variáveis?

### 1. No Vercel (Produção)
- Acesse: https://vercel.com/dashboard
- Vá em: Seu projeto → Settings → Environment Variables
- Copie os valores de:
  - `FIREBASE_PROJECT_ID` ou `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`
  - `FIREBASE_STORAGE_BUCKET` ou `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`

### 2. No Firebase Console
- Acesse: https://console.firebase.google.com
- Vá em: Project Settings → Service Accounts
- Clique em "Generate New Private Key"
- Baixe o arquivo JSON
- Use os valores do JSON:
  - `project_id` → `FIREBASE_PROJECT_ID`
  - `client_email` → `FIREBASE_CLIENT_EMAIL`
  - `private_key` → `FIREBASE_PRIVATE_KEY`

## Importante

⚠️ **NUNCA** commite o arquivo `.env.local` no Git!
- Ele já está no `.gitignore`
- Mantenha essas credenciais seguras

## Testar a configuração

Após configurar, teste executando:

```bash
cd E:\projetos\paineladm
npm run convert-images
```

Se funcionar, você verá:
```
🔄 Iniciando conversão de imagens existentes...
📦 Processando loja: ...
```

























