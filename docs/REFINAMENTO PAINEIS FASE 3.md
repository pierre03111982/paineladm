Documento de Implementação 3: Alterações de Interface (Front-End / UX)
🎯 Objetivo da Fase
Implementar a interface de usuário que consome as novas APIs de Impersonificação (ADM) e Edição Incremental (App Cliente), garantindo uma experiência de usuário fluida e segura.

📝 Prompt de Requisito para o Cursor AI
CONTEXTO DO PROJETO: Sistema SaaS "EXPERIMENTE AI". O Front-End é desenvolvido em um framework moderno (ex: React, Next.js ou Vue.js) e consome as novas APIs: /api/admin/impersonate e /api/refine-tryon.

REQUISITO 1: Implementar o Botão "Acessar Painel" (Painel ADM).

Localização: Na tela "Gerenciamento de Lojistas" do Painel Administrativo, adicionar um novo botão na coluna Ações (ao lado de "Responder" e "Ver Painel" se existirem).

Nome do Botão: "Acessar Painel" (ou "Impersonar").

Ação: Ao clicar, o Front-End deve chamar a API /api/admin/impersonate/:lojistaId. Após receber a URL de redirecionamento do Back-End (que contém o impersonation_token), o Front-End deve executar um redirecionamento imediato para essa URL.

Pré-requisito: Certifique-se de que a visibilidade deste botão esteja restrita a usuários com role ADMIN ou SUPER_ADMIN.

REQUISITO 2: Implementar Aviso de Impersonificação (Painel Lojista).

Componente de Aviso: Crie um componente de barra de status (Status Bar) que deve ser exibido no topo de todas as páginas do Painel do Lojista.

Lógica de Exibição: Este componente só deve ser renderizado se o flag de sessão isImpersonating for true (validado pelo Back-End via o token).

Estilo: A barra deve ser visualmente destacada (Ex: Fundo Amarelo ou Vermelho) e fixa no topo (sticky).

Conteúdo: O texto deve ser "AVISO: Você está visualizando como [NOME DO LOJISTA]. Clique aqui para SAIR".

Ação "SAIR": O link/botão [SAIR] deve encerrar a sessão atual (limpar o token de impersonificação) e redirecionar o usuário de volta para a URL do Painel Administrativo.

REQUISITO 3: Implementar o Botão "Adicionar Acessório" (App Cliente - Try-On).

Localização: Na tela onde a composição gerada é exibida (Screen 3 - onde estão "Comprar agora", etc.).

Novo Botão: Criar um novo botão com o texto "Adicionar Acessório" (ou "Refinar Look").

Fluxo:

Ao clicar, o Front-End armazena a URL da imagem da composição atual (baseImageUrl).

O usuário é redirecionado para a galeria de produtos.

Restrição de Seleção: Durante este novo fluxo, o Front-End deve limitar a seleção a 1 ou 2 produtos de categorias leves (ex: Jóias, Cosméticos, Óculos, Tintura). A seleção de Roupas ou Calçados deve ser desativada/proibida neste modo.

Chamada de API: Após a seleção do(s) novo(s) produto(s), o Front-End deve chamar a nova API /api/refine-tryon com a baseImageUrl e os newProductUrls selecionados, exibindo um loading otimizado.
Com a conclusão deste documento, você terá especificações para todas as melhorias propostas, cobrindo Back-End e Front-End!