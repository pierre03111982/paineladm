import { cookies } from "next/headers";
import { headers } from "next/headers";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp, getAdminDb } from "../firebaseAdmin";

/**
 * Verifica se há um session ID de impersonificação na URL ou cookies
 * Retorna o lojistaId se encontrado, null caso contrário
 */
async function getImpersonationTokenFromUrl(): Promise<string | null> {
  try {
    // Primeiro, verificar se há session ID nos cookies (após login)
    const cookieStore = await cookies();
    const impersonationSessionId = cookieStore.get("impersonation_session")?.value;
    const impersonationLojistaId = cookieStore.get("impersonation_lojistaId")?.value;

    if (impersonationSessionId && impersonationLojistaId) {
      // Verificar se a sessão ainda é válida
      const sessionDoc = await getAdminDb()
        .collection("impersonation_sessions")
        .doc(impersonationSessionId)
        .get();

      if (sessionDoc.exists) {
        const sessionData = sessionDoc.data();
        const expiresAt = sessionData?.expiresAt?.toDate?.() || new Date(sessionData?.expiresAt);
        
        if (expiresAt > new Date() && sessionData?.lojistaId === impersonationLojistaId) {
          console.log("[LojistaAuth] Sessão de impersonificação válida encontrada nos cookies:", impersonationLojistaId);
          return impersonationLojistaId;
        }
      }
    }

    // Se não encontrou nos cookies, verificar na URL (primeira vez)
    const headersList = await headers();
    const referer = headersList.get("referer") || "";
    
    if (referer) {
      try {
        const url = new URL(referer);
        const sessionId = url.searchParams.get("impersonation_session");
        const lojistaId = url.searchParams.get("lojistaId");

        if (sessionId && lojistaId) {
          // Verificar se a sessão existe e não expirou
          const sessionDoc = await getAdminDb()
            .collection("impersonation_sessions")
            .doc(sessionId)
            .get();

          if (sessionDoc.exists) {
            const sessionData = sessionDoc.data();
            const expiresAt = sessionData?.expiresAt?.toDate?.() || new Date(sessionData?.expiresAt);
            
            if (expiresAt > new Date() && sessionData?.lojistaId === lojistaId) {
              console.log("[LojistaAuth] Session ID de impersonificação válido encontrado na URL:", lojistaId);
              return lojistaId;
            }
          }
        }
      } catch (error) {
        // URL inválida, continuar
      }
    }

    return null;
  } catch (error) {
    console.error("[LojistaAuth] Erro ao verificar token de impersonificação:", error);
    return null;
  }
}

/**
 * Verifica se o usuário está em modo de impersonificação
 * Retorna true se houver uma sessão de impersonificação válida
 */
export async function isImpersonating(): Promise<boolean> {
  try {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return false;
    }

    // Verificar se há sessão de impersonificação
    const impersonationLojistaId = await getImpersonationTokenFromUrl();
    return impersonationLojistaId !== null;
  } catch (error) {
    console.error("[LojistaAuth] Erro ao verificar impersonificação:", error);
    return false;
  }
}

/**
 * Obtém o lojistaId do usuário logado
 * Busca na coleção lojas pelo email do usuário autenticado
 * Também verifica tokens de impersonificação
 */
export async function getCurrentLojistaId(): Promise<string | null> {
  try {
    // Durante o build, não há cookies, então retornar null
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return null;
    }

    // Primeiro, verificar se há token de impersonificação na URL
    const impersonationLojistaId = await getImpersonationTokenFromUrl();
    if (impersonationLojistaId) {
      console.log("[LojistaAuth] Usando lojistaId de impersonificação:", impersonationLojistaId);
      return impersonationLojistaId;
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




