# 📝 Exemplo de Variáveis de Ambiente para Subdomínios

Copie estas variáveis para o arquivo `.env.local` (desenvolvimento) ou configure no Vercel (produção).

## 🔧 Variáveis de Ambiente

### Produção (Vercel)

```env
# URLs dos Modelos com Subdomínios Profissionais
NEXT_PUBLIC_MODELO_1_URL=https://app1.experimenteai.com.br
NEXT_PUBLIC_MODELO_2_URL=https://app2.experimenteai.com.br
NEXT_PUBLIC_MODELO_3_URL=https://app3.experimenteai.com.br

# Backend
NEXT_PUBLIC_BACKEND_URL=https://www.experimenteai.com.br
NEXT_PUBLIC_PAINELADM_URL=https://www.experimenteai.com.br
```

### Desenvolvimento Local

```env
# Portas para Desenvolvimento Local
NEXT_PUBLIC_MODELO_1_PORT=3004
NEXT_PUBLIC_MODELO_2_PORT=3005
NEXT_PUBLIC_MODELO_3_PORT=3010

# Backend Local
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_PAINELADM_URL=http://localhost:3000
```

## 📋 Como Usar

### No Vercel

1. Acesse o projeto **paineladm** no Vercel
2. Vá em **Settings → Environment Variables**
3. Adicione as variáveis de **Production**
4. Faça um novo deploy

### Localmente

1. Crie um arquivo `.env.local` na raiz do projeto `paineladm`
2. Cole as variáveis de desenvolvimento
3. Reinicie o servidor de desenvolvimento

## ✅ Verificação

Após configurar, os links no painel administrativo devem aparecer como:
- `https://app1.experimenteai.com.br/{lojistaId}/login`
- `https://app2.experimenteai.com.br/{lojistaId}/login`
- `https://app3.experimenteai.com.br/{lojistaId}/login`


