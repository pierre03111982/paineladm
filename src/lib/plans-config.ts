/**
 * FASE 1: Configuração de Planos
 * 
 * Define os planos disponíveis (Start, Pro, Elite) com seus limites e benefícios
 */

export type PlanId = "start" | "pro" | "elite";

export type PlanStatus = "active" | "blocked" | "trial";

export type ClientType = "standard" | "test_unlimited";

export interface PlanConfig {
  id: PlanId;
  name: string;
  credits: number; // Créditos mensais incluídos
  adSlotsLimit: number; // Limite de anúncios no marketplace
  price: number; // Preço mensal em BRL
  features: string[];
}

/**
 * Configuração dos planos disponíveis
 */
export const PLANS_CONFIG: Record<PlanId, PlanConfig> = {
  start: {
    id: "start",
    name: "Start",
    credits: 100,
    adSlotsLimit: 0,
    price: 0, // Plano gratuito
    features: [
      "100 créditos mensais",
      "Geração de looks ilimitada",
      "Dashboard básico",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    credits: 600,
    adSlotsLimit: 1,
    price: 99, // R$ 99/mês
    features: [
      "600 créditos mensais",
      "1 slot de anúncio no marketplace",
      "Dashboard completo",
      "Suporte prioritário",
    ],
  },
  elite: {
    id: "elite",
    name: "Elite",
    credits: 2000,
    adSlotsLimit: 4,
    price: 299, // R$ 299/mês
    features: [
      "2000 créditos mensais",
      "4 slots de anúncio no marketplace",
      "Dashboard completo",
      "Suporte prioritário",
      "API access",
    ],
  },
};

/**
 * Obtém configuração de um plano
 */
export function getPlanConfig(planId: PlanId | string | null | undefined): PlanConfig | null {
  if (!planId || !(planId in PLANS_CONFIG)) {
    return null;
  }
  return PLANS_CONFIG[planId as PlanId];
}

/**
 * Obtém o plano padrão (Start)
 */
export function getDefaultPlan(): PlanConfig {
  return PLANS_CONFIG.start;
}


