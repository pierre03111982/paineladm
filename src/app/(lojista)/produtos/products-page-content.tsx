"use client";

import { useState } from "react";
import { Plus, Upload, FileText, Download, XCircle, Package } from "lucide-react";
import { ProductsTable } from "./products-table";
import type { ProdutoDoc } from "@/lib/firestore/types";
import { ManualProductForm } from "./manual-product-form";
import { ImportCatalogModal } from "./import-catalog-modal";
import { PageWrapper } from "@/components/ui/PageWrapper";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { motion } from "framer-motion";
import { IconPageHeader } from "../components/icon-page-header";
import { getPageHeaderColors } from "../components/page-header-colors";

type ProductsPageContentProps = {
  initialProdutos: ProdutoDoc[];
  lojistaId: string;
  perfil?: {
    descontoRedesSociais?: number | null;
  } | null;
};

export function ProductsPageContent({ initialProdutos, lojistaId, perfil }: ProductsPageContentProps) {
  const [showManualForm, setShowManualForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const activeProducts = initialProdutos.filter(p => !p.arquivado);
  const draftProducts = initialProdutos.filter(p => p.arquivado);
  const colors = getPageHeaderColors('/produtos');

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
              onClick={() => {
                console.log("[ProductsPageContent] Abrindo modal manual");
                setShowManualForm(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-500 hover:via-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/30 px-4 py-2.5 text-sm font-semibold transition-all duration-300"
              style={{ color: '#FFFFFF' }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="h-4 w-4 text-white" style={{ color: '#FFFFFF' }} />
              <span className="text-white" style={{ color: '#FFFFFF' }}>Adicionar produto</span>
            </motion.button>
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
        </div>

        <ProductsTable
          initialProdutos={initialProdutos}
          lojistaId={lojistaId}
          initialLojaDiscount={perfil?.descontoRedesSociais ?? null}
        />
        </AnimatedCard>

        {/* Modais */}
        {showManualForm && (
        <ManualProductForm
          lojistaId={lojistaId}
          onClose={() => {
            console.log("[ProductsPageContent] Fechando modal manual");
            setShowManualForm(false);
          }}
        />
      )}

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

