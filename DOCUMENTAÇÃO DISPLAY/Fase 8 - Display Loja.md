Prompt para Fase 8: Implementação do "Modo Display" (Espelho Mágico)

Contexto:
Queremos que o lojista use um monitor/tablet na loja rodando o App. Quando um cliente na loja gera um look no celular dele, esse look deve aparecer automaticamente no monitor da loja (Display).

Análise de Problemas Atuais (Baseado na Documentação):

O arquivo page.tsx do cliente ignora o parâmetro ?display=1.

A variável de ambiente no painel aponta para a porta errada.

Não há lógica de "auto-update" para novas imagens.

Instruções para o Cursor:

Correção de Ambiente (paineladm):

No arquivo paineladm/src/lib/client-app.ts, corrija a porta de fallback para 3001 (ou a porta que o modelo-2 usa no seu package.json).

Criação do Componente DisplayView (Modelo 2):

Crie apps-cliente/modelo-2/src/components/views/DisplayView.tsx.

Design: Fundo escuro (Dark Mode elegante), Imagem em destaque ocupando quase toda a tela.

Sidebar Lateral: Mostre um QR Code gerado dinamicamente (use qrcode.react ou similar) convidando: "Escaneie para Provador Virtual".

Animação: Use framer-motion (se disponível) ou CSS transitions para quando uma nova imagem chegar.

Lógica de Sincronização (O "Pulo do Gato"):

Dentro do DisplayView, implemente um useEffect com onSnapshot do Firestore.

Query: Escute a coleção composicoes da loja atual.

Filtro: Ordene por createdAt desc, limite 1.

Lógica: Se chegar uma composição nova (criada nos últimos 30 segundos), exiba ela na tela grande com um efeito de destaque. Caso contrário, exiba um carrossel de "Destaques da Loja" ou o QR Code grande.

Integração na Página (src/app/[lojistaId]/experimentar/page.tsx):

Leia o searchParam display.

Se display === '1', renderize o componente <DisplayView /> em vez da página normal de experimentação.

Isso isola a lógica: quem está no celular vê os botões, quem está no monitor vê o Display.

Critério de Aceite:

Abro localhost:3001/[ID]/experimentar?display=1 no PC.

Vejo uma tela bonita, sem botões de upload, com um QR Code.

Abro localhost:3001/[ID]/experimentar no Celular (aba anônima).

Gero um look no celular.

Mágica: A imagem aparece sozinha na tela do PC sem eu precisar dar F5.