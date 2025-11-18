Fase 2: Funcionalidades do Painel do Lojista

Este é o produto que estamos vendendo. Ele precisa ser intuitivo e focado em gerar vendas para o lojista.

1. Stack Visual (Frontend desta Fase)

Framework: React (ou Next.js).

Estilização: Tailwind CSS.

Componentes: shadcn/ui (Para botões, tabelas, modais, formulários, abas).

Gráficos (KPIs): Recharts.

Ícones: Lucide React.

Banco de Dados (Cliente): firebase (Para ler e escrever dados do lojista).

2. Login

Página de login simples (Email/Senha) usando componentes shadcn/ui.

Redireciona para o Dashboard se o usuário tiver o role: 'lojista'.

3. Dashboard (Foco em Conversão)

O Lojista deve ver imediatamente o valor do serviço.

Branding: A Logomarca do Lojista (puxada do Firestore) deve aparecer no topo do painel.

KPI Principal: Total de "Experimentações" (composições geradas) hoje / últimos 7 dias / mês (Usar Recharts).

KPI Secundário: "Produtos Mais Provados" (Gráfico de pizza ou lista com Recharts).

KPI Terciário: "Clientes Mais Ativos" (Lista de clientes que mais geraram imagens).

KPI de Engajamento: "Total de Composições Curtidas" (Contagem de curtido == true).

Widget Principal: "Galeria de Composições Recentes" (Mostra as últimas 5-10 imagens VTON geradas pelos clientes, com destaque visual para as curtidas).

Ação Rápida: "Enviar Promoção via WhatsApp" (Botão de atalho).

4. Gerenciamento de Produtos (CRUD Completo)

O Lojista precisa de controle total sobre seu inventário virtual.

Cadastro Manual:

Botão "Adicionar Produto Manualmente".

Abre um Modal (shadcn/ui) com um formulário para preencher os campos: Upload de Imagem, Nome, Preço, Tamanhos, Cores, Observações.

Cadastro em Massa (Upload):

Botão "Importar Produtos".

Opções de importação (usar Abas shadcn/ui):

Upload de CSV/Planilha: O Lojista baixa um modelo (.csv) e faz o upload. O backend lê o arquivo e cria os produtos em lote.

Sincronização com E-commerce (Avançado): Conexão com APIs de plataformas (ex: Shopify, Nuvemshop).

Visualização: Galeria de cards de produtos (com botões de "Editar" e "Excluir").

5. Galeria de Composições (O "Ouro")

O Lojista precisa ver o que seus clientes estão criando.

Visualização: Uma galeria de todas as imagens geradas (VTON e Cenários).

Destaque de Curtida: Exibir um ícone de coração (❤️ Lucide React) proeminente nos cards das imagens onde curtido == true.

Filtros: Poder filtrar por Cliente, Produto, Data e "Apenas Curtidas".

Ações por Imagem:

Visualizar: Ver a imagem em tamanho real.

Enviar via WhatsApp: (Ação principal) Abrir um modal para enviar a imagem (ou imagens) para o WhatsApp do cliente.

6. Gerenciamento de Clientes

Uma Tabela (shadcn/ui) simples listando todos os clientes que se cadastraram (/lojas/{lojistaId}/clientes).

Colunas: Nome, WhatsApp, Data de Cadastro, Total de Imagens Geradas.

7. Configurações e Integração

Upload de Logomarca:

Campo para o Lojista fazer o upload do seu logo (Salva em logoUrl).

Integração API WhatsApp (Mensagens):

Campo para credenciais de API (para envio de promoções e imagens).

Configuração de Redes Sociais:

Campo para URLs de Instagram, Facebook, TikTok.

Templates de Mensagem:

Campo para customizar a mensagem de envio de promoções.

Configurações de Venda (Checkout):

Título: "Como você deseja que seus clientes comprem?"

Opção 1 (Radio): "Redirecionar para o WhatsApp de Vendas"

Campo: "Número do WhatsApp de Vendas" (Salva em salesConfig.salesWhatsapp)

Opção 2 (Radio): "Redirecionar para um Link (E-commerce)"

Campo: "URL do seu site ou link de checkout" (Salva em salesConfig.checkoutLink)

O Lojista seleciona um como salesConfig.channel principal.