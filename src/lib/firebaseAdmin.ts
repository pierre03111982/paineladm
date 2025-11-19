import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

let adminApp: App | null = null;
let adminDb: Firestore | null = null;
let adminStorage: Storage | null = null;

function initializeAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  console.log("[FirebaseAdmin] Verificando variáveis de ambiente:", {
    hasProjectId: !!projectId,
    hasClientEmail: !!clientEmail,
    hasPrivateKey: !!privateKey,
    projectIdLength: projectId?.length || 0,
    clientEmailLength: clientEmail?.length || 0,
    privateKeyLength: privateKey?.length || 0,
  });

  if (!projectId || !clientEmail || !privateKey) {
    const missing = [];
    if (!projectId) missing.push("FIREBASE_PROJECT_ID ou NEXT_PUBLIC_FIREBASE_PROJECT_ID");
    if (!clientEmail) missing.push("FIREBASE_CLIENT_EMAIL");
    if (!privateKey) missing.push("FIREBASE_PRIVATE_KEY");
    
    const errorMsg = `Firebase Admin SDK não configurado. Variáveis faltando: ${missing.join(", ")}`;
    console.error("[FirebaseAdmin]", errorMsg);
    throw new Error(errorMsg);
  }

  try {
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
    console.log("[FirebaseAdmin] ✅ Firebase Admin inicializado com sucesso");
    return adminApp;
  } catch (error: any) {
    console.error("[FirebaseAdmin] ❌ Erro ao inicializar Firebase Admin:", {
      message: error?.message,
      stack: error?.stack?.substring(0, 500),
    });
    throw error;
  }
}

export function getAdminDb(): Firestore {
  if (adminDb) {
    return adminDb;
  }

  const app = initializeAdminApp();
  adminDb = getFirestore(app);
  return adminDb;
}

export function getAdminStorage(): Storage {
  if (adminStorage) {
    return adminStorage;
  }

  const app = initializeAdminApp();
  adminStorage = getStorage(app);
  return adminStorage;
}

export function getAdminApp(): App {
  return initializeAdminApp();
}

