# 📊 Guia de Monitoramento - Experimente AI

Este documento descreve como configurar monitoramento básico para a aplicação em produção.

---

## 1. Métricas Essenciais

### 1.1 Aplicação
- **Uptime**: Disponibilidade da aplicação
- **Tempo de Resposta**: Latência das requisições
- **Taxa de Erro**: Porcentagem de requisições com erro
- **Throughput**: Requisições por segundo

### 1.2 APIs Externas
- **Vertex AI**: Custos e quota
- **Stability.ai**: Custos e quota
- **Firebase**: Uso de Firestore e Storage

### 1.3 Negócio
- **Total de Composições Geradas**: Por dia/semana/mês
- **Total de Lojistas Ativos**: Crescimento
- **MRR**: Receita mensal recorrente
- **Custo Total de API**: Por período

---

## 2. Ferramentas Recomendadas

### 2.1 Vercel Analytics (Se usar Vercel)
- ✅ Já incluído no plano
- ✅ Métricas de performance automáticas
- ✅ Análise de uso

**Configuração:**
```typescript
// next.config.ts
const nextConfig = {
  // Vercel Analytics já está habilitado automaticamente
}
```

### 2.2 Google Cloud Monitoring
- ✅ Integração nativa com Vertex AI
- ✅ Métricas de custo
- ✅ Alertas configuráveis

**Configuração:**
1. Acesse Google Cloud Console
2. Vá em Monitoring > Dashboards
3. Crie dashboards personalizados

### 2.3 Sentry (Tracking de Erros)
- ✅ Captura erros em produção
- ✅ Stack traces completos
- ✅ Notificações em tempo real

**Instalação:**
```bash
npm install @sentry/nextjs
```

**Configuração:**
```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### 2.4 LogRocket (Sessões de Usuário)
- ✅ Gravação de sessões
- ✅ Debug de problemas
- ✅ Análise de UX

---

## 3. Alertas Recomendados

### 3.1 Críticos (Imediato)
- Aplicação offline
- Taxa de erro > 5%
- Tempo de resposta > 5s
- Quota de API > 90%

### 3.2 Importantes (1 hora)
- Taxa de erro > 2%
- Tempo de resposta > 2s
- Quota de API > 75%

### 3.3 Informativos (Diário)
- Relatório diário de métricas
- Resumo de custos
- Novos cadastros

---

## 4. Dashboards Recomendados

### 4.1 Dashboard Operacional
- Uptime
- Tempo de resposta
- Taxa de erro
- Requisições por segundo

### 4.2 Dashboard de Negócio
- Total de composições
- Total de lojistas
- MRR
- Custo de API

### 4.3 Dashboard de Custos
- Custo por provider (Vertex AI, Stability.ai)
- Custo por lojista
- Projeção de custos

---

## 5. Logs

### 5.1 Estrutura de Logs
Use logs estruturados para facilitar análise:

```typescript
console.log(JSON.stringify({
  level: "info",
  timestamp: new Date().toISOString(),
  service: "api",
  endpoint: "/api/lojista/composicoes/generate",
  lojistaId: "...",
  duration: 1234,
  status: "success"
}));
```

### 5.2 Níveis de Log
- **ERROR**: Erros que precisam atenção
- **WARN**: Avisos importantes
- **INFO**: Informações gerais
- **DEBUG**: Debug detalhado (apenas desenvolvimento)

---

## 6. Backup e Recuperação

### 6.1 Firestore
- Configure backup automático no Firebase Console
- Frequência: Diária
- Retenção: 30 dias

### 6.2 Storage
- Configure versionamento no Firebase Storage
- Configure lifecycle policies

---

## 7. Checklist de Monitoramento

- [ ] Uptime monitorado
- [ ] Alertas configurados
- [ ] Dashboards criados
- [ ] Logs estruturados
- [ ] Backup automático configurado
- [ ] Métricas de custo monitoradas
- [ ] Notificações configuradas

---

*Para mais detalhes sobre cada ferramenta, consulte a documentação oficial.*































