# 🔐 Como Acessar o Painel Administrativo

## 📍 URL de Acesso

**URL de Produção (Vercel):**
- https://paineladm-gn1qhfwea-pierre03111982s-projects.vercel.app/login

**URL Local (desenvolvimento):**
- http://localhost:3000/login

---

## 🔑 Método de Autenticação

O painel usa **Firebase Authentication** com email e senha.

### Requisitos:
- ✅ Conta criada no Firebase Authentication
- ✅ Email e senha válidos
- ✅ Senha com pelo menos 6 caracteres

---

## 👤 Criar Primeiro Usuário

Se você ainda não tem uma conta, precisa criar um usuário no Firebase Console:

### Opção 1: Via Firebase Console (Recomendado)

1. **Acesse o Firebase Console:**
   - https://console.firebase.google.com
   - Selecione o projeto: `paineladmexperimenteai`

2. **Vá em Authentication:**
   - No menu lateral, clique em **Authentication**
   - Clique na aba **Users**

3. **Adicione um usuário:**
   - Clique em **Add user**
   - Digite o **Email** (ex: `admin@experimenteai.com`)
   - Digite a **Senha** (mínimo 6 caracteres)
   - Clique em **Add user**

4. **Pronto!** Agora você pode fazer login no painel.

### Opção 2: Via Código (Temporário)

Se preferir criar via código, você pode usar o Firebase Admin SDK. Mas a forma mais simples é pelo Console.

---

## 🚀 Como Fazer Login

1. **Acesse a URL de login:**
   ```
   https://paineladm-gn1qhfwea-pierre03111982s-projects.vercel.app/login
   ```

2. **Preencha os dados:**
   - **E-mail:** O email cadastrado no Firebase Authentication
   - **Senha:** A senha definida no Firebase

3. **Clique em "Entrar"**

4. **Você será redirecionado para:** `/dashboard`

---

## ⚠️ Problemas Comuns

### "Credenciais inválidas"
- Verifique se o email está correto
- Verifique se a senha está correta
- Certifique-se de que o usuário existe no Firebase Authentication

### "Não encontramos uma conta com esse e-mail"
- O usuário não foi criado no Firebase Authentication
- Crie o usuário no Firebase Console primeiro

### "Este usuário está desativado"
- O usuário foi desabilitado no Firebase Console
- Reative o usuário no Firebase Console

### Erro de conexão
- Verifique se as variáveis de ambiente do Firebase estão configuradas na Vercel
- Verifique se `NEXT_PUBLIC_FIREBASE_API_KEY` e outras variáveis estão corretas

---

## 🔧 Variáveis de Ambiente Necessárias

Certifique-se de que estas variáveis estão configuradas na Vercel:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=paineladmexperimenteai.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=paineladmexperimenteai
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=paineladmexperimenteai.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

**Onde configurar:**
- Vercel Dashboard → Projeto → Settings → Environment Variables

---

## 📝 Próximos Passos Após Login

Após fazer login com sucesso, você terá acesso a:

- **Dashboard:** Visão geral e métricas
- **Produtos:** Gerenciar catálogo
- **Clientes:** Ver clientes cadastrados
- **Composições:** Gerenciar gerações de imagens
- **Configurações:** Ajustar perfil da loja

---

## 🆘 Precisa de Ajuda?

1. Verifique se o usuário existe no Firebase Console
2. Verifique se as variáveis de ambiente estão configuradas
3. Teste com outro navegador ou modo anônimo
4. Verifique os logs do console do navegador (F12)

---

*Última atualização: $(date)*



