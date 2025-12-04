/**
 * Rate Limiting simples usando Map em memória
 * Para produção, considere usar Redis ou um serviço dedicado
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Map para armazenar rate limits por chave (IP ou customerId)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Limpar entradas expiradas periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Limpar a cada minuto

/**
 * Verifica se o limite de taxa foi excedido
 * @param key - Identificador único (IP ou customerId)
 * @param maxRequests - Número máximo de requisições
 * @param windowMs - Janela de tempo em milissegundos
 * @returns true se permitido, false se bloqueado
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 1,
  windowMs: number = 10000 // 10 segundos por padrão
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // Criar nova entrada
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, newEntry);
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: newEntry.resetTime,
    };
  }

  // Verificar se excedeu o limite
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetTime,
    };
  }

  // Incrementar contador
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetTime,
  };
}

/**
 * Obtém o IP do cliente da requisição
 */
export function getClientIP(request: Request): string {
  // Tentar obter do header X-Forwarded-For (Vercel, Cloudflare, etc)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  // Tentar obter do header X-Real-IP
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Fallback para localhost
  return "127.0.0.1";
}





















