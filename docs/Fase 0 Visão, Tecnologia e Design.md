Fase 0: Visão, Tecnologia e Design do Projeto "Experimente AI"

1. Visão Geral do Projeto

Criar uma plataforma SaaS (Software as a Service) B2B/B2C chamada "Experimente AI", focada em provador virtual (Virtual Try-On).

Modelos de Negócio:

B2B (Lojistas): Venda de planos/pacotes para lojistas e autônomos usarem a plataforma para seus clientes.

B2C (Cliente Final): O cliente do lojista usa o app (via Display, QR Code ou Link) para experimentar produtos.

2. Personas e Papéis

Administrador (ADM): Você. Gerencia toda a plataforma, clientes (lojistas) e custos.

Lojista (Cliente B2B): O dono da loja. Gerencia seus produtos, vê a galeria de clientes e métricas de conversão.

Cliente Final (Usuário B2C): O cliente da loja. Faz o upload da foto e "experimenta" os produtos.

3. Fluxo Central de Geração de Imagem (Arquitetura de API)

Este é o "coração" técnico do aplicativo e será dividido em duas chamadas de API encadeadas.

Fluxo 1: Imagem Base (Try-On)

API: Google Vertex AI Virtual Try-On (`virtual-try-on-preview-08-04`).

Custo Estimado: US$ 0,04 por imagem (tabela oficial do Vertex AI).

Saída: `imagem_base_tryon` (a pessoa usando a peça escolhida, mantendo cenário, iluminação e postura originais).

Fluxo 2: Personalização de Cenário (Imagen 3)

API: Google Vertex AI Imagen 3 (modo edição).

Entrada: utiliza a `imagem_base_tryon` como `base_image`, evitando reenviar a foto original e preservando os ajustes do Try-On.

Custo Estimado: US$ 0,04 por imagem (tabela oficial do Vertex AI).

Saída: `imagem_cenario_personalizado` (a pessoa com a mesma peça e itens extras em um novo cenário e iluminação coerentes com o briefing).

Custo Total Estimado por Cliente (1 composição = 2 imagens)

Custo Try-On: US$ 0,04
Custo Imagen 3: US$ 0,04
Total: US$ 0,08 por cliente

Observações chave

- Todo o fluxo roda dentro do Google Vertex AI, eliminando dependência de serviços externos.
- Imagen 3 é responsável por adicionar itens extras (ex.: bolsa, acessórios) e variar cenário/iluminação.
- Podemos gerar múltiplas variações duplicando o passo do Imagen 3 com prompts diferentes.

4. Stack de Tecnologia Proposta (Para o Cursor AI)

Esta é a lista de todas as ferramentas necessárias para construir o projeto.

Backend (Node.js)

Runtime: Node.js (Versão LTS, ex: 20.x).

Servidor: Express.js (Para criar a API REST).

Banco de Dados (Admin): firebase-admin (Para autenticação, Firestore e Storage no servidor).

Processamento de Imagem: sharp (Para redimensionar e aplicar marcas d'água).

Chamadas de API (HTTP): axios (Para chamar as APIs do Google Vertex AI).

Formulários: form-data (Necessário para endpoints que exigem multipart/form-data ao enviar imagens).

Autenticação (Google): google-auth-library (Para autenticar com o Vertex AI).

Utilitários: dotenv (Para variáveis de ambiente), cors (Para permitir a comunicação com o frontend).

Frontend (React)

Framework: React (ou Next.js para melhor performance e SEO).

Estilização (Base): Tailwind CSS (Para todo o estilo utility-first).

Componentes (Painéis ADM/Lojista): shadcn/ui (Biblioteca de componentes bonita e customizável, baseada em Tailwind).

Gráficos (Dashboards): Recharts (Para os KPIs de custo e receita).

Ícones: Lucide React (Biblioteca de ícones padrão do shadcn/ui).

Banco de Dados (Cliente)

Cliente DB/Auth: firebase (SDK do lado do cliente para login e leitura/escrita no Firestore).

5. Identidade Visual (Design e Cores)

Tema: Dark Mode (Modo Escuro) como base.

Cores de Destaque (Neon): Usar o Magenta/Rosa e Ciano/Azul (como visto no seu app atual) para bordas, botões e elementos interativos.

Painéis (ADM/Lojista): Usar o tema padrão (elegante e limpo) do shadcn/ui, mas customizado com o logo "Experimente AI" e toques de cor magenta.

Tipografia: Inter (Moderna, legível, ótima para UIs).