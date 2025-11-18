# 🚀 Guia Rápido de Deploy

## ✅ Passo 1: Corrigir Erros de Build

Antes de fazer deploy, certifique-se de que o build funciona:

```bash
cd E:\projetos\paineladm
npm run build
```

Se houver erros, corrija-os antes de continuar.

---

## ✅ Passo 2: Instalar Vercel CLI

```bash
npm install -g vercel
```

---

## ✅ Passo 3: Login na Vercel

```bash
vercel login
```

Isso abrirá o navegador para você fazer login.

---

## ✅ Passo 4: Configurar Variáveis de Ambiente

Antes de fazer deploy, você precisa configurar as variáveis de ambiente na Vercel:

1. Acesse https://vercel.com/dashboard
2. Crie um novo projeto ou selecione o existente
3. Vá em **Settings** > **Environment Variables**
4. Adicione todas as variáveis do arquivo `ENV_PRODUCTION_EXAMPLE.md`

**Variáveis obrigatórias:**
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (com `\n` preservados)
- `FIREBASE_STORAGE_BUCKET`
- `GOOGLE_CLOUD_PROJECT_ID`
- `STABILITY_API_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- E todas as outras do arquivo de exemplo

---

## ✅ Passo 5: Fazer Deploy

```bash
cd E:\projetos\paineladm
vercel --prod
```

O Vercel vai:
1. Fazer upload do código
2. Instalar dependências
3. Fazer build
4. Fazer deploy

---

## ✅ Passo 6: Verificar Deploy

Após o deploy, você receberá uma URL. Acesse e teste:
- Login funciona?
- APIs respondem?
- Geração de imagens funciona?

---

## 🆘 Problemas Comuns

### Build falha
- Verifique se todas as variáveis de ambiente estão configuradas
- Verifique se não há erros de sintaxe no código
- Limpe o cache: `rm -rf .next`

### Erro de autenticação Firebase
- Verifique se `FIREBASE_PRIVATE_KEY` está com `\n` preservados
- Verifique se todas as variáveis do Firebase estão corretas

### Erro de Vertex AI
- Verifique se `GOOGLE_CLOUD_PROJECT_ID` está correto
- Verifique se a service account tem permissões corretas

---

## 📝 Próximos Passos Após Deploy

1. Configurar domínio customizado (opcional)
2. Configurar monitoramento
3. Configurar backup do Firestore
4. Testar todas as funcionalidades

---

**Boa sorte com o deploy! 🚀**































