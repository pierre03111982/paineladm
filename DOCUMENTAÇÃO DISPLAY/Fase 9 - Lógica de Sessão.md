Prompt para Fase 9: Gerenciamento de Sessão e Privacidade do Display

Contexto:
Precisamos garantir que a conexão entre o Celular do Cliente e a TV da Loja seja fluida, mas que se encerre automaticamente para garantir privacidade quando o cliente for embora.

Instruções para o Cursor:

Componente DisplayView (Lógica de Timeout):

Edite apps-cliente/modelo-2/src/components/views/DisplayView.tsx.

Crie um estado viewMode: 'idle' (QR Code/Descanso) | 'active' (Mostrando Look do Cliente).

No useEffect que escuta o Firestore:

Quando chegar uma nova composição:

Set viewMode = 'active'.

Inicie um setTimeout de 45 segundos.

Quando o timer acabar:

Set viewMode = 'idle'.

Limpe a imagem da tela.

Resultado: A TV "dorme" sozinha se o cliente parar de interagir.

Contexto de "Modo Loja" no Cliente:

Crie um Hook useStoreSession no modelo-2.

Quando o cliente escaneia o QR Code (que tem ?lojista=ID&connect=true), salve no sessionStorage: connected_store_id.

Na tela de Experimentar, verifique esse ID.

Se estiver conectado, envie a flag broadcast: true junto com a geração da imagem.

UI de Controle (Header do App):

No Header do App Cliente (layout.tsx ou componente Header), adicione um indicador visual condicional.

Se useStoreSession estiver ativo:

Mostre um ícone de "Cast" (📡) ou "Na Loja" verde.

Ao clicar, abra um Dialog: "Você está conectado ao telão da loja. Deseja sair?" -> Botão "Desconectar".

Regra de Negócio:

O cliente sempre vê a foto no celular dele (isso é o padrão).

A transmissão para a TV é um "efeito colateral" opcional que só acontece se ele estiver pareado e dura pouco tempo na tela grande.

Ação Esperada:

Gero uma imagem -> Aparece na TV.

Espero 1 minuto -> A TV volta para o QR Code.

Saio da loja -> A conexão morre naturalmente.