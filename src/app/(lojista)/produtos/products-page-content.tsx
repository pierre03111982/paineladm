"use client";

import { useState } from "react";
import { Plus, Upload, FileText, Download, ExternalLink, Info, CheckCircle2, XCircle } from "lucide-react";
import { ProductsTable } from "./products-table";
import type { ProdutoDoc } from "@/lib/firestore/types";
import { ManualProductForm } from "./manual-product-form";
import { ImportCatalogModal } from "./import-catalog-modal";
import { PageWrapper } from "@/components/ui/PageWrapper";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { motion } from "framer-motion";

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
  const [showEcommerceWaitlist, setShowEcommerceWaitlist] = useState(false);

  const activeProducts = initialProdutos.filter(p => !p.arquivado);
  const draftProducts = initialProdutos.filter(p => p.arquivado);

  return (
    <PageWrapper>
      <div className="w-full space-y-8">
        {/* Seção Produtos */}
        <AnimatedCard className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-[var(--text-main)] mb-2 font-heading">Produtos</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Gerencie o catálogo que alimenta o Provador Virtual. Cadastre novas peças manualmente, importe via planilha ou sincronize com seu e-commerce.
            </p>
          </div>
          <div className="flex gap-3">
            <motion.button
              onClick={() => {
                console.log("[ProductsPageContent] Abrindo modal manual");
                setShowManualForm(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/30 px-4 py-2.5 text-sm font-semibold transition-all duration-300"
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="h-4 w-4" />
              Adicionar produto
            </motion.button>
            <button
              onClick={() => {
                console.log("[ProductsPageContent] Abrindo modal import");
                setShowImportModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-white transition-all hover:bg-gray-50 dark:hover:bg-[var(--bg-card)]/80"
            >
              <Upload className="h-4 w-4" />
              Importar catálogo
            </button>
          </div>
        </div>
        </AnimatedCard>

        {/* Seção Inventário */}
        <AnimatedCard className="p-6 overflow-hidden">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-main)] font-heading">Inventário</h2>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
              <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
              Ativo
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
              <div className="h-2 w-2 rounded-full bg-gray-500"></div>
              Rascunho
            </button>
          </div>
        </div>

        <div className="mb-4">
            <p className="text-sm text-[var(--text-secondary)] mb-3">
            {activeProducts.length} produto(s) disponível(is) no provador.
          </p>
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nome, categoria, tag ou ID..."
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] px-4 py-2.5 pl-10 text-sm text-slate-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400 focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none"
            />
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        <ProductsTable
          initialProdutos={initialProdutos}
          lojistaId={lojistaId}
          initialLojaDiscount={perfil?.descontoRedesSociais ?? null}
        />
        </AnimatedCard>

        {/* Seção Manual */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <AnimatedCard className="p-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">MANUAL</span>
          </div>
            <h3 className="text-lg font-semibold text-[var(--text-main)] mb-2 font-heading">Cadastro manual de produto</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
            Preencha as informações essenciais do produto, faça upload da foto e disponibilize imediatamente no provador. Ideal para peças exclusivas ou lançamentos rápidos.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowManualForm(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] px-4 py-2 text-sm font-medium text-slate-700 dark:text-white transition-all hover:bg-gray-50 dark:hover:bg-[var(--bg-card)]/80"
            >
              Abrir formulário
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] px-4 py-2 text-sm font-medium text-slate-700 dark:text-white transition-all hover:bg-gray-50 dark:hover:bg-[var(--bg-card)]/80">
              Ver guia de preenchimento
            </button>
          </div>
          </AnimatedCard>

          <AnimatedCard className="p-6">
          <h4 className="text-sm font-semibold text-[var(--text-main)] dark:text-white mb-3">Campos sugeridos</h4>
          <ul className="space-y-2 text-sm text-[var(--text-secondary)] dark:text-white/85">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-indigo-600 dark:text-indigo-300 flex-shrink-0" />
              <span>Foto em alta resolução (PNG ou JPG)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-indigo-300 flex-shrink-0" />
              <span>Nome, preço, categoria e coleção</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-indigo-300 flex-shrink-0" />
              <span>Cores, tamanhos e estoque disponível</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-indigo-300 flex-shrink-0" />
              <span>Observações para IA (ex: materiais, detalhes)</span>
            </li>
          </ul>
          <div className="mt-4 rounded-lg border border-indigo-100 dark:border-white/15 bg-indigo-50 dark:bg-white/5 p-3 shadow-sm text-xs text-indigo-900 dark:text-white/85">
            <p>
              <Info className="inline h-3.5 w-3.5 mr-1" />
              Dica: produtos com fotos neutras e fundo limpo têm resultado melhor nas combinações inteligentes do provador.
            </p>
          </div>
          </AnimatedCard>
        </div>

        {/* Seção Importação */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <AnimatedCard className="p-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">IMPORTAÇÃO</span>
          </div>
            <h3 className="text-lg font-semibold text-[var(--text-main)] mb-2 font-heading">Importar produtos em massa</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
            Suba uma planilha padrão para cadastrar dezenas de produtos em segundos. Ideal para atualizar coleções completas ou trazer o catálogo do e-commerce.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white shadow-lg shadow-emerald-500/30 px-4 py-2 text-sm font-medium transition-all duration-300"
            >
              <Upload className="h-4 w-4" />
              Enviar arquivo CSV
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] px-4 py-2 text-sm font-medium text-slate-700 dark:text-white transition-all hover:bg-gray-50 dark:hover:bg-[var(--bg-card)]/80">
              <Download className="h-4 w-4" />
              Baixar modelo
            </button>
          </div>
          </AnimatedCard>

          <AnimatedCard className="p-6" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
          <h4 className="text-sm font-semibold text-[var(--text-main)] mb-2">Conecte seu e-commerce</h4>
          <p className="text-sm text-emerald-900 dark:text-emerald-300 mb-4">
            Estamos preparando integrações nativas com Shopify, Nuvemshop e VTEX para que seu catálogo fique sempre sincronizado. Cadastre-se na lista de espera e seja avisado em primeira mão.
          </p>
            <button
              onClick={() => setShowEcommerceWaitlist(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 dark:border-emerald-500 bg-emerald-100 dark:bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-900 dark:text-emerald-300 transition-all hover:bg-emerald-200 dark:hover:bg-emerald-500/30"
            >
            Quero ser avisado
            <ExternalLink className="h-4 w-4" />
          </button>
          </AnimatedCard>
        </div>

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

      {showEcommerceWaitlist && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-8 sm:pt-12 overflow-y-auto">
          <div className="w-full max-w-md neon-card rounded-xl p-6 mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[var(--text-main)] font-heading">Lista de Espera</h2>
              <button
                onClick={() => setShowEcommerceWaitlist(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Em breve, você poderá conectar seu e-commerce diretamente ao provador virtual. Cadastre-se para ser notificado quando as integrações estiverem disponíveis.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-main)] mb-1">Email</label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-main)] mb-1">Plataforma de interesse</label>
                <select className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none">
                  <option>Shopify</option>
                  <option>Nuvemshop</option>
                  <option>VTEX</option>
                  <option>Outra</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowEcommerceWaitlist(false)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] px-4 py-2 text-sm text-slate-700 dark:text-white transition-all hover:bg-gray-50 dark:hover:bg-[var(--bg-card)]/80"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  alert("Cadastro realizado! Você será notificado quando as integrações estiverem disponíveis.");
                  setShowEcommerceWaitlist(false);
                }}
                className="rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white shadow-lg shadow-emerald-500/30 px-4 py-2 text-sm font-semibold transition-all duration-300"
              >
                Cadastrar
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </PageWrapper>
  );
}

