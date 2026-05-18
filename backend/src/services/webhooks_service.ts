import logger from "../utils/logger.ts";
import {
  tryActivateLicenseFromMercadoPagoPayment,
  type MercadoPagoPaymentLike,
} from "./license_service.ts";
import {
  extractMerchantOrderIdFromNotification,
  extractPaymentIdFromNotification,
  fetchMercadoPagoMerchantOrderById,
  getMercadoPagoPaymentById,
  isMercadoPagoConfigured,
  verifyMercadoPagoWebhookSignatureFromEnv,
} from "../utils/mercadopago/index.ts";

export type WebhookHttpResult = {
  status: number;
  body: string;
};

export type MercadoPagoWebhookInput = {
  method: string;
  headers: Record<string, unknown>;
  query: Record<string, unknown>;
  body: unknown;
};

function logIncoming(input: MercadoPagoWebhookInput): void {
  const bodyObj =
    input.body && typeof input.body === "object"
      ? (input.body as Record<string, unknown>)
      : null;

  console.log("[debug:license][/api/webhooks/mercadopago]", {
    method: input.method,
    query: input.query,
    bodyKeys: bodyObj ? Object.keys(bodyObj) : [],
    bodyType: bodyObj?.type,
    bodyDataId: (bodyObj?.data as { id?: unknown } | undefined)?.id,
    bodyId: bodyObj?.id,
  });
}

function isMpPaymentNotFoundError(fetchErr: unknown): boolean {
  const e = fetchErr as { message?: string; status?: number; cause?: { status?: number } };
  const msg = String(e?.message ?? fetchErr ?? "");
  const httpStatus = e?.status ?? e?.cause?.status;
  return httpStatus === 404 || /\bnot\s+found\b/i.test(msg) || /\b404\b/.test(msg);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function resolvePaymentRow(entry: unknown): Promise<MercadoPagoPaymentLike | null> {
  let row: MercadoPagoPaymentLike;

  if (typeof entry === "number" || (typeof entry === "string" && /^\d+$/.test(entry.trim()))) {
    const pid = String(entry).trim();
    try {
      row = await getMercadoPagoPaymentById(pid);
    } catch (pe: unknown) {
      logger.warn(
        `[MP webhook] merchant_order: GET payment ${pid} falhou — ${pe instanceof Error ? pe.message : String(pe)}`
      );
      return null;
    }
  } else if (entry && typeof entry === "object") {
    row = entry as MercadoPagoPaymentLike;
  } else {
    return null;
  }

  const pid = row.id != null ? String(row.id).trim() : "";
  if (!/^\d+$/.test(pid)) return null;

  const hasRef =
    typeof row.external_reference === "string" && row.external_reference.trim().length > 0;
  const needsFetch =
    !hasRef || row.status == null || row.transaction_amount == null || !row.currency_id;

  if (needsFetch) {
    try {
      return await getMercadoPagoPaymentById(pid);
    } catch (pe: unknown) {
      logger.warn(
        `[MP webhook] merchant_order: GET payment ${pid} falhou — ${pe instanceof Error ? pe.message : String(pe)}`
      );
      return null;
    }
  }

  return row;
}

async function handleMerchantOrder(
  body: unknown,
  query: Record<string, unknown>
): Promise<WebhookHttpResult> {
  const orderId = extractMerchantOrderIdFromNotification(body, query);
  if (!orderId) {
    console.log("[debug:license][/api/webhooks/mercadopago] merchant_order sem id, ACK");
    return { status: 200, body: "OK" };
  }

  console.log("[debug:license][/api/webhooks/mercadopago] merchant_order id", orderId);

  let orderJson: unknown;
  try {
    orderJson = await fetchMercadoPagoMerchantOrderById(orderId);
  } catch (orderErr: unknown) {
    const msg = orderErr instanceof Error ? orderErr.message : String(orderErr);
    logger.error(`[MP webhook] merchant_orders/${orderId} falhou: ${msg}`);
    console.log("[debug:license][/api/webhooks/mercadopago] merchant_order fetch ERRO", {
      orderId,
      msg,
    });
    return { status: 502, body: "Merchant order fetch failed" };
  }

  const order = orderJson as { payments?: unknown };
  const payList = Array.isArray(order.payments) ? order.payments : [];
  console.log("[debug:license][/api/webhooks/mercadopago] merchant_order payments", payList.length);

  for (const entry of payList) {
    const full = await resolvePaymentRow(entry);
    if (!full) continue;

    const pid = String(full.id).trim();
    const outcome = await tryActivateLicenseFromMercadoPagoPayment(full, pid);
    if (outcome === "activated") {
      return { status: 200, body: "OK" };
    }
  }

  return { status: 200, body: "OK" };
}

async function fetchPaymentWithRetry(paymentId: string): Promise<MercadoPagoPaymentLike> {
  const maxPaymentFetchAttempts = 8;
  let lastFetchErr: unknown;

  for (let attempt = 1; attempt <= maxPaymentFetchAttempts; attempt++) {
    try {
      return await getMercadoPagoPaymentById(paymentId);
    } catch (fetchErr: unknown) {
      lastFetchErr = fetchErr;
      if (isMpPaymentNotFoundError(fetchErr) && attempt < maxPaymentFetchAttempts) {
        logger.warn(
          `[MP webhook] GET payment ${paymentId} 404 (tentativa ${attempt}/${maxPaymentFetchAttempts}); nova tentativa após atraso.`
        );
        console.log("[debug:license][/api/webhooks/mercadopago] get payment 404 — retry", {
          paymentId,
          attempt,
        });
        await sleep(600 * attempt);
        continue;
      }
      if (isMpPaymentNotFoundError(fetchErr)) {
        logger.error(
          `[MP webhook] GET payment ${paymentId} ainda 404 após ${maxPaymentFetchAttempts} tentativas.`
        );
        console.log(
          "[debug:license][/api/webhooks/mercadopago] get payment 404 definitivo — 502 p/ retry MP",
          { paymentId }
        );
        throw Object.assign(new Error("Payment not visible or token mismatch"), { httpStatus: 502 });
      }
      throw fetchErr;
    }
  }

  throw lastFetchErr ?? new Error("Falha ao obter pagamento MP");
}

async function handlePaymentNotification(
  body: unknown,
  query: Record<string, unknown>
): Promise<WebhookHttpResult> {
  const paymentId = extractPaymentIdFromNotification(body, query);
  if (!paymentId) {
    console.log("[debug:license][/api/webhooks/mercadopago] sem paymentId, ACK");
    return { status: 200, body: "OK" };
  }

  console.log("[debug:license][/api/webhooks/mercadopago] paymentId", paymentId);

  try {
    const payment = await fetchPaymentWithRetry(paymentId);
    await tryActivateLicenseFromMercadoPagoPayment(payment, paymentId);
    return { status: 200, body: "OK" };
  } catch (err: unknown) {
    const httpStatus = (err as { httpStatus?: number }).httpStatus;
    if (httpStatus === 502) {
      return { status: 502, body: "Payment not visible or token mismatch" };
    }
    throw err;
  }
}

export const webhooksService = {
  async handleMercadoPagoWebhook(input: MercadoPagoWebhookInput): Promise<WebhookHttpResult> {
    logIncoming(input);

    if (!isMercadoPagoConfigured()) {
      logger.warn("[MP webhook] MERCADOPAGO_ACCESS_TOKEN ausente — ignorando notificação");
      return { status: 503, body: "Misconfigured" };
    }

    if (process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim()) {
      const ok = verifyMercadoPagoWebhookSignatureFromEnv(
        input.headers,
        input.query,
        input.body
      );
      if (!ok) {
        logger.warn("[MP webhook] assinatura x-signature inválida ou incompleta");
        console.log("[debug:license][/api/webhooks/mercadopago] assinatura FALHOU (401)");
        return { status: 401, body: "Unauthorized" };
      }
      console.log("[debug:license][/api/webhooks/mercadopago] assinatura OK");
    } else {
      logger.warn(
        "[MP webhook] MERCADOPAGO_WEBHOOK_SECRET não definido — assinatura não validada (configure em produção)"
      );
    }

    const topic = String(input.query.topic ?? input.query.type ?? "").toLowerCase();
    if (topic && topic !== "payment" && topic !== "merchant_order") {
      console.log("[debug:license][/api/webhooks/mercadopago] topic ignorado, ACK", { topic });
      return { status: 200, body: "OK" };
    }

    if (topic === "merchant_order") {
      return handleMerchantOrder(input.body, input.query);
    }

    return handlePaymentNotification(input.body, input.query);
  },
};
