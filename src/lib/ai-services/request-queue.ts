/**
 * Sistema de Fila de Requisições para Gemini Flash Image
 * Garante que apenas 1 requisição seja processada por vez
 * Evita erro 429 (Resource Exhausted) por múltiplas chamadas simultâneas
 */

interface QueuedRequest<T> {
  id: string;
  requestFn: () => Promise<T>; // Função a ser executada, não a promise
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

class RequestQueue {
  private queue: QueuedRequest<any>[] = [];
  private processing = false;
  private minDelayBetweenRequests = 60000; // 60 segundos entre requisições (1 por minuto - limite conservador)
  private lastRequestTime = 0;

  /**
   * Adiciona uma requisição à fila
   * Garante que apenas uma requisição seja processada por vez
   */
  async enqueue<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const queuedRequest: QueuedRequest<T> = {
        id: requestId,
        requestFn: requestFn, // Guardar a função, não executar ainda
        resolve,
        reject,
        timestamp: Date.now(),
      };

      this.queue.push(queuedRequest);
      console.log(`[RequestQueue] 📥 Requisição ${requestId} adicionada à fila. Posição: ${this.queue.length}`);

      // Processar a fila se não estiver processando
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Processa a fila uma requisição por vez
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift();
      
      if (!request) {
        continue;
      }

      try {
        // Calcular delay necessário para respeitar limite de 1 requisição por minuto
        const timeSinceLastRequest = Date.now() - this.lastRequestTime;
        const delayNeeded = Math.max(0, this.minDelayBetweenRequests - timeSinceLastRequest);

        if (delayNeeded > 0) {
          console.log(`[RequestQueue] ⏳ Aguardando ${(delayNeeded / 1000).toFixed(1)}s antes de processar requisição ${request.id} (respeitando limite de 1 req/min)`);
          await new Promise(resolve => setTimeout(resolve, delayNeeded));
        }

        console.log(`[RequestQueue] 🚀 Processando requisição ${request.id}...`);
        const startTime = Date.now();
        
        // Executar a requisição (agora sim, quando for sua vez na fila)
        const result = await request.requestFn();
        
        const executionTime = Date.now() - startTime;
        this.lastRequestTime = Date.now();
        
        console.log(`[RequestQueue] ✅ Requisição ${request.id} concluída em ${executionTime}ms`);
        request.resolve(result);

        // Pequeno delay adicional entre requisições para garantir espaço
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`[RequestQueue] ❌ Erro na requisição ${request.id}:`, error);
        request.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }

    this.processing = false;
    console.log(`[RequestQueue] ✅ Fila processada. ${this.queue.length} requisições restantes.`);
  }

  /**
   * Retorna o tamanho atual da fila
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Limpa a fila (útil em caso de erro crítico)
   */
  clear(): void {
    console.warn(`[RequestQueue] 🧹 Limpando fila com ${this.queue.length} requisições pendentes`);
    this.queue.forEach(req => {
      req.reject(new Error("Fila limpa devido a erro crítico"));
    });
    this.queue = [];
    this.processing = false;
  }
}

// Instância singleton da fila
let requestQueueInstance: RequestQueue | null = null;

export function getRequestQueue(): RequestQueue {
  if (!requestQueueInstance) {
    requestQueueInstance = new RequestQueue();
  }
  return requestQueueInstance;
}

