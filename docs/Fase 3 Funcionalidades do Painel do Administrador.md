Fase 3: Funcionalidades do Painel do Administrador (ADM)

Este é o painel de controle do negócio "Experimente AI". O ADM precisa de controle total sobre os Lojistas e visibilidade total dos custos.

1. Stack Visual (Frontend desta Fase)

Framework: React (ou Next.js).

Estilização: Tailwind CSS.

Componentes: shadcn/ui (Especialmente Table, Badge, Button, Dialog).

Gráficos (KPIs): Recharts.

Ícones: Lucide React.

Banco de Dados (Admin): firebase (Para ler/escrever dados) e firebase-admin (no backend, para criar/editar Lojistas).

2. Login

Página de login (Email/Senha).

Redireciona para o Dashboard ADM se o usuário tiver o role: 'admin'.

3. Dashboard ADM (Foco em Custo e Receita)

Branding: Logo "Experimente AI" no topo.

KPIs de Custo:

Total de Imagens VTON Geradas (Google) (Custo Total = Total * US$ 0,04).

Total de Imagens Personalizadas (Vertex Imagen 3) (Custo Total = Total * US$ 0,04).

Custo Total de API (SOMA).

Usar Recharts para mostrar o gráfico de Custo vs. Tempo.

KPIs de Receita:

Total de Lojistas (por Plano: "pro", "lite", "free").

Receita Mensal Recorrente (MRR).

Usar Recharts para mostrar o gráfico de Receita vs. Tempo.

Widgets:

"Lojistas com maior uso de API".

"Lojistas pendentes de pagamento".

"Novos cadastros de Lojistas (aguardando aprovação)".

4. Gerenciamento de Lojistas (CRUD Completo)

O ADM controla quem usa a plataforma.

Visualização: Uma Tabela (shadcn/ui) de todos os lojistas cadastrados, incluindo logoUrl, email, planoAtual, statusPagamento.

Ações:

Aprovar/Rejeitar novos cadastros de Lojistas.

Suspender/Ativar conta de Lojista (Botão Switch do shadcn/ui).

Editar Lojista (em um Dialog shadcn/ui):

Definir o planoAtual (ex: "pro").

Definir o limiteImagens (ex: 5000).

Atualizar statusPagamento (ex: "pago", "pendente").

Definir dataVencimento.

5. Gerenciamento de Planos (Pacotes de Serviços)

Interface para o ADM criar ou editar os planos de assinatura (ex: "Lite", "Pro", "Volume+"), definindo o limiteImagens e o preço de cada um.