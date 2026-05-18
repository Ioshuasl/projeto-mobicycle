import type { Request, Response } from "express";
import { Router } from "express";
import logger from "../utils/logger.ts";
import {
  tryActivateLicenseFromMercadoPagoPayment,
  type MercadoPagoPaymentLike,
} from "../services/license_service.ts";
import {
  extractMerchantOrderIdFromNotification,
  extractPaymentIdFromNotification,
  fetchMercadoPagoMerchantOrderById,
  getMercadoPagoPaymentById,
  isMercadoPagoConfigured,
  verifyMercadoPagoWebhookSignatureFromEnv,
} from "../utils/mercadopago/index.ts";

/** Webhooks Mercado Pago — sem JWT (migrado de `server.ts`). */
export function createWebhooksRoutes(): Router {
  const router = Router();

  const mercadoPagoWebhook = async (req: Request, res: Response) => {
    const hdr = req.headers as unknown as Record<string, unknown>;
    const q = req.query as Record<string, unknown>;
    const bodyObj =
      req.body && typeof req.body === "object"
        ? (req.body as Record<string, unknown>)
        : null;

    console.log("[debug:license][/api/webhooks/mercadopago]", {
      method: req.method,
      query: q,
      bodyKeys: bodyObj ? Object.keys(bodyObj) : [],
      bodyType: bodyObj?.type,
      bodyDataId: (bodyObj?.data as { id?: unknown } | undefined)?.id,
      bodyId: bodyObj?.id,
    });

    try {
      if (!isMercadoPagoConfigured()) {
        logger.warn("[MP webhook] MERCADOPAGO_ACCESS_TOKEN ausente — ignorando notificação");
        return res.status(503).send("Misconfigured");
      }

      if (process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim()) {
        const ok = verifyMercadoPagoWebhookSignatureFromEnv(hdr, q, req.body);
        if (!ok) {
          logger.warn("[MP webhook] assinatura x-signature inválida ou incompleta");
          console.log("[debug:license][/api/webhooks/mercadopago] assinatura FALHOU (401)");
          return res.status(401).send("Unauthorized");
        }
        console.log("[debug:license][/api/webhooks/mercadopago] assinatura OK");
      } else {
        logger.warn(
          "[MP webhook] MERCADOPAGO_WEBHOOK_SECRET não definido — assinatura não validada (configure em produção)"
        );
      }

      const topic = String(q.topic ?? q.type ?? "").toLowerCase();
      if (topic && topic !== "payment" && topic !== "merchant_order") {
        console.log("[debug:license][/api/webhooks/mercadopago] topic ignorado, ACK", {
          topic,
        });
        return res.status(200).send("OK");
      }

      if (topic === "merchant_order") {
        const orderId = extractMerchantOrderIdFromNotification(req.body, q);
        if (!orderId) {
          console.log("[debug:license][/api/webhooks/mercadopago] merchant_order sem id, ACK");
          return res.status(200).send("OK");
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
          return res.status(502).send("Merchant order fetch failed");
        }

        const order = orderJson as { payments?: unknown };
        const payList = Array.isArray(order.payments) ? order.payments : [];
        console.log(
          "[debug:license][/api/webhooks/mercadopago] merchant_order payments",
          payList.length
        );

        for (const entry of payList) {
          let row: MercadoPagoPaymentLike;
          if (
            typeof entry === "number" ||
            (typeof entry === "string" && /^\d+$/.test(entry.trim()))
          ) {
            const pid = String(entry).trim();
            try {
              row = await getMercadoPagoPaymentById(pid);
            } catch (pe: unknown) {
              logger.warn(
                `[MP webhook] merchant_order: GET payment ${pid} (id na lista) falhou — ${pe instanceof Error ? pe.message : String(pe)}`
              );
              continue;
            }
          } else if (entry && typeof entry === "object") {
            row = entry as MercadoPagoPaymentLike;
          } else {
            continue;
          }

          const pid = row.id != null ? String(row.id).trim() : "";
          if (!/^\d+$/.test(pid)) continue;

          let full: MercadoPagoPaymentLike = row;
          const hasRef =
            typeof row.external_reference === "string" &&
            row.external_reference.trim().length > 0;
          const needsFetch =
            !hasRef ||
            row.status == null ||
            row.transaction_amount == null ||
            !row.currency_id;

          if (needsFetch) {
            try {
              full = await getMercadoPagoPaymentById(pid);
            } catch (pe: unknown) {
              logger.warn(
                `[MP webhook] merchant_order: GET payment ${pid} falhou — ${pe instanceof Error ? pe.message : String(pe)}`
              );
              continue;
            }
          }

          const outcome = await tryActivateLicenseFromMercadoPagoPayment(full, pid);
          if (outcome === "activated") {
            return res.status(200).send("OK");
          }
        }
        return res.status(200).send("OK");
      }

      const paymentId = extractPaymentIdFromNotification(req.body, q);
      if (!paymentId) {
        console.log("[debug:license][/api/webhooks/mercadopago] sem paymentId, ACK");
        return res.status(200).send("OK");
      }
      console.log("[debug:license][/api/webhooks/mercadopago] paymentId", paymentId);

      const isMpPaymentNotFoundError = (fetchErr: unknown): boolean => {
        const e = fetchErr as { message?: string; status?: number; cause?: { status?: number } };
        const msg = String(e?.message ?? fetchErr ?? "");
        const httpStatus = e?.status ?? e?.cause?.status;
        return (
          httpStatus === 404 ||
          /\bnot\s+found\b/i.test(msg) ||
          /\b404\b/.test(msg)
        );
      };

      const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

      const maxPaymentFetchAttempts = 8;
      let payment: Awaited<ReturnType<typeof getMercadoPagoPaymentById>> | undefined;
      let lastFetchErr: unknown;

      for (let attempt = 1; attempt <= maxPaymentFetchAttempts; attempt++) {
        try {
          payment = await getMercadoPagoPaymentById(paymentId);
          lastFetchErr = undefined;
          break;
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
            return res.status(502).send("Payment not visible or token mismatch");
          }
          throw fetchErr;
        }
      }

      if (!payment) {
        throw lastFetchErr ?? new Error("Falha ao obter pagamento MP");
      }

      const outcome = await tryActivateLicenseFromMercadoPagoPayment(payment, paymentId);
      if (outcome === "activated") {
        return res.status(200).send("OK");
      }
      return res.status(200).send("OK");
    } catch (err) {
      logger.error("[MP webhook] erro ao processar:", err);
      console.log("[debug:license][/api/webhooks/mercadopago] ERRO 500", {
        message: err instanceof Error ? err.message : String(err),
      });
      return res.status(500).send("Error");
    }
  };

  router.post("/webhooks/mercadopago", mercadoPagoWebhook);
  router.get("/webhooks/mercadopago", mercadoPagoWebhook);

  return router;
}
