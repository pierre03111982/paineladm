import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminDb, getAdminApp } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/auth/admin-auth";

// Forçar renderização dinâmica
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/lojistas/criar
 * Cria uma nova loja e seu administrador em uma única operação
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const {
      // Dados da loja
      nomeLoja,
      planoAtual = "free",
      status = "ativo", // Liberar acesso automaticamente
      statusPagamento = "pago",
      limiteImagens = 50,
      descricao,
      // Dados do administrador
      emailAdmin,
      senhaAdmin,
      nomeAdmin,
    } = body;

    // Validações
    if (!nomeLoja) {
      return NextResponse.json(
        { error: "Nome da loja é obrigatório" },
        { status: 400 }
      );
    }

    if (!emailAdmin || !senhaAdmin) {
      return NextResponse.json(
        { error: "Email e senha do administrador são obrigatórios" },
        { status: 400 }
      );
    }

    if (senhaAdmin.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 6 caracteres" },
        { status: 400 }
      );
    }

    const auth = getAuth(getAdminApp());
    const db = getAdminDb();

    // Verificar se o email já existe
    try {
      await auth.getUserByEmail(emailAdmin);
      return NextResponse.json(
        { error: "Este email já está cadastrado" },
        { status: 400 }
      );
    } catch (error: any) {
      // Se não encontrar o usuário, continuar (é o esperado)
      if (error.code !== "auth/user-not-found") {
        throw error;
      }
    }

    // Criar usuário administrador da loja no Firebase Auth
    const userRecord = await auth.createUser({
      email: emailAdmin,
      password: senhaAdmin,
      displayName: nomeAdmin || nomeLoja,
      emailVerified: true, // Verificar email automaticamente para liberar acesso
    });

    // Definir role como "lojista"
    await auth.setCustomUserClaims(userRecord.uid, {
      role: "lojista",
    });

    // Criar loja no Firestore
    const lojaRef = db.collection("lojas").doc();
    await lojaRef.set({
      email: emailAdmin,
      nome: nomeLoja,
      planoAtual,
      status, // "ativo" - acesso liberado automaticamente
      statusPagamento,
      limiteImagens,
      imagensGeradasMes: 0,
      descricao: descricao || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Criar perfil público da loja
    const perfilRef = lojaRef.collection("perfil").doc("publico");
    await perfilRef.set({
      nome: nomeLoja,
      descricao: descricao || null,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      loja: {
        id: lojaRef.id,
        nome: nomeLoja,
        email: emailAdmin,
        status,
        planoAtual,
      },
      admin: {
        uid: userRecord.uid,
        email: emailAdmin,
        displayName: nomeAdmin || nomeLoja,
      },
    });
  } catch (error: any) {
    console.error("[API Criar Lojista] Erro:", error);
    
    if (error.code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "Este email já está cadastrado" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Erro ao criar loja e administrador" },
      { status: 500 }
    );
  }
}




