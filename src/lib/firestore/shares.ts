import { getAdminDb } from "@/lib/firebaseAdmin";
import { randomUUID } from "crypto";

export interface ShareDoc {
  id: string;
  lojistaId: string;
  clienteId: string; // Cliente que compartilhou
  clienteNome: string;
  clienteWhatsapp: string;
  imagemUrl: string;
  lookId?: string;
  compositionId?: string;
  jobId?: string;
  shareCode: string; // Código único para o link
  shareUrl: string; // URL completa com o código
  createdAt: Date;
  totalAccesses: number; // Quantas vezes o link foi acessado
  totalSignups: number; // Quantos clientes se cadastraram via esse link
}

export interface ReferralDoc {
  id: string;
  lojistaId: string;
  shareId: string; // ID do compartilhamento
  shareCode: string; // Código do compartilhamento
  referrerClienteId: string; // Cliente que compartilhou
  referrerClienteNome: string;
  referrerClienteWhatsapp: string;
  referredClienteId: string; // Cliente que acessou o link
  referredClienteNome: string;
  referredClienteWhatsapp: string;
  accessedAt: Date;
  signedUpAt?: Date; // Quando se cadastrou (se aplicável)
}

/**
 * Criar um compartilhamento e retornar o link
 */
export async function createShare(params: {
  lojistaId: string;
  clienteId: string;
  clienteNome: string;
  clienteWhatsapp: string;
  imagemUrl: string;
  lookId?: string;
  compositionId?: string;
  jobId?: string;
}): Promise<{ shareId: string; shareCode: string; shareUrl: string }> {
  const db = getAdminDb();
  const { lojistaId, clienteId, clienteNome, clienteWhatsapp, imagemUrl, lookId, compositionId, jobId } = params;

  // Gerar código único para o compartilhamento (8 caracteres alfanuméricos)
  const shareCode = randomUUID().replace(/-/g, "").substring(0, 8).toUpperCase();

  // Construir URL do app com o código
  const clientAppUrl = process.env.NEXT_PUBLIC_CLIENT_APP_URL || "http://localhost:3002";
  const shareUrl = `${clientAppUrl}/${lojistaId}?share=${shareCode}`;

  const shareData: Omit<ShareDoc, "id"> = {
    lojistaId,
    clienteId,
    clienteNome,
    clienteWhatsapp,
    imagemUrl,
      lookId: lookId || undefined,
      compositionId: compositionId || undefined,
      jobId: jobId || undefined,
    shareCode,
    shareUrl,
    createdAt: new Date(),
    totalAccesses: 0,
    totalSignups: 0,
  };

  const docRef = await db
    .collection("lojas")
    .doc(lojistaId)
    .collection("shares")
    .add(shareData);

  console.log("[createShare] Compartilhamento criado:", {
    shareId: docRef.id,
    shareCode,
    clienteId,
  });

  return {
    shareId: docRef.id,
    shareCode,
    shareUrl,
  };
}

/**
 * Buscar compartilhamento por código
 */
export async function getShareByCode(
  lojistaId: string,
  shareCode: string
): Promise<ShareDoc | null> {
  try {
    const db = getAdminDb();
    const snapshot = await db
      .collection("lojas")
      .doc(lojistaId)
      .collection("shares")
      .where("shareCode", "==", shareCode.toUpperCase())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    return {
      id: doc.id,
      lojistaId: data.lojistaId,
      clienteId: data.clienteId,
      clienteNome: data.clienteNome,
      clienteWhatsapp: data.clienteWhatsapp,
      imagemUrl: data.imagemUrl,
      lookId: data.lookId || undefined,
      compositionId: data.compositionId || undefined,
      jobId: data.jobId || undefined,
      shareCode: data.shareCode,
      shareUrl: data.shareUrl,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      totalAccesses: data.totalAccesses || 0,
      totalSignups: data.totalSignups || 0,
    };
  } catch (error) {
    console.error("[getShareByCode] Erro:", error);
    return null;
  }
}

/**
 * Registrar acesso a um link compartilhado
 */
export async function registerShareAccess(params: {
  lojistaId: string;
  shareCode: string;
  visitorId?: string; // ID do visitante (pode ser session ID ou cliente ID se já estiver logado)
}): Promise<{ share: ShareDoc | null; isNewAccess: boolean }> {
  const { lojistaId, shareCode, visitorId } = params;
  const db = getAdminDb();

  const share = await getShareByCode(lojistaId, shareCode);
  if (!share) {
    return { share: null, isNewAccess: false };
  }

  // Incrementar contador de acessos
  const shareRef = db
    .collection("lojas")
    .doc(lojistaId)
    .collection("shares")
    .doc(share.id);

  await shareRef.update({
    totalAccesses: (share.totalAccesses || 0) + 1,
  });

  share.totalAccesses = (share.totalAccesses || 0) + 1;

  console.log("[registerShareAccess] Acesso registrado:", {
    shareCode,
    shareId: share.id,
    visitorId,
  });

  return { share, isNewAccess: true };
}

/**
 * Registrar que um cliente se cadastrou via link compartilhado
 */
export async function registerShareSignup(params: {
  lojistaId: string;
  shareCode: string;
  referrerClienteId: string; // Cliente que compartilhou
  referredClienteId: string; // Cliente que se cadastrou
  referredClienteNome: string;
  referredClienteWhatsapp: string;
}): Promise<string> {
  const { lojistaId, shareCode, referrerClienteId, referredClienteId, referredClienteNome, referredClienteWhatsapp } = params;
  const db = getAdminDb();

  // Buscar o compartilhamento
  const share = await getShareByCode(lojistaId, shareCode);
  if (!share) {
    throw new Error("Compartilhamento não encontrado");
  }

  // Verificar se já existe referral para evitar duplicatas
  const existingRef = await db
    .collection("lojas")
    .doc(lojistaId)
    .collection("referrals")
    .where("shareCode", "==", shareCode.toUpperCase())
    .where("referredClienteId", "==", referredClienteId)
    .limit(1)
    .get();

  if (!existingRef.empty) {
    console.log("[registerShareSignup] Referral já existe");
    return existingRef.docs[0].id;
  }

  // Criar referral
  const referralData: Omit<ReferralDoc, "id"> = {
    lojistaId,
    shareId: share.id,
    shareCode: share.shareCode,
    referrerClienteId,
    referrerClienteNome: share.clienteNome,
    referrerClienteWhatsapp: share.clienteWhatsapp,
    referredClienteId,
    referredClienteNome,
    referredClienteWhatsapp,
    accessedAt: new Date(),
    signedUpAt: new Date(),
  };

  const referralRef = await db
    .collection("lojas")
    .doc(lojistaId)
    .collection("referrals")
    .add(referralData);

  // Incrementar contador de signups no share
  const shareRef = db
    .collection("lojas")
    .doc(lojistaId)
    .collection("shares")
    .doc(share.id);

  await shareRef.update({
    totalSignups: (share.totalSignups || 0) + 1,
  });

  console.log("[registerShareSignup] Signup registrado:", {
    referralId: referralRef.id,
    shareCode,
    referrerClienteId,
    referredClienteId,
  });

  return referralRef.id;
}

/**
 * Buscar todos os referrals de um cliente (clientes que ele trouxe)
 */
export async function getClientReferrals(
  lojistaId: string,
  clienteId: string
): Promise<ReferralDoc[]> {
  try {
    const db = getAdminDb();
    const snapshot = await db
      .collection("lojas")
      .doc(lojistaId)
      .collection("referrals")
      .where("referrerClienteId", "==", clienteId)
      .orderBy("signedUpAt", "desc")
      .get();

    const referrals: ReferralDoc[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      referrals.push({
        id: doc.id,
        lojistaId: data.lojistaId,
        shareId: data.shareId,
        shareCode: data.shareCode,
        referrerClienteId: data.referrerClienteId,
        referrerClienteNome: data.referrerClienteNome,
        referrerClienteWhatsapp: data.referrerClienteWhatsapp,
        referredClienteId: data.referredClienteId,
        referredClienteNome: data.referredClienteNome,
        referredClienteWhatsapp: data.referredClienteWhatsapp,
        accessedAt: data.accessedAt?.toDate?.() || new Date(data.accessedAt),
        signedUpAt: data.signedUpAt?.toDate?.() || new Date(data.signedUpAt),
      });
    });

    return referrals;
  } catch (error) {
    console.error("[getClientReferrals] Erro:", error);
    return [];
  }
}

/**
 * Buscar estatísticas de compartilhamento de um cliente
 */
export async function getClientShareStats(
  lojistaId: string,
  clienteId: string
): Promise<{
  totalShares: number;
  totalAccesses: number;
  totalSignups: number;
  totalReferrals: number;
}> {
  try {
    const db = getAdminDb();

    // Contar compartilhamentos
    const sharesSnapshot = await db
      .collection("lojas")
      .doc(lojistaId)
      .collection("shares")
      .where("clienteId", "==", clienteId)
      .get();

    let totalAccesses = 0;
    let totalSignups = 0;
    sharesSnapshot.forEach((doc) => {
      const data = doc.data();
      totalAccesses += data.totalAccesses || 0;
      totalSignups += data.totalSignups || 0;
    });

    // Contar referrals
    const referralsSnapshot = await db
      .collection("lojas")
      .doc(lojistaId)
      .collection("referrals")
      .where("referrerClienteId", "==", clienteId)
      .get();

    return {
      totalShares: sharesSnapshot.size,
      totalAccesses,
      totalSignups,
      totalReferrals: referralsSnapshot.size,
    };
  } catch (error) {
    console.error("[getClientShareStats] Erro:", error);
    return {
      totalShares: 0,
      totalAccesses: 0,
      totalSignups: 0,
      totalReferrals: 0,
    };
  }
}

