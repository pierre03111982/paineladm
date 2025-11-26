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
      imageUrl: imageUrl ? imageUrl.substring(0, 100) + "..." : null,
      lojistaId,
      imageUrlType: imageUrl ? (imageUrl.startsWith('blob:') ? 'blob' : imageUrl.startsWith('http') ? 'http' : 'other') : 'null',
    })

    // Validação de parâmetros
    if (!displayUuid || !imageUrl) {
      console.error("[display/update] Parâmetros obrigatórios ausentes:", {
        hasDisplayUuid: !!displayUuid,
        hasImageUrl: !!imageUrl,
      })
      return NextResponse.json(
        { error: "displayUuid e imageUrl são obrigatórios" },
        { status: 400 }
      )
    }

    // Validar que imageUrl não é um blob URL (blob URLs não funcionam no servidor)
    if (imageUrl.startsWith('blob:')) {
      console.error("[display/update] Erro: imageUrl é um blob URL, não pode ser usado no servidor:", imageUrl.substring(0, 50))
      return NextResponse.json(
        { 
          error: "URL de imagem inválida. Blob URLs não são suportadas. Use uma URL HTTP/HTTPS válida.",
          details: "A imagem precisa ser uma URL pública (HTTP/HTTPS), não um blob URL do navegador."
        },
        { status: 400 }
      )
    }

    // Validar que imageUrl é uma URL válida
    try {
      new URL(imageUrl)
    } catch (urlError) {
      console.error("[display/update] Erro: imageUrl não é uma URL válida:", imageUrl.substring(0, 100))
      return NextResponse.json(
        { 
          error: "URL de imagem inválida",
          details: "A URL fornecida não é válida."
        },
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

    // Validar que displayUuid existe
    const displayRef = db.collection("displays").doc(displayUuid)
    const displayDoc = await displayRef.get()
    
    if (!displayDoc.exists) {
      console.warn("[display/update] Display não encontrado, criando novo:", displayUuid)
      // Não retornar erro, criar o display se não existir
    }

    // Atualizar documento do display usando Admin SDK
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
      imageUrl: imageUrl.substring(0, 100) + "...",
    })

    return NextResponse.json({
      success: true,
      displayUuid,
      imageUrl: imageUrl.substring(0, 100) + "...", // Retornar URL truncada para log
    })
  } catch (error: any) {
    console.error("[display/update] ❌ Erro ao atualizar display:", error)
    console.error("[display/update] Stack trace:", error?.stack)
    console.error("[display/update] Error details:", {
      name: error?.name,
      message: error?.message,
      code: error?.code,
    })
    
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




