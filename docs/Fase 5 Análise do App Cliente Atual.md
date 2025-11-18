Fase 5: Análise do App Cliente Atual e Novas Ideias de Layout

Este arquivo analisa as capturas de tela do seu aplicativo "Experimente AI" existente e lista as novas funcionalidades necessárias e ideias de layout.

1. Análise da Interface Atual (Baseado nas Capturas de Tela)

Seu protótipo atual (layout neon escuro) é um excelente ponto de partida e já possui:

Upload de Foto: Área para a foto do cliente.

Seleção de Produto: Uma grade de categorias (Imagens, Acessórios, Óculos, Calçados) e uma área para "Produtos para Combinar".

Geração: Botão "Gerar Imagem com X Produto(s)".

Resultado: Uma galeria com as 3 imagens geradas (VTON + 2 Cenários) e botões de "Baixar Imagem".

2. Novas Funcionalidades (O que precisa ser Adicionado)

Para transformar o protótipo atual na plataforma completa que planejamos, as seguintes funcionalidades precisam ser implementadas no App Cliente:

Login/Cadastro do Cliente:

O que falta: Fluxo de captura de Nome e WhatsApp (Firebase Phone Auth) e Consentimento (LGPD).

Exibição de Dados do Produto (Firestore):

O que falta: A seção "Produtos para Combinar" só mostra imagens.

Necessário: Exibir nome, preco, tamanhos, e obs de cada produto (do Firestore).

Botões de Engajamento (Na Tela de Resultado):

O que falta: A tela de resultado só tem "Baixar Imagem".

Necessário (Adicionar):

"Comprar Agora" (Botão Principal/CTA): // <-- NOVO. Inicia o fluxo de venda (WhatsApp ou Link) configurado pelo Lojista.

"Receber Imagens por WhatsApp" (Botão Secundário): (Mudar nome para diferenciar do "Comprar").

"Curtir" (❤️ Ícone).

"Siga-nos" (Ícone do Instagram/Facebook).

Integração da Marca D'água (Watermark):

O que falta: As imagens geradas estão limpas.

Necessário (Backend): O backend deve aplicar a marca d'água (Logo + Texto) antes de salvar a imagem.

3. Ideias Interessantes para o Layout (Melhorias de UX)

Aqui estão algumas ideias para melhorar a interface do seu protótipo:

Modal "Detalhe do Produto":

Quando o cliente clicar em um produto na grade, em vez de apenas selecioná-lo, abra um modal (popup).

Este modal deve mostrar a imagem do produto maior, o nome, preco, tamanhos disponíveis e as observacoes.

O botão de ação principal neste modal será "Experimentar Agora".

Gamificação no Carregamento (Loading):

(Como discutido) Quando as Imagens 2 e 3 estiverem carregando, use placeholders criativos.

Mostre a miniatura do produto na caixa e a mensagem de status (ex: "Aplicando IA...", "Ajustando iluminação...", "Criando cenário...", "Finalizando em alta qualidade...").

Foco no "Look Completo" (Venda Casada):

Aprimore a UI para permitir que o cliente selecione múltiplos produtos para o mesmo Try-On (ex: um vestido + um óculos).

O VTON (Fluxo 1) precisará ser adaptado para aceitar múltiplas imagens de produto, se a API do Google suportar.

Tela de Resultado Focada em CTA (Call to Action):

Após a geração das 3 imagens, a interface deve destacar o botão "Comprar Agora" (ou "Tenho Interesse").

Os botões "Receber Imagens", "Curtir" e "Baixar" devem ter um peso visual menor (secundário) que o botão de compra.