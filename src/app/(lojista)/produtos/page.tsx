import { ProductsTable } from "./products-table";
import { fetchProdutos, fetchLojaPerfil } from "@/lib/firestore/server";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { PageHeader } from "../components/page-header";
import { ProductsPageContent } from "./products-page-content";

// Force new deploy - 2025-01-23 - Git connected
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0; // Sempre renderizar do zero, sem cache
export const fetchCache = 'force-no-store'; // Forçar busca sem cache
export const runtime = 'nodejs'; // Forçar runtime Node.js (não Edge)

type ProdutosPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ProdutosPage({ searchParams }: ProdutosPageProps) {
  const params = await searchParams;
  // Tentar ler tanto lojistaId quanto lojistald (para compatibilidade com typos)
  const lojistaIdFromQuery = (params.lojistaId || params.lojistald) as string | undefined;
  
  // Prioridade: query string (modo admin) > usuário logado > env var
  const lojistaIdFromAuth = lojistaIdFromQuery ? null : await getCurrentLojistaId();
  const lojistaId =
    lojistaIdFromQuery ||
    lojistaIdFromAuth ||
    process.env.NEXT_PUBLIC_LOJISTA_ID ||
    process.env.LOJISTA_ID ||
    "";

  if (!lojistaId) {
    console.error("[ProdutosPage] ERRO: lojistaId está vazio!");
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Erro: ID da loja não encontrado</h1>
        <p className="text-gray-600">Por favor, faça login novamente ou forneça o lojistaId na URL.</p>
      </div>
    );
  }

  try {
    const includeArchived = params.includeArchived === "true";
    const produtos = await fetchProdutos(lojistaId);
    const perfil = await fetchLojaPerfil(lojistaId);
    
    console.log("[ProdutosPage] lojistaId:", lojistaId);
    console.log("[ProdutosPage] Produtos encontrados:", produtos.length);
    
    // Filtrar arquivados se necessário
    const filteredProdutos = includeArchived 
      ? produtos 
      : produtos.filter((p) => !p.arquivado);

    console.log("[ProdutosPage] Produtos filtrados (arquivados):", filteredProdutos.length);

    return (
      <ProductsPageContent 
        initialProdutos={filteredProdutos}
        perfil={perfil}
        lojistaId={lojistaId}
      />
    );
  } catch (error: any) {
    console.error("[ProdutosPage] Erro ao carregar produtos:", error);
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Erro ao carregar produtos</h1>
        <p className="text-gray-600">{error.message || "Erro desconhecido"}</p>
      </div>
    );
  }
}
