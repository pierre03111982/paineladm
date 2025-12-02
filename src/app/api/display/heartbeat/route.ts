import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = 'force-dynamic';

/**
 * PHASE 16: Display Heartbeat API
 * Atualiza o IP, userAgent e lastHeartbeat do display a cada 30 segundos
 * Endpoint: POST /api/display/heartbeat
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { displayUuid } = body;

    if (!displayUuid) {
      return NextResponse.json(
        { error: "displayUuid é obrigatório" },
        { status: 400 }
      );
    }

    // Obter IP do cliente
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const clientIp = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";

    // Obter User-Agent
    const userAgent = request.headers.get("user-agent") || "unknown";

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { error: "Firebase Admin não configurado" },
        { status: 500 }
      );
    }

    // Atualizar documento do display
    const displayRef = db.collection("displays").doc(displayUuid);
    
    await displayRef.set(
      {
        lastKnownIp: clientIp,
        userAgent: userAgent,
        lastHeartbeat: FieldValue.serverTimestamp(),
        status: "idle", // Manter como idle se não estiver pareado
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log("[display/heartbeat] ✅ Heartbeat atualizado:", {
      displayUuid,
      clientIp,
      userAgent: userAgent.substring(0, 50) + "...",
    });

    return NextResponse.json({
      success: true,
      displayUuid,
      ip: clientIp,
    });
  } catch (error: any) {
    console.error("[display/heartbeat] ❌ Erro:", error);
    return NextResponse.json(
      {
        error: "Erro ao atualizar heartbeat",
        details: error.message,
      },
      { status: 500 }
    );
  }
}








