import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebaseAdmin"
import { FieldValue } from "firebase-admin/firestore"

export const dynamic = 'force-dynamic'

/**
 * API para atualizar o display específico com uma nova imagem
 * Usa Firebase Admin SDK (permissões privilegiadas)
 * Endpoint: POST /api/display/update
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { displayUuid, imageUrl, lojistaId } = body

    console.log("[display/update] Recebendo requisição:", {
      displayUuid,
      imageUrl: imageUrl ? imageUrl.substring(0, 50) + "..." : null,
      lojistaId,
    })

    if (!displayUuid || !imageUrl) {
      return NextResponse.json(
        { error: "displayUuid e imageUrl são obrigatórios" },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    if (!db) {
      console.error("[display/update] Firebase Admin não disponível")
      return NextResponse.json(
        { error: "Firebase Admin não configurado" },
        { status: 500 }
      )
    }

    // Atualizar documento do display usando Admin SDK
    const displayRef = db.collection("displays").doc(displayUuid)
    
    await displayRef.set(
      {
        activeImage: imageUrl,
        timestamp: FieldValue.serverTimestamp(),
        lojistaId: lojistaId || null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    console.log("[display/update] ✅ Display atualizado com sucesso:", {
      displayUuid,
      lojistaId,
    })

    return NextResponse.json({
      success: true,
      displayUuid,
    })
  } catch (error: any) {
    console.error("[display/update] ❌ Erro ao atualizar display:", error)
    console.error("[display/update] Stack trace:", error?.stack)
    
    return NextResponse.json(
      {
        error: "Erro ao atualizar display",
        details: error.message || "Erro desconhecido",
        code: error.code || "UNKNOWN",
      },
      { status: 500 }
    )
  }
}




