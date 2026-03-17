import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp, getAdminDb } from "@/lib/firebaseAdmin";
import { isAdminEmail } from "@/lib/auth/admin-auth";

/**
 * Handler OPTIONS para CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

/**
 * API route para verificar se um usuário é admin
 * POST /api/auth/check-admin
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { isAdmin: false, error: "Token não fornecido" },
        { status: 400 }
      );
    }

    // Verificar token no Firebase Admin
    const auth = getAuth(getAdminApp());
    const decodedToken = await auth.verifyIdToken(token);

    const email = decodedToken.email;
    if (!email) {
      return NextResponse.json(
        { isAdmin: false, error: "Email não encontrado no token" },
        { status: 401 }
      );
    }

    // Verificar se o email está na lista de admins
    const isAdmin = isAdminEmail(email);
    
    // Se não for admin, tentar buscar o lojistaId associado a este email
    let lojistaId = null;
    if (!isAdmin) {
      const db = getAdminDb();
      const lojaSnapshot = await db
        .collection("lojas")
        .where("email", "==", email)
        .limit(1)
        .get();

      if (!lojaSnapshot.empty) {
        lojistaId = lojaSnapshot.docs[0].id;
      }
    }

    console.log("[CheckAdmin] Email verificado:", email);
    console.log("[CheckAdmin] É admin?", isAdmin);
    console.log("[CheckAdmin] LojistaId encontrado:", lojistaId);

    return NextResponse.json({
      isAdmin,
      lojistaId,
      email: isAdmin ? email : null,
      debug: {
        checkedEmail: email,
        adminEmails: process.env.ADMIN_EMAILS,
      },
    });
  } catch (error) {
    console.error("[CheckAdmin] Erro ao verificar admin:", error);
    return NextResponse.json(
      { isAdmin: false, error: "Erro ao verificar permissões" },
      { status: 500 }
    );
  }
}

