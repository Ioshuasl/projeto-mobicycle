/**
 * Valores monetários em BRL para a API do Mercado Pago (Checkout Pro).
 */

export class MercadoPagoAmountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MercadoPagoAmountError';
  }
}

/** Arredonda para 2 casas (padrão BRL na API). */
export function roundBrlUnitPrice(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export type ValidateAmountOptions = {
  min?: number;
  max?: number;
};

/**
 * Garante valor finito, > 0, até 2 casas decimais e limites opcionais.
 * Lança MercadoPagoAmountError para respostas 400 consistentes.
 */
export function assertValidBrlCheckoutAmount(amount: number, opts: ValidateAmountOptions = {}): number {
  if (!Number.isFinite(amount)) {
    throw new MercadoPagoAmountError('Valor do pagamento inválido');
  }
  const rounded = roundBrlUnitPrice(amount);
  if (rounded <= 0) {
    throw new MercadoPagoAmountError('O valor deve ser maior que zero');
  }
  if (Math.abs(amount - rounded) > 1e-9) {
    throw new MercadoPagoAmountError('Use no máximo 2 casas decimais');
  }
  const { min = 1, max = 1_000_000 } = opts;
  if (rounded < min) {
    throw new MercadoPagoAmountError(`Valor mínimo: R$ ${min.toFixed(2)}`);
  }
  if (rounded > max) {
    throw new MercadoPagoAmountError(`Valor máximo: R$ ${max.toFixed(2)}`);
  }
  return rounded;
}
