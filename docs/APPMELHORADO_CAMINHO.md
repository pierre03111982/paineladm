# 📁 Caminho do appmelhorado

## ✅ Caminho Oficial

O projeto **appmelhorado** está localizado em:

```
E:\projetos\appmelhorado\
```

## 🚀 Como Usar

### Desenvolvimento Local

```bash
cd E:\projetos\appmelhorado
npm run dev
```

O app estará disponível em: `http://localhost:3000`

### Deploy para Produção

```bash
cd E:\projetos\appmelhorado
vercel --prod
```

## 📝 Notas

- Este é o **único** projeto appmelhorado ativo
- Todas as referências devem apontar para `E:\projetos\appmelhorado\`
- O projeto está configurado para rodar na porta 3000 por padrão
- Para usar no simulador, acesse: `http://localhost:3000/[lojistaId]?simulator=1&backend=http://localhost:3000`

## 🔗 Integração com paineladm

O paineladm (em `E:\projetos\paineladm\`) se comunica com o appmelhorado via:
- API `/api/simulator/data` (no paineladm)
- URLs configuradas em `src/lib/client-app.ts`


