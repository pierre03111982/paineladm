 Fluxo de 3 Telas do Cliente

Tela 1: Login e Consentimento

Gatilho: Primeiro acesso ao app (via QR Code ou link). O app lê o {lojistaId} da URL.

Interface: Pede Nome e WhatsApp.

Auth: Firebase Phone Authentication (envio de código SMS).

Consentimento (LGPD) - Chave da Anonimização:

Checkbox: "Autorizo o uso da minha imagem para o provador virtual (LGPD)."

Checkbox: "Autorizo a [Nome da Loja] a ver minhas composições para sugestões."

Se este for desmarcado, o backend (no cadastro) salvará consentimentoImagens: false no perfil do cliente

Tela 2: Workspace (Foto + Catálogo)

Upload: Cliente sobe a foto (imagemPessoaUrl).

Seleção: Cliente navega pelo catálogo (lido de /lojas/{lojistaId}/produtos).

Ação: Cliente clica em "Gerar Looks".

Tela 3: Resultados (Os 2 Looks)

Processamento (Backend - API Central):

Backend recebe imagemPessoaUrl, produtoId e clienteId.

Busca tipoProduto no Firestore.

Gera Imagem 1 (Look Natural): Chama Vertex Try-On (Custo $0.04).

Gera Imagem 2 (Look Criativo): Chama Vertex Imagen 3, usando a Imagem 1 como base (Custo $0.04).

Aplica Watermark: Usa sharp para aplicar a logoUrl da loja, produtoNome, produtoPreco e os avisos legais ("Valor sujeito a alteração...") em ambas as imagens.

Verifica Consentimento: O backend lê /lojas/{lojistaId}/clientes/{clienteId}.consentimentoImagens.

Se true: Salva as 2 URLs reais no Firestore (/composicoes/...) com anonimo: false.

Se false (Anominizar):

Chama Vertex Imagen 3 mais uma vez (Custo +$0.04).

Prompt: "Gere um rosto fotorrealista diferente para esta pessoa. Mantenha o corpo, cabelo, tom de pele e a roupa."

Salva as 2 URLs com o rosto fictício no Firestore com anonimo: true.

Retorno: O backend retorna as imagens reais (com watermark) para o cliente (o cliente NUNCA vê a imagem anônima).

Exibição (Frontend):

O cliente vê as suas imagens reais (que foram retornadas diretamente da API).

Ações: "Comprar Agora" (lê salesConfig do lojista), "Receber Imagens", "Curtir" (atualiza curtido: true no Firestore), "Siga-nos" (lê redesSociais do lojista).

4. Fluxo do Display da Loja (QR Code Rápido)

O Lojista exibe o QR Code (da Fase 2) no seu display/monitor.

O Cliente escaneia, o que o leva à Tela 1 (Login/Consentimento) do App Cliente.

FASE 5: ANÁLISE DO APP CLIENTE E IDEIAS DE LAYOUT

1. Análise da Interface Atual (Baseado nas Capturas de Tela)

Problema: O fluxo atual (Captura de tela 2025-11-05... e outras) está confuso e dividido em muitas telas/seções.

Solução: O novo fluxo de 3 Telas (Login -> Workspace -> Resultados) é mais limpo, direto e focado na conversão.

Design: A estética neon/dark mode é forte e deve ser mantida.

2. Novas Funcionalidades (O que precisa ser Adicionado ao App Cliente)

Refatoração para 3 Telas: O app deve ser refatorado para o fluxo claro: Tela 1 (Login/Consentimento) -> Tela 2 (Workspace) -> Tela 3 (Resultados).

Lógica de Login/Consentimento: Implementar o Firebase Phone Auth e os checkboxes de privacidade (Tela 1).

Dados do Produto: O Catálogo (Tela 2) deve puxar nome, preco, tamanhos, obs do Firestore.

Botões de Resultado (Tela 3): Adicionar "Comprar Agora", "Receber por WhatsApp", "Curtir" e "Siga-nos".

Exibição de Watermark: O backend aplicará a marca d'água; o frontend apenas exibirá a imagem final (com marca d'água).

3. Ideias Interessantes para o Layout (Melhorias de UX)

Modal "Detalhe do Produto" (Tela 2): Ao clicar em um produto no catálogo, abrir um modal (popup) com a foto grande, nome, preço e tamanhos. O botão principal do modal será "Experimentar Agora".

Gamificação no Carregamento (Entre Telas 2 e 3): Ao clicar em "Gerar Looks", exibir uma tela de carregamento bonita que mostre as mensagens de progresso que criamos (ex: "Ajustando caimento...", "Criando cenário...", "Finalizando...").

Foco no "Look Completo" (Venda Casada) (Tela 2): O layout deve permitir selecionar múltiplos itens (ex: Vestido + Óculos) se o tipoProduto for compatível (ex: "Vestuário" + "Outros"). O backend usará o fluxo de combinação de itens.

Tela de Resultado Focada em CTA (Tela 3): O botão "Comprar Agora" deve ser o maior e mais chamativo. "Receber Imagens", "Curtir" e "Baixar" devem ser ações secundárias.

