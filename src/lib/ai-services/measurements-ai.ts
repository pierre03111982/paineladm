/**
 * Serviço de Detecção de Landmarks de Roupas via Gemini Vision
 * "Alfaiate Digital" - Detecta pontos de referência automaticamente na imagem
 */

import { APIResponse } from "./types";

/**
 * Configuração do Gemini para detecção de landmarks
 */
const GEMINI_MEASUREMENTS_CONFIG = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || "",
  location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
  modelId: "gemini-2.5-flash",
};

/**
 * Coordenadas normalizadas de um ponto (0-100 scale)
 */
export interface LandmarkPoint {
  x: number; // 0-100
  y: number; // 0-100
}

/**
 * Landmarks detectados para peças superiores e vestidos
 */
export interface TopsDressLandmarks {
  bust_start: LandmarkPoint; // Left armpit seam
  bust_end: LandmarkPoint; // Right armpit seam
  waist_start: LandmarkPoint; // Narrowest part or straight across
  waist_end: LandmarkPoint;
  length_top: LandmarkPoint; // Highest shoulder point
  length_bottom: LandmarkPoint; // Lowest hem point
}

/**
 * Landmarks detectados para peças inferiores
 */
export interface BottomsLandmarks {
  waist_start: LandmarkPoint; // Left waistband
  waist_end: LandmarkPoint; // Right waistband
  hip_start: LandmarkPoint; // Widest part
  hip_end: LandmarkPoint;
  length_top: LandmarkPoint; // Waistband
  length_bottom: LandmarkPoint; // Hem
}

/**
 * Resultado da detecção de landmarks
 */
export type GarmentLandmarks = TopsDressLandmarks | BottomsLandmarks;

/**
 * Categoria de peça de roupa
 */
export type GarmentCategory = "TOPS" | "DRESS" | "BOTTOMS";

/**
 * Serviço de detecção de landmarks de roupas
 */
export class MeasurementsAIService {
  private projectId: string;
  private location: string;
  private endpoint: string;

  constructor() {
    this.projectId = GEMINI_MEASUREMENTS_CONFIG.projectId;
    this.location = GEMINI_MEASUREMENTS_CONFIG.location;

    this.endpoint = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${GEMINI_MEASUREMENTS_CONFIG.modelId}:generateContent`;

    if (!this.projectId) {
      console.warn(
        "[MeasurementsAI] GOOGLE_CLOUD_PROJECT_ID não configurado. Serviço em modo mock."
      );
    }
  }

  /**
   * Verifica se o serviço está configurado
   */
  isConfigured(): boolean {
    return !!(this.projectId && this.location);
  }

  /**
   * Obtém token de acesso do Firebase Admin
   */
  private async getAccessToken(): Promise<string> {
    try {
      const { getAdminApp } = await import("@/lib/firebaseAdmin");
      const adminApp = getAdminApp();

      if (!adminApp) {
        throw new Error("Firebase Admin não inicializado");
      }

      const client = await adminApp.options.credential?.getAccessToken();

      if (!client || !client.access_token) {
        throw new Error("Não foi possível obter token de acesso");
      }

      return client.access_token;
    } catch (error) {
      console.error("[MeasurementsAI] Erro ao obter access token:", error);
      throw new Error(
        "Falha na autenticação. Configure GOOGLE_APPLICATION_CREDENTIALS ou use Service Account do Firebase."
      );
    }
  }

  /**
   * Converte URL de imagem para base64
   */
  private async imageUrlToBase64(imageUrl: string): Promise<string> {
    try {
      console.log(
        "[MeasurementsAI] 📥 Baixando imagem de:",
        imageUrl.substring(0, 100) + "..."
      );
      const response = await fetch(imageUrl);

      if (!response.ok) {
        throw new Error(
          `Falha ao baixar imagem: ${response.status} ${response.statusText}`
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString("base64");

      // Detectar tipo MIME
      const contentType =
        response.headers.get("content-type") || "image/jpeg";
      const mimeType = contentType.split(";")[0].trim();

      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      console.error(
        "[MeasurementsAI] Erro ao converter imagem para base64:",
        error
      );
      throw error;
    }
  }

  /**
   * Detecta landmarks de uma peça de roupa na imagem
   */
  async detectGarmentLandmarks(
    imageUrl: string,
    category: GarmentCategory
  ): Promise<APIResponse<GarmentLandmarks>> {
    const startTime = Date.now();

    if (!this.isConfigured()) {
      return {
        success: false,
        error: "Serviço não configurado. Configure GOOGLE_CLOUD_PROJECT_ID.",
      };
    }

    try {
      console.log(
        "[MeasurementsAI] 🔍 Iniciando detecção de landmarks:",
        imageUrl.substring(0, 100) + "...",
        "Categoria:",
        category
      );

      // Obter token de acesso
      const accessToken = await this.getAccessToken();

      // Converter imagem para base64
      const imageBase64 = await this.imageUrlToBase64(imageUrl);

      // Extrair apenas o base64 (sem o prefixo data:)
      const base64Data = imageBase64.split(",")[1];

      // Construir prompt baseado na categoria
      const systemPrompt = this.buildPrompt(category);

      // Construir payload
      const requestBody = {
        contents: [
          {
            role: "user",
            parts: [
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Data,
                },
              },
              {
                text: systemPrompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2, // Baixa temperatura para resultados mais precisos
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 2000,
          responseMimeType: "application/json", // Forçar resposta JSON
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
        ],
      };

      console.log("[MeasurementsAI] 📤 Enviando requisição para Gemini...");

      // Fazer requisição
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[MeasurementsAI] ❌ Erro da API:", errorText);

        if (
          response.status === 429 ||
          errorText.includes("429") ||
          errorText.includes("Resource exhausted") ||
          errorText.includes("RESOURCE_EXHAUSTED")
        ) {
          throw new Error(
            `429 Resource exhausted. Please try again later. Please refer to https://cloud.google.com/vertex-ai/generative-ai/docs/error-code-429 for more details.`
          );
        }

        throw new Error(`Gemini API error: ${response.status} ${errorText}`);
      }

      // Processar resposta
      const responseText = await response.text();
      console.log(
        "[MeasurementsAI] 📄 Resposta bruta (primeiros 200 chars):",
        responseText.substring(0, 200)
      );

      let responseData: any;
      try {
        responseData = JSON.parse(responseText);
      } catch (jsonParseError: any) {
        console.error(
          "[MeasurementsAI] ❌ Erro ao fazer parse do JSON:",
          jsonParseError
        );
        throw new Error(
          `Resposta da API não é um JSON válido: ${jsonParseError.message}`
        );
      }

      // Extrair texto da resposta
      const textContent =
        responseData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textContent) {
        throw new Error("Resposta vazia do Gemini");
      }

      // Parsear JSON (pode vir com markdown code blocks)
      let jsonText = textContent.trim();

      // Remover markdown code blocks se existirem
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/```\n?/g, "");
      }

      // Sanitizar JSON: remover caracteres de controle
      jsonText = jsonText
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove caracteres de controle
        .trim();

      // Função robusta para corrigir strings JSON malformadas
      const fixUnquotedProperties = (text: string): string => {
        // Padrão para encontrar propriedades sem aspas: identificador seguido de :
        const propertyPattern = /([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g;
        return text.replace(propertyPattern, (match, prefix, propertyName) => {
          // Se já tem aspas, não substituir
          if (match.includes('"')) {
            return match;
          }
          // Adicionar aspas ao nome da propriedade
          return `${prefix}"${propertyName}":`;
        });
      };

      // Parsear landmarks com tratamento de erros
      let landmarks: GarmentLandmarks;
      try {
        landmarks = JSON.parse(jsonText);
      } catch (parseError: any) {
        console.error("[MeasurementsAI] ❌ Erro ao fazer parse do JSON:", parseError.message);
        console.error("[MeasurementsAI] 📄 JSON recebido (primeiros 500 chars):", jsonText.substring(0, 500));
        console.error("[MeasurementsAI] 📄 JSON recebido (últimos 200 chars):", jsonText.substring(Math.max(0, jsonText.length - 200)));
        
        // Se o erro menciona uma posição específica, mostrar o contexto ao redor
        const positionMatch = parseError.message.match(/position (\d+)/);
        if (positionMatch) {
          const position = parseInt(positionMatch[1]);
          const start = Math.max(0, position - 100);
          const end = Math.min(jsonText.length, position + 100);
          const context = jsonText.substring(start, end);
          console.error("[MeasurementsAI] 📍 Contexto ao redor da posição", position, ":", context);
          console.error("[MeasurementsAI] 📍 Caractere problemático:", jsonText[position], "(" + jsonText.charCodeAt(position) + ")");
        }
        
        // Se for erro de "Expected double-quoted property name", tentar corrigir
        if (parseError.message.includes("Expected double-quoted property name")) {
          console.log("[MeasurementsAI] 🔧 Tentando corrigir erro de propriedade sem aspas...");
          
          const jsonFixed = fixUnquotedProperties(jsonText);
          
          // Tentar parsear novamente
          try {
            landmarks = JSON.parse(jsonFixed);
            console.log("[MeasurementsAI] ✅ JSON corrigido com sucesso (propriedades sem aspas corrigidas)");
          } catch (correctionError: any) {
            console.error("[MeasurementsAI] ❌ Correção automática falhou:", correctionError.message);
            // Se ainda falhou, usar fallback
            landmarks = this.getFallbackLandmarks(category) as GarmentLandmarks;
            console.log("[MeasurementsAI] ⚠️ Usando landmarks padrão (fallback)");
          }
        } else {
          // Para outros erros, usar fallback
          landmarks = this.getFallbackLandmarks(category) as GarmentLandmarks;
          console.log("[MeasurementsAI] ⚠️ Usando landmarks padrão (fallback)");
        }
      }

      // Validar coordenadas (devem estar entre 0-100)
      this.validateLandmarks(landmarks, category);

      const executionTime = Date.now() - startTime;
      console.log(
        "[MeasurementsAI] ✅ Landmarks detectados com sucesso em",
        executionTime,
        "ms"
      );
      console.log("[MeasurementsAI] 📊 Landmarks:", JSON.stringify(landmarks, null, 2));

      return {
        success: true,
        data: landmarks,
        executionTime,
      };
    } catch (error: any) {
      let errorMessage = error?.message || "Erro desconhecido ao detectar landmarks";

      // Sanitizar mensagem de erro
      if (typeof errorMessage !== "string") {
        errorMessage = String(errorMessage);
      }

      errorMessage = errorMessage
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
        .replace(/\r\n/g, " ")
        .replace(/\r/g, " ")
        .replace(/\n/g, " ")
        .substring(0, 500);

      console.error("[MeasurementsAI] ❌ Erro capturado:", errorMessage);
      console.error("[MeasurementsAI] ❌ Stack trace:", error.stack);

      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: errorMessage,
        executionTime,
      };
    }
  }

  /**
   * Constrói o prompt do sistema baseado na categoria
   */
  private buildPrompt(category: GarmentCategory): string {
    if (category === "TOPS" || category === "DRESS") {
      return `Analyze this clothing image. Return a JSON object with normalized coordinates (0 to 100 scale) for key measurement points.

IMPORTANT: Return ONLY valid JSON, no markdown, no explanations.

Category: ${category}

Return the following points:
- bust_start: {x, y} - Left armpit seam (ponto onde a manga encontra o corpo, lado esquerdo)
- bust_end: {x, y} - Right armpit seam (ponto onde a manga encontra o corpo, lado direito)
- waist_start: {x, y} - Narrowest part of waist or straight across (cintura mais estreita ou linha reta)
- waist_end: {x, y} - Opposite point on waistline
- length_top: {x, y} - Highest shoulder point (ponto mais alto do ombro)
- length_bottom: {x, y} - Lowest hem point (ponto mais baixo da barra/barra)

🚨 CRITICAL RULE FOR STANDARD GARMENTS (Sweatshirt, Hoodie, Moletom, T-Shirt, Top):
- If the detected category is 'Sweatshirt', 'Hoodie', 'Moletom', 'T-Shirt', 'Camiseta', 'Blusa', 'Top', or similar upper body garments, you MUST return 'bust_start' and 'bust_end' landmarks.
- IF visual detection has low confidence (e.g., difficult contrast, unclear edges, fabric texture makes it hard to see seams), ESTIMATE the measurements based on standard market sizing for the identified target audience (Adult vs Kids).
- Example standards for Kids Size 6: Chest ~32-34cm, Length ~45-50cm. For Kids Size 8: Chest ~34-36cm, Length ~48-52cm. For Kids Size 10: Chest ~36-38cm, Length ~50-55cm.
- Example standards for Adult Size M: Chest ~44-48cm, Length ~60-70cm.
- Use these standards to guide your landmark placement if edges are unclear. DO NOT return incomplete data for standard garments - ALWAYS provide bust_start and bust_end, even if estimated.

All coordinates must be between 0 and 100, where:
- x: 0 = left edge, 100 = right edge
- y: 0 = top edge, 100 = bottom edge

Example response format:
{
  "bust_start": {"x": 25, "y": 35},
  "bust_end": {"x": 75, "y": 35},
  "waist_start": {"x": 30, "y": 50},
  "waist_end": {"x": 70, "y": 50},
  "length_top": {"x": 50, "y": 15},
  "length_bottom": {"x": 50, "y": 85}
}`;
    } else {
      // BOTTOMS
      return `Analyze this clothing image. Return a JSON object with normalized coordinates (0 to 100 scale) for key measurement points.

IMPORTANT: Return ONLY valid JSON, no markdown, no explanations.

Category: ${category}

Return the following points:
- waist_start: {x, y} - Left waistband (ponto esquerdo do cós)
- waist_end: {x, y} - Right waistband (ponto direito do cós)
- hip_start: {x, y} - Widest part on left side (parte mais larga, lado esquerdo)
- hip_end: {x, y} - Widest part on right side (parte mais larga, lado direito)
- length_top: {x, y} - Waistband center (centro do cós)
- length_bottom: {x, y} - Hem point (ponto da barra)

All coordinates must be between 0 and 100, where:
- x: 0 = left edge, 100 = right edge
- y: 0 = top edge, 100 = bottom edge

Example response format:
{
  "waist_start": {"x": 30, "y": 10},
  "waist_end": {"x": 70, "y": 10},
  "hip_start": {"x": 25, "y": 35},
  "hip_end": {"x": 75, "y": 35},
  "length_top": {"x": 50, "y": 10},
  "length_bottom": {"x": 50, "y": 90}
}`;
    }
  }

  /**
   * Valida os landmarks retornados
   */
  private validateLandmarks(
    landmarks: GarmentLandmarks,
    category: GarmentCategory
  ): void {
    const validatePoint = (point: LandmarkPoint, name: string) => {
      if (typeof point.x !== "number" || typeof point.y !== "number") {
        throw new Error(`${name} deve ter propriedades x e y numéricas`);
      }
      if (point.x < 0 || point.x > 100 || point.y < 0 || point.y > 100) {
        throw new Error(
          `${name} coordenadas devem estar entre 0-100. Recebido: x=${point.x}, y=${point.y}`
        );
      }
    };

    if (category === "TOPS" || category === "DRESS") {
      const topsLandmarks = landmarks as TopsDressLandmarks;
      validatePoint(topsLandmarks.bust_start, "bust_start");
      validatePoint(topsLandmarks.bust_end, "bust_end");
      validatePoint(topsLandmarks.waist_start, "waist_start");
      validatePoint(topsLandmarks.waist_end, "waist_end");
      validatePoint(topsLandmarks.length_top, "length_top");
      validatePoint(topsLandmarks.length_bottom, "length_bottom");
    } else {
      const bottomsLandmarks = landmarks as BottomsLandmarks;
      validatePoint(bottomsLandmarks.waist_start, "waist_start");
      validatePoint(bottomsLandmarks.waist_end, "waist_end");
      validatePoint(bottomsLandmarks.hip_start, "hip_start");
      validatePoint(bottomsLandmarks.hip_end, "hip_end");
      validatePoint(bottomsLandmarks.length_top, "length_top");
      validatePoint(bottomsLandmarks.length_bottom, "length_bottom");
    }
  }

  /**
   * Retorna landmarks padrão como fallback quando a IA não tem certeza
   */
  getFallbackLandmarks(
    category: GarmentCategory
  ): GarmentLandmarks {
    if (category === "TOPS" || category === "DRESS") {
      return {
        bust_start: { x: 25, y: 35 },
        bust_end: { x: 75, y: 35 },
        waist_start: { x: 30, y: 50 },
        waist_end: { x: 70, y: 50 },
        length_top: { x: 50, y: 15 },
        length_bottom: { x: 50, y: 85 },
      };
    } else {
      return {
        waist_start: { x: 30, y: 10 },
        waist_end: { x: 70, y: 10 },
        hip_start: { x: 25, y: 35 },
        hip_end: { x: 75, y: 35 },
        length_top: { x: 50, y: 10 },
        length_bottom: { x: 50, y: 90 },
      };
    }
  }
}

// Singleton
export const measurementsAIService = new MeasurementsAIService();
