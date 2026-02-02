import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "../firebaseAdmin";

/**
 * Lista de emails autorizados como admin
 * Em produção, isso deve vir do Firestore ou de variáveis de ambiente
 */
function getAdminEmails(): string[] {
  const envEmails = process.env.ADMIN_EMAILS;
  
  if (envEmails) {
    const emails = envEmails.split(",").map((e) => e.trim()).filter(Boolean);
    console.log("[AdminAuth] Emails admin carregados da variável de ambiente:", emails);
    return emails;
  }
  
  // Fallback para desenvolvimento
  const fallback = [
    "admin@experimenteai.com",
    "pierre03111982@gmail.com",
  ];
  console.warn("[AdminAuth] ADMIN_EMAILS não configurada, usando fallback:", fallback);
  return fallback;
}

const ADMIN_EMAILS = getAdminEmails();

/**
 * Verifica se um email tem permissão de admin
 * Esta função pode ser usada tanto no servidor quanto no cliente
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.some((adminEmail) => 
    email.toLowerCase() === adminEmail.toLowerCase()
  );
}

/**
 * Verifica se o usuário atual é admin
 * Retorna o email do usuário se for admin, null caso contrário
 */
export async function getCurrentAdmin(): Promise<string | null> {
  try {
    // Durante o build, não há cookies, então retornar null
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      console.log("[AdminAuth] Build em andamento, pulando verificação");
      return null;
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      console.log("[AdminAuth] Token não encontrado nos cookies");
      return null;
    }

    console.log("[AdminAuth] Token encontrado, verificando...");

    // Verificar token no Firebase Admin
    const auth = getAuth(getAdminApp());
    const decodedToken = await auth.verifyIdToken(token);

    const email = decodedToken.email;
    if (!email) {
      console.log("[AdminAuth] Email não encontrado no token");
      return null;
    }

    console.log("[AdminAuth] Email do token:", email);
    console.log("[AdminAuth] Lista de admins:", ADMIN_EMAILS);

    // Verificar se o email está na lista de admins
    const isAdmin = isAdminEmail(email);
    console.log("[AdminAuth] É admin?", isAdmin);

    if (isAdmin) {
      return email;
    }

    console.log("[AdminAuth] Email não está na lista de admins");
    return null;
  } catch (error) {
    console.error("[AdminAuth] Erro ao verificar admin:", error);
    if (error instanceof Error) {
      console.error("[AdminAuth] Mensagem de erro:", error.message);
      // Não logar stack durante build
      if (process.env.NEXT_PHASE !== 'phase-production-build') {
        console.error("[AdminAuth] Stack:", error.stack);
      }
    }
    return null;
  }
}

/**
 * Requer que o usuário seja admin
 * Redireciona para login se não for admin
 */
export async function requireAdmin(): Promise<string> {
  try {
    // Durante o build, não fazer redirect, apenas retornar um email placeholder
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      console.log("[requireAdmin] Build em andamento, retornando placeholder");
      return "admin@build";
    }

    const adminEmail = await getCurrentAdmin();

    if (!adminEmail) {
      console.log("[requireAdmin] Usuário não é admin, redirecionando para login");
      redirect("/login?admin=true&error=unauthorized");
    }

    return adminEmail;
  } catch (error) {
    console.error("[requireAdmin] Erro ao verificar admin:", error);
    // Se for erro de redirect, relançar
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error;
    }
    // Durante build, não fazer redirect
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return "admin@build";
    }
    // Caso contrário, redirecionar
    redirect("/login?admin=true&error=check_failed");
  }
}

/**
 * Verifica se o usuário tem permissão de admin (sem redirecionar)
 * Útil para componentes que precisam verificar mas não bloquear
 */
export async function checkAdminAccess(): Promise<boolean> {
  const adminEmail = await getCurrentAdmin();
  return adminEmail !== null;
}

/**
 * Verifica se o usuário tem role super_admin via custom claims do Firebase
 * Esta é a validação mais segura para operações críticas como adicionar créditos
 */
export async function isSuperAdmin(): Promise<boolean> {
  try {
    // Durante o build, não há cookies, então retornar false
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return false;
    }    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;    if (!token) {
      console.log("[isSuperAdmin] Token não encontrado nos cookies");
      return false;
    }    // Verificar token no Firebase Admin
    const auth = getAuth(getAdminApp());
    const decodedToken = await auth.verifyIdToken(token);    // Verificar custom claims - Firebase retorna claims diretamente no token
    // Custom claims são acessados via decodedToken.role ou decodedToken['role']
    const role = (decodedToken as any).role || (decodedToken as any).claims?.role;
    const isSuper = role === "super_admin";    // Fallback: Verificar também se é admin via email (compatibilidade)
    const email = decodedToken.email;
    const isAdminByEmail = email ? isAdminEmail(email) : false;    const isAuthorized = isSuper || isAdminByEmail;    console.log("[isSuperAdmin] Verificação:", {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role,
      isSuper,
      isAdminEmail,
      isAuthorized,
    });    return isAuthorized;
  } catch (error) {
    console.error("[isSuperAdmin] Erro ao verificar super_admin:", error);
    return false;
  }
}/**
 * Requer que o usuário seja super_admin
 * Retorna 403 se não for
 */
export async function requireSuperAdmin(): Promise<void> {
  const isSuper = await isSuperAdmin();
  if (!isSuper) {
    throw new Error("FORBIDDEN: Apenas super_admin pode executar esta operação");
  }
}/**
 * Verifica se o usuário tem permissão de super_admin (sem lançar erro)
 * Útil para verificações condicionais
 */
export async function checkSuperAdminAccess(): Promise<boolean> {
  return await isSuperAdmin();
}