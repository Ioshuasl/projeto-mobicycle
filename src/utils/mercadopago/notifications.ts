/**
 * Webhooks / notificações — parse de payload e validação de assinatura (x-signature).
 * @see https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
import crypto from 'crypto';

export type MercadoPagoWebhookBody = {
  action?: string;
  type?: string;
  topic?: string;
  data?: { id?: string | number };
  id?: string | number;
  /** Alguns payloads trazem resource como URL ou id */
  resource?: string;
};

export type MercadoPagoNotificationTopic =
  | 'payment'
  | 'merchant_order'
  | 'preference'
  | 'chargebacks'
  | 'delivery'
  | 'point_integration_wh'
  | string;

/** Lê header case-insensitive (Express / Node). */
export function getMercadoPagoWebhookHeader(
  headers: Record<string, unknown>,
  name: string
): string {
  const want = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === want) {
      const v = headers[key];
      if (Array.isArray(v)) return String(v[0] ?? '').trim();
      return String(v ?? '').trim();
    }
  }
  return '';
}

export function extractNotificationTopic(
  query: Record<string, unknown>
): MercadoPagoNotificationTopic | null {
  const t = query.topic ?? query.type;
  if (t == null || t === '') return null;
  return String(t).toLowerCase() as MercadoPagoNotificationTopic;
}

/**
 * `data.id` enviado na query em notificações Webhook (usado no manifest da x-signature).
 * @see https://mercadopago.com/developers/pt/docs/your-integrations/notifications/webhooks
 */
export function extractWebhookQueryDataId(query: Record<string, unknown>): string {
  const raw = query['data.id'] ?? query.id;
  if (raw == null || raw === '') return '';
  let id = String(raw).trim();
  if (/^[a-zA-Z0-9]+$/.test(id)) {
    id = id.toLowerCase();
  }
  return id;
}

/**
 * Extrai o ID do pagamento de um POST JSON ou query (?topic=payment&id= ou data.id=).
 */
export function extractPaymentIdFromNotification(
  body: unknown,
  query: Record<string, unknown>
): string | null {
  const topic = String(query.topic ?? query.type ?? '').toLowerCase();
  const queryId = query.id ?? query['data.id'];
  if ((topic === 'payment' || topic === '') && queryId != null && queryId !== '') {
    const id = String(queryId);
    if (/^\d+$/.test(id)) return id;
  }

  if (!body || typeof body !== 'object') return null;
  const b = body as MercadoPagoWebhookBody;

  const dataId = b.data?.id;
  if (dataId != null && dataId !== '') {
    const id = String(dataId);
    if (/^\d+$/.test(id)) return id;
  }

  if (b.type === 'payment' && b.id != null) return String(b.id);

  const action = String(b.action ?? '');
  if (action.startsWith('payment.') && b.data?.id != null) return String(b.data.id);

  return null;
}

export function extractMerchantOrderIdFromNotification(
  body: unknown,
  query: Record<string, unknown>
): string | null {
  const topic = extractNotificationTopic(query);
  if (topic && topic !== 'merchant_order') return null;

  const qid = query.id ?? query['data.id'];
  if (qid != null && qid !== '') {
    const id = String(qid).trim();
    if (id) return id;
  }

  if (!body || typeof body !== 'object') return null;
  const b = body as MercadoPagoWebhookBody;
  if (b.data?.id != null) return String(b.data.id);
  return null;
}

export function extractPreferenceIdFromNotification(
  body: unknown,
  query: Record<string, unknown>
): string | null {
  const topic = extractNotificationTopic(query);
  if (topic && topic !== 'preference') return null;

  const qid = query['data.id'] ?? query.id;
  if (qid != null && qid !== '') return String(qid).trim();

  if (!body || typeof body !== 'object') return null;
  const b = body as MercadoPagoWebhookBody;
  if (b.data?.id != null) return String(b.data.id);
  return null;
}

export type ParsedXsSignature = {
  ts?: string;
  v1?: string;
};

/** Parse do header `ts=...,v1=...`. */
export function parseMercadoPagoXsSignatureHeader(xSignatureHeader: string): ParsedXsSignature {
  const out: ParsedXsSignature = {};
  if (!xSignatureHeader) return out;
  for (const part of xSignatureHeader.split(',')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === 'ts') out.ts = value;
    else if (key === 'v1') out.v1 = value;
  }
  return out;
}

/**
 * Monta a string do manifest e calcula HMAC-SHA256 (hex), conforme documentação MP.
 * Segmentos ausentes devem ser omitidos do manifest.
 */
export function buildMercadoPagoWebhookSignatureManifest(
  dataId: string,
  xRequestId: string,
  ts: string
): string {
  let manifest = '';
  if (dataId) manifest += `id:${dataId};`;
  if (xRequestId) manifest += `request-id:${xRequestId};`;
  if (ts) manifest += `ts:${ts};`;
  return manifest;
}

export function computeMercadoPagoWebhookSignature(secret: string, manifest: string): string {
  return crypto.createHmac('sha256', secret).update(manifest, 'utf8').digest('hex');
}

export type VerifyMercadoPagoWebhookSignatureParams = {
  /** Assinatura secreta do painel (Webhooks). */
  secret: string;
  headers: Record<string, unknown>;
  query: Record<string, unknown>;
};

/**
 * Valida header `x-signature` (HMAC-SHA256 do manifest com `data.id` da query, `x-request-id`, `ts`).
 * Retorna false se headers incompletos ou assinatura inválida.
 * @see https://mercadopago.com/developers/pt/docs/your-integrations/notifications/webhooks
 */
export function verifyMercadoPagoWebhookSignature(params: VerifyMercadoPagoWebhookSignatureParams): boolean {
  const { secret, headers, query } = params;
  if (!secret?.trim()) return false;

  const xSignature = getMercadoPagoWebhookHeader(headers, 'x-signature');
  const xRequestId = getMercadoPagoWebhookHeader(headers, 'x-request-id');
  const { ts, v1 } = parseMercadoPagoXsSignatureHeader(xSignature);

  if (!v1 || !ts || !xRequestId) return false;

  const dataId = extractWebhookQueryDataId(query);
  const manifest = buildMercadoPagoWebhookSignatureManifest(dataId, xRequestId, ts);
  if (!manifest) return false;

  const computed = computeMercadoPagoWebhookSignature(secret.trim(), manifest);
  if (!/^[0-9a-f]+$/i.test(v1) || computed.length !== v1.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(v1, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Opcional: lê `MERCADOPAGO_WEBHOOK_SECRET` do env e valida (para uso no `server.ts`).
 */
export function verifyMercadoPagoWebhookSignatureFromEnv(
  headers: Record<string, unknown>,
  query: Record<string, unknown>
): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  return verifyMercadoPagoWebhookSignature({ secret, headers, query });
}
