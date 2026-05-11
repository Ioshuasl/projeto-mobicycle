// Hook utilitário para sincronizar estado de views com URL path
// Usa a History API nativa para manter rotas no browser sem react-router

type ViewType = string;

// Mapeamento: view state → URL path
const VIEW_TO_PATH: Record<string, string> = {
  // App-level views
  'login': '/login',
  'register': '/register',
  'admin': '/admin',
  // Dashboard views
  'dashboard': '/dashboard',
  'financeiro': '/financeiro',
  'afiliados': '/afiliados',
  'ONBORD_MATRIX': '/matrizes',
  'CASHBOARD_MATRIX': '/cashboard',
  'vouchers': '/vouchers',
  'servicos': '/servicos',
  'notificacoes': '/notificacoes',
  'perfil': '/perfil',
  'painel': '/painel',
  'rede': '/rede',
};

// Mapeamento reverso: URL path → view state
const PATH_TO_VIEW: Record<string, string> = {};
for (const [view, path] of Object.entries(VIEW_TO_PATH)) {
  PATH_TO_VIEW[path] = view;
}

/**
 * Atualiza o URL do browser sem recarregar a página.
 * Usa pushState para que o botão voltar funcione.
 */
export function navigateTo(view: ViewType): void {
  const path = VIEW_TO_PATH[view];
  if (path && window.location.pathname !== path) {
    const search = window.location.search;
    window.history.pushState({ view }, '', path + search);
  }
}

/**
 * Substitui o URL atual sem adicionar uma nova entrada no histórico.
 * Útil para a primeira carga da página.
 */
export function replaceRoute(view: ViewType): void {
  const path = VIEW_TO_PATH[view];
  if (path && window.location.pathname !== path) {
    const search = window.location.search;
    window.history.replaceState({ view }, '', path + search);
  }
}

/**
 * Lê o pathname atual e retorna a view correspondente.
 * Retorna a defaultView se o path não for reconhecido.
 */
export function getViewFromPath(defaultView: string = 'dashboard'): string {
  const pathname = window.location.pathname;
  return PATH_TO_VIEW[pathname] || defaultView;
}

/**
 * Verifica se o pathname atual corresponde a uma view de admin.
 */
export function isAdminPath(): boolean {
  return window.location.pathname === '/admin';
}

/**
 * Verifica se o pathname atual corresponde à tela de login.
 */
export function isLoginPath(): boolean {
  return window.location.pathname === '/login';
}

/**
 * Lista de paths válidos do Dashboard (para filtrar no App.tsx).
 */
export const DASHBOARD_PATHS = [
  '/dashboard', '/financeiro', '/afiliados', '/matrizes', '/cashboard',
  '/vouchers', '/servicos', '/notificacoes', '/perfil', '/painel', '/rede'
];

export { VIEW_TO_PATH, PATH_TO_VIEW };
