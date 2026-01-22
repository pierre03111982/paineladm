"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { RefreshCw, Eye, Sparkles } from "lucide-react"
import { ClientSalesCockpitModal } from "./ClientSalesCockpitModal"

type Composition = {
  id: string
  imagemUrl: string
  createdAt: Date
  customerName: string
  customerWhatsapp: string | null
  produtoNome?: string
  customerId: string
  productIds?: string[]
  produtosUtilizados?: Array<{
    id: string
    nome: string
    imagemUrl: string
  }>
}

type ComposicoesVisualHistoryProps = {
  initialCompositions: Composition[]
  lojistaId: string
  totalInDatabase?: number
}

// Função auxiliar para determinar status da composição (novo, aguardando, etc)
const getCompositionStatus = (createdAt: Date): { label: string; className: string } => {
  const now = new Date()
  const diffHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
  
  if (diffHours < 24) {
    return { label: "Novo", className: "bg-green-500 text-white" }
  } else if (diffHours < 72) {
    return { label: "Aguardando", className: "bg-yellow-500 text-white" }
  }
  return { label: "Anterior", className: "bg-gray-500 text-white" }
}

export function ComposicoesVisualHistory({ 
  initialCompositions, 
  lojistaId,
  totalInDatabase
}: ComposicoesVisualHistoryProps) {
  // Converter strings de data para Date objects quando necessário (serialização do servidor)
  const normalizeCompositions = (comps: Composition[]): Composition[] => {
    return comps.map(comp => ({
      ...comp,
      createdAt: comp.createdAt instanceof Date ? comp.createdAt : new Date(comp.createdAt as any)
    }))
  }

  const [compositions, setCompositions] = useState<Composition[]>(normalizeCompositions(initialCompositions))
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [displayedCount, setDisplayedCount] = useState(16) // Começar mostrando 16 composições
  const [selectedComposition, setSelectedComposition] = useState<Composition | null>(null)
  const [filter, setFilter] = useState<"all" | "today" | "favorites">("all")
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set())
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Atualizar composições quando initialCompositions mudar (após refresh)
  useEffect(() => {
    const normalized = normalizeCompositions(initialCompositions)
    setCompositions(normalized)
    // Resetar contador quando novas composições chegarem
    setDisplayedCount(16)
  }, [initialCompositions])

  // Auto-refresh a cada 20 segundos (igual ao radar)
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData()
    }, 20000) // 20 segundos

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshData = async () => {
    setIsRefreshing(true)
    router.refresh()
    // Aguardar um pouco para a atualização completar
    setTimeout(() => {
      setIsRefreshing(false)
    }, 1000)
  }

  // Formatar WhatsApp
  const formatWhatsApp = (whatsapp: string | null): string => {
    if (!whatsapp) return ""
    const cleaned = whatsapp.replace(/\D/g, "")
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
    }
    return whatsapp
  }

  // Formatar data/hora para exibição no rodapé
  const formatCompositionDate = (date: Date): string => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    // Se for hoje, mostrar hora e minutos
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const compDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    
    if (compDate.getTime() === today.getTime()) {
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      if (diffMins < 60) {
        return `Hoje, ${hours}:${minutes}`
      } else {
        return `Hoje, ${hours}:${minutes}`
      }
    } else if (diffDays === 1) {
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      return `Ontem, ${hours}:${minutes}`
    } else {
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      return `${day}/${month}, ${hours}:${minutes}`
    }
  }

  // Função para abrir modal do cliente
  const openClientModal = (composition: Composition) => {
    setSelectedComposition(composition)
  }

  // Função para fechar modal
  const closeModal = () => {
    setSelectedComposition(null)
  }

  // Função para carregar mais composições (scroll infinito)
  const loadMore = useCallback(() => {
    if (displayedCount < compositions.length) {
      setDisplayedCount(prev => Math.min(prev + 16, compositions.length))
    }
  }, [displayedCount, compositions.length])

  // Observer para scroll infinito
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      // Carregar mais quando estiver a 200px do final
      if (scrollHeight - scrollTop - clientHeight < 200) {
        loadMore()
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [loadMore])

  // Filtrar composições baseado no filtro selecionado
  const filteredCompositions = compositions.filter((comp) => {
    if (filter === "today") {
      const today = new Date()
      const compDate = new Date(comp.createdAt)
      return (
        compDate.getDate() === today.getDate() &&
        compDate.getMonth() === today.getMonth() &&
        compDate.getFullYear() === today.getFullYear()
      )
    }
    if (filter === "favorites") {
      return favoritedIds.has(comp.id)
    }
    return true
  })

  // Ordenar composições filtradas por data (mais recente primeiro)
  const sortedCompositions = [...filteredCompositions].sort((a, b) => 
    b.createdAt.getTime() - a.createdAt.getTime()
  )

  // Pegar apenas as composições a serem exibidas
  const displayedCompositions = sortedCompositions.slice(0, displayedCount)
  const totalCompositions = sortedCompositions.length
  const hasMore = displayedCount < totalCompositions

  return (
    <div className="space-y-6">
      {/* Header com título, filtros e botão de atualizar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-main)] font-heading">Composições</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Histórico Visual ({sortedCompositions.length.toLocaleString('pt-BR')} composições{filter !== "all" ? " filtradas" : ""}{totalInDatabase && totalInDatabase > totalCompositions ? ` de ${totalInDatabase.toLocaleString('pt-BR')} no banco` : ''})
            </p>
          </div>
          <button
            onClick={refreshData}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-[var(--bg-card)]/60 px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-all hover:border-indigo-500 hover:text-indigo-600 hover:shadow-lg hover:shadow-indigo-500/30 disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Atualizando..." : "Atualizar"}
          </button>
        </div>

        {/* Filtros Rápidos */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              filter === "all"
                ? "bg-indigo-500 text-white"
                : "bg-[var(--bg-card)]/60 text-[var(--text-secondary)] border border-gray-300 hover:border-indigo-500"
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter("today")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              filter === "today"
                ? "bg-indigo-500 text-white"
                : "bg-[var(--bg-card)]/60 text-[var(--text-secondary)] border border-gray-300 hover:border-indigo-500"
            }`}
          >
            Mostrar só Hoje
          </button>
          <button
            onClick={() => setFilter("favorites")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              filter === "favorites"
                ? "bg-indigo-500 text-white"
                : "bg-[var(--bg-card)]/60 text-[var(--text-secondary)] border border-gray-300 hover:border-indigo-500"
            }`}
          >
            Mostrar só Favoritos ({favoritedIds.size})
          </button>
        </div>
      </div>

      {sortedCompositions.length === 0 ? (
        <div className="neon-card p-10 text-center text-sm text-[var(--text-secondary)]">
          {filter === "today" 
            ? "Nenhuma composição encontrada para hoje." 
            : filter === "favorites"
            ? "Nenhuma composição favoritada."
            : "Nenhuma composição encontrada."}
        </div>
      ) : (
        <div 
          ref={scrollContainerRef}
          className="neon-card p-6 h-[calc(100vh-100px)] overflow-y-auto"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent',
          }}
        >
          {/* Grid de composições - LAYOUT similar ao card de produto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {displayedCompositions.map((comp) => {
              const status = getCompositionStatus(comp.createdAt)
              
              return (
                <div
                  key={comp.id}
                  className="group relative product-card-gradient rounded-xl overflow-hidden hover:shadow-lg transition-all flex flex-col min-h-[500px]"
                  style={{ display: 'flex', flexDirection: 'column', minHeight: '500px', border: '1px solid #60a5fa' }}
                >
                  {/* Badge de Status no canto superior esquerdo */}
                  <div className={`absolute top-2 left-2 z-20 px-2.5 py-1 rounded-full text-xs font-semibold ${status.className}`}>
                    {status.label}
                  </div>

                  {/* Imagem Principal da Composição - Aspect Square */}
                  <div className="aspect-square w-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 relative" style={{ boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)' }}>
                    <Image
                      src={comp.imagemUrl}
                      alt={comp.produtoNome || "Composição"}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      unoptimized
                    />
                    {/* Overlay gradient no hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>

                  {/* Miniaturas dos Produtos Utilizados - Lado a lado abaixo da imagem */}
                  {comp.produtosUtilizados && comp.produtosUtilizados.length > 0 && (
                    <div className="px-2 pt-2 pb-1 bg-white">
                      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
                        {comp.produtosUtilizados.slice(0, 4).map((produto) => (
                          <div
                            key={produto.id}
                            className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-white relative"
                            style={{ minWidth: '64px' }}
                          >
                            {produto.imagemUrl ? (
                              <Image
                                src={produto.imagemUrl}
                                alt={produto.nome}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                <span className="text-xs text-gray-400">N/A</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Content - Container Flexível */}
                  <div className="p-4 flex flex-col flex-1" style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: '0' }}>
                    {/* Nome do Cliente - Barra Gradiente */}
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
                          {comp.customerName}
                        </h3>
                      </div>
                    </div>

                    {/* Grid 2x2 com Informações */}
                    <div 
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
                      {/* Data/Hora */}
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
                        <span style={{ color: '#374151', fontSize: '10px', fontWeight: '500', marginBottom: '4px' }}>Data:</span>
                        <span style={{ color: '#111827', fontSize: '12px', fontWeight: '600' }}>
                          {formatCompositionDate(comp.createdAt)}
                        </span>
                      </div>
                      
                      {/* WhatsApp */}
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
                        <span style={{ color: '#374151', fontSize: '10px', fontWeight: '500', marginBottom: '4px' }}>WhatsApp:</span>
                        <span style={{ color: '#111827', fontSize: '12px', fontWeight: '600' }}>
                          {comp.customerWhatsapp ? formatWhatsApp(comp.customerWhatsapp) : "-"}
                        </span>
                      </div>
                      
                      {/* Produto Principal */}
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
                        <span style={{ color: '#374151', fontSize: '10px', fontWeight: '500', marginBottom: '4px' }}>Produto:</span>
                        <span style={{ color: '#111827', fontSize: '12px', fontWeight: '600' }}>
                          {comp.produtoNome || "-"}
                        </span>
                      </div>
                      
                      {/* Total de Produtos */}
                      <div style={{ 
                        padding: '10px 8px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        minHeight: '60px'
                      }}>
                        <span style={{ color: '#374151', fontSize: '10px', fontWeight: '500', marginBottom: '4px' }}>Itens:</span>
                        <span style={{ color: '#111827', fontSize: '12px', fontWeight: '600' }}>
                          {comp.produtosUtilizados?.length || comp.productIds?.length || "1"}
                        </span>
                      </div>
                    </div>

                    {/* Botões de Ação */}
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
                        onClick={(e) => {
                          e.stopPropagation()
                          openClientModal(comp)
                        }}
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
                        <span style={{ color: '#ffffff' }}>Ver</span>
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openClientModal(comp)
                        }}
                        style={{
                          background: 'linear-gradient(to right, #22c55e, #16a34a)',
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
                        <Sparkles 
                          style={{ 
                            width: '16px', 
                            height: '16px', 
                            color: '#ffffff', 
                            stroke: '#ffffff',
                            flexShrink: 0
                          }}
                        />
                        <span style={{ color: '#ffffff' }}>Analisar</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Indicador de carregamento */}
          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={loadMore}
                className="inline-flex items-center gap-2 rounded-lg border border-indigo-500/50 bg-indigo-500/20 px-4 py-2 text-sm font-semibold text-indigo-300 transition-all hover:bg-indigo-500/30"
              >
                Carregar mais ({totalCompositions - displayedCount} restantes)
              </button>
            </div>
          )}

          {/* Indicador de fim */}
          {!hasMore && displayedCompositions.length > 0 && (
            <div className="mt-6 text-center text-sm text-[var(--text-secondary)]">
              Todas as {sortedCompositions.length} composições{filter !== "all" ? " filtradas" : ""} foram carregadas.
            </div>
          )}
        </div>
      )}

      {/* Modal Cockpit de Vendas */}
      <ClientSalesCockpitModal
        composition={selectedComposition}
        lojistaId={lojistaId}
        isOpen={!!selectedComposition}
        onClose={closeModal}
      />
    </div>
  )
}
