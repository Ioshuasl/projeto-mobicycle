/**
 * Cliente singleton do SDK Mercado Pago (servidor).
 */
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { getMercadoPagoAccessToken } from './config.ts';

let cachedConfig: MercadoPagoConfig | null = null;

export function getMercadoPagoConfig(): MercadoPagoConfig {
  if (!cachedConfig) {
    cachedConfig = new MercadoPagoConfig({ accessToken: getMercadoPagoAccessToken() });
  }
  return cachedConfig;
}

/** Reinicia o client (útil em testes ou após trocar env em runtime). */
export function resetMercadoPagoConfigCache(): void {
  cachedConfig = null;
}

export function getPreferenceApi(): Preference {
  return new Preference(getMercadoPagoConfig());
}

export function getPaymentApi(): Payment {
  return new Payment(getMercadoPagoConfig());
}
