import { NextRequest, NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";
import { getAdminStorage } from "@/lib/firebaseAdmin";

export const dynamic = 'force-dynamic';

/**
 * API Route para verificar o status da geração de vídeo
 * Documentação: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/veo-video-generation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lojistaId, operationName } = body;

    if (!lojistaId || !operationName) {
      return NextResponse.json(
        { error: "Parâmetros obrigatórios faltando" },
        { status: 400 }
      );
    }

    // Configurações do Vertex AI Veo
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
    const modelId = 'veo-3.1-fast-generate-001';

    if (!projectId) {
      return NextResponse.json(
        { error: "GOOGLE_CLOUD_PROJECT_ID não configurado" },
        { status: 500 }
      );
    }

    // Obter token de acesso do Google Cloud
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Erro ao obter token de autenticação" },
        { status: 500 }
      );
    }

    // Chamar fetchPredictOperation para verificar o status
    const apiUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:fetchPredictOperation`;

    const requestBody = {
      operationName: operationName
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[check-video-status] Erro na API Vertex AI:", errorText);
      return NextResponse.json(
        { error: `Erro ao verificar status: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Log para debug
    console.log("[check-video-status] Resposta completa:", JSON.stringify(data, null, 2));

    // Verificar se há erro na resposta (mesmo com done: true pode haver erro)
    if (data.error) {
      console.error("[check-video-status] Erro na resposta da API:", data.error);
      return NextResponse.json({
        done: true,
        error: true,
        errorMessage: data.error.message || `Erro na geração do vídeo: código ${data.error.code}`,
        errorCode: data.error.code,
        videoUrl: null
      });
    }

    // Verificar diferentes estruturas de resposta possíveis
    let video: any = null;
    
    // Estrutura 1: data.response.videos[0]
    if (data.done && data.response?.videos && Array.isArray(data.response.videos) && data.response.videos.length > 0) {
      video = data.response.videos[0];
      console.log("[check-video-status] Vídeo encontrado em response.videos:", { 
        gcsUri: video.gcsUri, 
        uri: video.uri,
        bytesBase64Encoded: !!video.bytesBase64Encoded, 
        mimeType: video.mimeType,
        keys: Object.keys(video)
      });
    }
    // Estrutura 2: data.response.generatedVideos[0] (alternativa possível)
    else if (data.done && data.response?.generatedVideos && Array.isArray(data.response.generatedVideos) && data.response.generatedVideos.length > 0) {
      video = data.response.generatedVideos[0];
      console.log("[check-video-status] Vídeo encontrado em response.generatedVideos:", { 
        gcsUri: video.gcsUri, 
        uri: video.uri,
        bytesBase64Encoded: !!video.bytesBase64Encoded, 
        mimeType: video.mimeType,
        keys: Object.keys(video)
      });
    }
    // Estrutura 3: data.response.video (singular)
    else if (data.done && data.response?.video) {
      video = data.response.video;
      console.log("[check-video-status] Vídeo encontrado em response.video:", { 
        gcsUri: video.gcsUri, 
        uri: video.uri,
        bytesBase64Encoded: !!video.bytesBase64Encoded, 
        mimeType: video.mimeType,
        keys: Object.keys(video)
      });
    }

    if (video) {
      // Normalizar URI: pode ser gcsUri ou uri
      const videoUri = video.gcsUri || video.uri;
      
      // Se o vídeo está em GCS, fazer download e upload para Firebase Storage
      if (videoUri && (videoUri.startsWith('gs://') || videoUri.startsWith('https://storage.googleapis.com'))) {
        try {
          // Converter gcsUri (gs://bucket/path) para URL HTTP
          // Formato: gs://bucket-name/path/to/file
          let gcsBucketName: string;
          let filePath: string;
          
          if (videoUri.startsWith('gs://')) {
            const gcsUriMatch = videoUri.match(/^gs:\/\/([^\/]+)\/(.+)$/);
            if (!gcsUriMatch) {
              throw new Error(`Formato de gcsUri inválido: ${videoUri}`);
            }
            [, gcsBucketName, filePath] = gcsUriMatch;
          } else if (videoUri.startsWith('https://storage.googleapis.com')) {
            // Já é uma URL HTTP, extrair bucket e path
            const urlMatch = videoUri.match(/https:\/\/storage\.googleapis\.com\/([^\/]+)\/(.+)$/);
            if (!urlMatch) {
              throw new Error(`Formato de URL inválido: ${videoUri}`);
            }
            [, gcsBucketName, filePath] = urlMatch;
          } else {
            throw new Error(`URI de vídeo não reconhecida: ${videoUri}`);
          }
          // Usar a API do Google Cloud Storage para fazer download
          const storageApiUrl = `https://storage.googleapis.com/storage/v1/b/${gcsBucketName}/o/${encodeURIComponent(filePath)}?alt=media`;
          
          const gcsResponse = await fetch(storageApiUrl, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });

          if (!gcsResponse.ok) {
            const errorText = await gcsResponse.text();
            console.error("[check-video-status] Erro ao fazer download do GCS:", errorText);
            throw new Error(`Erro ao fazer download do GCS: ${gcsResponse.statusText}`);
          }

          const videoBuffer = Buffer.from(await gcsResponse.arrayBuffer());
          
          // Fazer upload para Firebase Storage
          const storage = getAdminStorage();
          const firebaseBucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
          
          if (!firebaseBucketName) {
            throw new Error('FIREBASE_STORAGE_BUCKET não configurado');
          }

          const bucket = storage.bucket(firebaseBucketName);
          const fileName = `lojas/${lojistaId}/videos/${Date.now()}-video-veo.mp4`;
          const file = bucket.file(fileName);

          await file.save(videoBuffer, {
            metadata: {
              contentType: video.mimeType || 'video/mp4',
            },
          });

          // Tornar público
          await file.makePublic();
          // Usar o método do Firebase Storage para obter a URL pública
          // Formato: https://storage.googleapis.com/BUCKET_NAME/FILE_PATH
          // Codificar o caminho do arquivo para URL
          const encodedFileName = fileName.split('/').map(segment => encodeURIComponent(segment)).join('/');
          const publicUrl = `https://storage.googleapis.com/${firebaseBucketName}/${encodedFileName}`;

          console.log("[check-video-status] Vídeo salvo com sucesso:", { publicUrl, fileName });

          return NextResponse.json({
            done: true,
            videoUrl: publicUrl,
            mimeType: video.mimeType || 'video/mp4'
          });
        } catch (uploadError: any) {
          console.error("[check-video-status] Erro ao fazer upload do vídeo:", uploadError);
          // Se falhar o upload, retornar o URI como fallback
          return NextResponse.json({
            done: true,
            videoUrl: videoUri,
            mimeType: video.mimeType,
            warning: "Vídeo disponível no GCS, mas upload para Firebase Storage falhou"
          });
        }
      } else if (video.bytesBase64Encoded) {
        // Se o vídeo está em base64, fazer upload para Firebase Storage
        try {
          const videoBuffer = base64ToBuffer(video.bytesBase64Encoded);
          
          // Fazer upload para Firebase Storage
          const storage = getAdminStorage();
          const firebaseBucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
          
          if (!firebaseBucketName) {
            throw new Error('FIREBASE_STORAGE_BUCKET não configurado');
          }

          const bucket = storage.bucket(firebaseBucketName);
          const fileName = `lojas/${lojistaId}/videos/${Date.now()}-video-veo.mp4`;
          const file = bucket.file(fileName);

          await file.save(videoBuffer, {
            metadata: {
              contentType: video.mimeType || 'video/mp4',
            },
          });

          // Tornar público
          await file.makePublic();
          // Usar o método do Firebase Storage para obter a URL pública
          // Formato: https://storage.googleapis.com/BUCKET_NAME/FILE_PATH
          // Codificar o caminho do arquivo para URL
          const encodedFileName = fileName.split('/').map(segment => encodeURIComponent(segment)).join('/');
          const publicUrl = `https://storage.googleapis.com/${firebaseBucketName}/${encodedFileName}`;

          console.log("[check-video-status] Vídeo base64 salvo com sucesso:", { publicUrl, fileName });

          return NextResponse.json({
            done: true,
            videoUrl: publicUrl,
            mimeType: video.mimeType || 'video/mp4'
          });
        } catch (uploadError: any) {
          console.error("[check-video-status] Erro ao fazer upload do vídeo base64:", uploadError);
          // Fallback: retornar como data URL
          const videoDataUrl = `data:${video.mimeType || 'video/mp4'};base64,${video.bytesBase64Encoded}`;
          return NextResponse.json({
            done: true,
            videoUrl: videoDataUrl,
            mimeType: video.mimeType
          });
        }
      }
    }

    // Operação concluída mas sem vídeo (ex.: bloqueado por diretrizes da Vertex AI)
    if (data.done && !video) {
      const rawStr = JSON.stringify(data);
      const isBlockedByGuidelines =
        /filtered out|violated.*usage guidelines|usage guidelines|blocked videos|rephrasing the prompt/i.test(rawStr);

      const errorMessage = isBlockedByGuidelines
        ? "O vídeo foi bloqueado pelas diretrizes de uso da IA. Dica: use uma foto da modelo em pose neutra, com a roupa em destaque e fundo adequado (ex.: estúdio ou ambiente comercial). Evite closes no rosto ou poses que possam ser interpretadas de forma sensível."
        : "Vídeo não foi retornado pela IA. Tente novamente ou use outra imagem.";

      console.log("[check-video-status] Operação concluída mas sem vídeo na resposta:", {
        hasResponse: !!data.response,
        hasVideos: !!data.response?.videos,
        videosLength: data.response?.videos?.length || 0,
        isBlockedByGuidelines,
        fullResponse: JSON.stringify(data, null, 2)
      });

      return NextResponse.json({
        done: true,
        videoUrl: null,
        error: true,
        errorMessage,
        errorCode: isBlockedByGuidelines ? "CONTENT_BLOCKED" : "NO_VIDEO_IN_RESPONSE",
        debug: {
          hasResponse: !!data.response,
          hasVideos: !!data.response?.videos,
          videosLength: data.response?.videos?.length || 0,
          hasGeneratedVideos: !!data.response?.generatedVideos,
          generatedVideosLength: data.response?.generatedVideos?.length || 0,
          hasVideo: !!data.response?.video,
          responseKeys: data.response ? Object.keys(data.response) : []
        }
      });
    }

    return NextResponse.json({
      done: data.done || false,
      videoUrl: null,
      debug: data.done ? {
        hasResponse: !!data.response,
        hasVideos: !!data.response?.videos,
        videosLength: data.response?.videos?.length || 0
      } : undefined
    });

  } catch (error: any) {
    console.error("[check-video-status] Erro:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * Converte base64 para Buffer (para uso no servidor)
 */
function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, 'base64');
}

/**
 * Obtém o token de acesso do Google Cloud usando Service Account Key
 */
async function getAccessToken(): Promise<string | null> {
  try {
    // Prioridade 1: Usar GCP_SERVICE_ACCOUNT_KEY se disponível (já configurado no .env.local)
    if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
      try {
        const credentials = typeof process.env.GCP_SERVICE_ACCOUNT_KEY === 'string' 
          ? JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY)
          : process.env.GCP_SERVICE_ACCOUNT_KEY;
        
        const auth = new GoogleAuth({
          credentials: credentials,
          scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });
        
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();
        
        return accessToken.token || null;
      } catch (parseError) {
        console.error("[check-video-status] Erro ao parsear GCP_SERVICE_ACCOUNT_KEY:", parseError);
      }
    }

    // Prioridade 2: Usar GOOGLE_APPLICATION_CREDENTIALS se contém JSON diretamente (Vercel)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        const credsValue = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        // Se começa com {, é JSON direto, não um caminho
        if (credsValue.trim().startsWith('{')) {
          const credentials = JSON.parse(credsValue);
          const auth = new GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
          });
          const client = await auth.getClient();
          const accessToken = await client.getAccessToken();
          return accessToken.token || null;
        }
      } catch (parseError) {
        // Se não for JSON, continua para próxima opção (pode ser caminho de arquivo)
        console.log("[check-video-status] GOOGLE_APPLICATION_CREDENTIALS não é JSON, tentando como caminho...");
      }
    }

    // Prioridade 3: Usar GOOGLE_APPLICATION_CREDENTIALS_JSON se disponível
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      try {
        const credentials = typeof process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON === 'string'
          ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
          : process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
        
        const auth = new GoogleAuth({
          credentials: credentials,
          scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });
        
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();
        
        return accessToken.token || null;
      } catch (parseError) {
        console.error("[check-video-status] Erro ao parsear GOOGLE_APPLICATION_CREDENTIALS_JSON:", parseError);
      }
    }

    // Prioridade 4: Usar Application Default Credentials (para desenvolvimento local com gcloud ou quando GOOGLE_APPLICATION_CREDENTIALS é caminho)
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    
    return accessToken.token || null;
  } catch (error) {
    console.error("[check-video-status] Erro ao obter token:", error);
    return null;
  }
}
