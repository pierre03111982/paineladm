import { NextRequest, NextResponse } from "next/server";
import { getAdminStorage } from "@/lib/firebaseAdmin";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get("image") as File | null;
    const lojistaIdFromForm = formData.get("lojistaId") as string | null;
    const productId = formData.get("productId") as string | null;

    // Buscar lojistaId do usuário logado se não fornecido no form
    const lojistaIdFromAuth = await getCurrentLojistaId();
    const lojistaId = lojistaIdFromForm || lojistaIdFromAuth;

    if (!image) {
      return NextResponse.json(
        { error: "Imagem é obrigatória" },
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
      console.error("[Upload Product Image] FIREBASE_STORAGE_BUCKET não configurado");
      return NextResponse.json(
        { error: "Configuração de storage não encontrada" },
        { status: 500 }
      );
    }

    const bucket = storage.bucket(bucketName);
    const buffer = Buffer.from(await image.arrayBuffer());
    const fileName = `lojas/${lojistaId}/produtos/${productId ? `${productId}/` : ""}${Date.now()}-${image.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const file = bucket.file(fileName);

    await file.save(buffer, {
      metadata: {
        contentType: image.type || "image/png",
      },
    });

    // Tornar público
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

    return NextResponse.json({ 
      success: true, 
      imageUrl: publicUrl,
      storagePath: fileName,
    });
  } catch (error: any) {
    console.error("[Upload Product Image] Erro ao fazer upload da imagem:", error);
    console.error("[Upload Product Image] Stack:", error.stack);
    return NextResponse.json(
      { error: error.message || "Erro ao processar imagem" },
      { status: 500 }
    );
  }
}


