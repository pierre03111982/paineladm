import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebaseAdmin"

const db = getAdminDb()

export async function GET(request: NextRequest) {
  try {
    // Buscar logs das últimas 24 horas
    const yesterday = new Date()
    yesterday.setHours(yesterday.getHours() - 24)

    const logsSnapshot = await db
      .collection("system_logs")
      .where("timestamp", ">=", yesterday.toISOString())
      .get()

    const logs = logsSnapshot.docs.map((doc) => doc.data())

    // Calcular estatísticas
    const stats = {
      totalLogs: logs.length,
      errors: logs.filter((log) => log.level === "error").length,
      warnings: logs.filter((log) => log.level === "warn").length,
      critical: logs.filter((log) => log.level === "critical").length,
      aiGenerations: {
        total: logs.filter((log) => log.context?.eventType === "ai_generation").length,
        success: logs.filter(
          (log) =>
            log.context?.eventType === "ai_generation" && log.level === "info"
        ).length,
        failed: logs.filter(
          (log) =>
            log.context?.eventType === "ai_generation" && log.level === "error"
        ).length,
      },
      creditEvents: {
        total: logs.filter((log) => log.context?.eventType === "credit_event").length,
        deducts: logs.filter(
          (log) => log.context?.creditEventType === "deduct"
        ).length,
        adds: logs.filter((log) => log.context?.creditEventType === "add").length,
        insufficient: logs.filter(
          (log) => log.context?.creditEventType === "insufficient"
        ).length,
      },
    }

    return NextResponse.json(stats)
  } catch (error: any) {
    console.error("[API/Admin/Stats] Erro:", error)
    return NextResponse.json(
      { error: "Erro ao buscar estatísticas" },
      { status: 500 }
    )
  }
}




