import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";
import { getAuth, type Auth } from "firebase-admin/auth";

// Singleton Variables
let adminApp: App | null = null;
let adminDb: Firestore | null = null;
let adminStorage: Storage | null = null;
let adminAuth: Auth | null = null;

function initializeAdminApp(): App {
  if (adminApp) return adminApp;

  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  // Fallback para build time
  if (!projectId || !clientEmail || !privateKey) {
    if (getApps().length > 0) return getApps()[0];
    // Retorna null ou lança erro dependendo do ambiente, aqui evitamos crash no build
    console.warn("Firebase Admin: Credenciais não encontradas."); 
    return null as any; 
  }

  try {
    adminApp = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
    return adminApp;
  } catch (error) {
    console.error("Erro init Firebase Admin:", error);
    throw error;
  }
}

// Funções Auxiliares
export function getAdminDb(): Firestore {
  if (adminDb) return adminDb;
  const app = initializeAdminApp();
  adminDb = getFirestore(app);
  try { adminDb.settings({ ignoreUndefinedProperties: true }); } catch (e) {}
  return adminDb;
}

export function getAdminStorage(): Storage {
  if (adminStorage) return adminStorage;
  const app = initializeAdminApp();
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;
  
  // Configurar Storage com bucket explícito
  adminStorage = getStorage(app);
  
  // Verificar se o bucket está configurado
  if (!storageBucket) {
    console.warn("[FirebaseAdmin] ⚠️ FIREBASE_STORAGE_BUCKET não configurado, usando padrão");
  }
  
  return adminStorage;
}

export function getAdminAuth(): Auth {
  if (adminAuth) return adminAuth;
  const app = initializeAdminApp();
  adminAuth = getAuth(app);
  return adminAuth;
}

export function getAdminApp(): App {
  return initializeAdminApp();
}

// --- EXPORTAÇÕES CRÍTICAS (ISSO CONSERTA O ERRO DE IMPORTAÇÃO) ---
export const app = initializeAdminApp();
export const db = getAdminDb(); 
export const storage = getAdminStorage();
export const auth = getAdminAuth();