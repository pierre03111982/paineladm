"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Check } from "lucide-react";

export interface ProductForCombo {
  id: string;
  nome: string;
  categoria?: string;
  /** URL da foto de catálogo (9:16) — prioridade: imagemUrlCatalogo > catalogImageUrls[0] > imagemUrl */
  catalogImageUrl: string | null;
}

interface OutroProdutoModalProps {
  lojistaId: string;
  onClose: () => void;
  onConfirm: (products: [ProductForCombo | null, ProductForCombo | null]) => void;
}

export function OutroProdutoModal({
  lojistaId,
  onClose,
  onConfirm,
}: OutroProdutoModalProps) {
  const [products, setProducts] = useState<ProductForCombo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selected, setSelected] = useState<(ProductForCombo | null)[]>([null, null]);

  useEffect(() => {
    loadProducts();
  }, [lojistaId]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/lojista/products?lojistaId=${lojistaId}&limit=200`
      );
      if (!response.ok) throw new Error("Erro ao carregar produtos");
      const data = await response.json();
      const list = Array.isArray(data) ? data : data.products || data.data || [];
      const mapped: ProductForCombo[] = list.map((p: any) => ({
        id: p.id,
        nome: p.nome || "Sem nome",
        categoria: p.categoria,
        catalogImageUrl:
          p.imagemUrlCatalogo ||
          (Array.isArray(p.catalogImageUrls) && p.catalogImageUrls[0]) ||
          p.imagemUrl ||
          null,
      }));
      setProducts(mapped);
    } catch (e) {
      console.error("[OutroProdutoModal] Erro:", e);
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(
    new Set(products.map((p) => p.categoria).filter(Boolean))
  ) as string[];

  const filtered = products.filter((p) => {
    const matchCat = !selectedCategory || p.categoria === selectedCategory;
    return matchCat;
  });

  const toggleProduct = (product: ProductForCombo) => {
    const idx = selected.findIndex((s) => s?.id === product.id);
    if (idx !== -1) {
      const next = [...selected];
      next[idx] = null;
      setSelected(next);
      return;
    }
    const emptyIdx = selected.findIndex((s) => s === null);
    if (emptyIdx === -1) {
      return;
    }
    const next = [...selected];
    next[emptyIdx] = product;
    setSelected(next);
  };

  const handleConfirm = () => {
    onConfirm([selected[0] ?? null, selected[1] ?? null]);
    onClose();
  };

  const selectedCount = selected.filter((s) => s !== null).length;

  const modalContent = (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" aria-modal="true" role="dialog">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div
          className="relative flex items-center justify-end p-4 border-b-2 border-indigo-500/50 rounded-t-2xl"
          style={{
            background: 'linear-gradient(to right, #0f172a 0%, #1e3a8a 25%, #4169E1 50%, #1e3a8a 75%, #0f172a 100%)',
          }}
        >
          <h2
            className="absolute left-0 right-0 flex justify-center items-center text-lg font-bold whitespace-nowrap pointer-events-none"
            style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
          >
            Escolher produtos para o look (máx. 2, categorias diferentes)
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="relative z-10 p-2 hover:bg-white/10 rounded-lg transition shrink-0"
            aria-label="Fechar"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-200 flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Filtrar por categoria:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
          >
            <option value="">Todas</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <span className="text-sm text-gray-500">
            Selecionados: {selectedCount}/2
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nenhum produto encontrado.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {filtered.map((product) => {
                const isSelected = selected.some((s) => s?.id === product.id);
                const slotIndex = selected.findIndex((s) => s?.id === product.id);
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => toggleProduct(product)}
                    className={`relative rounded-lg border-2 overflow-hidden transition text-left ${
                      isSelected
                        ? "border-rose-500 ring-2 ring-rose-300"
                        : "border-gray-200 hover:border-rose-300"
                    }`}
                    style={{ aspectRatio: "9/16" }}
                  >
                    {product.catalogImageUrl ? (
                      <img
                        src={product.catalogImageUrl}
                        alt={product.nome}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-xs p-2 text-center">
                        {product.nome}
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 bg-rose-500/20 flex items-center justify-center">
                        <span className="bg-rose-500 text-white rounded-full p-1.5">
                          <Check className="h-4 w-4" />
                        </span>
                      </div>
                    )}
                    {slotIndex !== -1 && (
                      <div className="absolute top-1 left-1 bg-rose-500 text-white text-[10px] font-bold rounded px-1.5 py-0.5">
                        {slotIndex + 1}
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-blue-600 px-2 py-2 text-xs font-semibold text-center break-words line-clamp-2 flex items-center justify-center" style={{ color: '#ffffff' }}>
                      {product.nome}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-semibold text-sm"
            style={{ color: '#ffffff' }}
          >
            Confirmar e fechar
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
