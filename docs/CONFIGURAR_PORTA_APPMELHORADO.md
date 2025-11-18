# 🔧 Configurar Porta do appmelhorado

## 📋 Problema

Se o `appmelhorado` estiver rodando em uma porta diferente de 3001, o simulador não conseguirá acessá-lo.

## ✅ Solução

Adicione a variável de ambiente `NEXT_PUBLIC_APPMELHORADO_PORT` no arquivo `.env.local` do `paineladm`:

```env
NEXT_PUBLIC_APPMELHORADO_PORT=3002
```

**Ou** configure a URL completa:

```env
NEXT_PUBLIC_CLIENT_APP_URL=http://localhost:3002
```

## 📝 Passo a Passo

1. Abra o arquivo `.env.local` em `E:\projetos\paineladm\.env.local`
2. Adicione uma das linhas acima (use a porta que o appmelhorado está usando)
3. Reinicie o servidor do paineladm:
   ```bash
   cd E:\projetos\paineladm
   npm run dev
   ```

## 🔍 Como Descobrir a Porta

Verifique no terminal onde o `appmelhorado` está rodando. Você verá algo como:

```
▲ Next.js 14.2.6
Local: http://localhost:3002
```

Use essa porta na variável de ambiente.

## 💡 Nota

- Se não configurar, o padrão será `3001`
- A variável `NEXT_PUBLIC_CLIENT_APP_URL` tem prioridade sobre `NEXT_PUBLIC_APPMELHORADO_PORT`
- Em produção, use `NEXT_PUBLIC_CLIENT_APP_URL` com a URL completa do domínio


