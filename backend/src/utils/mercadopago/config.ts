/**
 * Configuração e URLs base para integração Mercado Pago (Checkout Pro).
 * Uso exclusivo no servidor — nunca importar de componentes React.
 */

const TRAILING_SLASH = /\/$/;

export function isMercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN?.trim());
}

export function getMercadoPagoAccessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado');
  }
  return token;
}

/** True se o token for de testes (prefixo oficial do MP). Não lança se env estiver vazio. */
export function isTestAccessToken(token?: string): boolean {
  const t = token ?? process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() ?? '';
  return t.startsWith('TEST-');
}

/** Public Key de teste (Checkout Bricks / front). Opcional no servidor. */
export function getMercadoPagoPublicKey(): string | undefined {
  const v = process.env.MERCADOPAGO_PUBLIC_KEY?.trim();
  return v || undefined;
}

/** Par de credenciais de sandbox (teste) — token e/ou public key com prefixo TEST-. */
export function isMercadoPagoSandboxCredentials(): boolean {
  const at = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() ?? '';
  const pk = process.env.MERCADOPAGO_PUBLIC_KEY?.trim() ?? '';
  return at.startsWith('TEST-') || pk.startsWith('TEST-');
}

/**
 * URL pública da aplicação (sem barra final).
 * Usada em notification_url e back_urls do Checkout Pro.
 */
export function getAppPublicBaseUrl(): string {
  const fromEnv = process.env.APP_PUBLIC_URL?.trim().replace(TRAILING_SLASH, '');
  if (fromEnv) return fromEnv;
  const port = process.env.PORT || '3000';
  return `http://localhost:${port}`;
}

export function buildAbsoluteUrl(path: string): string {
  const base = getAppPublicBaseUrl();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}
