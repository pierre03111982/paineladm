MASTER PROMPT: IMPLEMENTAÇÃO DA SUITE "SALES INTELLIGENCE" (IA CONSULTIVA)
CONTEXTO DO PROJETO: Estamos evoluindo o paineladm (Next.js + Firebase + Tailwind) do projeto "Experimenta AI". Atualmente, usamos a IA apenas para gerar imagens. O novo objetivo é implementar uma Camada de Inteligência de Vendas ativa, onde a IA analisa dados de clientes e produtos para gerar insights proativos (texto/análise) para o lojista.

ARQUITETURA EXISTENTE (REFERÊNCIA):

Diretórios: src/app/(lojista)/... (Rotas protegidas do lojista)

Libs: src/lib/firestore (Acesso a dados), src/lib/ai-services (Lógica Gemini)

Coleções Principais: lojas/{id}/clientes, lojas/{id}/produtos, lojas/{id}/composicoes.

PLANO DE EXECUÇÃO SEQUENCIAL
Por favor, execute a implementação seguindo estritamente as fases abaixo. Não pule etapas.

FASE 1: INFRAESTRUTURA DE DADOS (BACKEND)
Objetivo: Criar a capacidade de processar texto com Gemini e salvar os resultados.

Novo Serviço de IA (Texto):

Crie src/lib/ai-services/gemini-text.ts.

Implemente uma classe GeminiTextService usando o modelo gemini-1.5-flash (ou pro).

Método principal: generateInsight(prompt: string, contextData: any): Promise<InsightResult>.

O retorno deve ser sempre um JSON estruturado, não texto livre.

Tipagem de Dados:

Crie src/types/insights.ts.

Defina a interface InsightDoc:

TypeScript

export type InsightType = 'opportunity' | 'risk' | 'trend' | 'action';
export type InsightPriority = 'high' | 'medium' | 'low';

export interface InsightDoc {
  id: string;
  lojistaId: string;
  type: InsightType;
  title: string;
  message: string;
  priority: InsightPriority;
  relatedEntity?: { type: 'client' | 'product', id: string, name: string };
  actionLabel?: string; // Ex: "Enviar WhatsApp", "Ver Produto"
  actionLink?: string;  // Deep link
  isRead: boolean;
  createdAt: Date; // Firestore Timestamp
  expiresAt: Date;
}
Nova Coleção Firestore:

Defina os paths para a coleção lojas/{lojistaId}/insights.

Crie funções em src/lib/firestore/insights.ts para: createInsight, getUnreadInsights, markAsRead.

FASE 2: UI - O "CÉREBRO DA LOJA" (DASHBOARD)
Objetivo: Exibir os insights gerados na tela principal.

Local: src/app/(lojista)/dashboard/page.tsx

Novo Componente: src/components/dashboard/AIInsightsFeed.tsx.

Layout:

Inserir no topo do Dashboard (antes dos gráficos).

Estilo "Carrossel de Cards" ou "Lista de Notificações Inteligentes".

Use ícones para diferenciar prioridade (🔴 Alta, 🟡 Média, 🔵 Baixa).

Botão de ação direta no card (ex: Se for actionLabel: "Enviar Whats", abrir link do WhatsApp).

Mock Data: Para testar visualmente, crie um array de insights fictícios se a coleção estiver vazia.

FASE 3: UI - DOSSIÊ DO CLIENTE
Objetivo: Analisar o perfil comportamental do cliente.

Local: src/app/(lojista)/clientes/[clienteId]/page.tsx

Novo Componente: src/components/clients/ClientStyleProfile.tsx.

Lógica de Análise (Prompt do Gemini):

Criar função que lê historicoTentativas  e likes do cliente.

Prompt: "Analise as roupas que o cliente deu like. Defina o estilo (ex: Romântico, Urbano). Identifique risco de churn (dias sem acesso)."

Layout:

Adicionar como uma aba ou card lateral na página de detalhes.

Exibir:

"Moodboard Verbal": Descrição textual do estilo.

"Termômetro de Interesse": Score calculado baseado na frequência recente.

"Recomendação de Ouro": Sugerir 1 produto do estoque atual que combine com os likes anteriores.

FASE 4: UI - FEEDBACK DE PRODUTO
Objetivo: Explicar por que um produto não vende.

Local: src/app/(lojista)/produtos/[productId]/page.tsx

Novo Componente: src/components/products/ProductPerformanceAI.tsx.

Lógica:

Ler métricas existentes: complaintRate e conversionRate.

Se complaintRate > 20% ou dislikes altos, acionar análise.

Layout:

Card de alerta na edição do produto: "Diagnóstico da IA".

Exemplo de msg: "Este produto tem alta rejeição em simulações. A IA detectou que o caimento virtual está distorcido. Recomendação: Trocar a foto original por uma em manequim invisível."

INSTRUÇÕES FINAIS PARA O CURSOR
Analise o código atual para manter a consistência visual (Tailwind, cores, bordas).

Comece pela FASE 1. Só avance para a FASE 2 quando a infraestrutura de dados estiver pronta.

Ao criar componentes UI, verifique se eles são responsivos (Mobile first).

Não apague nenhuma funcionalidade existente; apenas adicione/estenda.

Pode iniciar a execução da FASE 1 agora.