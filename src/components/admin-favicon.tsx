/**
 * PHASE 25: Admin Favicon Component
 * Busca a logo do admin do Firestore e adiciona como favicon dinamicamente
 */

import { getAdminDb } from "@/lib/firebaseAdmin";

export async function AdminFavicon() {
  try {
    const db = getAdminDb();
    const configDoc = await db.collection("admin").doc("config").get();
    
    if (configDoc.exists) {
      const data = configDoc.data();
      const logoUrl = data?.logoUrl;
      
      if (logoUrl) {
        return (
          <>
            <link rel="icon" type="image/png" href={logoUrl} />
            <link rel="icon" type="image/png" sizes="512x512" href={logoUrl} />
            <link rel="icon" type="image/png" sizes="192x192" href={logoUrl} />
            <link rel="icon" type="image/png" sizes="32x32" href={logoUrl} />
            <link rel="icon" type="image/png" sizes="16x16" href={logoUrl} />
            <link rel="apple-touch-icon" sizes="180x180" href={logoUrl} />
            <link rel="apple-touch-icon" sizes="512x512" href={logoUrl} />
            <link rel="shortcut icon" href={logoUrl} />
          </>
        );
      }
    }
  } catch (error) {
    console.error("[AdminFavicon] Erro ao buscar logo do admin:", error);
  }
  
  // Fallback: favicon padrão se não houver logo configurada
  return (
    <>
      <link rel="icon" type="image/png" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/favicon.ico" />
    </>
  );
}

