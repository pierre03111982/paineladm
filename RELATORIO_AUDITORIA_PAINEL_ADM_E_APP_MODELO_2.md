# Relatório de Auditoria — Painel ADM e App Modelo 2

**Data:** 07/02/2026  
**Escopo:** Funcionalidades completas do Painel Experimente AI (lojista e admin) e do App Cliente Modelo 2, por aba e recurso.

---

## Índice

1. [Visão geral](#1-visão-geral)
2. [Painel ADM — Área do Lojista (por aba)](#2-painel-adm--área-do-lojista-por-aba)
3. [Painel ADM — Área Admin (super-admin)](#3-painel-adm--área-admin-super-admin)
4. [App Cliente Modelo 2 — Funcionalidades](#4-app-cliente-modelo-2--funcionalidades)
5. [APIs e integrações técnicas (resumo)](#5-apis-e-integrações-técnicas-resumo)

---

## 1. Visão geral

| Sistema | Descrição |
|--------|-----------|
| **Painel ADM** | Aplicação Next.js para **lojistas** (gestão de produtos, clientes, pedidos, display, IA para catálogo e vídeo) e para **administradores** (lojistas, planos, custos, super-admin). |
| **App Modelo 2** | Aplicação cliente (PWA) onde o **consumidor** faz login, experimenta looks com IA (upload de foto + produtos), curte/compartilha, envia para display e pode finalizar compra. |

---

## 2. Painel ADM — Área do Lojista (por aba)

As abas do menu lateral são definidas em `nav-items.ts`. Abaixo, o que cada uma **oferece** e **faz**.

---

### 2.1 Dashboard

- **Rota:** `/dashboard`
- **O que oferece:**
  - Visão geral da loja: experimentações, clientes ativos, produtos, indicadores financeiros.
  - Gráficos (área, linha, pizza, barras): experimentações ao longo do tempo, breakdown de produtos, clientes ativos.
  - **Feed de Insights IA:** insights gerados por IA com links para produtos, clientes e ações (ex.: “Cliente X curtiu look com Produto Y”).
  - **Prévia do Display 9:16:** carrossel dos produtos marcados “Exibir no display” (imagem Modelo Frente + vídeo quando houver), com dots de navegação; intervalo maior quando o slide tem vídeo.
  - **Widget financeiro:** créditos, uso de pack catálogo, métricas.
  - **Mini gráficos** e cards de métricas (favoritos, compartilhamentos, conversões).
  - Links rápidos para Clientes, Produtos, Pedidos.

---

### 2.2 Produtos

- **Rotas:** `/produtos` (listagem), `/produtos/novo`, `/produtos/[id]/editar`
- **O que oferece:**
  - **Listagem:** tabela de produtos com filtros, busca, galeria de imagens (prioridade Modelo Frente), vídeo no segundo slide quando existir, badge “IA” em mídia gerada por IA.
  - **Cadastro/Edição:** formulário completo (nome, SKU, categoria, tipo, tags, estoque, grade, preço, ativar no site, exibir no display, etc.).
  - **Importação de catálogo** (modal).
  - **Análise IA integrada (no editor):**
    - Upload de foto(s) do produto → análise via API (`/api/lojista/products/analyze`).
    - Preenchimento automático: nome sugerido, categoria, tipo de produto, tags, detalhes, cor predominante, tecido estimado.
    - Medidas inteligentes por público (feminino/masculino/kids) e faixa (P/M, G/GG, etc.) quando aplicável.
  - **Estúdio Criativo (IA) — Catálogo de fotos:**
    - **Slot 1 – Foto Frente (Ghost Mannequin):** geração a partir da “Foto Frente” do upload → imagem 9:16, fundo branco, manequim transparente (Ghost Mannequin Hero 3D). API: `generate-studio`.
    - **Slot 2 – Foto Costas (Ghost Mannequin Costas):** mesma lógica usando a “Foto Costas” do upload. API: `generate-studio`.
    - **Slot 3 – Modelo Frente (Lifestyle):** modelo virtual usando Ghost Frente como referência da roupa + seed de personagem. Cenário (interior/urbano/natureza) conforme categoria. API: `generate-lifestyle` (view=front).
    - **Slot 4 – Modelo Costas (Lifestyle):** modelo de costas usando Ghost Costas + seed do Modelo Frente. API: `generate-lifestyle` (view=back).
    - **Slot 5 – Look combinado 1:** produto principal + produtos do “Combo 1” na mesma imagem. API: `generate-studio`.
    - **Slot 6 – Look combinado 2:** produto principal + “Combo 2”. API: `generate-studio`.
  - **Estúdio Vídeo (IA):**
    - Geração de vídeo a partir da imagem **Modelo Frente** (slot 3). API: `generate-video` (Vertex AI Veo); polling em `check-video-status`.
    - Toggle “Display” para marcar/desmarcar exibição do vídeo no display da loja.
    - Prévia do vídeo na caixa “Visualizar Vídeo Gerado”; persistência em `sessionStorage` e campo `videoUrl` no Firestore.
  - **Caixa “Visualizar Fotos Catálogo IA”:** galeria com os 6 slots (frente, costas, modelo frente, modelo costas, look 1, look 2); clique para ampliar.
  - Salvamento de URLs de catálogo (slots 1–6) e `videoUrl` no produto (Firestore).

---

### 2.3 Clientes

- **Rotas:** `/clientes`, `/clientes/[id]`
- **O que oferece:**
  - **Tabela de clientes:** lista com nome, contato, última composição, estatísticas de compartilhamento, indicações (referrals).
  - Filtros: arquivados, bloqueados; busca.
  - **Perfil do cliente (`/clientes/[id]`):** dados cadastrais, histórico de atividade, redefinição de senha (link app), estatísticas de shares, últimas imagens/composições.
  - Segmentação e histórico (APIs: `clientes/segmentation`, `clientes/history`).
  - Integração com IA do painel: links para “Ver Cliente” em insights e no chat.

---

### 2.4 Pedidos

- **Rota:** `/pedidos`
- **O que oferece:**
  - Listagem de pedidos da loja (Firestore: `lojas/{lojistaId}/orders`).
  - Conteúdo em `OrdersContent`: visualização e gestão de pedidos (status, detalhes, cliente).

---

### 2.5 Radar de Oportunidades (CRM)

- **Rota:** `/crm`
- **O que oferece:**
  - Lista de **clientes ativos na última semana** (168h).
  - Tabela CRM com dados vindos de `fetchActiveClients` (Firestore).
  - Foco em oportunidades de follow-up.

---

### 2.6 Composições

- **Rotas:** `/composicoes`, `/composicoes/[id]`
- **O que oferece:**
  - **Galeria de looks gerados:** composições criadas pelos clientes no app (foto do cliente + produtos).
  - Visualização por composição; like/deslike registrados no Firestore.
  - **Envio por WhatsApp:** envio da imagem da composição + mensagem (API `composicoes/send-whatsapp`); registro de compartilhamento.
  - Detalhes da composição em `/composicoes/[id]` (produto, cliente, imagem, likes, shares).

---

### 2.7 Simulador

- **Rota:** `/simulador`
- **O que oferece:**
  - **Iframe do App Cliente** (Modelo 1, 2 ou 3 conforme config) na URL `/{lojistaId}` (ou demo).
  - Simulação do que o cliente vê no celular (experimentar, resultado, etc.) sem sair do painel.
  - Parâmetros de backend e orientação (horizontal/vertical) quando aplicável.

---

### 2.8 Display

- **Rota:** `/display`
- **O que oferece:**
  - **Link/URL do display:** geração da URL que a loja usa para exibir a vitrine no TV/smart (App Modelo 2 em modo display: `display=1` + `backend` apontando para o painel).
  - **Descoberta do display:** instruções para conectar o dispositivo (TV/tablet) ao display da loja.
  - **Configurações do display:** orientação (horizontal/vertical), ajustes específicos da tela.
  - Produtos exibidos são os marcados “Exibir no display” (exibirNoDisplay), com imagem Modelo Frente e vídeo quando houver; API `display-produtos` usada pelo app e pela prévia do dashboard.

---

### 2.9 Aplicativo Cliente

- **Rota:** `/app-cliente`
- **O que oferece:**
  - **Links e QR Codes** para os **3 modelos** de app (Modelo 1, 2, 3).
  - Destaque do modelo padrão (configurado em Configurações).
  - Download de QR Code por modelo; cópia do link.
  - URLs construídas via `buildClientAppUrlWithModel(lojistaId, modelo)`.

---

### 2.10 Compartilhamento

- **Rota:** `/compartilhamento`
- **O que oferece:**
  - **SharePanel:** criação de **links e QR Codes** personalizados para convidar clientes a acessar a vitrine (app).
  - Uso em WhatsApp, redes sociais e ponto de venda.
  - Links com tracking (APIs `cliente/share`, `cliente/share/track`); métricas de compartilhamento no dashboard e no perfil do cliente.

---

### 2.11 Redes Sociais

- **Rota:** `/redes-sociais`
- **O que oferece:**
  - Formulário de **links** (Instagram, Facebook, TikTok, WhatsApp).
  - **Desconto para seguidores:** configuração de desconto e data de expiração (descontoRedesSociais, descontoRedesSociaisExpiraEm).
  - Dados salvos no perfil da loja (Firestore).

---

### 2.12 Integrações

- **Rota:** `/integracoes`
- **O que oferece:**
  - **Mercado Pago e Melhor Envio:** configuração de pagamento e envio.
  - **SalesSettingsForm:** configuração de vendas (perfil da loja).
  - **EcommerceIntegrationCard:** integração com e-commerce (sync de produtos quando aplicável).

---

### 2.13 Configurações

- **Rotas:** `/configuracoes`, `/configuracoes/assinatura`
- **O que oferece:**
  - **Perfil da loja:** nome, logo, descrição, dados de contato.
  - **Modelo de app padrão:** seletor Modelo 1 / 2 / 3 (campo `appModel` no perfil).
  - **Assinatura:** gestão de plano (se disponível na assinatura).
  - Upload de logo e ícone do app (APIs `perfil/upload-logo`, `perfil/upload-app-icon`).

---

### 2.14 Monitoramento (logs)

- **Rota:** `/monitoramento`
- **O que oferece:**
  - Listagem de **logs** do sistema (API `admin/logs`).
  - Filtros (all / error / critical).
  - Estatísticas: totais, erros, avisos, gerações IA (sucesso/falha), eventos de crédito (débitos, adições, saldo insuficiente).

---

## 3. Painel ADM — Área Admin (super-admin)

- **Rotas:** `/` (dashboard admin), `/lojistas`, `/planos`, `/custos`, `/super-admin`
- **Acesso:** restrito a usuários admin (`requireAdmin`, `AdminRouteGuard`).

| Aba | O que oferece |
|-----|----------------|
| **Dashboard Admin** | Visão geral: dados agregados de lojistas, métricas, atalhos (getAdminDashboardData). |
| **Lojistas** | Tabela de lojistas; gestão; acesso ao painel do lojista (view como lojista). |
| **Planos** | Gestão de planos de assinatura (planos-table). |
| **Custos** | Gestão de custos e créditos (custos-content). |
| **Super Admin** | Painel específico super-admin (SuperAdminDashboardClient): funções avançadas de gestão da plataforma. |

---

## 4. App Cliente Modelo 2 — Funcionalidades

O App Modelo 2 é acessado por `/{lojistaId}` (raiz), `/{lojistaId}/login`, `/{lojistaId}/experimentar`, `/{lojistaId}/resultado`, `/{lojistaId}/tv`. Pode rodar em modo **vitrine** (experimentar/resultado) ou em modo **display** (parâmetro `display=1`).

---

### 4.1 Página raiz `/[lojistaId]`

- Verifica sessão (localStorage `cliente_{lojistaId}`).
- Se **não logado** → redireciona para `/[lojistaId]/login`.
- Se **logado** → redireciona para `/[lojistaId]/experimentar`.

---

### 4.2 Login `/[lojistaId]/login`

- **O que oferece:**
  - Tela de identificação do cliente: nome e WhatsApp (e código de verificação quando ativo).
  - APIs: `verification/send-code`, `verification/validate-code`; sessão gravada (cookie/localStorage) para o lojista.
  - Após login → redirecionamento para `/[lojistaId]/experimentar`.

---

### 4.3 Experimentar `/[lojistaId]/experimentar`

- **O que oferece:**
  - **Catálogo de produtos** da loja (API `lojista/products` com `lojistaId`).
  - Categorias (ex.: “Todos”); seleção de produtos.
  - **Upload de foto do cliente:** envio da foto para geração do look (virtual try-on).
  - **Geração de composição:** combinação da foto do cliente com os produtos escolhidos (IA); exibição do resultado.
  - **Modo Display:** quando `display=1` na URL, interface adaptada para TV (vitrine automática, sem interação de compra).
  - **Conexão com a loja (StoreConnectionIndicator):** indica se o app está conectado ao backend do painel (`useStoreSession`, `connect-display`).
  - **Favoritos:** modal de favoritos; like nas composições.
  - **Desconto redes sociais:** aplicação de desconto quando configurado (salesConfig, descontoRedesSociais).
  - **Refine (refinamento):** modo de refino da composição (refineBaseImageUrl, refineCompositionId) quando disponível.
  - Dados da loja (nome, logo, redes, salesConfig) via API `lojista/perfil`.

---

### 4.4 Resultado `/[lojistaId]/resultado`

- **O que oferece:**
  - Exibição da **composição gerada** (look com a foto do cliente + produtos).
  - **Like / Dislike:** registro no Firestore (composições); modal de motivo em caso de dislike (garment_style, fit_issue, ai_distortion, other).
  - **Compartilhar:** geração de link de compartilhamento com tracking; compartilhamento via WhatsApp (API share + send-whatsapp quando aplicável).
  - **Enviar para o Display:** botão para enviar a composição para a TV da loja (SendToDisplayButton); integração com display ao vivo.
  - **Carrinho / Compra:** abertura do carrinho (ShoppingCartModal); integração com fluxo de pagamento (Mercado Pago, Melhor Envio) conforme configuração da loja (salesConfig).
  - **Favoritar:** salvamento nos favoritos do cliente.
  - **Refazer / Nova experimentação:** voltar à tela de experimentar ou gerar nova composição.
  - Sessão do cliente garantida (getClienteSessionWithFallback); dados da loja e configuração de vendas (normalizeSalesConfig).

---

### 4.5 TV `/[lojistaId]/tv`

- **O que oferece:**
  - **Tela para TV da loja:** exibição de **composições com like** (Firestore: `lojas/{lojistaId}/composicoes`, `liked === true`, ordenação por `updatedAt`).
  - Modos: **active** (uma composição em destaque) ou **carousel** (várias).
  - Atualização em tempo real (onSnapshot); troca de imagem quando há nova composição curtida.
  - Exibição do nome do cliente e da imagem da composição; opcionalmente QR ou CTA para o app.

---

### 4.6 Demo

- **Rota:** `/demo`
- Página de demonstração do app (sem lojista específico).

---

### 4.7 APIs do App Modelo 2 (resumo)

- **Cliente:** `check-session`, `session`, `share` (criar/track).
- **Lojista:** `perfil`, `products` (listagem para catálogo).
- **Vendas:** `sales/calculate-shipping`, `sales/create-payment`.
- **Melhor Envio:** `auth`, `callback`, `save-token`; webhook.
- **Outros:** `refine-tryon`, `upload-photo`, `verification/send-code`, `validate-code`, `watermark`, `simulator-proxy`, `manifest`, `pwa-icon`, webhooks (Mercado Pago, Melhor Envio).

---

## 5. APIs e integrações técnicas (resumo)

### 5.1 Produtos e IA (Painel)

| API | Função |
|-----|--------|
| `products/analyze` | Análise IA da foto do produto (nome, categoria, tags, detalhes, cor, tecido). |
| `products/bulk-analyze` | Análise em lote. |
| `products/generate-studio` | Geração Ghost Mannequin e looks combinados (Gemini/Imagen). |
| `products/generate-lifestyle` | Geração Modelo Frente e Modelo Costas (lifestyle). |
| `products/generate-video` | Início da geração de vídeo (Vertex AI Veo). |
| `products/check-video-status` | Polling do status e download do vídeo; upload para Storage; retorno da URL. |
| `products/upload-image` | Upload de imagem do produto. |
| `products/[productId]` | CRUD do produto; `display-asset` para recurso de display. |

### 5.2 Display e vitrine

| API | Função |
|-----|--------|
| `display-produtos` | Lista produtos para exibir no display (exibirNoDisplay, imagem Modelo Frente, videoUrl). |
| `display-settings` | Configurações do display. |
| `connect-display` | Conexão do app (display) ao painel. |

### 5.3 Clientes, composições e compartilhamento

| API | Função |
|-----|--------|
| `clientes`, `clientes/[clienteId]` | CRUD cliente; shares; referrals; reset-password; last-composition-image; last-liked-image. |
| `clientes/segmentation`, `clientes/history` | Segmentação e histórico. |
| `composicoes`, `composicoes/send-whatsapp`, `composicoes/upload-photo` | Composições e envio WhatsApp. |
| `cliente/share`, `cliente/share/track` | Criação e rastreamento de link de compartilhamento. |

### 5.4 Financeiro e assinatura

| API | Função |
|-----|--------|
| `credits`, `add-credits` | Créditos da loja. |
| `financial-data`, `dashboard-metrics` | Dados financeiros e métricas do dashboard. |
| `subscription/change` | Alteração de assinatura. |
| `sales-config` | Configuração de vendas. |

### 5.5 Outros

| API | Função |
|-----|--------|
| `perfil`, `perfil/upload-logo`, `perfil/upload-app-icon` | Perfil da loja e uploads. |
| `pedidos`, `pedidos/[orderId]` | Pedidos. |
| `ai/chat` | Chat IA do painel (orientação com links para produtos, clientes, composições). |
| `ai/insights`, `ai/product-performance`, `ai/analyze-daily` | Insights e análise. |

---

## Resumo final

- **Painel ADM:** cobre gestão completa da loja (produtos com IA de análise, estúdio de fotos em 6 slots, geração de vídeo, clientes, pedidos, CRM, composições, display, simulador, app-cliente, compartilhamento, redes sociais, integrações, configurações e monitoramento). A área admin adiciona gestão de lojistas, planos, custos e super-admin.
- **App Modelo 2:** fluxo cliente completo: login → experimentar (catálogo + foto + IA) → resultado (like/compartilhar/enviar ao display/carrinho) e tela TV para composições curtidas. Todas as funcionalidades descritas acima permitem identificar com precisão o que cada aba e cada tela faz.
