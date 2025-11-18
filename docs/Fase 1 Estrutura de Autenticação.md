Fase 1: Estrutura de Autenticação e Banco de Dados (Firestore)

1. Visão Geral

Para suportar os três tipos de usuários (ADM, Lojista, Cliente Final) e garantir que cada lojista só veja seus próprios dados (multi-tenancy), usaremos o Firebase Authentication e o Firestore.

2. Bibliotecas Necessárias (Stack desta Fase)

Backend (Node.js): firebase-admin (Para criar usuários e definir custom claims).

Frontend (React): firebase (Para os fluxos de login/cadastro).

3. Configuração do Firebase Authentication

Login ADM / Lojista (Email/Senha):

Habilitar o provedor "Email/Senha" no Firebase Auth.

Usaremos Custom Claims (Regras Customizadas) para definir o papel do usuário no momento do cadastro (ex: role: 'admin' ou role: 'lojista'). O Painel ADM só será acessível se role == 'admin'.

Login Cliente Final (WhatsApp/Telefone):

Habilitar o provedor "Telefone" no Firebase Auth.

O cliente final fará login usando o número do WhatsApp (recebendo um código SMS).

O cadastro simplificado (Nome + WhatsApp) será vinculado a este UID do Firebase Auth.

4. Estrutura do Banco de Dados (Firestore)

Esta estrutura é vital para a segurança e multi-tenancy.

/lojas/{lojistaId}
  |
  |-- (Informações do Lojista)
  |   |-- nomeDaLoja: "Loja da Maria"
  |   |-- email: "maria@loja.com"
  |   |-- logoUrl: "gs://bucket/logo_loja_maria.png" // Logomarca para branding e watermark
  |   |-- planoAtual: "pro"
  |   |-- limiteImagens: 5000 // Limite de gerações VTON (Fluxo 1)
  |   |-- imagensGeradasMes: 120
  |   |-- dataVencimento: Timestamp
  |   |-- statusPagamento: "pago"
  |   |-- whatsappApiConfig: { token: "..." }
  |   |-- redesSociais: { instagram: "...", facebook: "..." }
  |   |-- salesConfig: { // Configuração do Canal de Venda
  |   |--   channel: "whatsapp" // Opções: "whatsapp" ou "link"
  |   |--   salesWhatsapp: "+5548999991234" // Número para fechar a venda
  |   |--   checkoutLink: "[https://minhaloja.com/checkout?prod=](https://minhaloja.com/checkout?prod=)" // Link de e-commerce
  |   |-- }
  |
  |-- /produtos/{produtoId}
  |   |-- nome: "Vestido de Seda Verde"
  |   |-- preco: 199.90
  |   |-- tamanhos: ["P", "M", "G"]
  |   |-- cores: ["Verde", "Azul"]
  |   |-- obs: "Edição limitada de verão."
  |   |-- imagemUrl: "gs://bucket/produto_vestido.png"
  |
  |-- /clientes/{clienteId}
  |   |-- (Vinculado ao UID do Firebase Auth do Cliente)
  |   |-- nome: "Ana Silva"
  |   |-- whatsapp: "+5548999998888"
  |   |-- consentimentoImagens: true // (LGPD)
  |   |-- dataCadastro: Timestamp
  |
  |-- /composicoes/{composicaoId}
      |-- (O registro de cada Try-On gerado)
      |-- clienteId: (Referência a /clientes/{clienteId})
      |-- produtoId: (Referência a /produtos/{produtoId})
      |-- produtoNome: "Vestido de Seda Verde"
      |-- produtoPreco: 199.90
      |-- imagemPessoaUrl: "gs://bucket/cliente_ana_foto.jpg"
      |-- imagemVtonUrl: "gs://bucket/vton_ana_vestido_watermarked.jpg" // Imagem 1 (com watermark)
      |-- imagemCenario1Url: "gs://bucket/cenario1_ana_vestido_watermarked.jpg" // Imagem 2 (com watermark)
      |-- imagemCenario2Url: "gs://bucket/cenario2_ana_vestido_watermarked.jpg" // Imagem 3 (com watermark)
      |-- timestamp: Timestamp
      |-- curtido: false // (Para o Lojista ver o engajamento)

/admins/{adminId}
  |-- (Informações do Administrador)
  |-- nome: "Admin Geral"
  |-- email: "admin@experimente.ai"
