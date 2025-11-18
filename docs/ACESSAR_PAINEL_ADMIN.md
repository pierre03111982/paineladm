# 🔐 Como Acessar o Painel Administrativo

## 📍 URLs de Acesso

### Produção (Vercel):
- **Dashboard Admin:** https://paineladm-gn1qhfwea-pierre03111982s-projects.vercel.app/admin
- **Gerenciar Lojistas:** https://paineladm-gn1qhfwea-pierre03111982s-projects.vercel.app/admin/lojistas
- **Gerenciar Planos:** https://paineladm-gn1qhfwea-pierre03111982s-projects.vercel.app/admin/planos

### Local (Desenvolvimento):
- **Dashboard Admin:** http://localhost:3000/admin
- **Gerenciar Lojistas:** http://localhost:3000/admin/lojistas
- **Gerenciar Planos:** http://localhost:3000/admin/planos

---

## 🎯 Funcionalidades do Painel Administrativo

### 1. **Dashboard Administrativo** (`/admin`)
Visão geral completa da plataforma:

- **KPIs de Custo:**
  - Total de custos de API (USD)
  - Custos de Try-On (Vertex AI)
  - Custos de Imagen 3
  - Gráfico de tendência de custos (7 dias)

- **KPIs de Receita:**
  - MRR (Monthly Recurring Revenue)
  - Total de lojistas ativos
  - Distribuição por planos (Pro, Lite, Free)
  - Gráfico de tendência de receita (7 dias)

- **Widgets:**
  - Top 5 lojistas por uso (custo e composições)
  - Lojistas pendentes de pagamento
  - Novos cadastros (últimos 7 dias)

### 2. **Gerenciamento de Lojistas** (`/admin/lojistas`)
Gerencie todos os lojistas da plataforma:

- Visualizar todos os lojistas cadastrados
- Ver informações de cada lojista:
  - Nome e email
  - Plano atual (Free, Lite, Pro)
  - Status de pagamento
  - Data de vencimento
  - Status (ativo, pendente, suspenso)
  - Limite de imagens
  - Imagens geradas no mês
- Aprovar ou suspender lojistas
- Alterar planos dos lojistas
- Gerenciar status de pagamento

### 3. **Gerenciamento de Planos** (`/admin/planos`)
Crie e edite planos de assinatura:

- Visualizar todos os planos disponíveis:
  - **Free:** R$ 0,00 - 10 imagens/mês
  - **Lite:** R$ 99,00 - 500 imagens/mês
  - **Pro:** R$ 299,00 - 5000 imagens/mês
- Criar novos planos
- Editar planos existentes
- Ativar/desativar planos
- Definir limites de imagens por plano
- Definir preços

### 4. **Configurações** (`/admin/configuracoes`)
*Em desenvolvimento*

---

## 🚀 Como Acessar

### Método 1: Acesso Direto pela URL
1. Abra o navegador
2. Acesse: `https://paineladm-gn1qhfwea-pierre03111982s-projects.vercel.app/admin`
3. Você verá o Dashboard Administrativo

### Método 2: Navegação pelo Menu
1. Acesse o painel do lojista: `/login`
2. Após fazer login, você pode acessar `/admin` diretamente pela URL

---

## ✅ Autenticação Implementada

**O painel administrativo agora possui autenticação completa!**

### Proteções Implementadas:

1. ✅ **Middleware:** Protege todas as rotas `/admin/*` no nível do servidor
2. ✅ **Verificação Server-Side:** Cada página admin verifica permissões
3. ✅ **Verificação Client-Side:** Componente `AdminRouteGuard` verifica no cliente
4. ✅ **Redirecionamento:** Usuários não autorizados são redirecionados para login
5. ✅ **Cookies Seguros:** Tokens armazenados em cookies httpOnly

### Como Funciona:

- Ao tentar acessar `/admin`, você será redirecionado para `/login?admin=true`
- Faça login com um email que está na lista de admins
- O sistema verifica se o email tem permissão de admin
- Se autorizado, você acessa o painel administrativo

### Configuração Necessária:

Veja o arquivo `CONFIGURAR_ADMIN.md` para configurar os emails admin.

---

## 📊 APIs Disponíveis

O painel administrativo usa as seguintes APIs:

### Lojistas:
- `GET /api/admin/lojistas` - Listar todos os lojistas
- `PATCH /api/admin/lojistas/[lojistaId]` - Atualizar lojista

### Planos:
- `GET /api/admin/planos` - Listar todos os planos
- `POST /api/admin/planos` - Criar novo plano
- `PATCH /api/admin/planos/[planoId]` - Atualizar plano

---

## 🔧 Estrutura de Dados

### Lojista:
```typescript
{
  id: string;
  nome: string;
  email: string;
  planoAtual: "free" | "lite" | "pro";
  statusPagamento: "pendente" | "pago" | "atrasado";
  dataVencimento: Date | null;
  status: "ativo" | "pendente" | "suspenso";
  limiteImagens: number;
  imagensGeradasMes: number;
}
```

### Plano:
```typescript
{
  id: string;
  nome: string;
  preco: number;
  limiteImagens: number;
  descricao: string;
  ativo: boolean;
}
```

---

## 📝 Próximos Passos Recomendados

1. **Implementar Autenticação Admin:**
   - Criar middleware de proteção
   - Verificar permissões de admin
   - Redirecionar não autorizados

2. **Adicionar Funcionalidades:**
   - Exportar relatórios
   - Filtros avançados
   - Busca de lojistas
   - Histórico de alterações

3. **Melhorar Dashboard:**
   - Gráficos mais detalhados
   - Filtros por período
   - Exportação de dados

---

## 🆘 Troubleshooting

### Erro ao carregar dashboard:
- Verifique se as variáveis de ambiente do Firebase estão configuradas
- Verifique se o Firebase Admin SDK está funcionando
- Verifique os logs do console do navegador (F12)

### Dados não aparecem:
- Verifique se há lojistas cadastrados no Firestore
- Verifique se a coleção `lojas` existe no Firestore
- Verifique se a coleção `planos` existe no Firestore

### Erro 500 nas APIs:
- Verifique os logs da Vercel
- Verifique se as variáveis de ambiente estão corretas
- Verifique se o Firebase Admin SDK está configurado

---
Login unificado: 

https://paineladm-9tq8dtt2u-pierre03111982s-projects.vercel.app/login

Gerenciamento de usuários:

https://paineladm-9tq8dtt2u-pierre03111982s-projects.vercel.app/admin/usuarios

Painel admin: 

https://paineladm-9tq8dtt2u-pierre03111982s-projects.vercel.app/admin








*Última atualização: $(date)*

