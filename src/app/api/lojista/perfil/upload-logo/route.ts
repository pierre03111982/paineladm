import { NextRequest, NextResponse } from "next/server";
import { getAdminStorage } from "@/lib/firebaseAdmin";
import { updateLojaPerfil } from "@/lib/firestore/server";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const logo = formData.get("logo") as File | null;
    const lojistaIdFromForm = formData.get("lojistaId") as string | null;

    // Buscar lojistaId do usuário logado se não fornecido no form
    const lojistaIdFromAuth = await getCurrentLojistaId();
    const lojistaId = lojistaIdFromForm || lojistaIdFromAuth;

    if (!logo) {
      return NextResponse.json(
        { error: "Logo é obrigatório" },
        { status: 400 }
      );
    }

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório" },
        { status: 400 }
      );
    }

    // Upload para Firebase Storage
    const storage = getAdminStorage();
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    
    if (!bucketName) {
      console.error("[Upload Logo] FIREBASE_STORAGE_BUCKET não configurado");
      return NextResponse.json(
        { error: "Configuração de storage não encontrada" },
        { status: 500 }
      );
    }

    const bucket = storage.bucket(bucketName);
    const buffer = Buffer.from(await logo.arrayBuffer());
    const fileName = `lojas/${lojistaId}/logo/${Date.now()}-${logo.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const file = bucket.file(fileName);

    await file.save(buffer, {
      metadata: {
        contentType: logo.type || "image/png",
      },
    });

    // Tornar público
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

    // Atualizar perfil com logoUrl e storagePath
    await updateLojaPerfil(lojistaId, {
      logoUrl: publicUrl,
      logoStoragePath: fileName,
    });

    return NextResponse.json({ 
      success: true, 
      logoUrl: publicUrl,
      storagePath: fileName,
    });
  } catch (error: any) {
    console.error("[Upload Logo] Erro ao fazer upload do logo:", error);
    console.error("[Upload Logo] Stack:", error.stack);
    return NextResponse.json(
      { error: error.message || "Erro ao processar logo" },
      { status: 500 }
    );
  }
}

