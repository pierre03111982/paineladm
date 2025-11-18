/**
 * API Route: Teste de Geração de Imagem com Óculos
 * POST /api/test/oculos
 * 
 * Teste específico para gerar imagem combinando pessoa + óculos
 * usando Imagen 3.0 com fidelidade máxima ao rosto e ao produto
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminStorage } from "@/lib/firebaseAdmin";
import { randomUUID } from "crypto";

const storage = (() => {
  try {
    return getAdminStorage();
  } catch (error) {
    console.warn("[API Test] Storage indisponível:", error);
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
    request.headers.get("access-control-request-method") ?? "POST, GET, OPTIONS"
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
    const contentType = request.headers.get("content-type") || "";
    const isFormData = contentType.includes("multipart/form-data");
    
    let personImageUrl: string | null = null;
    let oculosImageUrl: string | null = null;
    let lojistaId: string | null = null;

    if (isFormData) {
      const formData = await request.formData();
      const personPhoto = formData.get("personPhoto") as File;
      const oculosPhoto = formData.get("oculosPhoto") as File;
      lojistaId = (formData.get("lojistaId") as string | null) || "test";

      if (!personPhoto || !oculosPhoto) {
        return applyCors(
          request,
          NextResponse.json(
            { error: "personPhoto e oculosPhoto são obrigatórios" },
            { status: 400 }
          )
        );
      }

      // Upload das fotos para Firebase Storage
      if (!bucket) {
        return applyCors(
          request,
          NextResponse.json(
            { error: "Storage não configurado" },
            { status: 500 }
          )
        );
      }

      try {
        // Upload foto da pessoa
        const personBuffer = Buffer.from(await personPhoto.arrayBuffer());
        const personFileName = `test/oculos/${Date.now()}-person-${personPhoto.name || "photo.jpg"}`;
        const personFile = bucket.file(personFileName);
        await personFile.save(personBuffer, {
          metadata: {
            contentType: personPhoto.type || "image/jpeg",
          },
        });
        await personFile.makePublic();
        personImageUrl = `https://storage.googleapis.com/${bucket.name}/${personFileName}`;

        // Upload foto do óculos
        const oculosBuffer = Buffer.from(await oculosPhoto.arrayBuffer());
        const oculosFileName = `test/oculos/${Date.now()}-oculos-${oculosPhoto.name || "oculos.jpg"}`;
        const oculosFile = bucket.file(oculosFileName);
        await oculosFile.save(oculosBuffer, {
          metadata: {
            contentType: oculosPhoto.type || "image/jpeg",
          },
        });
        await oculosFile.makePublic();
        oculosImageUrl = `https://storage.googleapis.com/${bucket.name}/${oculosFileName}`;

        console.log("[API Test] Fotos enviadas:", {
          personImageUrl,
          oculosImageUrl,
        });
      } catch (uploadError) {
        console.error("[API Test] Erro ao fazer upload:", uploadError);
        return applyCors(
          request,
          NextResponse.json(
            { error: "Erro ao fazer upload das fotos" },
            { status: 500 }
          )
        );
      }
    } else {
      const body = await request.json();
      personImageUrl = body.personImageUrl;
      oculosImageUrl = body.oculosImageUrl;
      lojistaId = (body.lojistaId as string | null | undefined) || "test";
    }

    if (!personImageUrl || !oculosImageUrl) {
      return applyCors(
        request,
        NextResponse.json(
          { error: "personImageUrl e oculosImageUrl são obrigatórios" },
          { status: 400 }
        )
      );
    }

    console.log("[API Test] Iniciando teste de geração com óculos:", {
      personImageUrl: personImageUrl.substring(0, 50) + "...",
      oculosImageUrl: oculosImageUrl.substring(0, 50) + "...",
    });

    // Usar o serviço especializado para teste de óculos
    const { generateOculosTest } = await import("@/lib/ai-services/oculos-test");
    
    // Garantir que lojistaId seja sempre string
    const finalLojistaId: string = lojistaId || "test";
    
    const testResult = await generateOculosTest({
      personImageUrl,
      oculosImageUrl,
      lojistaId: finalLojistaId,
      preserveFace: true,
      preserveBody: true,
    });

    if (!testResult.success || !testResult.data) {
      throw new Error(testResult.error || "Falha ao gerar imagem");
    }

    // Upload da imagem final
    let finalImageUrl = testResult.data.imageUrl;
    
    if (bucket && finalImageUrl.startsWith("data:")) {
      try {
        const match = /^data:(.+?);base64,(.+)$/.exec(finalImageUrl);
        if (match) {
          const contentType = match[1];
          const base64Data = match[2];
          const buffer = Buffer.from(base64Data, "base64");
          const extension = contentType?.split("/")[1]?.split(";")[0] || "png";

          const filePath = `test/oculos/result/${Date.now()}-${randomUUID()}.${extension}`;
          const token = randomUUID();

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

          await file.makePublic();
          finalImageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
            filePath
          )}?alt=media&token=${token}`;
        }
      } catch (uploadError) {
        console.error("[API Test] Erro ao fazer upload da imagem final:", uploadError);
      }
    }

    console.log("[API Test] Teste concluído com sucesso");

    return applyCors(
      request,
      NextResponse.json({
        success: true,
        imageUrl: finalImageUrl,
        method: testResult.data.method,
        metadata: {
          personImageUrl,
          oculosImageUrl,
          processingTime: testResult.data.processingTime,
          cost: testResult.data.cost,
          costBRL: Number((testResult.data.cost * 5).toFixed(2)), // Taxa aproximada
        },
      })
    );
  } catch (error) {
    console.error("[API Test] Erro no teste:", error);

    return applyCors(
      request,
      NextResponse.json(
        {
          error: "Erro ao processar teste",
          details: error instanceof Error ? error.message : "Erro desconhecido",
        },
        { status: 500 }
      )
    );
  }
}

