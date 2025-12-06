/**
 * API Route: Contador de Afinidade e Galeria Contextual
 * GET /api/cliente/affinity?lojistaId=...&userId=...&productId=...&action=count|gallery
 */

import { NextRequest, NextResponse } from "next/server";
import { countProductAffinity, getProductGallery } from "@/lib/firestore/affinity-queries";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lojistaId = searchParams.get("lojistaId");
    const userId = searchParams.get("userId");
    const productId = searchParams.get("productId");
    const action = searchParams.get("action") || "count"; // "count" ou "gallery"
    const uploadImageHash = searchParams.get("uploadImageHash") || null;

    if (!lojistaId || !userId) {
      return NextResponse.json(
        { error: "lojistaId e userId são obrigatórios" },
        { status: 400 }
      );
    }

    if (action === "gallery" && !productId) {
      return NextResponse.json(
        { error: "productId é obrigatório para action=gallery" },
        { status: 400 }
      );
    }

    if (action === "count") {
      if (!productId) {
        return NextResponse.json(
          { error: "productId é obrigatório para action=count" },
          { status: 400 }
        );
      }

      const count = await countProductAffinity(lojistaId, userId, productId);
      return NextResponse.json({ count });
    } else if (action === "gallery") {
      if (!productId) {
        return NextResponse.json(
          { error: "productId é obrigatório para action=gallery" },
          { status: 400 }
        );
      }

      const gallery = await getProductGallery(
        lojistaId,
        userId,
        productId,
        uploadImageHash
      );
      return NextResponse.json({ gallery });
    } else {
      return NextResponse.json(
        { error: "action deve ser 'count' ou 'gallery'" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("[API] Erro ao buscar afinidade:", error);
    return NextResponse.json(
      { error: "Erro ao buscar afinidade", details: error.message },
      { status: 500 }
    );
  }
}


