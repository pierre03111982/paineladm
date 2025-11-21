Documento de Implementação 2: Impersonificação (Painel Administrativo - Back-End)
🎯 Objetivo da Fase
Implementar um mecanismo seguro (baseado em JWT ou similar) para permitir que um Administrador com privilégios acesse o Painel do Lojista (Painel THAIS MODA) temporariamente, sem a necessidade de senha.

📝 Prompt de Requisito para o Cursor AI
CONTEXTO DO PROJETO: Sistema SaaS "EXPERIMENTE AI" de Try-On Virtual. O Back-End é baseado em Node.js (ou similar) com autenticação via JWT/Firebase. Possuímos três roles de usuários: ADMIN, SUPER_ADMIN e LOJISTA.

REQUISITO: Implementar o Back-End para a funcionalidade "Impersonificação de Lojista".

PASSOS DE IMPLEMENTAÇÃO (Back-End/API):

Criar Endpoint de Impersonificação:

Crie um novo endpoint HTTP GET: /api/admin/impersonate/:lojistaId.

Middleware de Autorização: Este endpoint deve ser protegido por um middleware que apenas permita acesso a usuários com o role ADMIN ou SUPER_ADMIN.

Geração do Token de Impersonificação (JWT):

Ao ser acionado, o endpoint deve:

Verificar se o lojistaId existe.

Gerar um novo JSON Web Token (JWT).

Payload do Token: O token deve conter:

O ID do Lojista (userId: lojistaId).

Um flag de segurança: isImpersonating: true.

O ID do ADM que está fazendo a impersonificação (adminId: req.userId).

Duração do Token: O Token deve ter uma curta duração (Ex: 30 minutos).

Resposta e Redirecionamento:

O endpoint deve retornar a URL completa do Painel do Lojista, incluindo o novo Token como um parâmetro de consulta.

Exemplo: https://[URL_DO_PAINEL_LOJISTA]/dashboard?impersonation_token=[NOVO_JWT].

PASSOS DE IMPLEMENTAÇÃO (Back-End de Login Existente):

Validação no Painel do Lojista: O sistema de validação de sessão do Painel do Lojista deve ser modificado para:

Ao receber um impersonation_token na URL, decodificá-lo e iniciar a sessão com o ID do Lojista.

Se o Token for válido e contiver isImpersonating: true, o Back-End deve definir a flag isImpersonating como true na sessão (ou contexto) do Front-End que será carregado.

REGRAS DE SEGURANÇA CRÍTICA:

O Lojista NÃO pode gerar ou usar este Token.

O token expira automaticamente após 30 minutos.

Nenhuma senha é trocada ou armazenada durante o processo.

PRÓXIMA FASE DE IMPLEMENTAÇÃO (Front-End/UX) VINCULADA: Esta API será consumida pelo Front-End do Painel ADM e ativará o aviso visual no Front-End do Painel Lojista