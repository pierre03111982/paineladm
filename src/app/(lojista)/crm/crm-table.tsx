"use client"

import { useState } from "react"
import type { ActiveClient } from "@/lib/firestore/crm-queries"
import { MessageCircle, Clock, Image as ImageIcon, Radar } from "lucide-react"
import Image from "next/image"

type CRMTableProps = {
  activeClients: ActiveClient[]
}

export function CRMTable({ activeClients }: CRMTableProps) {
  const [selectedClient, setSelectedClient] = useState<ActiveClient | null>(null)

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
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-800/50 border-b border-zinc-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Última Ação
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Composições
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">
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
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {client.avatar ? (
                          <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-indigo-500/30">
                            <Image
                              src={client.avatar}
                              alt={client.nome}
                              width={40}
                              height={40}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center border-2 border-indigo-500/30">
                            <span className="text-sm font-semibold text-indigo-300">
                              {getInitials(client.nome)}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-white">{client.nome}</div>
                          <div className="text-sm text-zinc-400">{client.whatsapp}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-zinc-300">
                        <Clock className="h-4 w-4 text-zinc-500" />
                        <span>{formatTimeAgo(client.lastActivity)}</span>
                      </div>
                      {client.lastProductName && (
                        <div className="text-xs text-zinc-500 mt-1">
                          {client.lastProductName}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-zinc-300">
                        <ImageIcon className="h-4 w-4 text-zinc-500" />
                        <span>{client.compositionCount}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a
                        href={generateWhatsAppLink(client)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 text-green-300 border border-green-500/50 hover:bg-green-500/30 transition-colors text-sm font-medium"
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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {selectedClient.compositions.map((comp) => (
                    <div
                      key={comp.id}
                      className="relative aspect-square rounded-lg overflow-hidden border border-zinc-800 bg-zinc-800/50"
                    >
                      <Image
                        src={comp.imagemUrl}
                        alt={comp.produtoNome || "Composição"}
                        fill
                        className="object-cover"
                      />
                      {comp.produtoNome && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2">
                          <p className="text-xs text-white truncate">{comp.produtoNome}</p>
                        </div>
                      )}
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


