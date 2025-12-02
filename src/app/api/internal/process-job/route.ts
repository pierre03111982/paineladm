import { NextRequest, NextResponse } from "next/server";
import { db, getAdminStorage } from "@/lib/firebaseAdmin";
import { CompositionOrchestrator } from "@/lib/ai-services/composition-orchestrator";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

/**
 * Faz upload de base64 data URL para Firebase Storage e retorna URL pública
 */
async function uploadBase64ToStorage(
  imageUrl: string,
  lojistaId: string,
  jobId: string
): Promise<string> {
  // Se não for base64 data URL, retornar como está
  if (!imageUrl.startsWith("data:image/")) {
    return imageUrl;
  }

  try {
    const storage = getAdminStorage();
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;
    
    // Obter bucket explícito
    const bucket = storage.bucket(storageBucket);
    
    // Extrair mime type e dados base64
    const matches = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      console.warn("[process-job] Formato base64 inválido, retornando como está");
      return imageUrl;
    }

    const mimeType = matches[1] || "png";
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");
    
    // Criar nome do arquivo único
    const timestamp = Date.now();
    const fileName = `generations/${lojistaId}/${jobId}-${timestamp}.${mimeType}`;
    const file = bucket.file(fileName);
    
    // Fazer upload
    await file.save(buffer, {
      metadata: {
        contentType: `image/${mimeType}`,
        metadata: {
        jobId,
          lojistaId,
          uploadedAt: new Date().toISOString(),
        },
      },
    });
    
    // Tornar público e obter URL
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    
    console.log("[process-job] ✅ Base64 convertido para Storage URL:", {
      originalLength: imageUrl.length,
      fileName,
      publicUrl: publicUrl.substring(0, 100) + "...",
    });
    
    return publicUrl;
  } catch (error: any) {
    console.error("[process-job] ❌ Erro ao fazer upload para Storage:", error);
    // Se falhar, retornar como está (pode causar erro depois, mas melhor que quebrar aqui)
    return imageUrl;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId } = body;

    if (!jobId) return NextResponse.json({ error: "Job ID required" }, { status: 400 });

    console.log(`[process-job] VERSAO FINAL BLINDADA - Job: ${jobId}`);
    
    const jobsRef = db.collection("generation_jobs");
    
    // Atualiza status para PROCESSING
    // Usamos toISOString() para garantir compatibilidade total
    await jobsRef.doc(jobId).update({
      status: "PROCESSING",
      startedAt: new Date().toISOString()
    });

    // Executa IA
    const orchestrator = new CompositionOrchestrator();
    const jobDoc = await jobsRef.doc(jobId).get();
    const params = jobDoc.data()?.params || {};

    console.log("[process-job] Chamando Orchestrator...");
    const finalResult = await orchestrator.createComposition(params);

    // --- ESTRATÉGIA DE SEGURANÇA MÁXIMA ---
    // Extrai apenas a URL como string simples.
    let finalUrl = "";
    const jobData = jobDoc.data();
    const lojistaId = jobData?.lojistaId || "unknown";
    
    if (finalResult.tryonImageUrl) {
      const imageUrl = String(finalResult.tryonImageUrl);
      // FIX: Se for base64, fazer upload para Storage
      if (imageUrl.startsWith("data:image/")) {
        console.log("[process-job] 🔄 Detectado base64, fazendo upload para Storage...");
        finalUrl = await uploadBase64ToStorage(imageUrl, lojistaId, jobId);
      } else {
        finalUrl = imageUrl;
      }
    }

    // Processar sceneImageUrls também se houver
    let processedSceneUrls: string[] = [];
    if (Array.isArray(finalResult.sceneImageUrls) && finalResult.sceneImageUrls.length > 0) {
      processedSceneUrls = await Promise.all(
        finalResult.sceneImageUrls.map(async (url: string) => {
          if (url && url.startsWith("data:image/")) {
            return await uploadBase64ToStorage(url, lojistaId, jobId);
          }
          return url;
        })
      );
    }

    console.log(`[process-job] Sucesso! URL gerada: ${finalUrl.substring(0, 100)}...`);

    // Salva no Firestore usando estrutura PLANA (na raiz).
    // Isso evita o erro "invalid nested entity" 100% das vezes.
    // FIX: Usar JSON.parse/stringify para remover undefined
    const updateData: any = {
      status: "COMPLETED",
      completedAt: FieldValue.serverTimestamp(),
      final_image_url: finalUrl,
      composition_id: String(finalResult.compositionId || ""),
      result: { 
          imageUrl: finalUrl,
          compositionId: finalResult.compositionId,
          sceneImageUrls: processedSceneUrls.length > 0 ? processedSceneUrls : undefined,
          totalCost: typeof finalResult.totalCost === "number" ? finalResult.totalCost : undefined,
          processingTime: typeof finalResult.processingTime === "number" ? finalResult.processingTime : undefined,
          status: "success"
      }
    };
    
    // Limpar undefined values
    const cleanUpdateData = JSON.parse(JSON.stringify(updateData));
    
    await jobsRef.doc(jobId).update(cleanUpdateData);

    return NextResponse.json({ success: true, jobId });

    } catch (error: any) {
    console.error("[process-job] ERRO FATAL:", error);
    
    // Tenta salvar o erro no Job para o frontend não ficar travado
    try {
        const b = await req.clone().json().catch(()=>({}));
        if(b.jobId) {
            await db.collection("generation_jobs").doc(b.jobId).update({
                status: "FAILED",
                error: String(error.message).substring(0, 200),
                failedAt: new Date().toISOString()
            });
        }
    } catch(e) {}
    
    return NextResponse.json({ error: String(error.message) }, { status: 500 });
  }
}