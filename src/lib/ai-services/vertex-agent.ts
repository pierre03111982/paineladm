/**
 * Agente Ana - Serviço de IA usando Vertex AI SDK
 * Versão simplificada e robusta
 */

import { VertexAI } from "@google-cloud/vertexai";

export class VertexAgent {
  private vertexAi: VertexAI;
  private project: string;
  private location: string;

  constructor() {
    // 1. FORÇANDO O ID CORRETO (Baseado na prova visual do console)
    // Se a variável de ambiente falhar, usa o ID que sabemos que tem a API ativa.
    this.project = process.env.GOOGLE_CLOUD_PROJECT_ID || "paineladmexperimenteai";
    this.location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

    console.log(`[VertexAgent] 🟢 Inicializando Ana no projeto: ${this.project}`);

    if (!this.project) {
      throw new Error("FATAL: Project ID vazio.");
    }

    this.vertexAi = new VertexAI({
      project: this.project,
      location: this.location,
    });

    console.log(`[VertexAgent] ✅ Vertex AI inicializado com sucesso`);
  }

  async sendMessage(userMessage: string, context: string): Promise<string> {
    const systemPrompt = `VOCÊ É A ANA, GERENTE DO SISTEMA.\nCONTEXTO:\n${context}\n\nResponda de forma curta, humana e prestativa.`;

    try {
      console.log(`[VertexAgent] Enviando mensagem para Gemini Flash...`);

      const model = this.vertexAi.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: systemPrompt,
      });

      const result = await model.generateContent(userMessage);
      const response = await result.response;
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

      return text || "Ana está pensando, mas não respondeu.";
    } catch (error: any) {
      console.error("[VertexAgent] 🔴 Erro de Conexão:", error);

      // Diagnóstico detalhado para o usuário
      if (error.message?.includes("404")) {
        return `ERRO 404: O código tentou acessar o projeto '${this.project}', mas não encontrou o modelo. Confirme se sua credencial local (gcloud auth) tem acesso a este projeto.`;
      }

      if (error.message?.includes("403") || error.message?.includes("Permission")) {
        return `ERRO DE PERMISSÃO: Sua conta logada no terminal não tem permissão 'Vertex AI User' no projeto '${this.project}'.`;
      }

      return `Erro técnico na Ana: ${error.message}`;
    }
  }
}

/**
 * Singleton do serviço
 */
let vertexAgentInstance: VertexAgent | null = null;

/**
 * Obtém instância do serviço Vertex Agent
 */
export function getVertexAgent(): VertexAgent {
  if (!vertexAgentInstance) {
    vertexAgentInstance = new VertexAgent();
  }
  return vertexAgentInstance;
}
