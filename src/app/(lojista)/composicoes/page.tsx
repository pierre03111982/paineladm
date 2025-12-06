import { ComposicoesVisualHistory } from "./composicoes-visual-history";
import { fetchAllCompositionsWithLike } from "./fetch-all-compositions-with-like";
import { countAllCompositions } from "./count-compositions";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Sempre buscar dados atualizados
export const fetchCache = 'force-no-store'; // Não usar cache

type SearchParams = {
  lojistaId?: string;
};

export default async function ComposicoesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams> | SearchParams;
}) {
  const params = await Promise.resolve(searchParams);
  const lojistaIdFromQuery = params.lojistaId;
  
  // Prioridade: query string (modo admin) > usuário logado > env var
  const lojistaIdFromAuth = lojistaIdFromQuery ? null : await getCurrentLojistaId();
  const lojistaId =
    lojistaIdFromQuery ||
    lojistaIdFromAuth ||
    process.env.NEXT_PUBLIC_LOJISTA_ID ||
    process.env.LOJISTA_ID ||
    "";

  let compositions = [];
  let totalCount = 0;
  
  console.log(`[ComposicoesPage] 🔍 Buscando composições para lojistaId: ${lojistaId}`);
  
  try {
    // Contar total de composições no banco
    const countResult = await countAllCompositions(lojistaId);
    totalCount = countResult.unique;
    console.log(`[ComposicoesPage] 📊 Total de composições no banco: ${totalCount}`);
    
    // Buscar TODAS as composições que receberam LIKE (mesma lógica do Radar)
    // O Radar mostra apenas composições que receberam like, então vamos fazer o mesmo
    compositions = await fetchAllCompositionsWithLike(lojistaId);
    console.log(`[ComposicoesPage] ✅ Composições com LIKE carregadas: ${compositions.length}`);
    
    // Log das datas das composições encontradas (primeiras e últimas)
    if (compositions.length > 0) {
      const sorted = [...compositions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const maisRecente = sorted[0];
      const maisAntiga = sorted[sorted.length - 1];
      console.log(`[ComposicoesPage] 📅 Mais recente: ${maisRecente.createdAt.toLocaleDateString("pt-BR")} ${maisRecente.createdAt.toLocaleTimeString("pt-BR")}`);
      console.log(`[ComposicoesPage] 📅 Mais antiga: ${maisAntiga.createdAt.toLocaleDateString("pt-BR")} ${maisAntiga.createdAt.toLocaleTimeString("pt-BR")}`);
      
      // Verificar se há composições de 03, 04 ou 05/12
      const data03 = new Date(2025, 11, 3, 0, 0, 0); // 03/12/2025 00:00:00
      const data06 = new Date(2025, 11, 6, 0, 0, 0); // 06/12/2025 00:00:00 (para incluir até 05/12)
      
      const composicoesRecentes = compositions.filter(comp => {
        const compDate = new Date(comp.createdAt);
        return compDate >= data03 && compDate < data06;
      });
      
      console.log(`[ComposicoesPage] 📅 Composições de 03-05/12: ${composicoesRecentes.length}`);
      
      // Log detalhado se não encontrou
      if (composicoesRecentes.length === 0) {
        console.log(`[ComposicoesPage] ⚠️  Nenhuma composição encontrada para 03-05/12`);
        console.log(`[ComposicoesPage] 📅 Data de corte: ${data03.toLocaleDateString("pt-BR")} até ${data06.toLocaleDateString("pt-BR")}`);
        console.log(`[ComposicoesPage] 📅 Mais recente encontrada: ${maisRecente.createdAt.toLocaleDateString("pt-BR")} ${maisRecente.createdAt.toLocaleTimeString("pt-BR")}`);
        
        // Verificar composições das últimas 24 horas
        const agora = new Date();
        const ultimas24h = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
        const composicoes24h = compositions.filter(comp => {
          const compDate = new Date(comp.createdAt);
          return compDate >= ultimas24h;
        });
        console.log(`[ComposicoesPage] 📅 Composições das últimas 24 horas: ${composicoes24h.length}`);
      }
    }
  } catch (error) {
    console.error("[ComposicoesPage] ❌ Erro ao buscar composições:", error);
  }

  return (
    <div className="space-y-6 p-6">
      <ComposicoesVisualHistory
        initialCompositions={compositions}
        lojistaId={lojistaId}
        totalInDatabase={totalCount}
      />
    </div>
  );
}
