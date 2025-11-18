import { NextRequest, NextResponse } from "next/server";
import { getAdminStorage } from "@/lib/firebaseAdmin";
import { randomUUID } from "crypto";

const storage = (() => {
  try {
    return getAdminStorage();
  } catch (error) {
    console.warn("[API Upload Photo] Storage indisponível:", error);
    return null;
  }
})();

const bucket =
  storage && process.env.FIREBASE_STORAGE_BUCKET
    ? storage.bucket(process.env.FIREBASE_STORAGE_BUCKET)
    : null;

function applyCors(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get("origin") ?? "*";
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set(
    "Access-Control-Allow-Headers",
    request.headers.get("access-control-request-headers") ?? "Content-Type, Authorization"
  );
  response.headers.set(
    "Access-Control-Allow-Methods",
    request.headers.get("access-control-request-method") ?? "POST, OPTIONS"
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  return response;
}

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  return applyCors(request, response);
}

export async function POST(request: NextRequest) {
  try {
    if (!bucket) {
      return applyCors(
        request,
        NextResponse.json(
          { error: "Storage não configurado" },
          { status: 500 }
        )
      );
    }

    const formData = await request.formData();
    const photo = formData.get("photo") as File;
    const lojistaId = formData.get("lojistaId") as string;

    if (!photo || !lojistaId) {
      return applyCors(
        request,
        NextResponse.json(
          { error: "Foto e lojistaId são obrigatórios" },
          { status: 400 }
        )
      );
    }

    // Converter File para Buffer
    const arrayBuffer = await photo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Determinar extensão do arquivo
    const extension = photo.name?.split(".").pop()?.toLowerCase() || "jpg";
    const contentType = photo.type || `image/${extension}`;
    
    // Criar caminho único para o arquivo
    const filePath = `lojas/${lojistaId}/clientes/uploads/${Date.now()}-${randomUUID()}.${extension}`;
    const token = randomUUID();

    // Fazer upload para Firebase Storage
    const file = bucket.file(filePath);
    await file.save(buffer, {
      metadata: {
        contentType,
        metadata: {
          firebaseStorageDownloadTokens: token,
        },
      },
      resumable: false,
    });

    // Tornar o arquivo público
    await file.makePublic();
    
    // Gerar URL pública (formato correto do Firebase Storage)
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
      filePath
    )}?alt=media&token=${token}`;

    console.log("[API Upload Photo] ✅ Upload concluído:", {
      lojistaId,
      filePath,
      size: buffer.length,
      publicUrl: publicUrl.substring(0, 100) + "...",
    });

    return applyCors(
      request,
      NextResponse.json({
        success: true,
        imageUrl: publicUrl,
        filePath,
      })
    );
  } catch (error) {
    console.error("[API Upload Photo] Erro:", error);
    return applyCors(
      request,
      NextResponse.json(
        {
          error: "Erro ao fazer upload da foto",
          details: error instanceof Error ? error.message : "Erro desconhecido",
        },
        { status: 500 }
      )
    );
  }
}

