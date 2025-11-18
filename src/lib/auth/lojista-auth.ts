import { cookies } from "next/headers";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp, getAdminDb } from "../firebaseAdmin";

/**
 * Obtém o lojistaId do usuário logado
 * Busca na coleção lojas pelo email do usuário autenticado
 */
export async function getCurrentLojistaId(): Promise<string | null> {
  try {
    // Durante o build, não há cookies, então retornar null
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return null;
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      console.log("[LojistaAuth] Token não encontrado nos cookies");
      return null;
    }

    // Verificar token no Firebase Admin
    const auth = getAuth(getAdminApp());
    const decodedToken = await auth.verifyIdToken(token);

    const email = decodedToken.email;
    if (!email) {
      console.log("[LojistaAuth] Email não encontrado no token");
      return null;
    }

    // Buscar loja pelo email na coleção lojas
    const db = getAdminDb();
    const lojaSnapshot = await db
      .collection("lojas")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (lojaSnapshot.empty) {
      console.log("[LojistaAuth] Nenhuma loja encontrada para o email:", email);
      return null;
    }

    const lojistaId = lojaSnapshot.docs[0].id;
    console.log("[LojistaAuth] LojistaId encontrado:", lojistaId, "para email:", email);
    return lojistaId;
  } catch (error) {
    console.error("[LojistaAuth] Erro ao obter lojistaId:", error);
    return null;
  }
}

/**
 * Obtém o email do usuário logado
 */
export async function getCurrentUserEmail(): Promise<string | null> {
  try {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return null;
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return null;
    }

    const auth = getAuth(getAdminApp());
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken.email || null;
  } catch (error) {
    console.error("[LojistaAuth] Erro ao obter email:", error);
    return null;
  }
}




