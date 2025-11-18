# 🔧 Adicionar Variável NEXT_PUBLIC_APP_URL

## ✅ Seus Domínios Já Estão Configurados!

Você já tem:
- ✅ `www.experimenteai.com.br` (Production)
- ✅ `experimenteai.com.br` (com redirect)

## 📋 Próximo Passo: Adicionar Variável de Ambiente

### Opção 1: Pelo Painel da Vercel (Recomendado)

1. **Acesse:** https://vercel.com/dashboard
2. **Selecione o projeto:** `paineladm`
3. **Vá em:** Settings → Environment Variables
4. **Clique em:** Add New
5. **Preencha:**
   - **Key:** `NEXT_PUBLIC_APP_URL`
   - **Value:** `https://www.experimenteai.com.br`
   - **Environment:** Selecione todas as opções:
     - ☑️ Production
     - ☑️ Preview  
     - ☑️ Development
6. **Clique em:** Save

### Opção 2: Via CLI (Terminal)

Execute os comandos abaixo (um para cada ambiente):

```powershell
# Para Production
cd E:\projetos\paineladm
echo https://www.experimenteai.com.br | vercel env add NEXT_PUBLIC_APP_URL production

# Para Preview
echo https://www.experimenteai.com.br | vercel env add NEXT_PUBLIC_APP_URL preview

# Para Development
echo https://www.experimenteai.com.br | vercel env add NEXT_PUBLIC_APP_URL development
```

## 🚀 Após Adicionar a Variável

### 1. Fazer Novo Deploy

```powershell
cd E:\projetos\paineladm
vercel --prod
```

### 2. Testar

1. Acesse: `https://www.experimenteai.com.br/login`
2. Teste fazer login
3. Verifique se tudo funciona

---

## 💡 Qual Domínio Usar?

Você pode usar:
- `https://www.experimenteai.com.br` (domínio principal)
- `https://experimenteai.com.br` (será redirecionado para www)

**Recomendação:** Use `https://www.experimenteai.com.br`

---

## ✅ Checklist

- [ ] Variável `NEXT_PUBLIC_APP_URL` adicionada
- [ ] Valor configurado: `https://www.experimenteai.com.br`
- [ ] Todas as environments selecionadas (Production, Preview, Development)
- [ ] Novo deploy realizado
- [ ] Testado acesso pelo domínio
- [ ] Login funcionando



