import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebaseAdmin"

const db = getAdminDb()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get("filter") || "all"
    const limit = parseInt(searchParams.get("limit") || "50")

    let query = db.collection("system_logs").orderBy("timestamp", "desc").limit(limit)

    if (filter === "error") {
      query = query.where("level", "in", ["error", "critical"])
    } else if (filter === "critical") {
      query = query.where("level", "==", "critical")
    }

    const snapshot = await query.get()
    const logs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({ logs })
  } catch (error: any) {
    console.error("[API/Admin/Logs] Erro:", error)
    return NextResponse.json(
      { error: "Erro ao buscar logs" },
      { status: 500 }
    )
  }
}








