"use client";

import { useState } from "react";
import { Plus, Upload, Download, Package, Ruler } from "lucide-react";
import { ProductsTable } from "./products-table";
import type { ProdutoDoc } from "@/lib/firestore/types";
import { ImportCatalogModal } from "./import-catalog-modal";
import { PageWrapper } from "@/components/ui/PageWrapper";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { motion } from "framer-motion";
import { IconPageHeader } from "../components/icon-page-header";
import { getPageHeaderColors } from "../components/page-header-colors";
import { useRouter, useSearchParams } from "next/navigation";
import { FittingModal } from "@/components/store/virtual-fitting";

type ProductsPageContentProps = {
  initialProdutos: ProdutoDoc[];
  lojistaId: string;
  perfil?: {
    descontoRedesSociais?: number | null;
  } | null;
};

const PRODUCT_MEASUREMENTS_TEST: Record<string, Record<string, number>> = {
  P: { Busto: 88, Cintura: 72, Quadril: 92 },
  M: { Busto: 92, Cintura: 76, Quadril: 96 },
  G: { Busto: 96, Cintura: 80, Quadril: 100 },
  GG: { Busto: 100, Cintura: 84, Quadril: 104 },
  XG: { Busto: 104, Cintura: 88, Quadril: 108 },
};

export function ProductsPageContent({ initialProdutos, lojistaId, perfil }: ProductsPageContentProps) {
  const [showImportModal, setShowImportModal] = useState(false);
  const [showFittingModal, setShowFittingModal] = useState(false);
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
        <AnimatedCard className="p-4 overflow-hidden">
        <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-[var(--text-main)] font-heading mb-0.5">Inventário</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Gerencie o catálogo que alimenta o Provador Virtual.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <motion.button
              onClick={handleAddProduct}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-500 hover:via-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/30 px-3 py-2 text-sm font-semibold transition-all duration-300"
              style={{ color: '#FFFFFF' }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="h-4 w-4 text-white" style={{ color: '#FFFFFF' }} />
              <span className="text-white" style={{ color: '#FFFFFF' }}>Adicionar produto</span>
            </motion.button>
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 shadow-lg shadow-emerald-500/30 px-3 py-2 text-sm font-semibold transition-all duration-300"
              style={{ color: '#FFFFFF' }}
            >
              <Upload className="h-4 w-4" style={{ color: '#FFFFFF' }} />
              <span style={{ color: '#FFFFFF' }}>Importar CSV</span>
            </button>
            <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-gray-50">
              <Download className="h-4 w-4" />
              Modelo CSV
            </button>
            <motion.button
              onClick={() => setShowFittingModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow-lg shadow-red-500/30 px-3 py-2 text-sm font-semibold transition-all duration-300"
              whileTap={{ scale: 0.95 }}
            >
              <Ruler className="h-4 w-4 text-white" style={{ color: '#FFFFFF' }} />
              <span className="text-white" style={{ color: '#FFFFFF' }}>Testar Ajustador de Medidas</span>
            </motion.button>
          </div>
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

        {/* Modal Ajuste de Medidas (abre direto ao clicar em Testar Ajustador) */}
        <FittingModal
          isOpen={showFittingModal}
          onClose={() => setShowFittingModal(false)}
          productId="produto-teste-ajustador"
          productMeasurements={PRODUCT_MEASUREMENTS_TEST}
          sizeOrder={["P", "M", "G", "GG", "XG"]}
        />
      </div>
    </PageWrapper>
  );
}

