# ✅ Links Atualizados para Subdomínio de Display

## 🎯 O que foi feito:

Todos os links de display foram atualizados para usar o subdomínio `display.experimenteai.com.br`.

---

## 📝 Arquivos Modificados:

### 1. `src/lib/client-app.ts`
- ✅ Função `buildClientAppDisplayUrl()` já usava o subdomínio
- ✅ Adicionado suporte opcional ao parâmetro `targetDisplayId` (Fase 10)

### 2. `src/app/(lojista)/display/display-link-panel.tsx`
- ✅ Fallback atualizado para usar `display.experimenteai.com.br` em vez de `app2.experimenteai.com.br`

### 3. `src/app/(lojista)/display/page.tsx`
- ✅ Fallback atualizado para usar `display.experimenteai.com.br` em vez de `app2.experimenteai.com.br`

---

## 🔧 Variáveis de Ambiente Necessárias:

No projeto **paineladm** na Vercel, configure:

```bash
NEXT_PUBLIC_DISPLAY_DOMAIN=display.experimenteai.com.br
NEXT_PUBLIC_DISPLAY_PROTOCOL=https
```

---

## ✅ Como Funciona:

1. **Função Principal:** `buildClientAppDisplayUrl(lojistaId, targetDisplayId?)`
   - Em **produção**: Usa `https://display.experimenteai.com.br`
   - Em **desenvolvimento**: Usa `http://localhost:3005`

2. **Geração de QR Code:**
   - Os QR codes gerados no paineladm agora apontam para o subdomínio de display
   - URL gerada: `https://display.experimenteai.com.br/[lojistaId]/experimentar?display=1`

3. **Middleware:**
   - O middleware no `apps-cliente/modelo-2` detecta automaticamente o subdomínio
   - Adiciona `?display=1` automaticamente

---

## 🚀 Próximos Passos:

1. ✅ Adicionar variável `NEXT_PUBLIC_DISPLAY_DOMAIN` no paineladm (Vercel)
2. ✅ Fazer redeploy do paineladm
3. ✅ Testar geração de QR code no painel
4. ✅ Verificar se os links gerados estão corretos

---

## 🧪 Como Testar:

1. Acesse o paineladm em produção
2. Vá em **Display da Loja**
3. Verifique o link gerado - deve ser: `https://display.experimenteai.com.br/[lojistaId]/experimentar?display=1`
4. Escaneie o QR code e verifique se abre no subdomínio correto

---

**Data da atualização:** $(date)
**Status:** ✅ Concluído
















