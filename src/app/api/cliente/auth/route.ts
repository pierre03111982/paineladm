import { NextRequest, NextResponse } from "next/server";
import { fetchClienteByWhatsapp } from "@/lib/firestore/server";
import bcrypt from "bcryptjs";

/**
 * POST /api/cliente/auth
 * Autentica cliente com WhatsApp e senha
 * Body: { lojistaId: string, whatsapp: string, password: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lojistaId, whatsapp, password } = body;

    if (!lojistaId || !whatsapp || !password) {
      return NextResponse.json(
        { error: "lojistaId, whatsapp e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const cleanWhatsapp = whatsapp.replace(/\D/g, "");
    const cliente = await fetchClienteByWhatsapp(lojistaId, cleanWhatsapp);

    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    // Buscar dados completos do cliente para verificar senha
    const { getAdminDb } = await import("@/lib/firebaseAdmin");
    const db = getAdminDb();
    const clienteRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("clientes")
      .doc(cliente.id);

    const clienteSnapshot = await clienteRef.get();
    if (!clienteSnapshot.exists) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    const clienteData = clienteSnapshot.data();
    const hashedPassword = clienteData?.passwordHash;

    if (!hashedPassword) {
      return NextResponse.json(
        { error: "Cliente não possui senha cadastrada. Faça o cadastro primeiro." },
        { status: 400 }
      );
    }

    // Verificar senha
    const passwordMatch = await bcrypt.compare(password, hashedPassword);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Senha incorreta" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      cliente: {
        id: cliente.id,
        nome: cliente.nome,
        whatsapp: cliente.whatsapp,
        email: cliente.email,
      },
    });
  } catch (error: any) {
    console.error("[API Cliente Auth] Erro:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao autenticar cliente" },
      { status: 500 }
    );
  }
}

