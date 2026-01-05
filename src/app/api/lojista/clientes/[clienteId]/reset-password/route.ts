import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebaseAdmin";

export const dynamic = 'force-dynamic';

/**
 * POST /api/lojista/clientes/[clienteId]/reset-password
 * Reseta a senha do cliente
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clienteId: string }> }
) {
  try {
    const { clienteId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const lojistaIdFromQuery = searchParams.get("lojistaId");
    
    // Prioridade: query string (modo admin) > usuário logado
    const lojistaIdFromAuth = lojistaIdFromQuery ? null : await getCurrentLojistaId();
    const lojistaId =
      lojistaIdFromQuery ||
      lojistaIdFromAuth ||
      process.env.NEXT_PUBLIC_LOJISTA_ID ||
      process.env.LOJISTA_ID ||
      "";

    if (!lojistaId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const db = getAdminDb();
    const clienteDoc = await db
      .collection("lojas")
      .doc(lojistaId)
      .collection("clientes")
      .doc(clienteId)
      .get();

    if (!clienteDoc.exists) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    const clienteData = clienteDoc.data();
    const email = clienteData?.email;

    if (!email) {
      return NextResponse.json(
        { error: "Cliente não possui email cadastrado" },
        { status: 400 }
      );
    }

    // Gerar nova senha aleatória
    const newPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase() + "!@#";
    
    try {
      // Buscar o usuário no Firebase Auth pelo email
      const auth = getAuth(getAdminApp());
      let userRecord;
      
      try {
        userRecord = await auth.getUserByEmail(email);
      } catch (error: any) {
        // Se o usuário não existir no Auth, criar um novo
        if (error?.code === 'auth/user-not-found') {
          userRecord = await auth.createUser({
            email: email,
            password: newPassword,
            displayName: clienteData?.nome || "Cliente",
          });
        } else {
          throw error;
        }
      }

      // Atualizar a senha
      await auth.updateUser(userRecord.uid, {
        password: newPassword,
      });

      // Atualizar o documento do cliente com a nova senha (opcional, para referência)
      await db
        .collection("lojas")
        .doc(lojistaId)
        .collection("clientes")
        .doc(clienteId)
        .update({
          updatedAt: new Date(),
          passwordResetAt: new Date(),
        });

      return NextResponse.json({ 
        success: true,
        message: "Senha resetada com sucesso",
        newPassword: newPassword // Em produção, não retornar a senha, apenas enviar por email
      });
    } catch (authError: any) {
      console.error("[Reset Password] Erro no Firebase Auth:", authError);
      return NextResponse.json(
        { error: `Erro ao resetar senha: ${authError.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error(`[API Reset Password] Erro:`, error);
    return NextResponse.json(
      { error: error.message || "Erro ao resetar senha" },
      { status: 500 }
    );
  }
}

