import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const dynamic = 'force-dynamic';

/**
 * POST /api/cliente/logout
 * Limpa a sessão do cliente no backend
 * Body: { lojistaId: string, whatsapp: string, deviceId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lojistaId, whatsapp, deviceId } = body;

    if (!lojistaId || !whatsapp) {
      return NextResponse.json(
        { error: "lojistaId e whatsapp são obrigatórios" },
        { status: 400 }
      );
    }

    const cleanWhatsapp = whatsapp.replace(/\D/g, "");
    const db = getAdminDb();

    // Buscar cliente por WhatsApp
    const clientesRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("clientes");

    const clientesSnapshot = await clientesRef
      .where("whatsapp", "==", cleanWhatsapp)
      .limit(1)
      .get();

    if (!clientesSnapshot.empty) {
      const clienteDoc = clientesSnapshot.docs[0];
      const clienteData = clienteDoc.data();
      
      // SEMPRE limpar sessão ativa, independente do deviceId
      // Isso permite que o usuário faça logout e login novamente no mesmo ou outro dispositivo
      await clienteDoc.ref.update({
        activeSession: false,
        activeDeviceId: null,
        lastLogoutAt: new Date(),
      });
      
      console.log(`[API Cliente Logout] Sessão limpa para ${whatsapp} (lojista: ${lojistaId})`);
    } else {
      console.log(`[API Cliente Logout] Cliente não encontrado para ${whatsapp} (lojista: ${lojistaId})`);
    }

    // Limpar sessões na coleção clienteSessions também
    const sessionsRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("clienteSessions");

    const sessionsSnapshot = await sessionsRef
      .where("whatsapp", "==", cleanWhatsapp)
      .get();

    const deletePromises: Promise<any>[] = [];
    sessionsSnapshot.forEach((doc) => {
      deletePromises.push(doc.ref.delete());
    });
    await Promise.all(deletePromises);

    return NextResponse.json({
      success: true,
      message: "Logout realizado com sucesso",
    });
  } catch (error: any) {
    console.error("[API Cliente Logout] Erro:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro ao fazer logout",
      },
      { status: 500 }
    );
  }
}





export const dynamic = 'force-dynamic';

/**
 * POST /api/cliente/logout
 * Limpa a sessão do cliente no backend
 * Body: { lojistaId: string, whatsapp: string, deviceId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lojistaId, whatsapp, deviceId } = body;

    if (!lojistaId || !whatsapp) {
      return NextResponse.json(
        { error: "lojistaId e whatsapp são obrigatórios" },
        { status: 400 }
      );
    }

    const cleanWhatsapp = whatsapp.replace(/\D/g, "");
    const db = getAdminDb();

    // Buscar cliente por WhatsApp
    const clientesRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("clientes");

    const clientesSnapshot = await clientesRef
      .where("whatsapp", "==", cleanWhatsapp)
      .limit(1)
      .get();

    if (!clientesSnapshot.empty) {
      const clienteDoc = clientesSnapshot.docs[0];
      const clienteData = clienteDoc.data();
      
      // SEMPRE limpar sessão ativa, independente do deviceId
      // Isso permite que o usuário faça logout e login novamente no mesmo ou outro dispositivo
      await clienteDoc.ref.update({
        activeSession: false,
        activeDeviceId: null,
        lastLogoutAt: new Date(),
      });
      
      console.log(`[API Cliente Logout] Sessão limpa para ${whatsapp} (lojista: ${lojistaId})`);
    } else {
      console.log(`[API Cliente Logout] Cliente não encontrado para ${whatsapp} (lojista: ${lojistaId})`);
    }

    // Limpar sessões na coleção clienteSessions também
    const sessionsRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("clienteSessions");

    const sessionsSnapshot = await sessionsRef
      .where("whatsapp", "==", cleanWhatsapp)
      .get();

    const deletePromises: Promise<any>[] = [];
    sessionsSnapshot.forEach((doc) => {
      deletePromises.push(doc.ref.delete());
    });
    await Promise.all(deletePromises);

    return NextResponse.json({
      success: true,
      message: "Logout realizado com sucesso",
    });
  } catch (error: any) {
    console.error("[API Cliente Logout] Erro:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro ao fazer logout",
      },
      { status: 500 }
    );
  }
}

