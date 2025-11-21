# 🔧 Resolver: Alterações Não Aparecem no Painel do Lojista

## ⚠️ Problema Comum

As alterações no painel do lojista não aparecem porque:

1. **Variáveis de ambiente precisam de novo deploy**
2. **Cache do navegador**
3. **Build não incluiu as mudanças**

---

## ✅ Solução Passo a Passo

### 1. Fazer Novo Deploy do Painel Adm

⚠️ **IMPORTANTE:** Variáveis de ambiente `NEXT_PUBLIC_*` são compiladas no build time!

**Opção A: Redeploy no Vercel (Mais Rápido)**

1. **Acesse o projeto `paineladm` no Vercel**
2. **Vá em Deployments**
3. **Clique nos 3 pontos (⋯) do último deployment**
4. **Selecione "Redeploy"**
5. **Aguarde o deploy terminar** (1-2 minutos)

**Opção B: Novo Commit/Push (Recomendado)**

1. **Faça um pequeno commit** (pode ser só um espaço em branco)
2. **Push para o repositório**
3. **O Vercel vai fazer deploy automático**

```bash
git add .
git commit -m "chore: trigger deploy para aplicar variáveis de ambiente"
git push
```

### 2. Limpar Cache do Navegador

**No navegador:**

1. **Pressione:** `Ctrl + Shift + R` (Windows/Linux) ou `Cmd + Shift + R` (Mac)
   - Isso força um reload sem cache

2. **Ou limpe o cache manualmente:**
   - Chrome: `Ctrl + Shift + Delete` → Limpar dados de navegação
   - Firefox: `Ctrl + Shift + Delete` → Limpar cache

3. **Ou use modo anônimo:**
   - `Ctrl + Shift + N` (Chrome) ou `Ctrl + Shift + P` (Firefox)
   - Teste se as alterações aparecem

### 3. Verificar Variáveis de Ambiente

**No Vercel:**

1. **Vá em Settings → Environment Variables**
2. **Verifique se as variáveis estão configuradas:**
   - `NEXT_PUBLIC_MODELO_1_URL=https://app1.experimenteai.com.br`
   - `NEXT_PUBLIC_MODELO_2_URL=https://app2.experimenteai.com.br`
   - `NEXT_PUBLIC_MODELO_3_URL=https://app3.experimenteai.com.br`

3. **Verifique o ambiente:**
   - Deve estar marcado para **"Production"** ✅
   - Se também usar Preview/Development, marque também

### 4. Verificar se o Deploy Incluiu as Variáveis

**No Vercel:**

1. **Vá em Deployments**
2. **Clique no deployment mais recente**
3. **Vá em "Settings" ou "Build Logs"**
4. **Verifique se as variáveis foram aplicadas**

---

## 🔍 Diagnóstico

### Teste 1: Verificar no Console do Navegador

1. **Abra o Painel Adm**
2. **Pressione F12** (abre DevTools)
3. **Vá na aba "Console"**
4. **Digite:**
   ```javascript
   console.log(process.env.NEXT_PUBLIC_MODELO_1_URL)
   ```
5. **Deve mostrar:** `https://app1.experimenteai.com.br`

⚠️ **Nota:** No Next.js, variáveis `NEXT_PUBLIC_*` são expostas ao cliente, mas só após o build.

### Teste 2: Verificar a URL Gerada

1. **Acesse o Painel Adm**
2. **Vá em "Aplicativo Cliente"**
3. **Verifique os links mostrados:**
   - Devem mostrar: `https://app1.experimenteai.com.br/{lojistaId}/login`
   - **NÃO** devem mostrar: `localhost:3004` ou URL antiga

### Teste 3: Verificar Build Logs

1. **No Vercel → Deployments → Último deployment**
2. **Clique em "Build Logs"**
3. **Procure por erros ou avisos**
4. **Verifique se o build foi bem-sucedido**

---

## 🐛 Problemas Comuns

### ❌ Links ainda mostram localhost

**Causa:** Variáveis de ambiente não foram aplicadas no build

**Solução:**
1. Verifique se as variáveis estão no Vercel
2. Faça um novo deploy
3. Limpe o cache do navegador

### ❌ Links mostram URL antiga

**Causa:** Cache do navegador ou build antigo

**Solução:**
1. Faça um novo deploy
2. Limpe o cache (`Ctrl + Shift + R`)
3. Teste em modo anônimo

### ❌ Variáveis não aparecem no console

**Causa:** Variáveis não foram compiladas no build

**Solução:**
1. Verifique se as variáveis estão configuradas no Vercel
2. Verifique se estão marcadas para "Production"
3. Faça um novo deploy
4. Aguarde o build terminar completamente

### ❌ Deploy falha

**Causa:** Erro no build ou configuração

**Solução:**
1. Verifique os Build Logs no Vercel
2. Procure por erros
3. Verifique se há problemas de sintaxe no código
4. Tente fazer um commit pequeno e push novamente

---

## ✅ Checklist de Verificação

- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] Variáveis marcadas para "Production"
- [ ] Novo deploy foi feito após adicionar variáveis
- [ ] Build foi bem-sucedido (status "Ready")
- [ ] Cache do navegador foi limpo
- [ ] Testei em modo anônimo
- [ ] Links mostram os subdomínios corretos
- [ ] Console do navegador mostra as variáveis corretas

---

## 🚀 Solução Rápida (Resumo)

1. **Vercel → paineladm → Deployments → Redeploy**
2. **Aguarde 1-2 minutos**
3. **Navegador → Ctrl + Shift + R** (limpar cache)
4. **Teste novamente**

---

## 📝 Nota Técnica

No Next.js, variáveis `NEXT_PUBLIC_*` são:
- **Compiladas no build time** (não runtime)
- **Expostas ao cliente** (podem ser acessadas no browser)
- **Incluídas no bundle JavaScript**

Por isso, **sempre** é necessário fazer um novo deploy após adicionar/alterar variáveis de ambiente.

---

**Se ainda não funcionar após seguir todos os passos, me avise que investigo mais!** 🔍

