# ✅ Próximos Passos Após Configurar Domínio

## 🎯 Status Atual

Você já tem os seguintes domínios configurados:
- ✅ `experimenteai.com.br` (com redirect para www)
- ✅ `www.experimenteai.com.br` (Production)
- ✅ `paineladm-ten.vercel.app` (Production)

## 📋 Próximos Passos

### 1️⃣ Atualizar Variáveis de Ambiente

Agora que o domínio está funcionando, você precisa atualizar as variáveis de ambiente na Vercel:

1. **Acesse:** Settings → Environment Variables
2. **Atualize ou adicione:**
   - `NEXT_PUBLIC_APP_URL` = `https://www.experimenteai.com.br`
   - Ou se quiser usar o subdomínio: `https://painel.experimenteai.com.br`

3. **Clique em Save**

### 2️⃣ Fazer Novo Deploy

Após atualizar as variáveis, faça um novo deploy:

```bash
cd E:\projetos\paineladm
vercel --prod
```

### 3️⃣ Testar o Domínio

1. Acesse: `https://www.experimenteai.com.br/login`
2. Teste o login
3. Verifique se todas as funcionalidades estão funcionando

### 4️⃣ Verificar URLs Internas

Certifique-se de que todas as URLs internas estão usando o novo domínio:
- Links de redirecionamento
- URLs de API
- Links de compartilhamento

---

## 🔍 Verificar se Está Funcionando

### Teste Básico:
1. Acesse: `https://www.experimenteai.com.br`
2. Deve carregar a página de login
3. Teste fazer login
4. Verifique se o redirecionamento funciona

### Verificar SSL:
- O domínio deve ter `https://` (SSL automático da Vercel)
- Não deve aparecer avisos de certificado inválido

---

## 💡 Dica

Se você quiser usar um subdomínio específico para o painel (ex: `painel.experimenteai.com.br`):

1. Na Vercel: Add Domain → `painel.experimenteai.com.br`
2. Na Hostinger: Adicione CNAME `painel` → `cname.vercel-dns.com`
3. Atualize `NEXT_PUBLIC_APP_URL` para o subdomínio

---

**Status:** Seus domínios estão configurados e funcionando! ✅



