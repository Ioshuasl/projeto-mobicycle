import { db, generateId, getSetting } from "../config/db.ts";
import logger from "../utils/logger.ts";
import { isMercadoPagoPaymentApproved } from "../utils/mercadopago/payments.ts";
import type { PaymentResponse } from "mercadopago/dist/clients/payment/commonTypes";
import { FinancialManager } from "./financial_manager.ts";
import { MatrixManager } from "./matrix_manager.ts";

export const LICENSE_CHECKOUT_PREFIX = "license:";

export type MercadoPagoPaymentLike = {
  id?: unknown;
  status?: string;
  external_reference?: string | null;
  currency_id?: string;
  transaction_amount?: number;
};

/** Idempotente: retorna sem efeito se a licença já estiver ativa (reentrega de webhook). */
export async function activateUserLicenseAfterGatewayPayment(
  userId: string,
  adhesionFee: number
): Promise<void> {
  console.log("[debug:license][activateUserLicenseAfterGatewayPayment] entrada", {
    userId,
    adhesionFee,
  });
  const user = (await db.prepare("SELECT * FROM users WHERE id = ?").get(userId)) as {
    is_activated: number;
    referrer_id: string | null;
  } | null;

  if (!user) throw new Error(`Usuário não encontrado: ${userId}`);
  if (user.is_activated) {
    console.log(
      "[debug:license][activateUserLicenseAfterGatewayPayment] usuário já is_activated=1 — noop",
      { userId }
    );
    return;
  }

  await db.prepare("UPDATE users SET is_activated = 1 WHERE id = ?").run(userId);

  await db
    .prepare(
      "INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'ADHESION', 'Ativação de Licença de Uso', 'COMPLETED')"
    )
    .run(generateId("tx"), userId, adhesionFee);

  if (user.referrer_id) {
    await FinancialManager.addReferralBonus(user.referrer_id, userId);
    await FinancialManager.payLicenseUnilevelBonus(userId);
    await FinancialManager.payInfiniteBonus(userId, adhesionFee);
  }

  const openMatrices = (await db
    .prepare(
      "SELECT id FROM matrices WHERE type = 'ONBORD' AND status = 'OPEN' ORDER BY created_at ASC"
    )
    .all()) as { id: string }[];

  let targetMatrix = openMatrices.length > 0 ? openMatrices[0] : null;
  if (!targetMatrix) {
    targetMatrix = await MatrixManager.createMatrix("ONBORD");
  }
  await MatrixManager.fillPosition(targetMatrix.id, userId);
  console.log("[debug:license][activateUserLicenseAfterGatewayPayment] concluído", {
    userId,
    matrixId: targetMatrix.id,
  });
}

/**
 * Processa pagamento MP: se for checkout de licença (`license:*`), ativa e marca checkout.
 */
export async function tryActivateLicenseFromMercadoPagoPayment(
  payment: MercadoPagoPaymentLike,
  paymentIdFallback: string
): Promise<"activated" | "skipped"> {
  const extRefRaw = payment.external_reference;
  const extRef = typeof extRefRaw === "string" ? extRefRaw.trim() : "";
  if (!extRef || !extRef.startsWith(LICENSE_CHECKOUT_PREFIX)) {
    console.log(
      "[debug:license][/api/webhooks/mercadopago] external_reference não é license:* , ACK",
      { extRef, paymentStatus: payment.status }
    );
    return "skipped";
  }

  const checkout = (await db
    .prepare("SELECT * FROM license_checkouts WHERE external_reference = ?")
    .get(extRef)) as {
    id: string;
    user_id: string;
    amount: number;
    status: string;
  } | null;

  if (!checkout) {
    logger.warn(
      `[MP webhook] license_checkouts não encontrado para external_reference=${extRef}`
    );
    console.log("[debug:license][/api/webhooks/mercadopago] license_checkouts NÃO encontrado", {
      extRef,
    });
    return "skipped";
  }

  console.log("[debug:license][license_service] checkout encontrado", {
    checkoutId: checkout.id,
    userId: checkout.user_id,
    status: checkout.status,
    amount: checkout.amount,
  });

  const mpId = payment.id != null ? String(payment.id) : paymentIdFallback;
  const mpStatus = String(payment.status ?? "");

  await db
    .prepare(
      "UPDATE license_checkouts SET mp_payment_id = ?, mp_payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
    .run(mpId, mpStatus, checkout.id);

  const paymentForApproval = payment as PaymentResponse;
  if (!isMercadoPagoPaymentApproved(paymentForApproval)) {
    console.log("[debug:license][/api/webhooks/mercadopago] pagamento não approved, ACK", {
      mpStatus: payment.status,
    });
    return "skipped";
  }

  const currency = String(payment.currency_id || "BRL");
  if (currency !== "BRL") {
    logger.warn(`[MP webhook] moeda inesperada ${currency} para checkout ${checkout.id}`);
    console.log("[debug:license][/api/webhooks/mercadopago] moeda != BRL, ACK", { currency });
    return "skipped";
  }

  const paid = Number(payment.transaction_amount);
  if (!Number.isFinite(paid) || Math.abs(paid - Number(checkout.amount)) > 0.02) {
    logger.warn(
      `[MP webhook] valor divergente para checkout ${checkout.id}: pago=${paid} esperado=${checkout.amount}`
    );
    console.log("[debug:license][/api/webhooks/mercadopago] valor divergente, ACK", {
      paid,
      esperado: checkout.amount,
    });
    return "skipped";
  }

  console.log(
    "[debug:license][/api/webhooks/mercadopago] chamando activateUserLicenseAfterGatewayPayment",
    { userId: checkout.user_id, amount: checkout.amount }
  );
  await activateUserLicenseAfterGatewayPayment(
    checkout.user_id,
    Number(checkout.amount)
  );

  await db
    .prepare(
      `UPDATE license_checkouts SET
        status = 'ACTIVATED',
        activated_at = COALESCE(activated_at, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`
    )
    .run(checkout.id);

  logger.info(
    `[MP webhook] licença ativada payment=${mpId} user=${checkout.user_id} checkout=${checkout.id}`
  );
  console.log("[debug:license][/api/webhooks/mercadopago] licença ativada + checkout ACTIVATED", {
    mpId,
    userId: checkout.user_id,
    checkoutId: checkout.id,
  });
  return "activated";
}
