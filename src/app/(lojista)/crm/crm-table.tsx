"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { ActiveClient } from "@/lib/firestore/crm-queries"
import { MessageCircle, Clock, Image as ImageIcon, Radar, RefreshCw } from "lucide-react"
import Image from "next/image"

type CRMTableProps = {
  activeClients: ActiveClient[]
}

export function CRMTable({ activeClients }: CRMTableProps) {
  const [selectedClient, setSelectedClient] = useState<ActiveClient | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const router = useRouter()

  // Auto-refresh a cada 20 segundos
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

  const getStatusBadge = (client: ActiveClient) => {
    const hoursSinceActivity = (Date.now() - client.lastActivity.getTime()) / (1000 * 60 * 60)
    
    if (hoursSinceActivity < 1) {
      return { label: "🔥 Quente", color: "bg-red-500/20 text-red-300 border-red-500/50" }
    } else if (hoursSinceActivity < 6) {
      return { label: "🟡 Morno", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/50" }
    } else {
      return { label: "❄️ Frio", color: "bg-blue-500/20 text-blue-300 border-blue-500/50" }
    }
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) {
      return `${diffMins}min atrás`
    } else if (diffHours < 24) {
      return `${diffHours}h atrás`
    } else {
      return `${diffDays}d atrás`
    }
  }

  const generateWhatsAppLink = (client: ActiveClient) => {
    const whatsapp = client.whatsapp.replace(/\D/g, "")
    const productName = client.lastProductName || "produto"
    const message = encodeURIComponent(
      `Oi ${client.nome}! Vi que você testou o ${productName} no provador. Ficou incrível! Quer um desconto?`
    )
    return `https://wa.me/55${whatsapp}?text=${message}`
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .filter(Boolean)
      .map(word => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
  }

  // Organizar composições por data (hoje, ontem, esta semana, etc.)
  const organizeCompositionsByDate = (compositions: Array<{ id: string; imagemUrl: string; createdAt: Date; produtoNome?: string }>) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const thisWeek = new Date(today)
    thisWeek.setDate(thisWeek.getDate() - 7)

    const groups: {
      label: string
      compositions: typeof compositions
    }[] = [
      { label: "Hoje", compositions: [] },
      { label: "Ontem", compositions: [] },
      { label: "Esta Semana", compositions: [] },
      { label: "Anterior", compositions: [] },
    ]

    compositions.forEach((comp) => {
      const compDate = comp.createdAt
      const compDateOnly = new Date(compDate.getFullYear(), compDate.getMonth(), compDate.getDate())

      if (compDateOnly.getTime() === today.getTime()) {
        groups[0].compositions.push(comp)
      } else if (compDateOnly.getTime() === yesterday.getTime()) {
        groups[1].compositions.push(comp)
      } else if (compDate >= thisWeek) {
        groups[2].compositions.push(comp)
      } else {
        groups[3].compositions.push(comp)
      }
    })

    // Ordenar composições dentro de cada grupo por data (mais recente primeiro)
    groups.forEach((group) => {
      group.compositions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    })

    // Remover grupos vazios
    return groups.filter((group) => group.compositions.length > 0)
  }

  // Formatar data/hora para exibição
  const formatCompositionDate = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    // Se for hoje, mostrar hora e minutos
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const compDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    
    if (compDate.getTime() === today.getTime()) {
      // Hoje: mostrar hora e minutos
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      if (diffMins < 60) {
        return `${diffMins}min atrás (${hours}:${minutes})`
      } else {
        return `${diffHours}h atrás (${hours}:${minutes})`
      }
    } else if (diffDays === 1) {
      // Ontem: mostrar "Ontem" e hora
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      return `Ontem às ${hours}:${minutes}`
    } else if (diffDays < 7) {
      // Esta semana: mostrar dia da semana e hora
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
      const dayName = days[date.getDay()]
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      return `${dayName} às ${hours}:${minutes}`
    } else {
      // Mais antigo: mostrar data completa
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
  }

  if (activeClients.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
        <Radar className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
        <h3 className="text-lg font-semibold text-zinc-300 mb-2">
          Nenhum cliente ativo
        </h3>
        <p className="text-sm text-zinc-500">
          Quando clientes usarem o app, eles aparecerão aqui.
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Botão de Refresh */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-zinc-400">
          Atualiza automaticamente a cada 20 segundos
        </div>
        <button
          onClick={refreshData}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 hover:bg-indigo-500/30 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Atualizando...' : 'Atualizar Agora'}
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <table className="w-full min-w-[640px]">
            <thead className="bg-zinc-800/50 border-b border-zinc-700">
              <tr>
                <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Última Ação
                </th>
                <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Composições
                </th>
                <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Ação
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {activeClients.map((client) => {
                const status = getStatusBadge(client)
                return (
                  <tr
                    key={client.customerId}
                    className="hover:bg-zinc-800/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedClient(client)}
                  >
                    <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        {client.avatar ? (
                          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full overflow-hidden border-2 border-indigo-500/30 shrink-0">
                            <Image
                              src={client.avatar}
                              alt={client.nome}
                              width={40}
                              height={40}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-indigo-500/20 flex items-center justify-center border-2 border-indigo-500/30 shrink-0">
                            <span className="text-xs sm:text-sm font-semibold text-indigo-300">
                              {getInitials(client.nome)}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-medium text-white text-sm sm:text-base truncate">{client.nome}</div>
                          <div className="text-xs sm:text-sm text-zinc-400 truncate">{client.whatsapp}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                      <span
                        className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-zinc-300">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-zinc-500 shrink-0" />
                        <span className="truncate">{formatTimeAgo(client.lastActivity)}</span>
                      </div>
                      {client.lastProductName && (
                        <div className="text-xs text-zinc-500 mt-1 truncate">
                          {client.lastProductName}
                        </div>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-zinc-300">
                        <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4 text-zinc-500 shrink-0" />
                        <span>{client.compositionCount}</span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-right">
                      <a
                        href={generateWhatsAppLink(client)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg bg-green-500/20 text-green-300 border border-green-500/50 hover:bg-green-500/30 transition-colors text-xs sm:text-sm font-medium whitespace-nowrap"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Chamar no WhatsApp
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalhes */}
      {selectedClient && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setSelectedClient(null)}
        >
          <div
            className="w-full max-w-4xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                {selectedClient.avatar ? (
                  <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-indigo-500/30">
                    <Image
                      src={selectedClient.avatar}
                      alt={selectedClient.nome}
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-16 w-16 rounded-full bg-indigo-500/20 flex items-center justify-center border-2 border-indigo-500/30">
                    <span className="text-xl font-semibold text-indigo-300">
                      {getInitials(selectedClient.nome)}
                    </span>
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedClient.nome}</h2>
                  <p className="text-zinc-400">{selectedClient.whatsapp}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedClient(null)}
                className="rounded-lg p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Histórico Visual ({selectedClient.compositions.length} composições)
              </h3>
              {selectedClient.compositions.length === 0 ? (
                <p className="text-zinc-500">Nenhuma composição encontrada.</p>
              ) : (
                <div className="space-y-6">
                  {organizeCompositionsByDate(selectedClient.compositions).map((group, groupIndex) => (
                    <div key={groupIndex} className="space-y-3">
                      {/* Cabeçalho do grupo de data */}
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-zinc-700"></div>
                        <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider px-3">
                          {group.label}
                        </h4>
                        <div className="h-px flex-1 bg-zinc-700"></div>
                      </div>
                      
                      {/* Grid de composições do grupo */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {group.compositions.map((comp) => (
                          <div
                            key={comp.id}
                            className="relative aspect-square rounded-lg overflow-hidden border border-zinc-800 bg-zinc-800/50 group hover:border-indigo-500/50 transition-colors"
                          >
                            <Image
                              src={comp.imagemUrl}
                              alt={comp.produtoNome || "Composição"}
                              fill
                              className="object-cover"
                            />
                            {/* Overlay com informações */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="absolute bottom-0 left-0 right-0 p-2">
                                <p className="text-xs text-zinc-300">
                                  {formatCompositionDate(comp.createdAt)}
                                </p>
                              </div>
                            </div>
                            {/* Informação sempre visível no canto inferior */}
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2">
                              <p className="text-xs text-white">
                                {formatCompositionDate(comp.createdAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <a
                href={generateWhatsAppLink(selectedClient)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-green-500/20 text-green-300 border border-green-500/50 hover:bg-green-500/30 transition-colors font-medium"
              >
                <MessageCircle className="h-5 w-5" />
                Chamar no WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}


