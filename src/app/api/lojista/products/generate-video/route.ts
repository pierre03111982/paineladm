import { NextRequest, NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";

export const dynamic = 'force-dynamic';

/**
 * API Route para gerar vídeo usando Vertex AI Veo 3 Fast
 * Documentação: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/veo-video-generation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lojistaId, imageBase64, imageUrl, prompt, durationSeconds, aspectRatio } = body;

    if (!lojistaId || (!imageBase64 && !imageUrl) || !prompt) {
      return NextResponse.json(
        { error: "Parâmetros obrigatórios faltando: lojistaId, imageBase64 ou imageUrl, e prompt" },
        { status: 400 }
      );
    }

    // Se recebeu imageUrl, fazer fetch no backend (evita CORS)
    let finalImageBase64 = imageBase64;
    if (imageUrl && !imageBase64) {
      try {
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          return NextResponse.json(
            { error: `Erro ao buscar imagem: ${imageResponse.statusText}` },
            { status: 400 }
          );
        }
        const imageBuffer = await imageResponse.arrayBuffer();
        finalImageBase64 = Buffer.from(imageBuffer).toString('base64');
      } catch (fetchError: any) {
        return NextResponse.json(
          { error: `Erro ao processar URL da imagem: ${fetchError.message}` },
          { status: 400 }
        );
      }
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

    // Obter token de acesso do Google Cloud usando google-auth-library
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Erro ao obter token de autenticação" },
        { status: 500 }
      );
    }

    // Validar duração do vídeo (suportado: 4, 6 ou 8 segundos para image-to-video)
    const requestedDuration = durationSeconds || 4;
    const validDurations = [4, 6, 8];
    const finalDuration = validDurations.includes(requestedDuration) 
      ? requestedDuration 
      : 4; // Padrão: 4 segundos se inválido

    if (!validDurations.includes(requestedDuration)) {
      console.warn(`[generate-video] Duração ${requestedDuration}s não suportada. Usando ${finalDuration}s (suportado: ${validDurations.join(', ')}s)`);
    }

    // Preparar a requisição para o Vertex AI Veo
    const apiUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:predictLongRunning`;

    const requestBody = {
      instances: [
        {
          prompt: prompt,
          image: {
            bytesBase64Encoded: finalImageBase64,
            mimeType: "image/jpeg"
          }
        }
      ],
      parameters: {
        durationSeconds: finalDuration,
        aspectRatio: aspectRatio || "9:16",
        generateAudio: false,
        resolution: "720p",
        sampleCount: 1,
        // Permite geração com pessoas de todas as idades (evita bloqueio "person/face generation" em imagens com crianças).
        // Requer que o projeto esteja na allowlist do Google para "allow_all". Caso contrário, use "allow_adult".
        personGeneration: "allow_all",
      }
    };

    // Fazer a chamada para a API do Vertex AI
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
      console.error("[generate-video] Erro na API Vertex AI:", errorText);
      return NextResponse.json(
        { error: `Erro ao gerar vídeo: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.name) {
      return NextResponse.json(
        { error: "Nome da operação não retornado" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      operationName: data.name,
      success: true
    });

  } catch (error: any) {
    console.error("[generate-video] Erro:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
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
        console.error("[generate-video] Erro ao parsear GCP_SERVICE_ACCOUNT_KEY:", parseError);
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
        console.log("[generate-video] GOOGLE_APPLICATION_CREDENTIALS não é JSON, tentando como caminho...");
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
        console.error("[generate-video] Erro ao parsear GOOGLE_APPLICATION_CREDENTIALS_JSON:", parseError);
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
    console.error("[generate-video] Erro ao obter token:", error);
    return null;
  }
}
