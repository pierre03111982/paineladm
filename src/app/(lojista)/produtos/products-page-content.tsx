"use client";

import { useState } from "react";
import { Plus, Upload, FileText, Download, XCircle, Package, Sparkles, Loader2, Ruler } from "lucide-react";
import { ProductsTable } from "./products-table";
import type { ProdutoDoc } from "@/lib/firestore/types";
import { ImportCatalogModal } from "./import-catalog-modal";
import { PageWrapper } from "@/components/ui/PageWrapper";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { motion } from "framer-motion";
import { IconPageHeader } from "../components/icon-page-header";
import { getPageHeaderColors } from "../components/page-header-colors";
import { useRouter, useSearchParams } from "next/navigation";

type ProductsPageContentProps = {
  initialProdutos: ProdutoDoc[];
  lojistaId: string;
  perfil?: {
    descontoRedesSociais?: number | null;
  } | null;
};

export function ProductsPageContent({ initialProdutos, lojistaId, perfil }: ProductsPageContentProps) {
  const [showImportModal, setShowImportModal] = useState(false);
  const [analyzingBulk, setAnalyzingBulk] = useState(false);
  const [bulkAnalysisResult, setBulkAnalysisResult] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const lojistaIdFromUrl = searchParams?.get("lojistaId") || searchParams?.get("lojistald");

  const activeProducts = initialProdutos.filter(p => !p.arquivado);
  const draftProducts = initialProdutos.filter(p => p.arquivado);
  const colors = getPageHeaderColors('/produtos');

  const handleAddProduct = () => {
    console.log("[ProductsPageContent] Navegando para /produtos/novo", { lojistaIdFromUrl });
    if (lojistaIdFromUrl) {
      router.push(`/produtos/novo?lojistaId=${lojistaIdFromUrl}`);
    } else {
      router.push("/produtos/novo");
    }
  };

  const handleBulkAnalyze = async () => {
    if (!confirm("Deseja analisar todos os produtos do catálogo? Isso pode levar alguns minutos.")) {
      return;
    }

    try {
      setAnalyzingBulk(true);
      setBulkAnalysisResult(null);

      const response = await fetch("/api/lojista/products/bulk-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          lojistaId: lojistaIdFromUrl || lojistaId,
          limit: 1000,
          skip: 0
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao executar análise em massa");
      }

      const result = await response.json();
      setBulkAnalysisResult(
        `Análise concluída! Processados: ${result.processed}, Atualizados: ${result.updated}, Erros: ${result.errors}, Pulados: ${result.skipped}`
      );
      
      // Recarregar a página após 2 segundos para mostrar os dados atualizados
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error("[ProductsPageContent] Erro na análise em massa:", error);
      setBulkAnalysisResult(`Erro: ${error.message}`);
    } finally {
      setAnalyzingBulk(false);
    }
  };

  return (
    <PageWrapper>
      <div className="w-full space-y-6">
        <IconPageHeader
          icon={Package}
          title="Produtos"
          description="Gerencie o catálogo que alimenta o Provador Virtual. Cadastre novas peças manualmente, importe via planilha ou sincronize com seu e-commerce."
          gradientFrom={colors.from}
          gradientTo={colors.to}
          shadowColor={colors.shadow}
        />

        {/* Seção Unificada - Inventário e Importação */}
        <AnimatedCard className="p-6 overflow-hidden">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-[var(--text-main)] font-heading mb-2">Inventário</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Gerencie o catálogo que alimenta o Provador Virtual.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <motion.button
              onClick={handleAddProduct}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-500 hover:via-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/30 px-4 py-2.5 text-sm font-semibold transition-all duration-300"
              style={{ color: '#FFFFFF' }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="h-4 w-4 text-white" style={{ color: '#FFFFFF' }} />
              <span className="text-white" style={{ color: '#FFFFFF' }}>Adicionar produto</span>
            </motion.button>
            <button
              onClick={handleBulkAnalyze}
              disabled={analyzingBulk}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-500 hover:via-pink-500 hover:to-purple-500 text-white shadow-lg shadow-purple-500/30 px-4 py-2.5 text-sm font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {analyzingBulk ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#FFFFFF', stroke: '#FFFFFF' }} />
                  <span style={{ color: '#FFFFFF' }}>Analisando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" style={{ color: '#FFFFFF', stroke: '#FFFFFF' }} />
                  <span style={{ color: '#FFFFFF' }}>Analisar Todos os Produtos</span>
                </>
              )}
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 shadow-lg shadow-emerald-500/30 px-4 py-2.5 text-sm font-semibold transition-all duration-300"
                style={{ color: '#FFFFFF' }}
              >
                <Upload className="h-4 w-4" style={{ color: '#FFFFFF' }} />
                <span style={{ color: '#FFFFFF' }}>Importar CSV</span>
              </button>
              <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-white transition-all hover:bg-gray-50 dark:hover:bg-[var(--bg-card)]/80">
                <Download className="h-4 w-4" />
                Modelo CSV
              </button>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <motion.button
              onClick={() => router.push("/ajustador-medidas-test")}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow-lg shadow-red-500/30 px-4 py-2.5 text-sm font-semibold transition-all duration-300"
              whileTap={{ scale: 0.95 }}
            >
              <Ruler className="h-4 w-4 text-white" style={{ color: '#FFFFFF' }} />
              <span className="text-white" style={{ color: '#FFFFFF' }}>Testar Ajustador de Medidas</span>
            </motion.button>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              Teste a funcionalidade de Provador Virtual / Ajustador de Medidas
            </p>
          </div>
          {bulkAnalysisResult && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              bulkAnalysisResult.startsWith("Erro") 
                ? "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300" 
                : "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300"
            }`}>
              {bulkAnalysisResult}
            </div>
          )}
        </div>

        <ProductsTable
          initialProdutos={initialProdutos}
          lojistaId={lojistaId}
          initialLojaDiscount={perfil?.descontoRedesSociais ?? null}
        />
        </AnimatedCard>

        {/* Modal de Importação */}
        {showImportModal && (
          <ImportCatalogModal
            lojistaId={lojistaId}
            onClose={() => {
              console.log("[ProductsPageContent] Fechando modal import");
              setShowImportModal(false);
            }}
          />
        )}
      </div>
    </PageWrapper>
  );
}

