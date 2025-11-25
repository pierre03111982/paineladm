Prompt para Fase 11: Configuração de Subdomínio e Middleware (Display Dedicado)

Contexto:
O cliente definiu que o acesso ao "Modo Display" (TV da loja) será feito através de um subdomínio exclusivo: https://display.experimenteai.com.br.
Isso separa a experiência do cliente (no celular) da experiência da loja (na TV).

Estrutura de Domínios:

app2.experimenteai.com.br -> App do Cliente (Mobile)

display.experimenteai.com.br -> App da Loja (TV/Monitor)

Instruções para o Cursor:

Variáveis de Ambiente:

No arquivo .env.local (e instrução para Vercel), adicione:

NEXT_PUBLIC_DISPLAY_DOMAIN="display.experimenteai.com.br"
NEXT_PUBLIC_APP_DOMAIN="app2.experimenteai.com.br"


Next.js Middleware (apps-cliente/modelo-2/src/middleware.ts):

Crie ou atualize o middleware para interceptar o host da requisição.

Lógica de Roteamento:

Se o hostname for display.experimenteai.com.br:

Reescreva a rota internamente para adicionar o parâmetro ?display=1.

Exemplo: O usuário acessa display.experimenteai.com.br/[lojistaId] -> O Next.js serve internamente /[lojistaId]/experimentar?display=1.

Isso garante que a URL no navegador fique limpa (display.experimenteai.com.br/minhaloja) mas o código receba a flag correta.

Atualização do Gerador de QR Code (paineladm):

Vá em paineladm/src/app/(lojista)/display/display-link-panel.tsx.

Atualize a função que gera o link do QR Code.

Em vez de usar o domínio do app principal, ela deve usar https://${process.env.NEXT_PUBLIC_DISPLAY_DOMAIN}/${lojistaId}.

Adicione os parâmetros de pareamento (target_display) nessa nova URL.

Segurança de Origem (CORS):

Garanta que o next.config.mjs permita imagens e scripts cruzados entre esses dois subdomínios, caso necessário.

Resultado Esperado:

Ao digitar display.experimenteai.com.br/loja123, abre direto a tela preta do "Espelho Mágico" (DisplayView).

Ao digitar app2.experimenteai.com.br/loja123, abre o app normal de celular.