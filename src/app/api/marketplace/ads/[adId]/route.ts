/**
 * FASE 3: API para gerenciar anúncio individual
 * 
 * PATCH: Atualizar anúncio
 * DELETE: Remover anúncio
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { checkSuperAdminAccess } from "@/lib/auth/admin-auth";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import type { MarketplaceAd, AdStatus } from "@/lib/firestore/marketplace-types";

const db = getAdminDb();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ adId: string }> }
) {
  try {
    const { adId } = await params;
    const body = await request.json();
    const { status, title, description, imageUrl, ctaText, ctaLink, priority, startDate, endDate } = body;

    if (!adId) {
      return NextResponse.json(
        { error: "adId é obrigatório" },
        { status: 400 }
      );
    }

    // Buscar anúncio
    const adRef = db.collection("marketplace_ads").doc(adId);
    const adDoc = await adRef.get();

    if (!adDoc.exists) {
      return NextResponse.json(
        { error: "Anúncio não encontrado" },
        { status: 404 }
      );
    }

    const adData = adDoc.data() as MarketplaceAd;

    // Verificar permissão
    const isSuperAdmin = await checkSuperAdminAccess();
    if (!isSuperAdmin) {
      const currentLojistaId = await getCurrentLojistaId();
      if (currentLojistaId !== adData.lojistaId) {
        return NextResponse.json(
          { error: "Não autorizado" },
          { status: 403 }
        );
      }
    }

    // Preparar atualização
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (status !== undefined) updateData.status = status;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (ctaText !== undefined) updateData.ctaText = ctaText;
    if (ctaLink !== undefined) updateData.ctaLink = ctaLink;
    if (priority !== undefined) updateData.priority = priority;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;

    await adRef.update(updateData);

    console.log("[MarketplaceAds] ✅ Anúncio atualizado:", adId);

    return NextResponse.json({
      id: adId,
      ...updateData,
    });
  } catch (error: any) {
    console.error("[MarketplaceAds] Erro ao atualizar anúncio:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao atualizar anúncio" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ adId: string }> }
) {
  try {
    const { adId } = await params;

    if (!adId) {
      return NextResponse.json(
        { error: "adId é obrigatório" },
        { status: 400 }
      );
    }

    // Buscar anúncio
    const adRef = db.collection("marketplace_ads").doc(adId);
    const adDoc = await adRef.get();

    if (!adDoc.exists) {
      return NextResponse.json(
        { error: "Anúncio não encontrado" },
        { status: 404 }
      );
    }

    const adData = adDoc.data() as MarketplaceAd;

    // Verificar permissão
    const isSuperAdmin = await checkSuperAdminAccess();
    if (!isSuperAdmin) {
      const currentLojistaId = await getCurrentLojistaId();
      if (currentLojistaId !== adData.lojistaId) {
        return NextResponse.json(
          { error: "Não autorizado" },
          { status: 403 }
        );
      }
    }

    await adRef.delete();

    console.log("[MarketplaceAds] ✅ Anúncio removido:", adId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[MarketplaceAds] Erro ao remover anúncio:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao remover anúncio" },
      { status: 500 }
    );
  }
}




