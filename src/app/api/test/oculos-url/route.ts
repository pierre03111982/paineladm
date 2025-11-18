/**
 * API Route: Teste de Geração com URL do Produto
 * POST /api/test/oculos-url
 * 
 * Teste usando LINK (URL) da imagem do produto ao invés de enviar a imagem
 * A IA vai "ver" a imagem do link e incluir na foto da pessoa
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
    let oculosImageUrl: string | null = null; // URL do produto
    let oculosWebUrl: string | null = null; // Link web para a IA "ver"
    let lojistaId: string | null = null;

    if (isFormData) {
      const formData = await request.formData();
      const personPhoto = formData.get("personPhoto") as File;
      const oculosUrl = formData.get("oculosUrl") as string; // URL do produto
      lojistaId = formData.get("lojistaId") as string || "test";

      if (!personPhoto || !oculosUrl) {
        return applyCors(
          request,
          NextResponse.json(
            { error: "personPhoto e oculosUrl são obrigatórios" },
            { status: 400 }
          )
        );
      }

      // Validar se é uma URL válida
      try {
        new URL(oculosUrl);
        oculosWebUrl = oculosUrl;
      } catch {
        return applyCors(
          request,
          NextResponse.json(
            { error: "oculosUrl deve ser uma URL válida" },
            { status: 400 }
          )
        );
      }

      // Upload da foto da pessoa para Firebase Storage
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
        const personFileName = `test/oculos-url/${Date.now()}-person-${personPhoto.name || "photo.jpg"}`;
        const personFile = bucket.file(personFileName);
        await personFile.save(personBuffer, {
          metadata: {
            contentType: personPhoto.type || "image/jpeg",
          },
        });
        await personFile.makePublic();
        personImageUrl = `https://storage.googleapis.com/${bucket.name}/${personFileName}`;

        // Baixar imagem do produto do link para análise
        console.log("[API Test] Baixando imagem do produto do link:", oculosWebUrl);
        try {
          const oculosResponse = await fetch(oculosWebUrl);
          if (!oculosResponse.ok) {
            throw new Error(`Erro ao baixar imagem: ${oculosResponse.status}`);
          }
          
          const oculosBuffer = Buffer.from(await oculosResponse.arrayBuffer());
          const oculosFileName = `test/oculos-url/${Date.now()}-oculos-from-url.jpg`;
          const oculosFile = bucket.file(oculosFileName);
          await oculosFile.save(oculosBuffer, {
            metadata: {
              contentType: oculosResponse.headers.get("content-type") || "image/jpeg",
            },
          });
          await oculosFile.makePublic();
          oculosImageUrl = `https://storage.googleapis.com/${bucket.name}/${oculosFileName}`;
          
          console.log("[API Test] Imagem do produto baixada e salva:", oculosImageUrl);
        } catch (downloadError) {
          console.warn("[API Test] Erro ao baixar imagem do link, usando URL diretamente:", downloadError);
          // Continuar com a URL original
          oculosImageUrl = oculosWebUrl;
        }

        console.log("[API Test] Fotos preparadas:", {
          personImageUrl,
          oculosWebUrl,
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
      oculosWebUrl = body.oculosUrl || body.oculosWebUrl;
      oculosImageUrl = body.oculosImageUrl || oculosWebUrl;
      lojistaId = body.lojistaId || "test";

      // Validar URL se fornecida
      if (oculosWebUrl) {
        try {
          new URL(oculosWebUrl);
        } catch {
          return applyCors(
            request,
            NextResponse.json(
              { error: "oculosUrl deve ser uma URL válida" },
              { status: 400 }
            )
          );
        }
      }
    }

    if (!personImageUrl || !oculosWebUrl) {
      return applyCors(
        request,
        NextResponse.json(
          { error: "personImageUrl e oculosUrl são obrigatórios" },
          { status: 400 }
        )
      );
    }

    console.log("[API Test] Iniciando teste com URL do produto:", {
      personImageUrl: personImageUrl.substring(0, 50) + "...",
      oculosWebUrl,
      oculosImageUrl: oculosImageUrl?.substring(0, 50) + "...",
    });

    // Usar o serviço especializado, mas com URL no prompt
    const { generateOculosTest } = await import("@/lib/ai-services/oculos-test");
    
    const testResult = await generateOculosTest({
      personImageUrl,
      oculosImageUrl: oculosImageUrl || oculosWebUrl, // Usar URL baixada ou original
      lojistaId: lojistaId || "test",
      preserveFace: true,
      preserveBody: true,
      // Passar URL web para incluir no prompt
      oculosWebUrl: oculosWebUrl,
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

          const filePath = `test/oculos-url/result/${Date.now()}-${randomUUID()}.${extension}`;
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
          oculosWebUrl,
          oculosImageUrl,
          processingTime: testResult.data.processingTime,
          cost: testResult.data.cost,
          costBRL: Number((testResult.data.cost * 5).toFixed(2)),
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

