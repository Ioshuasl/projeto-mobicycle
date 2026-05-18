/**
 * Pagamentos — operações da API Payments (consulta, busca, criação, captura, cancelamento).
 * @see https://www.mercadopago.com.br/developers/pt/reference/payments/_payments/post
 */
import type { PaymentCreateRequest } from 'mercadopago/dist/clients/payment/create/types';
import type { PaymentResponse } from 'mercadopago/dist/clients/payment/commonTypes';
import type {
  PaymentSearch,
  PaymentSearchOptions,
} from 'mercadopago/dist/clients/payment/search/types';
import type { Options } from 'mercadopago/dist/types';
import { getPaymentApi } from './client.ts';

export class MercadoPagoPaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MercadoPagoPaymentError';
  }
}

/** Normaliza id numérico de pagamento (string ou number). */
export function assertMercadoPagoPaymentId(paymentId: string | number): string {
  const raw = typeof paymentId === 'number' ? String(paymentId) : paymentId.trim();
  if (!/^\d+$/.test(raw)) {
    throw new MercadoPagoPaymentError('ID de pagamento Mercado Pago inválido (esperado numérico)');
  }
  return raw;
}

export async function getMercadoPagoPaymentById(
  paymentId: string | number,
  requestOptions?: Options
): Promise<PaymentResponse> {
  const id = assertMercadoPagoPaymentId(paymentId);
  return getPaymentApi().get({ id, requestOptions });
}

export async function searchMercadoPagoPayments(
  options?: PaymentSearchOptions,
  requestOptions?: Options
): Promise<PaymentSearch> {
  return getPaymentApi().search({ options, requestOptions });
}

export async function searchMercadoPagoPaymentsByExternalReference(
  externalReference: string,
  options?: Omit<PaymentSearchOptions, 'external_reference'>,
  requestOptions?: Options
): Promise<PaymentSearch> {
  const ref = externalReference?.trim();
  if (!ref) {
    throw new MercadoPagoPaymentError('externalReference é obrigatório');
  }
  return searchMercadoPagoPayments({ ...options, external_reference: ref }, requestOptions);
}

/**
 * Cria um pagamento direto (Checkout API / PIX com token, cartão tokenizado, etc.).
 * Checkout Pro costuma não precisar disso (pagamento nasce na sessão da preferência).
 */
export async function createMercadoPagoPayment(
  body: PaymentCreateRequest,
  requestOptions?: Options
): Promise<PaymentResponse> {
  return getPaymentApi().create({ body, requestOptions });
}

/** Cancela um pagamento (status autorizado/pendente conforme regras MP). */
export async function cancelMercadoPagoPayment(
  paymentId: string | number,
  requestOptions?: Options
): Promise<PaymentResponse> {
  const id = assertMercadoPagoPaymentId(paymentId);
  return getPaymentApi().cancel({ id, requestOptions });
}

/**
 * Captura valor de um pagamento autorizado (ex.: cartão com capture=false na criação).
 * @param transactionAmount omitido = captura total
 */
export async function captureMercadoPagoPayment(
  paymentId: string | number,
  transactionAmount?: number,
  requestOptions?: Options
): Promise<PaymentResponse> {
  const id = assertMercadoPagoPaymentId(paymentId);
  return getPaymentApi().capture({ id, transaction_amount: transactionAmount, requestOptions });
}

// --- Status (resposta de get/create/cancel/capture) ---

export type MercadoPagoPaymentStatus =
  | 'pending'
  | 'approved'
  | 'authorized'
  | 'in_process'
  | 'in_mediation'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'charged_back'
  | string;

export function getMercadoPagoPaymentStatus(payment: PaymentResponse): MercadoPagoPaymentStatus {
  return (payment.status ?? '') as MercadoPagoPaymentStatus;
}

export function isMercadoPagoPaymentApproved(payment: PaymentResponse): boolean {
  return payment.status === 'approved';
}

export function isMercadoPagoPaymentPending(payment: PaymentResponse): boolean {
  return payment.status === 'pending' || payment.status === 'in_process' || payment.status === 'authorized';
}

export function isMercadoPagoPaymentRejected(payment: PaymentResponse): boolean {
  return payment.status === 'rejected';
}

export function isMercadoPagoPaymentCancelled(payment: PaymentResponse): boolean {
  return payment.status === 'cancelled';
}

export function isMercadoPagoPaymentRefunded(payment: PaymentResponse): boolean {
  return payment.status === 'refunded';
}

export function isMercadoPagoPaymentChargedBack(payment: PaymentResponse): boolean {
  return payment.status === 'charged_back';
}

/** True se o pagamento já foi creditado ao vendedor (regra comum para liberar saldo interno). */
export function isMercadoPagoPaymentSettledForCredit(payment: PaymentResponse): boolean {
  return payment.status === 'approved';
}
