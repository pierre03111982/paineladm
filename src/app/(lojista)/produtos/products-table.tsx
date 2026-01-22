"use client";

import { ProductPerformanceAI } from "@/components/products/ProductPerformanceAI";
import { ProductImageGallery } from "@/components/products/ProductImageGallery";

import { useMemo, useState, useEffect, useRef } from "react";
import { Package, Search, Edit, Eye, Archive, ArchiveRestore, Trash2, Filter, X, Upload, Info, Star, RefreshCw, Link2, Settings } from "lucide-react";
import type { ProdutoDoc } from "@/lib/firestore/types";
import { useSearchParams, useRouter } from "next/navigation";
import { PRODUCT_CATEGORY_OPTIONS } from "./category-options";

// ProductGridCard Component - Responsive Grid Card
function ProductGridCard({
  produto,
  selectedProducts,
  toggleProductSelection,
  handleArchive,
  setViewingProduto,
  setEditingProduto,
  handleDelete,
  isAdminView,
  loading,
  descontoRedesSociais = 0,
  lojistaIdParam,
}: {
  produto: ProdutoDoc;
  selectedProducts: Set<string>;
  toggleProductSelection: (id: string) => void;
  handleArchive: (produto: ProdutoDoc, archive: boolean) => Promise<void>;
  setViewingProduto: (produto: ProdutoDoc | null) => void;
  setEditingProduto: (produto: ProdutoDoc | null) => void;
  handleDelete: (produto: ProdutoDoc) => Promise<void>;
  isAdminView: boolean;
  loading: boolean;
  descontoRedesSociais?: number;
  lojistaIdParam?: string | null;
}) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);

  // Preparar array de imagens para a galeria (múltiplas imagens)
  // Ordem: Foto Catálogo (prioridade), Imagem Original, Look Combinado
  const produtoImages = useMemo(() => {
    const images = [];
    
    // 1. Foto Catálogo (prioridade - melhor qualidade)
    if (produto.imagemUrlCatalogo) {
      images.push({
        url: produto.imagemUrlCatalogo,
        label: "Foto Catálogo"
      });
    }
    
    // 2. Imagem Original (se diferente da catálogo)
    const imagemOriginal = produto.imagemUrlOriginal || produto.imagemUrl;
    if (imagemOriginal && imagemOriginal !== produto.imagemUrlCatalogo) {
      images.push({
        url: imagemOriginal,
        label: "Imagem Original"
      });
    }
    
    // 3. Look Combinado
    if (produto.imagemUrlCombinada && produto.imagemUrlCombinada !== produto.imagemUrlCatalogo) {
      images.push({
        url: produto.imagemUrlCombinada,
        label: "Look Combinado"
      });
    }
    
    return images;
  }, [produto.imagemUrlOriginal, produto.imagemUrl, produto.imagemUrlCatalogo, produto.imagemUrlCombinada]);

  // Calcular desconto total e preço com desconto
  const descontoRedes = descontoRedesSociais || 0;
  const descontoEspecial = produto.descontoProduto || 0;
  const descontoTotal = descontoRedes + descontoEspecial;
  const precoOriginal = produto.preco;
  const precoComDesconto = descontoTotal > 0 && precoOriginal > 0
    ? precoOriginal * (1 - descontoTotal / 100)
    : precoOriginal;
  const temDesconto = descontoTotal > 0;

  // Forçar estilos dos botões cyber/modernos diretamente no DOM
  useEffect(() => {
    if (!cardRef.current) return;

    const applyButtonStyles = () => {
      const viewButton = cardRef.current?.querySelector('[data-cyber-button="view"]') as HTMLElement;
      const editButton = cardRef.current?.querySelector('[data-cyber-button="edit"]') as HTMLElement;

      if (viewButton) {
        viewButton.style.setProperty('background', 'linear-gradient(to right, #2563eb, #9333ea)', 'important');
        viewButton.style.setProperty('color', '#ffffff', 'important');
        const viewSpans = viewButton.querySelectorAll('span, svg, path');
        viewSpans.forEach(el => {
          (el as HTMLElement).style.setProperty('color', '#ffffff', 'important');
          (el as HTMLElement).style.setProperty('stroke', '#ffffff', 'important');
        });
      }

      if (editButton) {
        editButton.style.setProperty('background', 'linear-gradient(to right, #0d9488, #10b981)', 'important');
        editButton.style.setProperty('color', '#DC2626', 'important');
        const editSpans = editButton.querySelectorAll('span');
        editSpans.forEach(el => {
          (el as HTMLElement).style.setProperty('color', '#DC2626', 'important');
        });
        const editSvgs = editButton.querySelectorAll('svg, path');
        editSvgs.forEach(el => {
          (el as HTMLElement).style.setProperty('color', '#ffffff', 'important');
          (el as HTMLElement).style.setProperty('stroke', '#ffffff', 'important');
        });
      }
    };

    // Aplicar imediatamente
    applyButtonStyles();

    // Aplicar após um pequeno delay para garantir
    const timeout = setTimeout(applyButtonStyles, 10);
    const timeout2 = setTimeout(applyButtonStyles, 100);

    return () => {
      clearTimeout(timeout);
      clearTimeout(timeout2);
    };
  }, [produto.id]);

  return (
    <div 
      ref={cardRef}
      data-product-card
      className="group relative product-card-gradient rounded-xl overflow-hidden hover:shadow-lg transition-all flex flex-col min-h-[500px]"
      style={{ display: 'flex', flexDirection: 'column', minHeight: '500px', border: '1px solid #60a5fa' }}
    >
      {/* Checkbox - Top Left - Reescrito do zero com cor azul */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!loading) {
            toggleProductSelection(produto.id);
          }
        }}
        disabled={loading}
        className="absolute top-2 left-2 z-20 flex items-center justify-center transition-all shadow-sm hover:shadow-md"
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '4px',
          border: selectedProducts.has(produto.id) ? '2px solid #4f46e5' : '2px solid #60a5fa',
          backgroundColor: selectedProducts.has(produto.id) ? '#4f46e5' : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(4px)',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
        onMouseEnter={(e) => {
          if (!loading && !selectedProducts.has(produto.id)) {
            e.currentTarget.style.borderColor = '#3b82f6';
            e.currentTarget.style.transform = 'scale(1.05)';
          }
        }}
        onMouseLeave={(e) => {
          if (!selectedProducts.has(produto.id)) {
            e.currentTarget.style.borderColor = '#60a5fa';
            e.currentTarget.style.transform = 'scale(1)';
          }
        }}
        aria-label={selectedProducts.has(produto.id) ? "Desmarcar produto" : "Selecionar produto"}
      >
        {selectedProducts.has(produto.id) && (
          <svg 
            width="12" 
            height="12" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="white" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            style={{ pointerEvents: 'none' }}
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Product Image Gallery - Múltiplas Imagens com Navegação */}
      {produtoImages.length > 0 ? (
        <ProductImageGallery
          images={produtoImages}
          aspectRatio="aspect-square"
          className="w-full"
        />
      ) : (
        <div className="aspect-square w-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 relative flex items-center justify-center" style={{ boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)' }}>
          <Package className="h-12 w-12 text-gray-300" />
        </div>
      )}

      {/* Content - Container Flexível com altura mínima */}
      <div className="p-4 flex flex-col flex-1" style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: '0' }}>
        {/* Nome do produto - Limitado a 2 linhas */}
        <div className="flex justify-center items-center w-full mb-3" style={{ flexShrink: 0 }}>
          <div
            style={{ 
              background: 'linear-gradient(to right, #4f46e5, #2563eb, #4f46e5)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'default',
              width: '100%',
              textAlign: 'center',
              minHeight: '48px',
              boxShadow: '0 4px 6px rgba(79, 70, 229, 0.3)'
            }}
            className="font-semibold text-sm"
          >
            <h3 
              style={{ 
                color: '#FFFFFF', 
                margin: 0, 
                padding: 0,
                textAlign: 'center',
                width: '100%',
                lineHeight: '1.4',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontWeight: '600'
              }}
              className="font-semibold text-sm text-white"
            >
              {produto.nome}
            </h3>
          </div>
        </div>

        {/* TABELA 2X2 - GRID CSS PADRONIZADO com altura mínima */}
        <div 
          data-product-info-grid
          style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gridTemplateRows: 'minmax(60px, 1fr) minmax(60px, 1fr)',
            gap: '0',
            border: '1px solid rgba(0, 0, 0, 0.15)',
            borderRadius: '6px',
            overflow: 'hidden',
            width: '100%',
            flexShrink: 0,
            minHeight: '120px',
            background: 'linear-gradient(180deg, #f3f4f6 0%, #ffffff 50%, #f3f4f6 100%)'
          }}
        >
          {/* Linha 1, Coluna 1: Categoria */}
          <div style={{ 
            padding: '10px 8px',
            borderRight: '1px solid rgba(0, 0, 0, 0.15)',
            borderBottom: '1px solid rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            minHeight: '60px'
          }}>
            <span style={{ color: '#374151', fontSize: '10px', fontWeight: '500', marginBottom: '4px' }}>Categoria:</span>
            <span style={{ color: '#111827', fontSize: '12px', fontWeight: '600' }}>{produto.categoria}</span>
          </div>
          {/* Linha 1, Coluna 2: Preço */}
          <div style={{ 
            padding: '10px 8px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            minHeight: '60px'
          }}>
            <span style={{ color: '#374151', fontSize: '10px', fontWeight: '500', marginBottom: '4px' }}>Preço:</span>
            {temDesconto ? (
              <>
                <span 
                  data-price-original="true"
                  style={{ 
                    color: '#f87171', 
                    fontSize: '11px', 
                    fontWeight: '400', 
                    textDecoration: 'line-through',
                    marginBottom: '2px'
                  }}
                >
                  R$ {precoOriginal.toFixed(2)}
                </span>
                <span 
                  data-price-discounted="true"
                  style={{ color: '#22c55e', fontSize: '14px', fontWeight: '700' }}
                >
                  R$ {precoComDesconto.toFixed(2)}
                </span>
                <span 
                  data-price-percentage="true"
                  style={{ 
                    color: '#facc15', 
                    fontSize: '10px', 
                    fontWeight: '600',
                    marginTop: '2px'
                  }}
                >
                  {descontoTotal.toFixed(0).replace('.0', '')}% OFF
                </span>
              </>
            ) : (
              <span 
                data-price-normal="true"
                style={{ color: '#4ade80', fontSize: '14px', fontWeight: '700' }}
              >
                R$ {precoOriginal.toFixed(2)}
              </span>
            )}
          </div>
          {/* Linha 2, Coluna 1: Estoque - Altura mínima garantida */}
          <div style={{ 
            padding: '10px 8px',
            borderRight: '1px solid rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            minHeight: '60px'
          }}>
            <span style={{ color: '#374151', fontSize: '10px', fontWeight: '500', marginBottom: '4px' }}>Estoque:</span>
            <span style={{ color: '#111827', fontSize: '12px', fontWeight: '600' }}>
              {produto.estoque !== undefined && produto.estoque !== null ? produto.estoque : "-"}
            </span>
          </div>
          {/* Linha 2, Coluna 2: Tamanhos - Altura mínima garantida */}
          <div style={{ 
            padding: '10px 8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            minHeight: '60px'
          }}>
            <span style={{ color: '#374151', fontSize: '10px', fontWeight: '500', marginBottom: '4px' }}>Tamanhos:</span>
            <span style={{ color: '#111827', fontSize: '12px', fontWeight: '600' }}>
              {produto.tamanhos && produto.tamanhos.length > 0 ? produto.tamanhos.join(", ") : "-"}
            </span>
          </div>
        </div>

        {/* Actions - Botões sempre no rodapé */}
        <div 
          style={{ 
            marginTop: 'auto', 
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'row',
            gap: '8px',
            paddingTop: '12px',
            width: '100%'
          }}
        >
          <button
            onClick={() => setViewingProduto(produto)}
            data-cyber-button="view"
            type="button"
            style={{
              background: 'linear-gradient(to right, #2563eb, #9333ea)',
              color: '#ffffff',
              borderRadius: '6px',
              padding: '10px 16px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              flex: '1 1 0%',
              fontSize: '12px',
              fontWeight: '600',
              minWidth: 0
            }}
          >
            <Eye 
              style={{ 
                width: '16px', 
                height: '16px', 
                color: '#ffffff', 
                stroke: '#ffffff',
                flexShrink: 0
              }} 
            />
            <span style={{ color: '#ffffff', whiteSpace: 'nowrap' }}>Ver</span>
          </button>
          
          <button
            onClick={() => {
              const url = lojistaIdParam
                ? `/produtos/${produto.id}/editar?lojistaId=${lojistaIdParam}`
                : `/produtos/${produto.id}/editar`;
              router.push(url);
            }}
            data-cyber-button="edit"
            type="button"
            style={{
              background: 'linear-gradient(to right, #0d9488, #10b981)',
              color: '#ffffff',
              borderRadius: '6px',
              padding: '10px 16px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              flex: '1 1 0%',
              fontSize: '12px',
              fontWeight: '600',
              minWidth: 0
            }}
          >
            <Edit 
              style={{ 
                width: '16px', 
                height: '16px', 
                color: '#ffffff', 
                stroke: '#ffffff',
                flexShrink: 0
              }} 
            />
            <span style={{ color: '#DC2626', whiteSpace: 'nowrap' }}>Editar</span>
          </button>
        </div>
      </div>
    </div>
  );
}

type ProductsTableProps = {
  initialProdutos: ProdutoDoc[];
  lojistaId: string;
  initialLojaDiscount?: number | null;
};

export function ProductsTable({
  initialProdutos,
  lojistaId,
  initialLojaDiscount = null,
}: ProductsTableProps) {
  const searchParams = useSearchParams();
  const isAdminView = searchParams?.get("admin") === "true";
  // Tentar ler tanto lojistaId quanto lojistald (para compatibilidade com typos)
  const lojistaIdFromUrl = searchParams?.get("lojistaId") || searchParams?.get("lojistald");
  const lojistaIdParam = lojistaIdFromUrl || lojistaId;
  
  const [produtos, setProdutos] = useState(initialProdutos);
  const [searchTerm, setSearchTerm] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  // Atualizar produtos quando initialProdutos mudar (após criar novo produto)
  useEffect(() => {
    console.log("[ProductsTable] initialProdutos recebido:", initialProdutos.length);
    setProdutos(initialProdutos);
  }, [initialProdutos.length]); // Usar apenas o length para evitar loops
  const [editingProduto, setEditingProduto] = useState<ProdutoDoc | null>(null);
  const [viewingProduto, setViewingProduto] = useState<ProdutoDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [lojaDiscount] = useState<number>(initialLojaDiscount ?? 0);

  // Recarregar produtos quando showArchived mudar
  useEffect(() => {
    const loadProdutos = async () => {
      try {
        setLoading(true);
        const url = lojistaIdParam 
          ? `/api/lojista/products?lojistaId=${lojistaIdParam}&includeArchived=${showArchived}`
          : `/api/lojista/products?includeArchived=${showArchived}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Erro ao carregar produtos");
        const data = await response.json();
        // A API retorna array direto ou objeto com { produtos: [...] }
        const produtosArray = Array.isArray(data) ? data : (data?.produtos || []);
        console.log("[ProductsTable] Produtos carregados:", produtosArray.length);
        setProdutos(produtosArray);
      } catch (err) {
        console.error("[ProductsTable] Erro ao carregar:", err);
        setError("Erro ao carregar produtos");
      } finally {
        setLoading(false);
      }
    };
    loadProdutos();
  }, [showArchived, lojistaIdParam]);

  const filteredProdutos = useMemo(() => {
    let filtered = produtos;

    // Filtrar arquivados
    if (!showArchived) {
      filtered = filtered.filter((p) => !p.arquivado);
    }

    // Filtrar por busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.nome.toLowerCase().includes(term) ||
          p.categoria.toLowerCase().includes(term) ||
          (p.obs && p.obs.toLowerCase().includes(term))
      );
    }

    // Filtrar por categoria
    if (categoryFilter !== "all") {
      filtered = filtered.filter((p) => p.categoria === categoryFilter);
    }

    return filtered;
  }, [produtos, searchTerm, categoryFilter, showArchived]);

  // FORÇA BRUTA: Aplicar estilos diretamente no DOM para garantir texto branco nos cards
  useEffect(() => {
    // Injetar CSS global para proteger botões cyber/modernos
    const styleId = 'cyber-buttons-protection'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        button[data-cyber-button="view"] {
          background: linear-gradient(to right, #2563eb, #9333ea) !important;
          color: #ffffff !important;
          border-radius: 6px !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
        }
        button[data-cyber-button="view"]:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
        }
        button[data-cyber-button="view"] *,
        button[data-cyber-button="view"] span {
          color: #ffffff !important;
        }
        button[data-cyber-button="view"] svg,
        button[data-cyber-button="view"] path {
          stroke: #ffffff !important;
          fill: none !important;
        }
        button[data-cyber-button="edit"] {
          background: linear-gradient(to right, #0d9488, #10b981) !important;
          color: #ffffff !important;
          border-radius: 6px !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
        }
        button[data-cyber-button="edit"]:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
        }
        button[data-cyber-button="edit"] *,
        button[data-cyber-button="edit"] span {
          color: #ffffff !important;
        }
        button[data-cyber-button="edit"] svg,
        button[data-cyber-button="edit"] path {
          stroke: #ffffff !important;
          fill: none !important;
        }
      `
      document.head.appendChild(style)
    }

    // Função auxiliar para verificar se elemento está dentro de botão cyber/moderno
    const isInsideCyberButton = (el: HTMLElement): boolean => {
      let current: HTMLElement | null = el
      while (current && current !== document.body) {
        if (current.hasAttribute && current.hasAttribute('data-cyber-button')) {
          return true
        }
        current = current.parentElement
      }
      return false
    }

    const forceProductCardStyles = () => {
      // Forçar texto branco nos cards de produto (exceto nome do produto e preço que são amarelos)
      const productCards = document.querySelectorAll('[data-product-card]') as NodeListOf<HTMLElement>
      productCards.forEach((card) => {
        const allTextElements = card.querySelectorAll('span, p, div, button, svg')
        allTextElements.forEach((el) => {
          const htmlEl = el as HTMLElement
          
          // PULAR COMPLETAMENTE elementos dentro de botões cyber/modernos
          if (isInsideCyberButton(htmlEl)) {
            return
          }
          
          // PULAR elementos de preço com data-attributes específicos
          if (htmlEl.hasAttribute('data-price-original') || 
              htmlEl.hasAttribute('data-price-discounted') || 
              htmlEl.hasAttribute('data-price-percentage') ||
              htmlEl.hasAttribute('data-price-normal')) {
            return
          }
          
          // Não aplicar em elementos com preço (verde claro)
          const textContent = htmlEl.textContent || ''
          const hasPrice = textContent.includes('R$') || htmlEl.style.color === '#4ade80' || htmlEl.style.color === '#facc15'
          
          if (!hasPrice && htmlEl.style.color !== '#4ade80' && htmlEl.style.color !== '#facc15') {
            htmlEl.style.setProperty('color', '#FFFFFF', 'important')
            htmlEl.style.setProperty('-webkit-text-fill-color', '#FFFFFF', 'important')
          }
        })
        
        // Forçar preço em verde claro (apenas se não tiver data-attributes específicos)
        const priceElements = card.querySelectorAll('span')
        priceElements.forEach((span) => {
          const spanEl = span as HTMLElement
          
          // PULAR se estiver dentro de botão cyber/moderno
          if (isInsideCyberButton(spanEl)) {
            return
          }
          
          // PULAR se tiver data-attributes de preço específicos (já têm cores definidas)
          if (spanEl.hasAttribute('data-price-original') || 
              spanEl.hasAttribute('data-price-discounted') || 
              spanEl.hasAttribute('data-price-percentage') ||
              spanEl.hasAttribute('data-price-normal')) {
            return
          }
          
          const textContent = spanEl.textContent || ''
          if (textContent.includes('R$')) {
            spanEl.style.setProperty('color', '#4ade80', 'important')
            spanEl.style.setProperty('-webkit-text-fill-color', '#4ade80', 'important')
          }
        })
        
        // Proteger cores dos preços com data-attributes
        const originalPrice = card.querySelector('[data-price-original="true"]') as HTMLElement
        if (originalPrice) {
          originalPrice.style.setProperty('color', '#f87171', 'important')
          originalPrice.style.setProperty('-webkit-text-fill-color', '#f87171', 'important')
        }
        
        const discountedPrice = card.querySelector('[data-price-discounted="true"]') as HTMLElement
        if (discountedPrice) {
          discountedPrice.style.setProperty('color', '#22c55e', 'important')
          discountedPrice.style.setProperty('-webkit-text-fill-color', '#22c55e', 'important')
          discountedPrice.style.setProperty('font-weight', '700', 'important')
        }
        
        const pricePercentage = card.querySelector('[data-price-percentage="true"]') as HTMLElement
        if (pricePercentage) {
          pricePercentage.style.setProperty('color', '#facc15', 'important')
          pricePercentage.style.setProperty('-webkit-text-fill-color', '#facc15', 'important')
        }
        
        const normalPrice = card.querySelector('[data-price-normal="true"]') as HTMLElement
        if (normalPrice) {
          normalPrice.style.setProperty('color', '#4ade80', 'important')
          normalPrice.style.setProperty('-webkit-text-fill-color', '#4ade80', 'important')
        }
        
        // Forçar nome do produto (h3) em amarelo
        const productNames = card.querySelectorAll('h3')
        productNames.forEach((h3) => {
          const h3El = h3 as HTMLElement
          // Manter texto branco como definido no style inline
          h3El.style.setProperty('color', '#FFFFFF', 'important')
          h3El.style.setProperty('-webkit-text-fill-color', '#FFFFFF', 'important')
        })
        
        // NÃO forçar estilos nos botões cyber/modernos (eles já têm estilos inline)
        const buttons = card.querySelectorAll('button')
        buttons.forEach((button) => {
          const buttonEl = button as HTMLElement
          // Verificar se é um botão cyber/moderno pelo data-attribute
          const isCyberButton = buttonEl.hasAttribute('data-cyber-button')
          
          // Se for botão cyber/moderno, NÃO aplicar estilos forçados
          if (isCyberButton) {
            return // Pular este botão, manter seus estilos inline
          }
          
          // Para botões antigos (sem fundo customizado), aplicar lógica antiga
          const hasGradient = buttonEl.style.background?.includes('linear-gradient') || 
                              buttonEl.style.background?.includes('gradient')
          
          if (!hasGradient) {
            buttonEl.style.setProperty('color', '#000000', 'important')
            buttonEl.style.setProperty('-webkit-text-fill-color', '#000000', 'important')
            
            const buttonChildren = button.querySelectorAll('span, svg, path')
            buttonChildren.forEach((child) => {
              const childEl = child as HTMLElement
              childEl.style.setProperty('color', '#000000', 'important')
              childEl.style.setProperty('-webkit-text-fill-color', '#000000', 'important')
              if (child.tagName === 'svg' || child.tagName === 'path') {
                childEl.style.setProperty('stroke', '#000000', 'important')
                childEl.style.setProperty('fill', '#000000', 'important')
              }
            })
          } else {
            buttonEl.style.setProperty('color', '#FFFFFF', 'important')
            const buttonChildren = button.querySelectorAll('span, svg, path')
            buttonChildren.forEach((child) => {
              const childEl = child as HTMLElement
              childEl.style.setProperty('color', '#FFFFFF', 'important')
              childEl.style.setProperty('-webkit-text-fill-color', '#FFFFFF', 'important')
              if (child.tagName === 'svg' || child.tagName === 'path') {
                childEl.style.setProperty('stroke', '#FFFFFF', 'important')
              }
            })
          }
        })
      })

      // Forçar texto preto em TODOS os elementos dentro da tabela
      const infoGrids = document.querySelectorAll('[data-product-info-grid]') as NodeListOf<HTMLElement>
      infoGrids.forEach((grid) => {
        const allSpans = grid.querySelectorAll('span') as NodeListOf<HTMLElement>
        allSpans.forEach((span) => {
          // Pular preços que têm cores específicas
          if (span.hasAttribute('data-price-original') || 
              span.hasAttribute('data-price-discounted') || 
              span.hasAttribute('data-price-percentage') || 
              span.hasAttribute('data-price-normal')) {
            return // Manter cor específica do preço
          }
          
          // Verificar se é label (primeiro span da div)
          const parent = span.parentElement
          if (parent && parent.querySelector('span:first-child') === span) {
            // Label em cinza escuro
            span.style.setProperty('color', '#374151', 'important')
            span.style.setProperty('-webkit-text-fill-color', '#374151', 'important')
          } else {
            // Valor em preto
            span.style.setProperty('color', '#111827', 'important')
            span.style.setProperty('-webkit-text-fill-color', '#111827', 'important')
          }
        })
      })
      
      // Forçar texto branco em elementos com data-force-white (fora da tabela)
      const forceWhiteElements = document.querySelectorAll('[data-force-white="true"]:not([data-product-info-grid] *)') as NodeListOf<HTMLElement>
      forceWhiteElements.forEach((el) => {
        el.style.setProperty('color', '#FFFFFF', 'important')
        el.style.setProperty('-webkit-text-fill-color', '#FFFFFF', 'important')
        
        // Forçar também nos filhos
        const children = el.querySelectorAll('*')
        children.forEach((child) => {
          const childEl = child as HTMLElement
          if (childEl.style.color !== '#facc15') {
            childEl.style.setProperty('color', '#FFFFFF', 'important')
            childEl.style.setProperty('-webkit-text-fill-color', '#FFFFFF', 'important')
          }
        })
      })
    }

    // Função para proteger estilos dos botões cyber/modernos
    const protectCyberButtons = () => {
      const cyberButtons = document.querySelectorAll('[data-cyber-button]') as NodeListOf<HTMLElement>
      cyberButtons.forEach((button) => {
        const buttonEl = button as HTMLElement
        
        // Restaurar gradientes baseado no tipo de botão
        if (buttonEl.getAttribute('data-cyber-button') === 'view') {
          buttonEl.style.setProperty('background', 'linear-gradient(to right, #2563eb, #9333ea)', 'important')
          buttonEl.style.setProperty('color', '#ffffff', 'important')
        } else if (buttonEl.getAttribute('data-cyber-button') === 'edit') {
          buttonEl.style.setProperty('background', 'linear-gradient(to right, #0d9488, #10b981)', 'important')
          buttonEl.style.setProperty('color', '#ffffff', 'important')
        }
        
        buttonEl.style.setProperty('border-radius', '6px', 'important')
        buttonEl.style.setProperty('transition', 'opacity 0.2s ease', 'important')
        
        // Restaurar estilos dos filhos (span, svg, path)
        const children = button.querySelectorAll('span, svg, path, *')
        children.forEach((child) => {
          const childEl = child as HTMLElement
          if (child.tagName === 'SPAN') {
            childEl.style.setProperty('color', '#ffffff', 'important')
            childEl.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important')
          } else if (child.tagName === 'SVG' || child.tagName === 'svg') {
            childEl.style.setProperty('color', '#ffffff', 'important')
            childEl.style.setProperty('stroke', '#ffffff', 'important')
            childEl.style.setProperty('fill', 'none', 'important')
          } else if (child.tagName === 'PATH' || child.tagName === 'path') {
            childEl.style.setProperty('stroke', '#ffffff', 'important')
            childEl.style.setProperty('fill', 'none', 'important')
          }
        })
      })
    }

    // Função para proteger estilos dos preços
    const protectPriceStyles = () => {
      const productCards = document.querySelectorAll('[data-product-card]') as NodeListOf<HTMLElement>
      productCards.forEach((card) => {
        const originalPrice = card.querySelector('[data-price-original="true"]') as HTMLElement
        if (originalPrice) {
          originalPrice.style.setProperty('color', '#f87171', 'important')
          originalPrice.style.setProperty('-webkit-text-fill-color', '#f87171', 'important')
          originalPrice.style.setProperty('text-decoration', 'line-through', 'important')
        }
        
        const discountedPrice = card.querySelector('[data-price-discounted="true"]') as HTMLElement
        if (discountedPrice) {
          discountedPrice.style.setProperty('color', '#22c55e', 'important')
          discountedPrice.style.setProperty('-webkit-text-fill-color', '#22c55e', 'important')
          discountedPrice.style.setProperty('font-weight', '700', 'important')
        }
        
        const pricePercentage = card.querySelector('[data-price-percentage="true"]') as HTMLElement
        if (pricePercentage) {
          pricePercentage.style.setProperty('color', '#facc15', 'important')
          pricePercentage.style.setProperty('-webkit-text-fill-color', '#facc15', 'important')
        }
        
        const normalPrice = card.querySelector('[data-price-normal="true"]') as HTMLElement
        if (normalPrice) {
          normalPrice.style.setProperty('color', '#4ade80', 'important')
          normalPrice.style.setProperty('-webkit-text-fill-color', '#4ade80', 'important')
        }
      })
    }

    // Executar com requestAnimationFrame para garantir renderização
    const applyStyles = () => {
      requestAnimationFrame(() => {
        protectCyberButtons()
        forceProductCardStyles()
        protectPriceStyles()
        requestAnimationFrame(() => {
          protectCyberButtons()
          protectPriceStyles()
        })
      })
    }
    
    // Executar imediatamente
    applyStyles()
    
    // Executar após delays
    const timeout = setTimeout(applyStyles, 50)
    const timeout2 = setTimeout(applyStyles, 200)
    const timeout3 = setTimeout(applyStyles, 500)
    const timeout4 = setTimeout(applyStyles, 1000)

    return () => {
      clearTimeout(timeout)
      clearTimeout(timeout2)
      clearTimeout(timeout3)
      clearTimeout(timeout4)
    }
  }, [filteredProdutos])

  const handleArchive = async (produto: ProdutoDoc, archive: boolean) => {
    try {
      setLoading(true);
      setError(null);
      const url = lojistaIdParam
        ? `/api/lojista/products/${produto.id}?lojistaId=${lojistaIdParam}`
        : `/api/lojista/products/${produto.id}`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: archive ? "archive" : "restore" }),
      });

      if (!response.ok) throw new Error("Erro ao arquivar produto");

      setProdutos((prev) =>
        prev.map((p) => (p.id === produto.id ? { ...p, arquivado: archive } : p))
      );
      setSuccess(archive ? "Produto arquivado" : "Produto restaurado");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("[ProductsTable] Erro ao arquivar:", err);
      setError("Erro ao arquivar produto");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (produto: ProdutoDoc) => {
    if (!confirm(`Tem certeza que deseja excluir "${produto.nome}"?`)) return;

    try {
      setLoading(true);
      setError(null);
      const url = lojistaIdParam
        ? `/api/lojista/products/${produto.id}?lojistaId=${lojistaIdParam}`
        : `/api/lojista/products/${produto.id}`;
      
      const response = await fetch(url, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Erro ao excluir produto");

      setProdutos((prev) => prev.filter((p) => p.id !== produto.id));
      setSelectedProducts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(produto.id);
        return newSet;
      });
      setSuccess("Produto excluído");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("[ProductsTable] Erro ao excluir:", err);
      setError("Erro ao excluir produto");
    } finally {
      setLoading(false);
    }
  };

  // Toggle seleção de produto
  const toggleProductSelection = (productId: string) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  // Selecionar todos os produtos visíveis
  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProdutos.length) {
      // Se todos estão selecionados, desselecionar todos
      setSelectedProducts(new Set());
    } else {
      // Selecionar todos os produtos filtrados
      setSelectedProducts(new Set(filteredProdutos.map(p => p.id)));
    }
  };

  // Excluir produtos selecionados
  const handleDeleteSelected = async () => {
    if (selectedProducts.size === 0) {
      setError("Nenhum produto selecionado");
      setTimeout(() => setError(null), 3000);
      return;
    }

    const count = selectedProducts.size;
    if (!confirm(`Tem certeza que deseja excluir ${count} produto(s) selecionado(s)? Esta ação não pode ser desfeita.`)) return;

    try {
      setLoading(true);
      setError(null);
      
      const selectedIds = Array.from(selectedProducts);
      console.log("[ProductsTable] Excluindo produtos:", selectedIds);
      
      const deleteResults = await Promise.allSettled(
        selectedIds.map(async (productId) => {
          const url = lojistaIdParam
            ? `/api/lojista/products/${productId}?lojistaId=${lojistaIdParam}`
            : `/api/lojista/products/${productId}`;
          
          console.log("[ProductsTable] Excluindo produto:", productId, "URL:", url);
          
          const response = await fetch(url, {
            method: "DELETE",
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Erro ao excluir produto ${productId}`);
          }
          
          return productId;
        })
      );

      // Verificar resultados
      const successfulResults = deleteResults.filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled');
      const failed = deleteResults.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      const successful = successfulResults.length;
      const successfulIds = successfulResults.map(r => r.value);
      
      console.log("[ProductsTable] Resultados da exclusão:", { successful, failed: failed.length, successfulIds });
      
      // Remover produtos excluídos com sucesso da lista local imediatamente
      if (successfulIds.length > 0) {
        const successfulIdsSet = new Set(successfulIds);
        setProdutos((prev) => prev.filter((p) => !successfulIdsSet.has(p.id)));
        // Remover também da seleção
        setSelectedProducts((prev) => {
          const newSet = new Set(prev);
          successfulIds.forEach(id => newSet.delete(id));
          return newSet;
        });
      }
      
      // Recarregar produtos do servidor para garantir sincronização completa
      try {
        const url = lojistaIdParam 
          ? `/api/lojista/products?lojistaId=${lojistaIdParam}&includeArchived=${showArchived}`
          : `/api/lojista/products?includeArchived=${showArchived}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          const produtosArray = Array.isArray(data) ? data : (data?.produtos || []);
          console.log("[ProductsTable] Produtos recarregados após exclusão:", produtosArray.length);
          setProdutos(produtosArray);
        } else {
          console.warn("[ProductsTable] Erro ao recarregar produtos, mas produtos já foram removidos localmente");
        }
      } catch (reloadError) {
        console.error("[ProductsTable] Erro ao recarregar produtos:", reloadError);
        // Produtos já foram removidos localmente, então está ok
      }
      
      // Mostrar mensagens de sucesso/erro
      if (failed.length > 0) {
        console.error("[ProductsTable] Erros ao excluir:", failed);
        const errorMessages = failed.map((f: any) => f.reason?.message || 'Erro desconhecido').join(', ');
        if (successful > 0) {
          setError(`${successful} produto(s) excluído(s), mas ${failed.length} falharam: ${errorMessages}`);
        } else {
          setError(`Erro ao excluir produtos: ${errorMessages}`);
        }
        setTimeout(() => setError(null), 5000);
      } else if (successful > 0) {
        setSuccess(`${successful} produto(s) excluído(s) com sucesso`);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      console.error("[ProductsTable] Erro ao excluir produtos:", err);
      setError(err.message || "Erro ao excluir produtos selecionados");
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (data: Partial<ProdutoDoc>) => {
    if (!editingProduto) return;

    try {
      setLoading(true);
      setError(null);
      const url = lojistaIdParam
        ? `/api/lojista/products/${editingProduto.id}?lojistaId=${lojistaIdParam}`
        : `/api/lojista/products/${editingProduto.id}`;
      
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Erro ao atualizar produto");

      setProdutos((prev) =>
        prev.map((p) => (p.id === editingProduto.id ? { ...p, ...data } : p))
      );
      setEditingProduto(null);
      setSuccess("Produto atualizado");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("[ProductsTable] Erro ao salvar:", err);
      setError("Erro ao atualizar produto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="neon-card rounded-2xl overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="text-sm text-[var(--text-secondary)]">
              {searchTerm.trim() || categoryFilter !== "all"
                ? `${filteredProdutos.length} produto(s) encontrado(s).`
                : `${produtos.length} produto(s) cadastrado(s).`}
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-[var(--text-main)]">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 bg-white text-indigo-600 focus:ring-indigo-500"
                />
                Mostrar arquivados
              </label>
            </div>
            {selectedProducts.size > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200">
                  {selectedProducts.size} selecionado(s)
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (!loading) {
                      handleDeleteSelected();
                    }
                  }}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg border-2 border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-400 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-4 w-4" />
                  {loading ? "Excluindo..." : `Excluir (${selectedProducts.size})`}
                </button>
              </div>
            )}
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por nome, categoria..."
                className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">Todas</option>
                {PRODUCT_CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-6">
            {error}
          </div>
        )}
        {success && (
          <div className="mx-4 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 sm:mx-6">
            {success}
          </div>
        )}

        {/* Product Grid - Responsive CSS Grid com Scroll */}
        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="py-14 text-center text-sm text-gray-500">
              Carregando...
            </div>
          ) : filteredProdutos.length === 0 ? (
            <div className="py-14 text-center text-sm text-gray-500">
              <Package className="mx-auto mb-4 h-10 w-10 text-gray-400" />
              {produtos.length === 0
                ? "Nenhum produto cadastrado ainda. Clique em 'Adicionar Produto' para começar."
                : "Nenhum produto corresponde aos filtros aplicados."}
            </div>
          ) : (
            <div 
              className="overflow-y-auto products-grid-scroll"
              style={{ 
                maxHeight: 'calc(2 * (400px + 1rem))',
                height: 'calc(2 * (400px + 1rem))'
              }}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {filteredProdutos.map((produto) => (
                    <ProductGridCard
                      key={produto.id}
                      produto={produto}
                      selectedProducts={selectedProducts}
                      toggleProductSelection={toggleProductSelection}
                      handleArchive={handleArchive}
                      setViewingProduto={setViewingProduto}
                      setEditingProduto={setEditingProduto}
                      handleDelete={handleDelete}
                      isAdminView={isAdminView}
                      loading={loading}
                      descontoRedesSociais={lojaDiscount}
                      lojistaIdParam={lojistaIdParam}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid de Cards é responsivo e funciona em todas as telas (mobile, tablet, desktop) */}

      {/* Modal de Visualização */}
      {viewingProduto && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-8 sm:pt-12 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Detalhes do Produto</h2>
              <button
                onClick={() => setViewingProduto(null)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              {viewingProduto.imagemUrl && (
                <img
                  src={viewingProduto.imagemUrl}
                  alt={viewingProduto.nome}
                  className="h-48 w-full rounded-lg object-cover"
                />
              )}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Nome</label>
                <p className="text-sm text-zinc-100">{viewingProduto.nome}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Categoria</label>
                <p className="text-sm text-zinc-100">{viewingProduto.categoria}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Preço</label>
                <p className="text-sm text-zinc-100">R$ {viewingProduto.preco.toFixed(2)}</p>
              </div>
              {viewingProduto.tamanhos && viewingProduto.tamanhos.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Tamanhos</label>
                  <p className="text-sm text-zinc-100">{viewingProduto.tamanhos.join(", ")}</p>
                </div>
              )}
              {viewingProduto.cores && viewingProduto.cores.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Cores</label>
                  <p className="text-sm text-zinc-100">{viewingProduto.cores.join(", ")}</p>
                </div>
              )}
              {viewingProduto.medidas && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Medidas</label>
                  <p className="text-sm text-zinc-100">{viewingProduto.medidas}</p>
                </div>
              )}
              {viewingProduto.obs && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Observações</label>
                  <p className="text-sm text-zinc-100">{viewingProduto.obs}</p>
                </div>
              )}
              {/* FASE 4: Diagnóstico da IA - Feedback de Produto */}
              {viewingProduto.qualityMetrics && (
                <div className="mb-4">
                  <ProductPerformanceAI
                    productId={viewingProduto.id}
                    lojistaId={lojistaIdParam || ""}
                    productName={viewingProduto.nome}
                    complaintRate={viewingProduto.qualityMetrics.complaintRate || 0}
                    conversionRate={viewingProduto.qualityMetrics.conversionRate || 0}
                  />
                </div>
              )}

              {viewingProduto.qualityMetrics && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Métricas de Qualidade</label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-secondary)]">Compatibilidade:</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= Math.round(viewingProduto.qualityMetrics!.compatibilityScore || 0)
                                ? "fill-amber-400 text-amber-400"
                                : "text-zinc-600"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-zinc-100">
                        {viewingProduto.qualityMetrics.compatibilityScore?.toFixed(1)}/5
                      </span>
                    </div>
                    {viewingProduto.qualityMetrics.conversionRate !== undefined && (
                      <p className="text-xs text-[var(--text-secondary)]">
                        Taxa de conversão: {viewingProduto.qualityMetrics.conversionRate.toFixed(1)}%
                      </p>
                    )}
                    {viewingProduto.qualityMetrics.complaintRate !== undefined && (
                      <p className="text-xs text-[var(--text-secondary)]">
                        Taxa de reclamações: {viewingProduto.qualityMetrics.complaintRate.toFixed(1)}%
                      </p>
                    )}
                  </div>
                </div>
              )}
              {viewingProduto.ecommerceSync && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Sincronização E-commerce</label>
                  <div className="space-y-1">
                    <p className="text-sm text-zinc-100">
                      Plataforma: {viewingProduto.ecommerceSync.platform === "shopify" ? "Shopify" : 
                                   viewingProduto.ecommerceSync.platform === "nuvemshop" ? "Nuvemshop" : 
                                   viewingProduto.ecommerceSync.platform}
                    </p>
                    {viewingProduto.ecommerceSync.productId && (
                      <p className="text-xs text-[var(--text-secondary)]">
                        ID do Produto: {viewingProduto.ecommerceSync.productId}
                      </p>
                    )}
                    {viewingProduto.ecommerceSync.lastSyncedAt && (
                      <p className="text-xs text-[var(--text-secondary)]">
                        Última sincronização: {viewingProduto.ecommerceSync.lastSyncedAt instanceof Date
                          ? viewingProduto.ecommerceSync.lastSyncedAt.toLocaleString("pt-BR")
                          : new Date(viewingProduto.ecommerceSync.lastSyncedAt).toLocaleString("pt-BR")}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {viewingProduto.ecommerceSync.syncPrice && (
                        <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-200">
                          Preço
                        </span>
                      )}
                      {viewingProduto.ecommerceSync.syncStock && (
                        <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-200">
                          Estoque
                        </span>
                      )}
                      {viewingProduto.ecommerceSync.syncVariations && (
                        <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2 py-0.5 text-xs text-purple-200">
                          Variações
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewingProduto(null)}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

type EditProdutoModalProps = {
  produto: ProdutoDoc;
  lojistaId?: string;
  descontoRedesSociais?: number | null;
  onClose: () => void;
  onSave: (data: Partial<ProdutoDoc>) => Promise<void>;
};

function EditProdutoModal({ produto, lojistaId, descontoRedesSociais = null, onClose, onSave }: EditProdutoModalProps) {
  const searchParams = useSearchParams();
  const lojistaIdFromUrl = searchParams?.get("lojistaId") || searchParams?.get("lojistald");
  const lojistaIdParam = lojistaIdFromUrl || lojistaId;
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>(""); // URL da imagem do upload (não preenche o campo URL)
  
  // Converter dados do produto para o formato do formulário
  const [formData, setFormData] = useState({
    nome: produto.nome || "",
    categoria: produto.categoria || "Roupas",
    preco: produto.preco ? produto.preco.toString().replace(".", ",") : "",
    imagemUrl: produto.imagemUrl || "", // Campo manual para URL
    imagemUrlOriginal: produto.imagemUrlOriginal || produto.imagemUrl || "",
    imagemUrlCatalogo: produto.imagemUrlCatalogo || null,
    descontoProduto: produto.descontoProduto?.toString() || "", // % de desconto específico
    tamanhos: produto.tamanhos?.join(";") || "", // Separador: ponto e vírgula
    cores: produto.cores?.join(" - ") || "", // Separador: hífen
    medidas: produto.medidas || "",
    observacoes: produto.obs || "",
    estoque: produto.estoque?.toString() || "",
    tags: produto.tags?.join(",") || "", // Separador: vírgula
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fase 13: Estados para Estúdio IA
  const [generatedCatalogImage, setGeneratedCatalogImage] = useState<string | null>(null);
  const [generatingCatalog, setGeneratingCatalog] = useState(false);
  const [corManequim, setCorManequim] = useState<string>("branco fosco");
  const [cenarioEscolhido, setCenarioEscolhido] = useState<string>("1");

  // Lista de cenários conforme documentação Fase 13
  const cenarios = [
    { id: "1", titulo: "Apartamento Parisiense", descricao: "Crie um fundo extremamente desfocado (bokeh cremoso) que sugira um apartamento parisiense clássico, com painéis de parede brancos ornamentados (boiserie), piso de madeira chevron e luz natural suave entrando por uma janela alta distante." },
    { id: "2", titulo: "Villa Minimalista", descricao: "O fundo deve ser uma sugestão fortemente desfocada de arquitetura contemporânea de concreto polido e grandes painéis de vidro. Use uma luz fria e sofisticada que crie reflexos suaves e difusos no piso, sugerindo um ambiente de design exclusivo." },
    { id: "3", titulo: "Boutique de Luxo", descricao: "Gere um fundo que evoque o interior de uma loja de alta costura, mas mantenha-o completamente fora de foco. Use tons quentes de madeira escura, reflexos sutis de latão dourado e luzes de prateleira distantes transformadas em um bokeh suave e rico." },
    { id: "4", titulo: "Hotel Lobby", descricao: "O cenário deve sugerir o saguão de um hotel cinco estrelas histórico. O fundo extremamente desfocado deve apresentar tons de mármore quente, brilhos distantes de lustres de cristal e uma atmosfera dourada e envolvente." },
    { id: "5", titulo: "Galeria de Arte", descricao: "Use um fundo de galeria minimalista e etéreo. Paredes brancas imaculadas e piso de cimento claro, com formas indistintas e suaves de esculturas modernas ao longe, mantidas em um desfoque limpo com luz difusa de claraboia." },
    { id: "6", titulo: "Rooftop Urbano", descricao: "O fundo deve capturar a atmosfera de um rooftop sofisticado durante a \"hora azul\". Crie um bokeh dramático com as luzes da cidade distante e tons profundos de azul e laranja no céu, sugerindo um evento noturno de luxo." },
    { id: "7", titulo: "Parede Veneziana", descricao: "Crie um fundo focado na textura de uma parede de gesso veneziano (stucco) artesanal em um tom neutro e quente (como areia ou terracota pálida). Mantenha a textura extremamente desfocada para criar um pano de fundo orgânico, rico e tátil." },
    { id: "8", titulo: "Jardim Privado", descricao: "Sugira um jardim manicurado em uma propriedade privada logo após o pôr do sol. O fundo deve ser um mix de tons de verde escuro da folhagem e o azul profundo do céu, com pequenas luzes quentes (fairy lights) criando um bokeh cintilante e romântico ao longe." },
    { id: "9", titulo: "Villa Toscana", descricao: "O fundo deve evocar um pátio de pedra antigo e ensolarado na Itália. Use paredes de pedra rústica bege e a sugestão de luz solar filtrada por oliveiras ou pérgolas, criando sombras suaves e um ambiente quente e desfocado." },
    { id: "10", titulo: "Estúdio Arquitetônico", descricao: "Use um fundo de estúdio ciclorama em tom off-white. Adicione profundidade projetando uma grande sombra arquitetônica suave e difusa (como a forma de um arco ou janela grande) na parede de fundo curva, mantendo tudo em um desfoque artístico." },
  ];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const formDataUpload = new FormData();
      formDataUpload.append("image", file);
      if (lojistaIdParam) {
        formDataUpload.append("lojistaId", lojistaIdParam);
      }

      const url = lojistaIdParam
        ? `/api/lojista/products/upload-image?lojistaId=${lojistaIdParam}`
        : `/api/lojista/products/upload-image`;
      
      const response = await fetch(url, {
        method: "POST",
        body: formDataUpload,
      });

      if (!response.ok) throw new Error("Erro ao fazer upload da imagem");
      const result = await response.json();
      
      // Armazena a URL do upload separadamente, sem preencher o campo URL manual
      setUploadedImageUrl(result.imageUrl);
    } catch (err) {
      console.error("[EditProdutoModal] Erro ao fazer upload:", err);
      setError("Erro ao fazer upload da imagem");
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Prioriza URL manual, se não houver, usa a do upload
      const imagemUrlFinal = formData.imagemUrl.trim() || uploadedImageUrl;
      
      const payload: any = {
        nome: formData.nome.trim(),
        categoria: formData.categoria.trim(),
        preco: parseFloat(formData.preco.replace(",", ".")) || 0,
        imagemUrl: imagemUrlFinal,
        tamanhos: formData.tamanhos ? formData.tamanhos.split(";").map((s) => s.trim()).filter(Boolean) : [],
        cores: formData.cores ? formData.cores.split("-").map((c) => c.trim()).filter(Boolean) : [],
        medidas: formData.medidas.trim() || "",
        observacoes: formData.observacoes.trim() || "",
        estoque: formData.estoque ? parseInt(formData.estoque) : undefined,
        tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      };

      // Campos novos: imagem original, catálogo e desconto
      if (formData.imagemUrlOriginal) {
        payload.imagemUrlOriginal = formData.imagemUrlOriginal;
      }
      if (formData.imagemUrlCatalogo) {
        payload.imagemUrlCatalogo = formData.imagemUrlCatalogo;
      }
      if (formData.descontoProduto !== undefined) {
        const raw = formData.descontoProduto.trim();
        if (!raw) {
          payload.descontoProduto = null;
        } else {
          const desconto = parseFloat(raw.replace(",", "."));
          if (!isNaN(desconto) && desconto >= 0 && desconto <= 100) {
            payload.descontoProduto = desconto;
          }
        }
      }

      console.log("[EditProdutoModal] Enviando payload:", JSON.stringify(payload, null, 2));

      // Usar onSave que já faz o PATCH e atualiza o estado
      await onSave(payload);
      
      // onSave já fecha o modal e atualiza a lista, não precisa fazer reload
    } catch (err: any) {
      console.error("[EditProdutoModal] Erro ao atualizar:", err);
      setError(err.message || "Erro ao atualizar produto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-4xl rounded-xl border border-gray-300 bg-white p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-main)]">Editar produto</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Atualize os campos abaixo para modificar o produto. O envio real será conectado ao Firestore.
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-2 rounded-xl border border-red-500/60 bg-red-500/10 px-3 py-1.5 text-xs text-red-200">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-2 rounded-xl border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Foto Principal - Mostrar Original e Catálogo lado a lado */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-main)] mb-1.5">FOTO PRINCIPAL</label>
            <div className="rounded-xl border border-gray-300 bg-gray-50 p-3 space-y-3">
              {/* Preview lado a lado: Original e Catálogo */}
              <div className="grid grid-cols-2 gap-3">
                {/* Foto Original */}
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Foto Original</label>
                  <div className="w-full h-32 rounded-xl bg-white flex items-center justify-center overflow-hidden">
                    {(formData.imagemUrlOriginal || formData.imagemUrl || uploadedImageUrl) ? (
                      <img
                        src={formData.imagemUrlOriginal || formData.imagemUrl || uploadedImageUrl}
                        alt="Foto Original"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <div className="text-center">
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">Sem imagem</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Foto Catálogo (IA) */}
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    Foto Catálogo (IA) {formData.imagemUrlCatalogo && <span className="text-emerald-400">✓</span>}
                  </label>
                  <div className="w-full h-32 rounded-xl bg-white flex items-center justify-center overflow-hidden">
                    {(formData.imagemUrlCatalogo || generatedCatalogImage) ? (
                      <img
                        src={formData.imagemUrlCatalogo || generatedCatalogImage || ""}
                        alt="Foto Catálogo IA"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Gere com IA</p>
                        <p className="text-[10px] text-zinc-600 mt-1">Esta será exibida em todos os lugares</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Botão de Upload e Campo URL */}
              <div className="space-y-2">
                <p className="text-xs text-[var(--text-secondary)]">
                  Utilize imagens em PNG ou JPG com fundo limpo. O upload é salvo automaticamente no Firebase Storage.
                </p>
                {uploadedImageUrl && (
                  <p className="text-xs text-emerald-400">
                    Arquivo pronto para envio junto com o cadastro.
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {uploadingImage ? "Enviando..." : "Selecionar Imagem"}
                  </button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>
                {/* Campo URL */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Ou adicione a imagem por URL
                  </label>
                  <input
                    type="url"
                    value={formData.imagemUrl}
                    onChange={(e) => {
                      setFormData({ 
                        ...formData, 
                        imagemUrl: e.target.value,
                        imagemUrlOriginal: e.target.value || formData.imagemUrlOriginal
                      });
                    }}
                    placeholder="https://exemplo.com/imagem.jpg"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Fase 13: Estúdio Virtual & Display */}
          {(formData.imagemUrl || uploadedImageUrl) && (
            <div className="border-t border-gray-200 pt-4">
              <label className="block text-xs font-medium text-zinc-300 mb-2">
                ✨ ESTÚDIO VIRTUAL & DISPLAY
              </label>
              <div className="rounded-xl border border-gray-300 bg-gray-50 p-3 space-y-3">
                {/* Seletor de Cor do Manequim */}
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    Cor do Manequim
                  </label>
                  <select
                    value={corManequim}
                    onChange={(e) => setCorManequim(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus:border-indigo-400 focus:outline-none"
                  >
                    <option value="branco fosco">Branco Fosco</option>
                    <option value="preto fosco">Preto Fosco</option>
                    <option value="invisível">Invisível</option>
                  </select>
                </div>

                {/* Seletor de Cenário */}
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    Cenário de Fundo
                  </label>
                  <select
                    value={cenarioEscolhido}
                    onChange={(e) => setCenarioEscolhido(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus:border-indigo-400 focus:outline-none"
                  >
                    {cenarios.map((cenario) => (
                      <option key={cenario.id} value={cenario.id}>
                        {cenario.id}. {cenario.titulo}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Escolha o ambiente visual para o fundo da imagem
                  </p>
                </div>

                {/* Botão Gerar */}
                <button
                  type="button"
                  onClick={async () => {
                    const imagemUrlParaUsar = formData.imagemUrl || uploadedImageUrl;
                    if (!imagemUrlParaUsar || !lojistaIdParam) {
                      setError("Imagem e ID da loja são necessários");
                      return;
                    }

                    try {
                      setGeneratingCatalog(true);
                      setError(null);

                      // Calcular preço promocional com base nos descontos
                      const preco = parseFloat(formData.preco.replace(",", ".")) || 0;
                      const descontoRedes = descontoRedesSociais || 0;
                      const descontoEspecial = parseFloat(formData.descontoProduto || "0") || 0;
                      const descontoTotal = descontoRedes + descontoEspecial;
                      const precoPromocional = descontoTotal > 0 && preco > 0
                        ? preco * (1 - descontoTotal / 100)
                        : null;

                      // Obter descrição do cenário escolhido
                      const cenarioSelecionado = cenarios.find(c => c.id === cenarioEscolhido);
                      const descricaoCenario = cenarioSelecionado?.descricao || cenarios[0].descricao;

                      const response = await fetch("/api/ai/catalog", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          produtoId: produto.id,
                          imagemUrl: imagemUrlParaUsar,
                          corManequim,
                          cenario: descricaoCenario,
                          lojistaId: lojistaIdParam,
                          preco,
                          precoPromocional,
                          descontoRedesSociais: descontoRedes,
                          descontoEspecial: descontoEspecial,
                        }),
                      });

                      if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || "Erro ao gerar imagem");
                      }

                      const data = await response.json();
                      
                      // A imagem foi salva automaticamente como imagemUrlCatalogo pela API
                      // Atualizar estado para mostrar que foi salva
                      if (data.savedAsMain) {
                        setSuccess("Imagem de catálogo gerada e salva automaticamente como imagem principal!");
                        setTimeout(() => setSuccess(null), 5000);
                        
                        // Atualizar formData para refletir a mudança
                        setFormData({
                          ...formData,
                          imagemUrlCatalogo: data.imageUrl,
                          imagemUrlOriginal: formData.imagemUrlOriginal || formData.imagemUrl || uploadedImageUrl,
                        });
                      }
                      
                      setGeneratedCatalogImage(data.imageUrl);
                    } catch (err: any) {
                      console.error("[EditProdutoModal] Erro ao gerar catálogo:", err);
                      setError(err.message || "Erro ao gerar imagem de catálogo");
                    } finally {
                      setGeneratingCatalog(false);
                    }
                  }}
                  disabled={generatingCatalog || !formData.imagemUrl && !uploadedImageUrl}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-xs font-medium text-white transition hover:bg-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingCatalog ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      ✨ Gerar Imagem de Catálogo
                    </>
                  )}
                </button>

                {/* Preview da Imagem Gerada - Agora salva automaticamente */}
                {generatedCatalogImage && (
                  <div className="space-y-2">
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2">
                      <p className="text-xs text-emerald-300 mb-2 font-semibold">
                        ✅ Imagem salva automaticamente como imagem principal do catálogo!
                      </p>
                      <div className="rounded-xl border border-gray-300 bg-white p-2">
                        <img
                          src={generatedCatalogImage}
                          alt="Imagem de catálogo gerada"
                          className="w-full rounded-lg object-contain max-h-64"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGeneratedCatalogImage(null)}
                      className="w-full rounded-lg bg-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-600"
                    >
                      Fechar Preview
                    </button>
                  </div>
                )}

                {/* Info */}
                <div className="flex items-start gap-2 rounded-xl border border-purple-500/20 bg-purple-500/10 p-2">
                  <Info className="h-3.5 w-3.5 mt-0.5 text-purple-400 flex-shrink-0" />
                  <p className="text-xs text-purple-200">
                    Gere uma imagem profissional de catálogo com etiqueta de preço integrada, ideal para exibição na TV da loja sem riscos de direitos de imagem.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Nome */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-main)] mb-1.5">NOME</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: Vestido Aurora"
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none"
            />
          </div>

          {/* Preço e Categoria */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[var(--text-main)] mb-1.5">PREÇO (R$)</label>
              <input
                type="text"
                value={formData.preco}
                onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                placeholder="Ex: 329,90"
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-main)] mb-1.5">CATEGORIA</label>
              <select
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-400 focus:outline-none"
              >
                <option value="">Selecione uma categoria</option>
                {PRODUCT_CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Descontos e Valor Final Calculado */}
          <div className="rounded-xl border border-gray-300 bg-gray-50 p-3 space-y-3">
            <label className="block text-xs font-medium text-zinc-300 mb-2">
              💰 DESCONTOS E PREÇO FINAL
            </label>
            
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {/* Desconto Redes Sociais (somente leitura) */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  DESCONTO REDES SOCIAIS (%)
                </label>
                <input
                  type="text"
                  value={descontoRedesSociais ? `${descontoRedesSociais}%` : "0%"}
                  disabled
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-xs text-[var(--text-secondary)] cursor-not-allowed"
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  Definido na tela de Produtos
                </p>
              </div>

              {/* Desconto Especial */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-main)] mb-1.5">
                  DESCONTO ESPECIAL (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.descontoProduto}
                  onChange={(e) => setFormData({ ...formData, descontoProduto: e.target.value })}
                  placeholder="Ex: 10"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none"
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  Somado ao desconto das redes sociais
                </p>
              </div>

              {/* Valor Final Calculado */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-main)] mb-1.5">
                  PREÇO FINAL COM DESCONTOS
                </label>
                <input
                  type="text"
                  value={(() => {
                    const preco = parseFloat(formData.preco.replace(",", ".")) || 0;
                    const descontoRedes = descontoRedesSociais || 0;
                    const descontoEspecial = parseFloat(formData.descontoProduto || "0") || 0;
                    const descontoTotal = descontoRedes + descontoEspecial;
                    
                    if (preco === 0 || descontoTotal === 0) {
                      return new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(preco);
                    }
                    
                    const precoFinal = preco * (1 - descontoTotal / 100);
                    return new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(precoFinal);
                  })()}
                  disabled
                  className="w-full rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300 cursor-not-allowed"
                />
                <p className="text-[10px] text-emerald-400 mt-1">
                  {(() => {
                    const descontoRedes = descontoRedesSociais || 0;
                    const descontoEspecial = parseFloat(formData.descontoProduto || "0") || 0;
                    const descontoTotal = descontoRedes + descontoEspecial;
                    return descontoTotal > 0 ? `Total: ${descontoTotal.toFixed(1)}% de desconto` : "Sem desconto aplicado";
                  })()}
                </p>
              </div>
            </div>
          </div>

          {/* Cores e Tamanhos */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[var(--text-main)] mb-1.5">
                CORES (SEPARADAS POR -)
              </label>
              <input
                type="text"
                value={formData.cores}
                onChange={(e) => setFormData({ ...formData, cores: e.target.value })}
                placeholder="Ex: lilás - grafite"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-main)] mb-1.5">
                TAMANHOS (SEPARADOS POR ;)
              </label>
              <input
                type="text"
                value={formData.tamanhos}
                onChange={(e) => setFormData({ ...formData, tamanhos: e.target.value })}
                placeholder="Ex: P;M;G"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Estoque e Tags */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[var(--text-main)] mb-1.5">ESTOQUE</label>
              <input
                type="text"
                value={formData.estoque}
                onChange={(e) => setFormData({ ...formData, estoque: e.target.value })}
                placeholder="Ex: 10"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-main)] mb-1.5">
                TAGS (SEPARADAS POR ,)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="Ex: promoção, novo, destaque"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Medidas */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-main)] mb-1.5">MEDIDAS</label>
            <input
              type="text"
              value={formData.medidas}
              onChange={(e) => setFormData({ ...formData, medidas: e.target.value })}
              placeholder="Ex: Altura: 150cm, Largura: 80cm"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none"
            />
          </div>

          {/* Observações para IA */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-main)] mb-1.5">
              OBSERVAÇÕES PARA IA
            </label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Ex: tecido em seda, caimento leve, ideal para looks noturnos."
              rows={2}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none"
            />
          </div>

          {/* Info e Botões */}
          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-start gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-2 mb-2">
              <Info className="h-3.5 w-3.5 mt-0.5 text-indigo-400 flex-shrink-0" />
              <p className="text-xs text-indigo-200">
                Os dados e a imagem são enviados para o Firestore. Em breve, você poderá definir estoque, status e vitrine.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50"
              >
                {loading ? "Salvando..." : "Salvar produto"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}





