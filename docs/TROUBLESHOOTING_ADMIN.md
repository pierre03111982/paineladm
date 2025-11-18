# 🔧 Troubleshooting - Acesso ao Painel Admin

## 🔍 Passo a Passo para Diagnosticar

### 1. Verificar Variável de Ambiente

**Na Vercel:**
1. Acesse: https://vercel.com/pierre03111982s-projects/paineladm/settings/environment-variables
2. Verifique se `ADMIN_EMAILS` está configurada
3. O valor deve ser: `seu-email@exemplo.com` (sem espaços extras)
4. Certifique-se de que está marcada para **Production**

**Teste:**
- Após configurar, faça um novo deploy
- A variável só é aplicada em novos deploys

---

### 2. Verificar Usuário no Firebase

1. Acesse: https://console.firebase.google.com
2. Selecione o projeto: `paineladmexperimenteai`
3. Vá em **Authentication** → **Users**
4. Verifique se o usuário existe
5. **IMPORTANTE:** O email deve ser EXATAMENTE igual ao que está em `ADMIN_EMAILS`

**Dica:** Copie e cole o email para evitar erros de digitação

---

### 3. Verificar Cookies no Navegador

1. Abra o DevTools (F12)
2. Vá na aba **Application** (ou **Aplicativo**)
3. No menu lateral, clique em **Cookies**
4. Selecione o domínio da Vercel
5. Verifique se existem os cookies:
   - `auth-token` (deve ter um valor)
   - `admin-token` (deve ter valor `true`)

**Se os cookies não existirem:**
- O login não está definindo os cookies corretamente
- Verifique o console do navegador para erros

---

### 4. Verificar Console do Navegador

1. Abra o DevTools (F12)
2. Vá na aba **Console**
3. Tente fazer login
4. Procure por erros em vermelho

**Erros comuns:**
- `Failed to fetch` → Problema de rede ou CORS
- `401 Unauthorized` → Token inválido
- `403 Forbidden` → Email não está na lista de admins

---

### 5. Verificar Logs da Vercel

1. Acesse: https://vercel.com/pierre03111982s-projects/paineladm
2. Vá em **Deployments**
3. Clique no último deploy
4. Vá em **Functions** → **View Function Logs**
5. Procure por erros relacionados a:
   - `[AdminAuth]`
   - `[CheckAdmin]`
   - `Firebase Admin SDK`

---

## 🐛 Problemas Comuns e Soluções

### Problema 1: "Você não tem permissão para acessar o painel administrativo"

**Causa:** O email não está na lista de admins

**Solução:**
1. Verifique se o email está exatamente igual em:
   - Firebase Authentication
   - Variável `ADMIN_EMAILS` na Vercel
2. Certifique-se de que não há espaços extras
3. Faça um novo deploy após alterar a variável

---

### Problema 2: Redirecionamento infinito para /login

**Causa:** Cookies não estão sendo definidos ou lidos corretamente

**Solução:**
1. Limpe os cookies do navegador
2. Tente fazer login novamente
3. Verifique se os cookies são definidos após o login
4. Verifique se o domínio está correto (deve ser o domínio da Vercel)

---

### Problema 3: Erro 500 ao acessar /admin

**Causa:** Erro no servidor ao verificar admin

**Solução:**
1. Verifique os logs da Vercel
2. Verifique se as variáveis do Firebase Admin estão configuradas:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
3. Verifique se o Firebase Admin SDK está funcionando

---

### Problema 4: Login funciona mas não acessa /admin

**Causa:** Token não está sendo verificado corretamente

**Solução:**
1. Verifique se o cookie `auth-token` existe
2. Verifique se o cookie `admin-token` existe e tem valor `true`
3. Tente limpar os cookies e fazer login novamente

---

## 🧪 Teste Manual

### Teste 1: Verificar se o email está na lista

1. Abra o console do navegador (F12)
2. Execute:
```javascript
fetch('/api/auth/check-admin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    token: 'SEU_TOKEN_AQUI' // Obtenha do cookie auth-token
  })
})
.then(r => r.json())
.then(console.log)
```

**Resultado esperado:**
```json
{
  "isAdmin": true,
  "email": "seu-email@exemplo.com"
}
```

---

### Teste 2: Verificar cookies

1. Abra o console do navegador (F12)
2. Execute:
```javascript
document.cookie
```

**Resultado esperado:**
Deve conter `auth-token` e `admin-token`

---

## 📝 Checklist Completo

- [ ] Variável `ADMIN_EMAILS` configurada na Vercel
- [ ] Email exatamente igual no Firebase e na variável
- [ ] Novo deploy feito após configurar variável
- [ ] Usuário criado no Firebase Authentication
- [ ] Cookies `auth-token` e `admin-token` existem
- [ ] Sem erros no console do navegador
- [ ] Sem erros nos logs da Vercel
- [ ] Variáveis do Firebase Admin configuradas

---

## 🆘 Se Nada Funcionar

1. **Limpe tudo:**
   - Limpe cookies do navegador
   - Faça logout do Firebase
   - Tente novamente

2. **Verifique a URL:**
   - Certifique-se de estar acessando a URL de produção
   - Não use cache do navegador (Ctrl+Shift+R)

3. **Teste em modo anônimo:**
   - Abra uma janela anônima
   - Tente fazer login

4. **Verifique o email:**
   - Use exatamente o mesmo email em todos os lugares
   - Sem espaços, sem diferenças de maiúsculas/minúsculas

---

*Última atualização: $(date)*



