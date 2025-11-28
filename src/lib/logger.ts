/**
 * Logger Centralizado
 * Salva erros críticos e eventos importantes no Firestore para análise posterior
 */

import { getAdminDb } from "./firebaseAdmin";

const db = getAdminDb();

export enum LogLevel {
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  CRITICAL = "critical",
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  context?: {
    [key: string]: any;
  };
  userId?: string;
  lojistaId?: string;
  timestamp: string;
  environment: string;
  userAgent?: string;
  ip?: string;
}

/**
 * Salva log no Firestore
 */
async function saveLog(entry: LogEntry): Promise<void> {
  try {
    await db.collection("system_logs").add({
      ...entry,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    // Se falhar ao salvar no Firestore, pelo menos logar no console
    console.error("[Logger] Erro ao salvar log no Firestore:", error);
    console.error("[Logger] Entry que falhou:", entry);
  }
}

/**
 * Logger principal
 */
export class Logger {
  private environment: string;

  constructor() {
    this.environment = process.env.NODE_ENV || "development";
  }

  /**
   * Log de informação
   */
  async info(message: string, context?: Record<string, any>): Promise<void> {
    const entry: LogEntry = {
      level: LogLevel.INFO,
      message,
      context,
      timestamp: new Date().toISOString(),
      environment: this.environment,
    };

    console.log(`[INFO] ${message}`, context || "");
    await saveLog(entry);
  }

  /**
   * Log de aviso
   */
  async warn(message: string, context?: Record<string, any>): Promise<void> {
    const entry: LogEntry = {
      level: LogLevel.WARN,
      message,
      context,
      timestamp: new Date().toISOString(),
      environment: this.environment,
    };

    console.warn(`[WARN] ${message}`, context || "");
    await saveLog(entry);
  }

  /**
   * Log de erro
   */
  async error(
    message: string,
    error?: Error,
    context?: Record<string, any>
  ): Promise<void> {
    const entry: LogEntry = {
      level: LogLevel.ERROR,
      message,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
      context,
      timestamp: new Date().toISOString(),
      environment: this.environment,
    };

    console.error(`[ERROR] ${message}`, error, context || "");
    await saveLog(entry);
  }

  /**
   * Log crítico (erros que precisam atenção imediata)
   */
  async critical(
    message: string,
    error?: Error,
    context?: Record<string, any>
  ): Promise<void> {
    const entry: LogEntry = {
      level: LogLevel.CRITICAL,
      message,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
      context,
      timestamp: new Date().toISOString(),
      environment: this.environment,
    };

    console.error(`[CRITICAL] ${message}`, error, context || "");
    await saveLog(entry);
  }

  /**
   * Log de evento de IA (geração de imagem)
   */
  async logAIGeneration(
    lojistaId: string,
    customerId: string | null,
    success: boolean,
    error?: Error,
    metadata?: {
      prompt?: string;
      provider?: string;
      compositionId?: string;
      imageUrl?: string;
      cost?: number;
    }
  ): Promise<void> {
    const entry: LogEntry = {
      level: success ? LogLevel.INFO : LogLevel.ERROR,
      message: success
        ? "Geração de imagem bem-sucedida"
        : "Falha na geração de imagem",
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
      context: {
        eventType: "ai_generation",
        lojistaId,
        customerId,
        ...metadata,
      },
      lojistaId,
      userId: customerId || undefined,
      timestamp: new Date().toISOString(),
      environment: this.environment,
    };

    if (success) {
      console.log(`[AI Generation] Sucesso para lojista ${lojistaId}`, metadata);
    } else {
      console.error(`[AI Generation] Falha para lojista ${lojistaId}`, error, metadata);
    }

    await saveLog(entry);
  }

  /**
   * Log de evento de créditos
   */
  async logCreditEvent(
    lojistaId: string,
    eventType: "deduct" | "add" | "insufficient",
    amount: number,
    balanceBefore: number,
    balanceAfter: number,
    context?: Record<string, any>
  ): Promise<void> {
    const entry: LogEntry = {
      level: eventType === "insufficient" ? LogLevel.WARN : LogLevel.INFO,
      message: `Evento de crédito: ${eventType}`,
      context: {
        eventType: "credit_event",
        creditEventType: eventType,
        amount,
        balanceBefore,
        balanceAfter,
        ...context,
      },
      lojistaId,
      timestamp: new Date().toISOString(),
      environment: this.environment,
    };

    console.log(`[Credit Event] ${eventType} para lojista ${lojistaId}`, {
      amount,
      balanceBefore,
      balanceAfter,
    });

    await saveLog(entry);
  }
}

// Instância singleton
export const logger = new Logger();

/**
 * PHASE 12: Helper function logError para facilitar uso em catch blocks
 * Salva erros críticos no Firestore system_logs
 */
export async function logError(
  context: string,
  error: Error | unknown,
  additionalContext?: {
    userId?: string;
    storeId?: string;
    errorType?: string;
    [key: string]: any;
  }
): Promise<void> {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  
  const entry: LogEntry = {
    level: LogLevel.ERROR,
    message: `[${context}] ${errorObj.message}`,
    error: {
      name: errorObj.name,
      message: errorObj.message,
      stack: errorObj.stack,
    },
    context: {
      errorType: additionalContext?.errorType || "UnknownError",
      ...additionalContext,
    },
    userId: additionalContext?.userId,
    lojistaId: additionalContext?.storeId,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  };

  try {
    await db.collection("system_logs").add({
      ...entry,
      createdAt: new Date().toISOString(),
    });
  } catch (saveError) {
    // Se falhar ao salvar no Firestore, pelo menos logar no console
    console.error("[logError] Erro ao salvar log no Firestore:", saveError);
    console.error("[logError] Entry que falhou:", entry);
  }
}










