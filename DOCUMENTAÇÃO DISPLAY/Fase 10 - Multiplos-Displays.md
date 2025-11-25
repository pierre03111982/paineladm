Prompt para Fase 10: Arquitetura Multi-Display e Canais Exclusivos

Contexto:
A loja pode ter vários monitores. Precisamos garantir que a foto do Cliente A apareça apenas no Monitor A, e não em todos os monitores da loja ao mesmo tempo.

Instruções para o Cursor:

Lógica de Identidade no DisplayView.tsx:

Ao montar o componente, verifique se existe um display_uuid no localStorage.

Se não existir, gere um novo (use crypto.randomUUID()) e salve.

QR Code: O QR Code gerado na tela deve incluir esse parâmetro: &target_display=${display_uuid}.

Firestore Listener: Em vez de escutar todas as composições da loja, escute apenas a coleção displays/{display_uuid}.

Lógica de Envio no Cliente (ExperimentarPage):

Ao ler o QR Code, o App Cliente deve capturar o parâmetro target_display da URL.

Salve esse ID na sessão (sessionStorage.setItem('target_display', id)).

Ao Gerar Imagem:

Além de salvar na coleção composicoes (histórico geral), salve/atualize o documento: db.collection('displays').doc(target_display).set({ activeImage: url, timestamp: now }).

Limpeza Automática:

No DisplayView, se não houver atualização no documento displays/{display_uuid} por 60 segundos, limpe a tela (volte para o QR Code).

Resultado Esperado:

Posso abrir 2 abas anônimas no PC (simulando 2 TVs). Cada uma terá um QR Code diferente.

Se eu escanear o QR da Aba 1, a foto só aparece na Aba 1.

Se eu escanear o QR da Aba 2, a foto só aparece na Aba 2.