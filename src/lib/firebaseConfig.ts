"use client";

import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let firebaseApp: FirebaseApp;
let firebaseAuthInstance: Auth | null = null;

// Inicializar Firebase App
if (!getApps().length) {
  try {
    firebaseApp = initializeApp(firebaseConfig);
    console.log("[Firebase] App inicializado com sucesso");
  } catch (error) {
    console.error("[Firebase] Erro ao inicializar app:", error);
    throw error;
  }
} else {
  firebaseApp = getApp();
}

// Inicializar Auth com tratamento de erro
try {
  firebaseAuthInstance = getAuth(firebaseApp);
  console.log("[Firebase] Auth inicializado com sucesso");
} catch (error) {
  console.error("[Firebase] Erro ao inicializar Auth:", error);
  throw error;
}

export const firebaseAuth = firebaseAuthInstance!;
export const firebaseStorage = getStorage(firebaseApp);
export const getFirebaseApp = () => firebaseApp;
