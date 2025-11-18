import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { isAdminEmail } from "@/lib/auth/admin-auth";

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

    console.log("[CheckAdmin] Email verificado:", email);
    console.log("[CheckAdmin] É admin?", isAdmin);
    console.log("[CheckAdmin] ADMIN_EMAILS:", process.env.ADMIN_EMAILS);

    return NextResponse.json({
      isAdmin,
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

