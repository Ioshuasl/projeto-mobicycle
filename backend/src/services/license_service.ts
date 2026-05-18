import { getSetting } from "../config/db.ts";
import { HttpError } from "../interfaces/errors.ts";
import type { AuthUser } from "../middlewares/auth.middleware.ts";
import { isUserAdmin } from "../middlewares/admin.middleware.ts";
import { licenseCheckoutRepository } from "../repository/license_checkout_repository.ts";
import { matrixRepository } from "../repository/matrix_repository.ts";
import { transactionRepository } from "../repository/transaction_repository.ts";
import { userRepository } from "../repository/user_repository.ts";
import logger from "../utils/logger.ts";
import { isMercadoPagoPaymentApproved } from "../utils/mercadopago/payments.ts";
import type { PaymentResponse } from "mercadopago/dist/clients/payment/commonTypes";
import {
  createCheckoutProPreferenceWithAppPaths,
  isMercadoPagoConfigured,
} from "../utils/mercadopago/index.ts";
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

export type CheckoutProResult = {
  checkoutUrl: string;
  preferenceId: string;
  externalReference: string;
  checkoutId: string;
  amount: number;
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

  const user = await userRepository.findLicenseActivationState(userId);
  if (!user) throw new Error(`Usuário não encontrado: ${userId}`);

  if (user.is_activated) {
    console.log(
      "[debug:license][activateUserLicenseAfterGatewayPayment] usuário já is_activated=1 — noop",
      { userId }
    );
    return;
  }

  await userRepository.setLicenseActivated(userId);
  await transactionRepository.insertAdhesion(userId, adhesionFee);

  if (user.referrer_id) {
    await FinancialManager.addReferralBonus(user.referrer_id, userId);
    await FinancialManager.payLicenseUnilevelBonus(userId);
    await FinancialManager.payInfiniteBonus(userId, adhesionFee);
  }

  const openMatrices = await matrixRepository.findOpenOnbordIds();
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

  const checkout = await licenseCheckoutRepository.findByExternalReference(extRef);
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

  await licenseCheckoutRepository.updatePaymentMeta(checkout.id, mpId, mpStatus);

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
  await activateUserLicenseAfterGatewayPayment(checkout.user_id, Number(checkout.amount));
  await licenseCheckoutRepository.markActivated(checkout.id);

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

export const licenseService = {
  async activateManual(authUser: AuthUser, userId: string | undefined): Promise<{ success: true }> {
    console.log("[debug:license][/api/user/activate]", {
      authUserId: authUser.id,
      bodyUserId: userId,
    });

    if (!userId || (authUser.id !== userId && !isUserAdmin(authUser))) {
      throw new HttpError(403, "Acesso negado");
    }

    const user = await userRepository.findLicenseActivationState(userId);
    if (!user) {
      throw new HttpError(404, "Usuário não encontrado");
    }
    if (user.is_activated) {
      throw new HttpError(400, "Licença já está ativa");
    }

    const adhesionFee = parseFloat(await getSetting("matrix_adhesion_fee", "650"));
    await activateUserLicenseAfterGatewayPayment(userId, adhesionFee);

    console.log("[debug:license][/api/user/activate] concluído com sucesso", { userId });
    return { success: true };
  },

  async createCheckoutPro(userId: string): Promise<CheckoutProResult> {
    if (!isMercadoPagoConfigured()) {
      throw new HttpError(
        503,
        "Pagamento não configurado. Defina MERCADOPAGO_ACCESS_TOKEN no servidor."
      );
    }

    const user = await userRepository.findForLicenseCheckout(userId);
    console.log("[debug:license][/api/license/checkout-pro] início", {
      userId,
      hasUser: !!user,
    });

    if (!user) {
      throw new HttpError(404, "Usuário não encontrado");
    }
    if (user.isActivated) {
      throw new HttpError(400, "Licença já está ativa");
    }

    const email = (user.email ?? "").trim();
    if (!email) {
      throw new HttpError(400, "Cadastre um e-mail na conta para pagar com Mercado Pago.");
    }

    const adhesionFee = parseFloat(await getSetting("matrix_adhesion_fee", "650"));
    if (!Number.isFinite(adhesionFee) || adhesionFee <= 0) {
      throw new HttpError(500, "Valor de adesão inválido nas configurações.");
    }

    const checkoutId = licenseCheckoutRepository.createId();
    const externalReference = `${LICENSE_CHECKOUT_PREFIX}${checkoutId}`;

    const nameParts = (user.name ?? "").trim().split(/\s+/);
    const firstName = nameParts[0] || "Cliente";
    const surname = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

    const pref = await createCheckoutProPreferenceWithAppPaths({
      externalReference,
      title: "Licença de Uso MOBICYCLE — Taxa de adesão",
      itemId: "license_adhesion",
      amount: adhesionFee,
      payer: { email, name: firstName, surname },
      statementDescriptor: "MOBICYCLE",
      successPath: "/?licensePayment=success",
      pendingPath: "/?licensePayment=pending",
      failurePath: "/?licensePayment=failure",
    });

    await licenseCheckoutRepository.insertPending({
      id: checkoutId,
      userId,
      externalReference,
      preferenceId: pref.preferenceId,
      amount: adhesionFee,
    });

    console.log("[debug:license][/api/license/checkout-pro] preferência criada", {
      userId,
      checkoutId,
      externalReference,
      preferenceId: pref.preferenceId,
      amount: adhesionFee,
    });

    return {
      checkoutUrl: pref.checkoutUrl,
      preferenceId: pref.preferenceId,
      externalReference,
      checkoutId,
      amount: adhesionFee,
    };
  },
};
