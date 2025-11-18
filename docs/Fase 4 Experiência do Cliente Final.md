Fase 4: Experiência do Cliente Final (B2C) e Display da Loja

Esta é a interface que o Cliente Final usará para interagir com os produtos do Lojista.

1. Stack Visual (Frontend - App Cliente / Display)

Framework: React (ou Next.js).

Estilização: Tailwind CSS.

Ícones: Lucide React.

Banco de Dados (Cliente): firebase (Para Login por Telefone e leitura/escrita de composições).

(Nota: Não usaremos shadcn/ui aqui para manter o design neon customizado do seu protótipo).

2. Stack do Backend (Funções de Geração)

Runtime: Node.js (provavelmente em Cloud Functions ou Cloud Run).

Servidor: Express.js.

APIs: axios, google-auth-library, form-data.

Processamento de Imagem: sharp (para Watermark).

SDK Vertex AI: @google-cloud/aiplatform (Try-On e Imagen 3).

3. Fluxo de Cadastro e Consentimento

Gatilho: Antes de gerar a primeira imagem.

Interface: Um Modal que pede Nome e WhatsApp.

Auth: Usa Firebase Phone Authentication (envio de código SMS).

Consentimento (LGPD): Checkbox obrigatório: "Autorizo o uso da minha imagem para a geração do provador virtual e para receber comunicações da loja via WhatsApp." (Salva em consentimentoImagens: true).

4. O Aplicativo de Provador Virtual (App do Lojista)

(Baseado no seu protótipo)

Galeria de Produtos: Carrega os produtos de /lojas/{lojistaId}/produtos.

Seleção de Produto: O cliente seleciona um item.

Página de Try-On: O cliente faz o upload da sua foto (imagemPessoaUrl).

Processamento (Backend):

O backend recebe a imagemPessoaUrl e o produtoId.

Busca os dados do produto (nome, preco) e a logoUrl do Lojista no Firestore.

Execu­ta o Fluxo 1 (Vertex Try-On) -> gera `imagem_base_tryon`.

(NOVO) Watermark (Try-On): o backend usa sharp para aplicar a marca d'água (Logo + Nome + Preço + Data + Aviso Legal) na `imagem_base_tryon`. Salva como `imagemTryOnUrl`.

Execu­ta o Fluxo 2 (Vertex Imagen 3 - edição) usando `imagemTryOnUrl` como imagem de referência e o prompt configurado (podemos repetir este passo para gerar variações adicionais quando necessário).

(NOVO) Watermark (Imagen 3): o backend aplica a mesma marca d'água nas imagens geradas pela Imagen 3. Salva como `imagemCenarioUrl` (e `imagemCenarioVariaçãoX`, se houver mais de uma).

As URLs resultantes (sempre `imagemTryOnUrl` + pelo menos uma variação do Imagen 3) são salvas no Firestore em `/lojas/{lojistaId}/composicoes/{composicaoId}`.

Tela de Resultado:

O cliente vê a imagem base (Try-On) e as variações de cenário geradas (Imagen 3), todas com marca d'água.

Ação Principal: "Comprar Agora" (ou "Tenho Interesse"):

Este é o Call-to-Action (CTA) mais importante.

O botão lê os dados de /lojas/{lojistaId}.salesConfig.

Se channel == 'whatsapp': Abre um link wa.me/ com o número salesConfig.salesWhatsapp e uma mensagem pré-pronta (ex: "Olá! Gostei deste produto que experimentei no Experimente AI: {produtoNome} - {produtoPreco}").

Se channel == 'link': Abre a URL salesConfig.checkoutLink em uma nova aba.

Ação Secundária: "Receber Imagens por WhatsApp":

Botão para o cliente receber as imagens que gerou (o Lojista captura o lead).

Ação Secundária: "Curtir Imagem" (Ícone DE CURIR DO INSTAGAM COM EFEITO DE ANIMAÇÃO):

Atualiza composicoes.curtido = true.

Ação Secundária: "Siga nossa Loja":

Botão/Ícone do Instagram/Facebook (Lucide React).

6. Fluxo do Display da Loja (QR Code Rápido)

Hardware: Um monitor/tablet na loja exibindo a versão "Display" do App Cliente.

Interface: Mostra um QR Code grande.

Fluxo:

Cliente escaneia o QR Code.

Abre o App Cliente no celular dele.

O App Cliente (celular) se conecta ao Display (via WebSocket ou Firestore listener).

O Cliente faz o upload da foto e seleciona o produto NO CELULAR.

O Cliente clica em "Gerar".

Monitor (Display): A tela do monitor atualiza e exibe as 3 imagens geradas (JÁ COM a marca d'água).

Ação no Display: O display agora também mostra os botões "Comprar Agora (WhatsApp)" e "Receber Imagens por WhatsApp" para fechar a venda na loja.