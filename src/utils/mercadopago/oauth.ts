/**
 * OAuth 2.0 — troca client_id + client_secret por access_token (fluxo client_credentials).
 * @see https://www.mercadopago.com.br/developers/pt/reference/oauth/_oauth_token/post
 *
 * Uso típico: integrações que precisam renovar token; Checkout Pro também aceita
 * Access Token fixo do painel (MERCADOPAGO_ACCESS_TOKEN).
 */

const OAUTH_TOKEN_URL = 'https://api.mercadopago.com/oauth/token';

export type MercadoPagoOAuthTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  user_id?: number;
  live_mode?: boolean;
  refresh_token?: string;
  public_key?: string;
  message?: string;
  error?: string;
  cause?: unknown;
};

export class MercadoPagoOAuthError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'MercadoPagoOAuthError';
    this.status = status;
    this.body = body;
  }
}

export function getMercadoPagoClientId(): string {
  const v = process.env.MERCADOPAGO_CLIENT_ID?.trim();
  if (!v) throw new Error('MERCADOPAGO_CLIENT_ID não configurado');
  return v;
}

export function getMercadoPagoClientSecret(): string {
  const v = process.env.MERCADOPAGO_CLIENT_SECRET?.trim();
  if (!v) throw new Error('MERCADOPAGO_CLIENT_SECRET não configurado');
  return v;
}

export function isMercadoPagoOAuthConfigured(): boolean {
  return Boolean(
    process.env.MERCADOPAGO_CLIENT_ID?.trim() && process.env.MERCADOPAGO_CLIENT_SECRET?.trim()
  );
}

/**
 * Obtém access_token via grant_type=client_credentials.
 */
export async function requestMercadoPagoClientCredentialsToken(): Promise<MercadoPagoOAuthTokenResponse> {
  const clientId = getMercadoPagoClientId();
  const clientSecret = getMercadoPagoClientSecret();

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: body.toString(),
  });

  const data = (await res.json().catch(() => ({}))) as MercadoPagoOAuthTokenResponse;

  if (!res.ok) {
    const msg =
      data.message ||
      data.error ||
      `OAuth token falhou: HTTP ${res.status}`;
    throw new MercadoPagoOAuthError(msg, res.status, data);
  }

  if (!data.access_token) {
    throw new MercadoPagoOAuthError('Resposta OAuth sem access_token', res.status, data);
  }

  return data;
}
