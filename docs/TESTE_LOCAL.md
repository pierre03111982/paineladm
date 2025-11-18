# 🧪 Guia de Teste Local

## ✅ Servidor Local

O servidor de desenvolvimento está configurado para rodar na porta **3000**.

### Acessar o Painel

1. **URL Principal**: http://localhost:3000
2. **Página de Login**: http://localhost:3000/login
3. **Simulador**: http://localhost:3000/simulador
4. **Display**: http://localhost:3000/display
5. **Compartilhamento**: http://localhost:3000/compartilhamento

### Verificar se está rodando

Abra o terminal e verifique se aparece:
```
✓ Ready
Local:    http://localhost:3000
```

Se aparecer uma porta diferente (ex: 3001, 3002), acesse essa porta.

## 🎨 O que testar

### 1. Página do Simulador
- [ ] Botão "Abrir Simulador em Nova Janela" funciona
- [ ] QR Code é gerado corretamente
- [ ] Texto explicativo está visível
- [ ] Layout responsivo (teste em mobile)

### 2. Página do Display
- [ ] QR Code do display funciona
- [ ] Link do display está correto
- [ ] Layout está organizado

### 3. Página de Compartilhamento
- [ ] QR Code de compartilhamento funciona
- [ ] Links estão corretos
- [ ] Botões de download funcionam

## 🚀 Quando estiver pronto para deploy

Após testar e aprovar, você pode fazer o deploy manual:

### Opção 1: Via Vercel CLI
```bash
cd E:\projetos\paineladm
vercel --prod
```

### Opção 2: Via Dashboard Vercel
1. Acesse https://vercel.com/dashboard
2. Selecione o projeto `paineladm`
3. Clique em "Deployments"
4. Clique nos três pontos do último deployment
5. Selecione "Redeploy"

## ⚠️ Importante

- **NÃO** faça deploy automático agora (para não exceder limite)
- Teste todas as páginas antes de fazer deploy
- Verifique se as variáveis de ambiente estão configuradas no Vercel

## 🔧 Comandos úteis

### Parar o servidor
```powershell
# Pressione Ctrl+C no terminal onde está rodando
# OU
taskkill /F /IM node.exe
```

### Reiniciar o servidor
```powershell
cd E:\projetos\paineladm
npm run dev
```

### Verificar porta em uso
```powershell
netstat -ano | findstr :3000
```

