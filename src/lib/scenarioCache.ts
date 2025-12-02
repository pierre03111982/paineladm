/**
 * PHASE 27: Cache em memória para cenários no paineladm
 * 
 * Este cache é usado quando o backend precisa buscar cenários do Firestore
 * para evitar queries repetidas.
 */

import { getAdminDb } from "./firebaseAdmin";

export interface CachedScenario {
  id: string;
  fileName?: string;
  imageUrl: string;
  lightingPrompt?: string;
  category: string;
  tags?: string[];
  description?: string;
  active: boolean;
}

class ScenarioCache {
  private scenarios: CachedScenario[] = [];
  private lastFetch: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  private fetchPromise: Promise<void> | null = null;

  /**
   * Carrega cenários do Firestore se necessário
   */
  async loadScenarios(forceRefresh: boolean = false): Promise<void> {
    const now = Date.now();
    const isExpired = now - this.lastFetch > this.CACHE_TTL;

    // Se o cache está válido e não é refresh forçado, retornar
    if (!forceRefresh && !isExpired && this.scenarios.length > 0) {
      return;
    }

    // Se já há uma requisição em andamento, aguardar ela
    if (this.fetchPromise) {
      await this.fetchPromise;
      return;
    }

    // Criar nova requisição
    this.fetchPromise = this._fetchScenarios();
    await this.fetchPromise;
    this.fetchPromise = null;
  }

  private async _fetchScenarios(): Promise<void> {
    const db = getAdminDb();
    
    if (!db) {
      console.warn('[ScenarioCache] Firestore Admin não disponível');
      return;
    }

    try {
      console.log('[ScenarioCache] Carregando cenários do Firestore...');
      const scenariosSnapshot = await db
        .collection('scenarios')
        .where('active', '==', true)
        .get();

      this.scenarios = scenariosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as CachedScenario[];

      this.lastFetch = Date.now();
      console.log(`[ScenarioCache] ✅ ${this.scenarios.length} cenários carregados no cache`);
    } catch (error: any) {
      console.error('[ScenarioCache] Erro ao carregar cenários:', error);
      // Manter cache anterior se houver erro
      if (this.scenarios.length === 0) {
        throw error;
      }
    }
  }

  /**
   * Retorna todos os cenários do cache
   */
  getAllScenarios(): CachedScenario[] {
    return this.scenarios;
  }

  /**
   * Busca cenários por tags
   */
  findScenariosByTags(tags: string[]): CachedScenario[] {
    if (!tags || tags.length === 0) return [];
    
    const normalizedTags = tags.map(t => t.toLowerCase().trim());
    
    return this.scenarios.filter(scenario => {
      if (!scenario.tags || scenario.tags.length === 0) return false;
      
      return scenario.tags.some(tag => 
        normalizedTags.some(searchTag => 
          tag.toLowerCase().includes(searchTag) || 
          searchTag.includes(tag.toLowerCase())
        )
      );
    });
  }

  /**
   * Busca cenário aleatório de uma categoria
   */
  findRandomByCategory(category: string): CachedScenario | null {
    const categoryScenarios = this.scenarios.filter(s => 
      s.category?.toLowerCase() === category.toLowerCase()
    );
    
    if (categoryScenarios.length === 0) return null;
    
    return categoryScenarios[Math.floor(Math.random() * categoryScenarios.length)];
  }

  /**
   * Busca cenário aleatório (fallback)
   */
  findRandom(): CachedScenario | null {
    if (this.scenarios.length === 0) return null;
    return this.scenarios[Math.floor(Math.random() * this.scenarios.length)];
  }

  /**
   * Limpa o cache (útil para testes ou refresh manual)
   */
  clear(): void {
    this.scenarios = [];
    this.lastFetch = 0;
  }

  /**
   * Força refresh do cache
   */
  async refresh(): Promise<void> {
    await this.loadScenarios(true);
  }
}

// Singleton
const scenarioCache = new ScenarioCache();

export default scenarioCache;

