import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

/**
 * POST /api/cliente/check-session
 * Verifica se o cliente já está logado em outro dispositivo POR WHATSAPP
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

    if (clientesSnapshot.empty) {
      // Cliente não existe, permitir login (será criado no cadastro)
      return NextResponse.json({
        alreadyLoggedIn: false,
        message: "Cliente não encontrado",
      });
    }

    const clienteDoc = clientesSnapshot.docs[0];
    const clienteData = clienteDoc.data();

    // Verificar se há sessão ativa em outro dispositivo
    const activeSession = clienteData?.activeSession;
    const activeDeviceId = clienteData?.activeDeviceId;
    const lastLoginAt = clienteData?.lastLoginAt;

    // Se não há sessão ativa, permitir login
    if (!activeSession || !activeDeviceId) {
      // Atualizar sessão atual
      await clienteDoc.ref.update({
        activeSession: true,
        activeDeviceId: deviceId || "unknown",
        lastLoginAt: new Date(),
      });

      return NextResponse.json({
        alreadyLoggedIn: false,
        message: "Sessão iniciada",
      });
    }

    // Se o deviceId é o mesmo, permitir login (mesmo dispositivo)
    if (activeDeviceId === deviceId) {
      // Atualizar última atividade
      await clienteDoc.ref.update({
        lastLoginAt: new Date(),
      });

      return NextResponse.json({
        alreadyLoggedIn: false,
        message: "Sessão renovada",
      });
    }

    // Verificar se a sessão anterior é muito antiga (mais de 24 horas)
    const lastLoginDate = lastLoginAt?.toDate ? lastLoginAt.toDate() : new Date(lastLoginAt);
    const hoursSinceLastLogin = (Date.now() - lastLoginDate.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastLogin > 24) {
      // Sessão antiga, permitir novo login e invalidar a anterior
      await clienteDoc.ref.update({
        activeSession: true,
        activeDeviceId: deviceId || "unknown",
        lastLoginAt: new Date(),
      });

      return NextResponse.json({
        alreadyLoggedIn: false,
        message: "Sessão anterior expirada, nova sessão iniciada",
      });
    }

    // Cliente já está logado em outro dispositivo
    return NextResponse.json({
      alreadyLoggedIn: true,
      message: "Cliente já está logado em outro dispositivo",
      lastLoginAt: lastLoginDate.toISOString(),
    });
  } catch (error: any) {
    console.error("[API Cliente Check Session] Erro:", error);
    // Em caso de erro, permitir login (não bloquear)
    return NextResponse.json(
      {
        alreadyLoggedIn: false,
        error: error.message || "Erro ao verificar sessão",
      },
      { status: 200 }
    );
  }
}

