/**
 * Pedidos comerciais (merchant_orders) — Checkout Pro costuma notificar também por `topic=merchant_order`.
 * Útil quando GET /payments/:id ainda retorna 404 enquanto o pagamento está em processamento.
 */
import { getMercadoPagoAccessToken } from './config.ts';

const TRAILING_SLASH = /\/$/;

function getMercadoPagoApiBase(): string {
  const fromEnv = process.env.MERCADOPAGO_API_BASE?.trim().replace(TRAILING_SLASH, '');
  return fromEnv || 'https://api.mercadopago.com';
}

export async function fetchMercadoPagoMerchantOrderById(orderId: string): Promise<unknown> {
  const id = String(orderId).trim();
  if (!/^\d+$/.test(id)) {
    throw new Error('ID de merchant_order inválido (esperado numérico)');
  }
  const url = `${getMercadoPagoApiBase()}/merchant_orders/${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getMercadoPagoAccessToken()}`,
      Accept: 'application/json',
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`merchant_orders/${id} HTTP ${res.status}: ${text.slice(0, 400)}`);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error('merchant_orders: resposta não é JSON');
  }
}
