/**
 * FASE 3: API de Anúncios do Marketplace
 * 
 * CRUD de anúncios com validação de adSlotsLimit por plano
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireSuperAdmin, checkSuperAdminAccess } from "@/lib/auth/admin-auth";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { getPlanConfig } from "@/lib/plans-config";
import type { MarketplaceAd, AdStatus } from "@/lib/firestore/marketplace-types";
import { FieldValue } from "firebase-admin/firestore";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";

const db = getAdminDb();

/**
 * GET: Listar anúncios
 * - Super admin: vê todos
 * - Lojista: vê apenas os seus
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lojistaIdFromQuery = searchParams.get("lojistaId");
    const status = searchParams.get("status") as AdStatus | null;

    const isSuperAdmin = await checkSuperAdminAccess();
    let lojistaId: string | null = null;

    if (lojistaIdFromQuery) {
      if (isSuperAdmin) {
        lojistaId = lojistaIdFromQuery;
      } else {
        // Usuário comum só pode ver seus próprios anúncios
        const currentLojistaId = await getCurrentLojistaId();
        if (currentLojistaId === lojistaIdFromQuery) {
          lojistaId = lojistaIdFromQuery;
        } else {
          return NextResponse.json(
            { error: "Não autorizado" },
            { status: 403 }
          );
        }
      }
    } else if (!isSuperAdmin) {
      // Lojista sem lojistaId na query = ver seus próprios
      lojistaId = await getCurrentLojistaId();
    }

    let query = db.collection("marketplace_ads") as any;

    if (lojistaId) {
      query = query.where("lojistaId", "==", lojistaId);
    }

    if (status) {
      query = query.where("status", "==", status);
    }

    const snapshot = await query.orderBy("priority", "desc").orderBy("createdAt", "desc").get();

    const ads: MarketplaceAd[] = snapshot.docs.map((doc: QueryDocumentSnapshot) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startDate: data.startDate?.toDate?.() || (data.startDate ? new Date(data.startDate) : undefined),
        endDate: data.endDate?.toDate?.() || (data.endDate ? new Date(data.endDate) : undefined),
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
      } as MarketplaceAd;
    });

    return NextResponse.json({ ads });
  } catch (error: any) {
    console.error("[MarketplaceAds] Erro ao listar anúncios:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao listar anúncios" },
      { status: 500 }
    );
  }
}

/**
 * POST: Criar novo anúncio
 * Valida adSlotsLimit do plano antes de criar
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lojistaId, title, description, imageUrl, ctaText, ctaLink, priority, startDate, endDate } = body;

    if (!lojistaId || !title) {
      return NextResponse.json(
        { error: "lojistaId e title são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se é super_admin ou o próprio lojista
    const isSuperAdmin = await checkSuperAdminAccess();
    if (!isSuperAdmin) {
      const currentLojistaId = await getCurrentLojistaId();
      if (currentLojistaId !== lojistaId) {
        return NextResponse.json(
          { error: "Não autorizado" },
          { status: 403 }
        );
      }
    }

    // Buscar dados da loja para validar plano
    const lojaRef = db.collection("lojas").doc(lojistaId);
    const lojaDoc = await lojaRef.get();

    if (!lojaDoc.exists) {
      return NextResponse.json(
        { error: "Loja não encontrada" },
        { status: 404 }
      );
    }

    const lojaData = lojaDoc.data() || {};
    const subscription = lojaData.subscription || {
      planId: "start",
      status: "active",
      adSlotsLimit: 0,
      clientType: "standard",
    };

    const planConfig = getPlanConfig(subscription.planId);
    const adSlotsLimit = subscription.adSlotsLimit || planConfig?.adSlotsLimit || 0;

    // Contar anúncios ativos da loja
    const activeAdsSnapshot = await db
      .collection("marketplace_ads")
      .where("lojistaId", "==", lojistaId)
      .where("status", "==", "active")
      .get();

    const activeAdsCount = activeAdsSnapshot.size;

    if (activeAdsCount >= adSlotsLimit) {
      return NextResponse.json(
        {
          error: `Limite de anúncios atingido. Seu plano ${planConfig?.name || subscription.planId} permite ${adSlotsLimit} anúncio(s) ativo(s).`,
          currentLimit: adSlotsLimit,
          currentCount: activeAdsCount,
        },
        { status: 402 }
      );
    }

    // Buscar dados da loja para preencher automaticamente
    const lojistaNome = lojaData.nome || "Loja";
    const lojistaLogoUrl = lojaData.logoUrl || lojaData.logo_url || null;

    // Criar anúncio
    const newAd: Omit<MarketplaceAd, "id"> = {
      lojistaId,
      lojistaNome,
      lojistaLogoUrl,
      title,
      description: description || undefined,
      imageUrl: imageUrl || undefined,
      ctaText: ctaText || "Ver Loja",
      ctaLink: ctaLink || undefined,
      status: "active",
      priority: priority || planConfig?.adSlotsLimit || 5,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      impressions: 0,
      clicks: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection("marketplace_ads").add(newAd);

    console.log("[MarketplaceAds] ✅ Anúncio criado:", {
      adId: docRef.id,
      lojistaId,
      title,
      adSlotsLimit,
      activeAdsCount: activeAdsCount + 1,
    });

    return NextResponse.json({
      id: docRef.id,
      ...newAd,
    });
  } catch (error: any) {
    console.error("[MarketplaceAds] Erro ao criar anúncio:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao criar anúncio" },
      { status: 500 }
    );
  }
}


