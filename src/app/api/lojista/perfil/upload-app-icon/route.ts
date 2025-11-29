/**
 * PHASE 17: Upload App Icon (PWA)
 * Permite que lojistas façam upload do ícone do aplicativo PWA
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminStorage, getAdminDb } from "@/lib/firebaseAdmin";

const db = getAdminDb();

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const appIcon = formData.get("appIcon") as File | null;
    const lojistaId = formData.get("lojistaId") as string | null;

    if (!appIcon) {
      return NextResponse.json(
        { error: "Ícone do aplicativo é obrigatório" },
        { status: 400 }
      );
    }

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório" },
        { status: 400 }
      );
    }

    // Validar tipo de arquivo
    if (!appIcon.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "O arquivo deve ser uma imagem" },
        { status: 400 }
      );
    }

    // Validar tamanho (máximo 5MB)
    if (appIcon.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "A imagem deve ter no máximo 5MB" },
        { status: 400 }
      );
    }

    // Upload para Firebase Storage
    const storage = getAdminStorage();
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    
    if (!bucketName) {
      console.error("[Upload App Icon] FIREBASE_STORAGE_BUCKET não configurado");
      return NextResponse.json(
        { error: "Configuração de storage não encontrada" },
        { status: 500 }
      );
    }

    const bucket = storage.bucket(bucketName);
    const buffer = Buffer.from(await appIcon.arrayBuffer());
    const fileName = `lojas/${lojistaId}/app-icon/${Date.now()}-${appIcon.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const file = bucket.file(fileName);

    await file.save(buffer, {
      metadata: {
        contentType: appIcon.type || "image/png",
      },
    });

    // Tornar público
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

    // Atualizar perfil do lojista com app_icon_url
    await db.collection("lojas").doc(lojistaId).set({
      app_icon_url: publicUrl,
      app_icon_storage_path: fileName,
      updatedAt: new Date(),
    }, { merge: true });

    console.log("[Upload App Icon] Ícone do app salvo:", {
      lojistaId,
      appIconUrl: publicUrl,
      storagePath: fileName,
    });

    return NextResponse.json({ 
      success: true, 
      appIconUrl: publicUrl,
      storagePath: fileName,
    });
  } catch (error: any) {
    console.error("[Upload App Icon] Erro ao fazer upload do ícone:", error);
    console.error("[Upload App Icon] Stack:", error.stack);
    return NextResponse.json(
      { error: error.message || "Erro ao processar ícone do aplicativo" },
      { status: 500 }
    );
  }
}

