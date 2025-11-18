# 🔐 Configurar Autenticação Admin

## 📋 Variável de Ambiente Necessária

Para que a autenticação admin funcione, você precisa configurar a variável de ambiente `ADMIN_EMAILS` com os emails autorizados.

### Configurar na Vercel:

1. Acesse: https://vercel.com/pierre03111982s-projects/paineladm/settings/environment-variables
2. Clique em **Add New**
3. Adicione:
   - **Key:** `ADMIN_EMAILS`
   - **Value:** `seu-email@exemplo.com,outro-email@exemplo.com` (separados por vírgula)
   - **Environment:** Production (e Preview se quiser)
4. Clique em **Save**

### Configurar Localmente:

Adicione ao arquivo `.env.local`:

```env
ADMIN_EMAILS=seu-email@exemplo.com,outro-email@exemplo.com
```

**Exemplo:**
```env
ADMIN_EMAILS=admin@experimenteai.com,pierre03111982@gmail.com
```

---

## ✅ Como Funciona

1. **Middleware:** Protege todas as rotas `/admin/*` no nível do servidor
2. **Verificação Server-Side:** Cada página admin verifica se o usuário é admin
3. **Verificação Client-Side:** Componente `AdminRouteGuard` verifica no cliente também
4. **Cookies:** Tokens de autenticação são armazenados em cookies httpOnly

---

## 🚀 Como Usar

### 1. Criar Usuário Admin no Firebase:

1. Acesse: https://console.firebase.google.com
2. Selecione o projeto: `paineladmexperimenteai`
3. Vá em **Authentication** → **Users**
4. Clique em **Add user**
5. Adicione o email que está em `ADMIN_EMAILS`
6. Defina uma senha
7. Clique em **Add user**

### 2. Fazer Login como Admin:

1. Acesse: `/login?admin=true`
2. Ou tente acessar `/admin` diretamente (será redirecionado)
3. Faça login com o email admin
4. Você será redirecionado para `/admin`

---

## 🔒 Segurança

- ✅ Tokens são verificados no servidor e no cliente
- ✅ Cookies são httpOnly (não acessíveis via JavaScript)
- ✅ Cookies são secure em produção (apenas HTTPS)
- ✅ Middleware bloqueia acesso não autorizado
- ✅ Verificação dupla (server + client)

---

## ⚠️ Importante

- **NUNCA** commite a variável `ADMIN_EMAILS` com emails reais no código
- Use variáveis de ambiente sempre
- Adicione apenas emails confiáveis
- Revise a lista de admins regularmente

---

## 🆘 Troubleshooting

### "Você não tem permissão para acessar o painel administrativo"
- Verifique se o email está em `ADMIN_EMAILS`
- Verifique se o email está correto (case-insensitive)
- Verifique se a variável de ambiente está configurada

### Erro 404 ao acessar `/admin`
- Verifique se o middleware está funcionando
- Verifique os logs do servidor
- Tente fazer login primeiro em `/login?admin=true`

### Cookies não são definidos
- Verifique se a API `/api/auth/set-token` está funcionando
- Verifique se o domínio está correto
- Em desenvolvimento, cookies funcionam em `localhost`

---

*Última atualização: $(date)*



