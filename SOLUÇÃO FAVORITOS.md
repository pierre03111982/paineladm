Aqui está a solução para o mistério. Analisei o seu código e encontrei exatamente onde está o erro lógico que faz com que, às vezes, os favoritos não apareçam ou desapareçam.

🕵️‍♂️ O Mistério Resolvido: "O Problema da Janela de 50"
O problema não está no Frontend (handleLike), nem no localStorage. O problema está na função de busca no banco de dados (fetchFavoriteLooks).

O que está acontecendo agora:

O seu banco de dados (favoritos) mistura Likes e Dislikes.

A sua query busca os últimos 50 registros (limit(50)), independentemente de serem likes ou dislikes.

O Cenário de Erro: Imagine que o cliente deu "Dislike" em 45 roupas e depois deu "Like" em 5.

A query baixa os últimos 50 itens.

O seu código JavaScript filtra os Dislikes.

Sobram 5 Likes. Tudo funciona.

O Cenário Fatal: O cliente continua usando o app e dá mais 50 "Dislikes" em roupas feias.

A query baixa os últimos 50 registros (que são todos dislikes).

O seu código filtra (remove) os dislikes.

Resultado: O array fica vazio [].

O cliente acha que perdeu os favoritos antigos, mas eles apenas "saíram da janela de busca" porque a query trouxe lixo (dislikes) em vez de trazer os próximos favoritos.

🚀 A Solução Definitiva
Você precisa filtrar os likes DIRETO NO BANCO DE DADOS, não na memória do servidor.

Aqui está o arquivo corrigido. Você deve substituir a função fetchFavoriteLooks no arquivo paineladm/src/lib/firestore/server.ts.

Arquivo: paineladm/src/lib/firestore/server.ts
⚠️ Passo Obrigatório: Criar o Índice
Ao adicionar .where("action", "==", "like").orderBy("createdAt", "desc"), o Firestore vai bloquear a query até que você crie um índice composto.

Rode o código.

Abra o terminal onde o backend está rodando.

Você verá um erro que diz: The query requires an index. You can create it here: https://console.firebase.google.com/....

Clique nesse link. Ele vai abrir o Firebase Console e criar o índice automaticamente para você.

Aguarde uns minutos (o Firebase vai dizer "Building"). Assim que terminar, seus favoritos funcionarão perfeitamente, ignorando todos os dislikes.

💡 Dica Extra: Pare de sujar o banco
Para evitar que o banco fique gigante com dados inúteis, no seu arquivo de Backend POST (paineladm/src/app/api/actions/route.ts), você está salvando o dislike na coleção de favoritos.

Sugiro não salvar o dislike nessa coleção, ou salvar em uma coleção separada chamada historico_acoes. Se você mantiver como está, a solução acima (usando .where) é obrigatória para performance e funcionamento correto.

/**
 * Busca os últimos 10 favoritos REAIS de um cliente
 * CORREÇÃO: Filtra 'like' no banco para evitar que dislikes ocupem o limite
 */
export async function fetchFavoriteLooks(params: {
  lojistaId: string;
  customerId: string;
}) {
  const { lojistaId, customerId } = params;
  if (!lojistaId || !customerId) return [];

  try {
    let snapshot;
    const ref = clienteFavoritosRef(lojistaId, customerId);

    try {
      // --- SOLUÇÃO DO MISTÉRIO ---
      // Filtramos APENAS onde action == 'like'.
      // Assim, mesmo que existam 1000 dislikes recentes, o banco vai pular eles
      // e buscar os likes que estão salvos atrás deles.
      snapshot = await ref
        .where("action", "==", "like") 
        .orderBy("createdAt", "desc")
        .limit(10) // Agora podemos limitar a 10 com segurança
        .get();

    } catch (error: any) {
      // ERRO DE ÍNDICE NO FIRESTORE
      // Se der erro porque falta o índice composto (action + createdAt),
      // o link para criar estará no console.log do servidor.
      if (error?.code === 'failed-precondition') {
        console.error("⚠️ FALTA ÍNDICE NO FIRESTORE! Crie o índice clicando no link do erro abaixo:");
        console.error(error);
        
        // FALLBACK (PLANO B):
        // Se não tiver índice, busca MUITOS itens para tentar achar os likes
        // Aumentei de 50 para 200 para garantir
        console.log("[fetchFavoriteLooks] Usando fallback sem índice (limit 200)");
        snapshot = await ref
          .orderBy("createdAt", "desc")
          .limit(200) 
          .get();
      } else {
        throw error;
      }
    }

    const results: any[] = [];

    snapshot.forEach((doc: any) => {
      const data = typeof doc.data === "function" ? doc.data() : doc.data;
      
      // Dupla verificação (caso use o fallback ou dados legados)
      const action = data?.action || data?.tipo || data?.votedType;
      
      // Se a query principal funcionou, isso aqui é redundante mas seguro.
      // Se caiu no fallback, isso aqui é essencial.
      const isLike = action === "like" || (!action && !data?.action); 
      const isDislike = action === "dislike";

      if (isDislike) return; // Ignora dislikes
      if (!isLike) return;   // Ignora outros tipos

      const hasImage = data?.imagemUrl && data.imagemUrl.trim() !== "";
      if (!hasImage) return;

      // Tratamento de Data
      let createdAt = data?.createdAt;
      if (createdAt?.toDate) {
        createdAt = createdAt.toDate();
      } else if (createdAt?.seconds) {
        createdAt = new Date(createdAt.seconds * 1000);
      } else if (typeof createdAt === 'string') {
        createdAt = new Date(createdAt);
      } else {
        createdAt = new Date();
      }

      results.push({
        id: doc.id,
        ...data,
        createdAt: createdAt
      });
    });

    // Ordenação final (para garantir)
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Retorna os top 10
    return results.slice(0, 10);

  } catch (error) {
    console.error("[fetchFavoriteLooks] Erro crítico:", error);
    return [];
  }
}