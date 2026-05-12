/**
 * Utilitários Mercado Pago (Checkout Pro e pagamentos).
 *
 * IMPORTANTE: contém uso de Access Token via env — importar apenas no servidor
 * (`server.ts`, `src/server/*`), nunca em código React/Vite client.
 */

export {
  isMercadoPagoConfigured,
  getMercadoPagoAccessToken,
  isTestAccessToken,
  getMercadoPagoPublicKey,
  isMercadoPagoSandboxCredentials,
  getAppPublicBaseUrl,
  buildAbsoluteUrl,
} from './config.ts';

export {
  getMercadoPagoConfig,
  resetMercadoPagoConfigCache,
  getPreferenceApi,
  getPaymentApi,
} from './client.ts';

export {
  roundBrlUnitPrice,
  assertValidBrlCheckoutAmount,
  MercadoPagoAmountError,
  type ValidateAmountOptions,
} from './amount.ts';

export {
  assertPreferenceId,
  applySafeAutoReturnToPreferenceRequest,
  createCheckoutProPreference,
  createCheckoutProPreferenceFromBody,
  createCheckoutProPreferenceWithAppPaths,
  getCheckoutProPreference,
  getCheckoutProPreferenceResult,
  MercadoPagoPreferenceError,
  pickCheckoutRedirectUrl,
  preferenceResponseToCheckoutResult,
  searchCheckoutProPreferences,
  searchCheckoutProPreferencesByExternalReference,
  shouldOmitAutoReturnForBackUrls,
  updateCheckoutProPreference,
  updateCheckoutProPreferenceResult,
  type CreateCheckoutProPreferenceParams,
  type CheckoutProBackUrls,
  type CheckoutProPayer,
  type CheckoutProPreferenceResult,
} from './checkoutPro.ts';

export {
  assertMercadoPagoPaymentId,
  cancelMercadoPagoPayment,
  captureMercadoPagoPayment,
  createMercadoPagoPayment,
  getMercadoPagoPaymentById,
  getMercadoPagoPaymentStatus,
  isMercadoPagoPaymentApproved,
  isMercadoPagoPaymentCancelled,
  isMercadoPagoPaymentChargedBack,
  isMercadoPagoPaymentPending,
  isMercadoPagoPaymentRefunded,
  isMercadoPagoPaymentRejected,
  isMercadoPagoPaymentSettledForCredit,
  MercadoPagoPaymentError,
  searchMercadoPagoPayments,
  searchMercadoPagoPaymentsByExternalReference,
  type MercadoPagoPaymentStatus,
} from './payments.ts';

export {
  buildMercadoPagoWebhookSignatureManifest,
  computeMercadoPagoWebhookSignature,
  extractMerchantOrderIdFromNotification,
  extractNotificationTopic,
  extractPaymentIdFromNotification,
  extractPreferenceIdFromNotification,
  extractWebhookQueryDataId,
  getMercadoPagoWebhookHeader,
  parseMercadoPagoXsSignatureHeader,
  verifyMercadoPagoWebhookSignature,
  verifyMercadoPagoWebhookSignatureFromEnv,
  type MercadoPagoWebhookBody,
  type MercadoPagoNotificationTopic,
  type ParsedXsSignature,
  type VerifyMercadoPagoWebhookSignatureParams,
} from './notifications.ts';

export {
  requestMercadoPagoClientCredentialsToken,
  getMercadoPagoClientId,
  getMercadoPagoClientSecret,
  isMercadoPagoOAuthConfigured,
  MercadoPagoOAuthError,
  type MercadoPagoOAuthTokenResponse,
} from './oauth.ts';
