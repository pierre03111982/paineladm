# 🧪 Teste Rápido de Acesso Admin

## Passo a Passo para Testar

### 1. Verificar Variável de Ambiente

Execute no terminal (ou verifique na Vercel):
```bash
# Na Vercel, vá em Settings > Environment Variables
# Verifique se ADMIN_EMAILS está configurada
```

**Exemplo correto:**
```
ADMIN_EMAILS=seu-email@exemplo.com
```

**Errado:**
```
ADMIN_EMAILS= seu-email@exemplo.com  (com espaço)
ADMIN_EMAILS="seu-email@exemplo.com" (com aspas)
```

---

### 2. Testar Login Admin

1. Acesse: `https://paineladm-gn1qhfwea-pierre03111982s-projects.vercel.app/login?admin=true`
2. Faça login com o email que está em `ADMIN_EMAILS`
3. Abra o DevTools (F12) → Console
4. Procure por mensagens de log

**O que deve aparecer:**
- `[AdminAuth] Email do token: seu-email@exemplo.com`
- `[AdminAuth] É admin? true`
- `[CheckAdmin] É admin? true`

---

### 3. Verificar Cookies

1. Após fazer login, abra DevTools (F12)
2. Vá em Application → Cookies
3. Verifique se existem:
   - `auth-token` (deve ter um valor longo)
   - `admin-token` (deve ter valor `true`)

**Se não existirem:**
- O login não está definindo os cookies
- Verifique erros no console

---

### 4. Testar Acesso Direto

1. Após fazer login, tente acessar:
   `https://paineladm-gn1qhfwea-pierre03111982s-projects.vercel.app/admin`

**O que deve acontecer:**
- ✅ Se tiver cookies corretos: Acessa o painel
- ❌ Se não tiver cookies: Redireciona para `/login?admin=true`

---

### 5. Verificar Logs da API

1. Abra DevTools (F12) → Network
2. Faça login
3. Procure pela requisição: `/api/auth/check-admin`
4. Clique nela → Response

**Resposta esperada:**
```json
{
  "isAdmin": true,
  "email": "seu-email@exemplo.com",
  "debug": {
    "checkedEmail": "seu-email@exemplo.com",
    "adminEmails": "seu-email@exemplo.com"
  }
}
```

**Se `isAdmin` for `false`:**
- O email não está na lista
- Verifique se o email está exatamente igual

---

## 🔍 Comandos de Debug no Console

### Verificar se é admin:
```javascript
// Obter token do cookie (se possível)
// Ou fazer login e verificar a resposta da API
fetch('/api/auth/check-admin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    token: 'SEU_TOKEN' // Obtenha do cookie auth-token via DevTools
  })
})
.then(r => r.json())
.then(data => {
  console.log('É admin?', data.isAdmin);
  console.log('Email:', data.email);
  console.log('Debug:', data.debug);
});
```

### Verificar cookies:
```javascript
// No console do navegador
console.log('Cookies:', document.cookie);
// Note: cookies httpOnly não aparecem aqui, mas você pode ver no DevTools
```

---

## ⚠️ Problemas Comuns

### "Você não tem permissão"
- Email não está em `ADMIN_EMAILS`
- Email tem diferença de maiúsculas/minúsculas
- Há espaços extras na variável

### Redirecionamento infinito
- Cookies não estão sendo definidos
- Domínio do cookie está errado
- Cookies estão sendo bloqueados

### Erro 500
- Firebase Admin SDK não configurado
- Variáveis do Firebase faltando
- Token inválido

---

## 📞 Informações para Debug

Quando pedir ajuda, forneça:

1. **Email usado no login:**
   ```
   seu-email@exemplo.com
   ```

2. **Valor de ADMIN_EMAILS na Vercel:**
   ```
   (copie exatamente como está)
   ```

3. **Erros no console:**
   ```
   (copie qualquer erro em vermelho)
   ```

4. **Resposta da API /api/auth/check-admin:**
   ```json
   (copie a resposta completa)
   ```

5. **Cookies presentes:**
   ```
   auth-token: sim/não
   admin-token: sim/não
   ```

---

*Última atualização: $(date)*



