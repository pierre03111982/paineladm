Prompt para Fase 12: Implementação do "Modo TV Store" (Espelho Mágico)

Objetivo:
Criar uma interface para Smart TVs/Monitores da loja que exibe, em tempo real e alta resolução, os looks que os clientes acabaram de "Favoritar" (Dar Like) no aplicativo.

Conceito de UX:
"O cliente dá o Like no celular, e a imagem aparece magicamente na tela grande da loja."

Instruções Técnicas para o Cursor:

Nova Rota (apps-cliente/modelo-2/src/app/[lojistaId]/tv/page.tsx):

Crie uma página otimizada para telas grandes (1920x1080), sem barras de rolagem.

Design:

Fundo escuro elegante (gradiente sutil ou preto absoluto).

Área central de destaque para a imagem.

Lateral ou Rodapé com QR Code: "Escaneie para Provador Virtual".

Lógica de Listening (Firestore):

Use onSnapshot para escutar a coleção lojas/{lojistaId}/composicoes.

Query:

Filtrar por liked == true (ou curtido == true).

Ordenar por updatedAt decrescente (ou createdAt).

Limitar a 1 (apenas a última).

Efeito: Quando o snapshot atualizar (detectar novo like), troque a imagem em destaque com uma animação suave (Fade In/Scale Up).

Modo de Descanso (Screensaver):

Se ninguém der like por 60 segundos, entre em modo "Carrossel", exibindo aleatoriamente as últimas 10 composições curtidas da loja para atrair atenção.

Componentes Visuais:

Use o SafeImage (já corrigido nas fases anteriores) com fill e object-contain para garantir que a foto fique linda na TV sem cortar a cabeça ou os pés.

Adicione uma legenda elegante: "Look criado por [Nome do Cliente]" (se disponível no doc).

Segurança:

Esta página deve ser "Read Only". Não precisa de login de cliente, apenas o ID da loja na URL.

Resultado Esperado:
O lojista abre .../loja123/tv na Smart TV. Quando qualquer cliente na loja der um Like no celular, a TV atualiza instantaneamente.