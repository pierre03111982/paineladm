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
            <h1 className="text-2xl font-bold text-[var(--text-main)]">Composições</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Histórico Visual ({sortedCompositions.length.toLocaleString('pt-BR')} composições{filter !== "all" ? " filtradas" : ""}{totalInDatabase && totalInDatabase > totalCompositions ? ` de ${totalInDatabase.toLocaleString('pt-BR')} no banco` : ''})
            </p>
          </div>
          <button
            onClick={refreshData}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-[var(--bg-card)]/60 px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-all hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-lg hover:shadow-indigo-500/30 disabled:cursor-wait disabled:opacity-60"
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
                : "bg-[var(--bg-card)]/60 text-[var(--text-secondary)] border border-gray-300 dark:border-gray-600 hover:border-indigo-500"
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter("today")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              filter === "today"
                ? "bg-indigo-500 text-white"
                : "bg-[var(--bg-card)]/60 text-[var(--text-secondary)] border border-gray-300 dark:border-gray-600 hover:border-indigo-500"
            }`}
          >
            Mostrar só Hoje
          </button>
          <button
            onClick={() => setFilter("favorites")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              filter === "favorites"
                ? "bg-indigo-500 text-white"
                : "bg-[var(--bg-card)]/60 text-[var(--text-secondary)] border border-gray-300 dark:border-gray-600 hover:border-indigo-500"
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
          {/* Grid de composições - NOVO LAYOUT estilo Instagram/Pinterest */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {displayedCompositions.map((comp) => {
              const status = getCompositionStatus(comp.createdAt)
              
              return (
                <div
                  key={comp.id}
                  className="group bg-[#1e1e2e] dark:bg-zinc-900 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-200 hover:-translate-y-1 flex flex-col"
                >
                  {/* Área da Imagem - 80% do card */}
                  <div 
                    className="relative h-[300px] w-full cursor-pointer"
                    onClick={() => openClientModal(comp)}
                  >
                    <Image
                      src={comp.imagemUrl}
                      alt={comp.produtoNome || "Composição"}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    
                    {/* Badge de Status no canto superior direito */}
                    <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold ${status.className}`}>
                      {status.label}
                    </div>
                    
                    {/* Overlay com opções secundárias no hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200">
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex gap-2">
                          <button className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors">
                            <Eye className="h-5 w-5 text-white" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rodapé - 20% do card com informações e botão */}
                  <div className="p-4 bg-[#1e1e2e] dark:bg-zinc-900 text-white flex flex-col gap-3">
                    {/* Cabeçalho: Nome e Data */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-white truncate">
                          {comp.customerName}
                        </h3>
                        <span className="text-xs text-gray-400">
                          {formatCompositionDate(comp.createdAt)}
                        </span>
                      </div>
                    </div>
                    
                    {/* WhatsApp */}
                    {comp.customerWhatsapp && (
                      <p className="text-sm text-gray-300">
                        {formatWhatsApp(comp.customerWhatsapp)}
                      </p>
                    )}
                    
                    {/* Botão de ação */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openClientModal(comp)
                      }}
                      className="w-full mt-2 px-4 py-2.5 bg-[#6c5ce7] hover:bg-[#5b4bc4] text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      Analisar & Vender
                    </button>
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
