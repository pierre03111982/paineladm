import { ComposicoesVisualHistory } from "./composicoes-visual-history";
import { fetchAllCompositionsForVisualHistory, type CompositionForVisualHistory } from "./fetch-all-compositions";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";

export const dynamic = 'force-dynamic';

type SearchParams = {
  lojistaId?: string;
};

export default async function ComposicoesVisualPage({
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

  let compositions: CompositionForVisualHistory[] = [];
  
  try {
    compositions = await fetchAllCompositionsForVisualHistory(lojistaId);
  } catch (error) {
    console.error("[ComposicoesVisualPage] Erro ao buscar composições:", error);
  }

  return (
    <div className="space-y-6 p-6">
      <ComposicoesVisualHistory
        initialCompositions={compositions}
        lojistaId={lojistaId}
      />
    </div>
  );
}


