"use client";

import { useState, useEffect } from "react";
import { X, Search, Loader2, Plus } from "lucide-react";

interface Product {
  id: string;
  nome: string;
  imagemUrl?: string;
  categoria?: string;
  tags?: string[];
}

interface ManualCombinationModalProps {
  lojistaId: string;
  currentProductTags?: string[];
  onClose: () => void;
  onConfirm: (productIds: string[]) => void;
}

export function ManualCombinationModal({
  lojistaId,
  currentProductTags = [],
  onClose,
  onConfirm,
}: ManualCombinationModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSlots, setSelectedSlots] = useState<(Product | null)[]>([null, null]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [lojistaId]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/lojista/products?lojistaId=${lojistaId}&limit=100`
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao carregar produtos");
      }
      
      const data = await response.json();
      // A API pode retornar um array diretamente ou um objeto com products
      const productsList = Array.isArray(data) ? data : (data.products || data.data || []);
      setProducts(productsList);
    } catch (error) {
      console.error("[ManualCombinationModal] Erro ao carregar produtos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = (product: Product) => {
    const emptySlotIndex = selectedSlots.findIndex(slot => slot === null);
    if (emptySlotIndex === -1) {
      alert("Você já selecionou 2 produtos. Remova um para adicionar outro.");
      return;
    }

    const newSlots = [...selectedSlots];
    newSlots[emptySlotIndex] = product;
    setSelectedSlots(newSlots);
  };

  const handleRemoveProduct = (index: number) => {
    const newSlots = [...selectedSlots];
    newSlots[index] = null;
    setSelectedSlots(newSlots);
  };

  const handleConfirm = () => {
    const productIds = selectedSlots
      .filter(slot => slot !== null)
      .map(slot => slot!.id);

    if (productIds.length === 0) {
      alert("Selecione pelo menos 1 produto para combinar");
      return;
    }

    setGenerating(true);
    onConfirm(productIds);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(products.map(p => p.categoria).filter(Boolean)));

  const selectedCount = selectedSlots.filter(slot => slot !== null).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Montar Look Combinado
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Área de Slots */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Produtos Selecionados
            </h3>
            <span className="text-sm text-gray-500">
              Itens selecionados: {selectedCount}/2
            </span>
          </div>
          
          <div className="flex gap-4">
            {/* Slot Fixo: Produto Principal */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Produto Principal (Atual)
              </label>
              <div className="aspect-square rounded-lg border-2 border-indigo-500 bg-indigo-50 p-2">
                <div className="w-full h-full flex items-center justify-center text-indigo-600">
                  <span className="text-sm font-semibold">Produto Atual</span>
                </div>
              </div>
            </div>

            {/* Slot 1 */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Peça Complementar 1
              </label>
              <div className="aspect-square rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 relative overflow-hidden">
                {selectedSlots[0] ? (
                  <>
                    {selectedSlots[0].imagemUrl && (
                      <img
                        src={selectedSlots[0].imagemUrl}
                        alt={selectedSlots[0].nome}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <button
                      onClick={() => handleRemoveProduct(0)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-xs font-semibold truncate">
                      {selectedSlots[0].nome}
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Plus className="h-8 w-8" />
                  </div>
                )}
              </div>
            </div>

            {/* Slot 2 */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Peça Complementar 2
              </label>
              <div className="aspect-square rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 relative overflow-hidden">
                {selectedSlots[1] ? (
                  <>
                    {selectedSlots[1].imagemUrl && (
                      <img
                        src={selectedSlots[1].imagemUrl}
                        alt={selectedSlots[1].nome}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <button
                      onClick={() => handleRemoveProduct(1)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-xs font-semibold truncate">
                      {selectedSlots[1].nome}
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Plus className="h-8 w-8" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Ferramentas */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
            >
              <option value="">Todas as categorias</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid de Produtos */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Nenhum produto encontrado
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredProducts.map((product) => {
                const isSelected = selectedSlots.some(slot => slot?.id === product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => !isSelected && handleAddProduct(product)}
                    disabled={isSelected}
                    className={`relative aspect-square rounded-lg border-2 overflow-hidden transition ${
                      isSelected
                        ? "border-green-500 bg-green-50 opacity-50 cursor-not-allowed"
                        : "border-gray-200 hover:border-indigo-500"
                    }`}
                  >
                    {product.imagemUrl ? (
                      <img
                        src={product.imagemUrl}
                        alt={product.nome}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-xs text-center p-2">
                        {product.nome}
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-1 text-xs font-semibold truncate px-2">
                      {product.nome}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedCount === 0 || generating}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Gerando...</span>
              </>
            ) : (
              <>
                <span>✨ Gerar Look com Seleção (Custo: 2 Créditos)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

