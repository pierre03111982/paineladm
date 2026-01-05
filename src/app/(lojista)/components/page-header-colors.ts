// Mapa de cores para cada rota - pode ser usado no servidor e no cliente
export const PAGE_HEADER_COLORS: Record<string, { from: string; to: string; shadow: string }> = {
  '/dashboard': { from: '#10b981', to: '#059669', shadow: '#10b981' }, // Verde
  '/produtos': { from: '#3b82f6', to: '#2563eb', shadow: '#3b82f6' }, // Azul
  '/clientes': { from: '#8b5cf6', to: '#7c3aed', shadow: '#8b5cf6' }, // Roxo
  '/pedidos': { from: '#f59e0b', to: '#d97706', shadow: '#f59e0b' }, // Laranja
  '/crm': { from: '#ef4444', to: '#dc2626', shadow: '#ef4444' }, // Vermelho
  '/composicoes': { from: '#ec4899', to: '#db2777', shadow: '#ec4899' }, // Rosa
  '/simulador': { from: '#06b6d4', to: '#0891b2', shadow: '#06b6d4' }, // Ciano
  '/display': { from: '#14b8a6', to: '#0d9488', shadow: '#14b8a6' }, // Teal
  '/app-cliente': { from: '#6366f1', to: '#4f46e5', shadow: '#6366f1' }, // Índigo
  '/compartilhamento': { from: '#84cc16', to: '#65a30d', shadow: '#84cc16' }, // Lima
  '/redes-sociais': { from: '#a855f7', to: '#9333ea', shadow: '#a855f7' }, // Roxo
  '/integracoes': { from: '#f97316', to: '#ea580c', shadow: '#f97316' }, // Laranja
  '/configuracoes': { from: '#64748b', to: '#475569', shadow: '#64748b' }, // Slate
  '/configuracoes/assinatura': { from: '#6366f1', to: '#4f46e5', shadow: '#6366f1' }, // Índigo
};

// Função helper para obter cores com fallback - pode ser usada no servidor e no cliente
export function getPageHeaderColors(route: string): { from: string; to: string; shadow: string } {
  return PAGE_HEADER_COLORS[route] || { from: '#6366f1', to: '#4f46e5', shadow: '#6366f1' }; // Fallback índigo
}


