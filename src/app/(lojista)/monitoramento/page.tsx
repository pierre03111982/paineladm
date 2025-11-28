"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "../components/page-header"
import { AlertCircle, CheckCircle, XCircle, Info, TrendingDown, TrendingUp } from "lucide-react"

interface LogEntry {
  id: string
  level: string
  message: string
  timestamp: string
  lojistaId?: string
  context?: any
}

interface SystemStats {
  totalLogs: number
  errors: number
  warnings: number
  critical: number
  aiGenerations: {
    total: number
    success: number
    failed: number
  }
  creditEvents: {
    total: number
    deducts: number
    adds: number
    insufficient: number
  }
}

export default function MonitoramentoPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "error" | "critical">("all")

  useEffect(() => {
    loadLogs()
    loadStats()
  }, [filter])

  async function loadLogs() {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/logs?filter=${filter}&limit=50`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error("Erro ao carregar logs:", error)
    } finally {
      setIsLoading(false)
    }
  }

  async function loadStats() {
    try {
      const response = await fetch("/api/admin/stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error)
    }
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "critical":
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "warn":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />
      default:
        return <CheckCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-red-500/20 text-red-300 border-red-500/50"
      case "error":
        return "bg-red-500/10 text-red-400 border-red-500/30"
      case "warn":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/50"
      case "info":
        return "bg-blue-500/20 text-blue-300 border-blue-500/50"
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/50"
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitoramento do Sistema"
        description="Logs e estatísticas do sistema"
      />

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] p-6 shadow-md transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-600">Total de Logs</h3>
              <Info className="h-5 w-5 text-slate-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.totalLogs}</p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] p-6 shadow-md transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-600">Erros</h3>
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.errors}</p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] p-6 shadow-md transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-600">Gerações IA</h3>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-bold text-slate-900">
                {stats.aiGenerations.success} / {stats.aiGenerations.total}
              </p>
              <p className="text-xs text-slate-600">
                {stats.aiGenerations.failed} falhas
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] p-6 shadow-md transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-600">Eventos de Crédito</h3>
              <TrendingDown className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.creditEvents.total}</p>
            <p className="text-xs text-slate-600 mt-1">
              {stats.creditEvents.insufficient} saldo insuficiente
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === "all"
              ? "bg-indigo-500 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => setFilter("error")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === "error"
              ? "bg-red-500 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          }`}
        >
          Erros
        </button>
        <button
          onClick={() => setFilter("critical")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === "critical"
              ? "bg-red-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          }`}
        >
          Críticos
        </button>
      </div>

      {/* Lista de Logs */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-zinc-400">Carregando logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            Nenhum log encontrado
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 hover:bg-zinc-800/30 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {getLevelIcon(log.level)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getLevelColor(
                          log.level
                        )}`}
                      >
                        {log.level.toUpperCase()}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {formatTime(log.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-white mb-1">{log.message}</p>
                    {log.context && (
                      <details className="mt-2">
                        <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-300">
                          Ver contexto
                        </summary>
                        <pre className="mt-2 p-2 bg-zinc-900 rounded text-xs text-zinc-300 overflow-x-auto">
                          {JSON.stringify(log.context, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}









