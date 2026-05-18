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
 * `data.id` para o manifest da x-signature: query (como na doc MP) ou, em POST só JSON, corpo.
 */
/** Normaliza o `id` do manifest x-signature (doc MP: alfanuméricos em minúsculas). */
export function normalizeMercadoPagoWebhookManifestDataId(dataId: string): string {
  let id = dataId.trim();
  if (!id) return id;
  if (/^[a-zA-Z0-9]+$/.test(id)) {
    id = id.toLowerCase();
  }
  return id;
}

/**
 * Candidatos ao `id:` do manifest HMAC — o MP nem sempre manda `data.id` na query
 * (ex.: `merchant_order` com `?id=` e corpo `{ resource, topic }`).
 * A validação deve aceitar qualquer candidato que reproduza o `v1` recebido.
 */
export function collectWebhookSignatureDataIdCandidates(
  query: Record<string, unknown>,
  body?: unknown
): string[] {
  const out: string[] = [];
  const push = (raw: unknown) => {
    if (raw == null || raw === '') return;
    const s = String(raw).trim();
    if (s && !out.includes(s)) out.push(s);
  };

  push(query['data.id']);
  push(query.id);

  if (body && typeof body === 'object') {
    const b = body as MercadoPagoWebhookBody;
    const res = b.resource;
    if (typeof res === 'string' && res.trim()) {
      try {
        const u = new URL(res, 'https://api.mercadopago.com');
        const parts = u.pathname.split('/').filter(Boolean);
        const last = parts[parts.length - 1];
        if (last) push(last);
      } catch {
        const m = res.match(/(\d+)\s*$/);
        if (m) push(m[1]);
      }
    }
    push(b.data?.id);
    push(b.id);
  }

  return out;
}

export function extractWebhookSignatureDataId(query: Record<string, unknown>, body?: unknown): string {
  const candidates = collectWebhookSignatureDataIdCandidates(query, body);
  return candidates[0] ?? '';
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
 * Monta a string do manifest (sempre os três segmentos, como na documentação oficial do MP).
 * @see https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
export function buildMercadoPagoWebhookSignatureManifest(
  dataId: string,
  xRequestId: string,
  ts: string
): string {
  return `id:${dataId};request-id:${xRequestId};ts:${ts};`;
}

export function computeMercadoPagoWebhookSignature(secret: string, manifest: string): string {
  return crypto.createHmac('sha256', secret).update(manifest, 'utf8').digest('hex');
}

export type VerifyMercadoPagoWebhookSignatureParams = {
  /** Assinatura secreta do painel (Webhooks). */
  secret: string;
  headers: Record<string, unknown>;
  query: Record<string, unknown>;
  /** Corpo JSON do POST (opcional) — MP pode enviar `data.id` só no body. */
  body?: unknown;
};

/**
 * Valida header `x-signature` (HMAC-SHA256 do manifest com `data.id`, `x-request-id`, `ts`).
 * Retorna false se headers incompletos ou assinatura inválida.
 * @see https://mercadopago.com/developers/pt/docs/your-integrations/notifications/webhooks
 */
export function verifyMercadoPagoWebhookSignature(params: VerifyMercadoPagoWebhookSignatureParams): boolean {
  const { secret, headers, query, body } = params;
  if (!secret?.trim()) return false;

  const xSignature = getMercadoPagoWebhookHeader(headers, 'x-signature');
  const xRequestId = getMercadoPagoWebhookHeader(headers, 'x-request-id');
  const { ts, v1 } = parseMercadoPagoXsSignatureHeader(xSignature);

  if (!v1 || !ts || !xRequestId) return false;
  if (!/^[0-9a-f]+$/i.test(v1)) return false;

  const v1Buf = Buffer.from(v1, 'hex');
  const candidates = collectWebhookSignatureDataIdCandidates(query, body);
  if (candidates.length === 0) return false;

  for (const raw of candidates) {
    const dataId = normalizeMercadoPagoWebhookManifestDataId(raw);
    const manifest = buildMercadoPagoWebhookSignatureManifest(dataId, xRequestId, ts);
    const computed = computeMercadoPagoWebhookSignature(secret.trim(), manifest);
    if (computed.length !== v1.length) continue;
    try {
      if (crypto.timingSafeEqual(Buffer.from(computed, 'hex'), v1Buf)) return true;
    } catch {
      /* tamanho inválido — tenta próximo candidato */
    }
  }
  return false;
}

/**
 * Opcional: lê `MERCADOPAGO_WEBHOOK_SECRET` do env e valida (para uso no `server.ts`).
 */
export function verifyMercadoPagoWebhookSignatureFromEnv(
  headers: Record<string, unknown>,
  query: Record<string, unknown>,
  body?: unknown
): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  return verifyMercadoPagoWebhookSignature({ secret, headers, query, body });
}
