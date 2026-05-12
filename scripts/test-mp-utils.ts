/**
 * Exercita src/utils/mercadopago (config, amount, notifications, checkoutPro, payments).
 *
 * Pré-requisitos: MERCADOPAGO_ACCESS_TOKEN no .env ou .env.example.
 * Sandbox painel (APP_USR-): MERCADOPAGO_ALLOW_APP_USR_IN_UTILS_TEST=1 no .env (ou .env.example).
 *
 * Uso: npm run mp:utils-test
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  assertValidBrlCheckoutAmount,
  MercadoPagoAmountError,
} from '../src/utils/mercadopago/amount.ts';
import {
  isMercadoPagoConfigured,
  isTestAccessToken,
  isMercadoPagoSandboxCredentials,
  getMercadoPagoPublicKey,
  getAppPublicBaseUrl,
} from '../src/utils/mercadopago/config.ts';
import { resetMercadoPagoConfigCache } from '../src/utils/mercadopago/client.ts';
import {
  createCheckoutProPreferenceWithAppPaths,
  getCheckoutProPreferenceResult,
  pickCheckoutRedirectUrl,
  searchCheckoutProPreferencesByExternalReference,
} from '../src/utils/mercadopago/checkoutPro.ts';
import {
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
} from '../src/utils/mercadopago/notifications.ts';
import {
  assertMercadoPagoPaymentId,
  getMercadoPagoPaymentById,
  getMercadoPagoPaymentStatus,
  MercadoPagoPaymentError,
  searchMercadoPagoPayments,
} from '../src/utils/mercadopago/payments.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
dotenv.config({ path: path.join(root, '.env.example') });
dotenv.config({ path: path.join(root, '.env'), override: true });

function assertTestAccessToken(): void {
  if (process.env.MERCADOPAGO_ALLOW_PROD_TOKEN_IN_SCRIPTS === '1') {
    console.warn('[mp:utils-test] MERCADOPAGO_ALLOW_PROD_TOKEN_IN_SCRIPTS=1 — checagem TEST- desativada.');
    return;
  }
  if (process.env.MERCADOPAGO_ALLOW_APP_USR_IN_UTILS_TEST === '1') {
    console.warn(
      '[mp:utils-test] MERCADOPAGO_ALLOW_APP_USR_IN_UTILS_TEST=1 — token não precisa ser TEST- (sandbox APP_USR do painel).'
    );
    return;
  }
  if (!isTestAccessToken()) {
    console.error(
      '[mp:utils-test] Exige MERCADOPAGO_ACCESS_TOKEN TEST- ou defina MERCADOPAGO_ALLOW_APP_USR_IN_UTILS_TEST=1.\n' +
        '  Produção: MERCADOPAGO_ALLOW_PROD_TOKEN_IN_SCRIPTS=1 (não recomendado).'
    );
    process.exit(1);
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

async function main() {
  console.log('[mp:utils-test] Mercado Pago — exercício dos utilitários (API real onde indicado).\n');

  if (!isMercadoPagoConfigured()) {
    console.error('[mp:utils-test] MERCADOPAGO_ACCESS_TOKEN não definido.');
    process.exit(1);
  }

  assertTestAccessToken();
  resetMercadoPagoConfigCache();

  const publicKey = getMercadoPagoPublicKey();
  section('[1] Config');
  console.log('    APP_PUBLIC_URL:', getAppPublicBaseUrl());
  console.log('    access_token (prefixo):', (process.env.MERCADOPAGO_ACCESS_TOKEN ?? '').slice(0, 12) + '…');
  console.log('    public_key:', publicKey ? `${publicKey.slice(0, 12)}…` : '(não)');
  console.log('    sandbox (TEST- em token ou PK):', isMercadoPagoSandboxCredentials());
  console.log(
    '    MERCADOPAGO_WEBHOOK_SECRET:',
    process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim() ? '(definido)' : '(omitido — verify from env não testado)'
  );

  section('[2] amount — assertValidBrlCheckoutAmount');
  try {
    assertValidBrlCheckoutAmount(0.5, { min: 0.5, max: 100 });
    console.log('    OK: R$ 0,50 (min=0.50)');
  } catch (e) {
    if (e instanceof MercadoPagoAmountError) {
      console.log('    skip 0,50:', e.message);
    }
  }
  console.log('    OK: R$ 5,00 →', assertValidBrlCheckoutAmount(5, { min: 1, max: 100_000 }));

  section('[3] notifications — parse (offline)');
  const payBody = { action: 'payment.created', data: { id: '123456789' } };
  console.log('    extractPaymentId:', extractPaymentIdFromNotification(payBody, {}));
  console.log('    topic:', extractNotificationTopic({ topic: 'payment' }));
  console.log('    data.id query:', extractWebhookQueryDataId({ 'data.id': 'AbC999' }));
  console.log(
    '    merchant_order id:',
    extractMerchantOrderIdFromNotification({}, { topic: 'merchant_order', id: 'ord-xyz' })
  );
  console.log(
    '    preference id:',
    extractPreferenceIdFromNotification({}, { topic: 'preference', 'data.id': 'pref-abc' })
  );
  console.log('    getMercadoPagoWebhookHeader:', getMercadoPagoWebhookHeader({ 'X-Request-Id': 'abc' }, 'x-request-id'));

  const parsed = parseMercadoPagoXsSignatureHeader('ts=1704908010,v1=deadbeef');
  console.log('    parse x-signature:', parsed);

  section('[4] notifications — assinatura HMAC (round-trip)');
  const sigSecret = 'mp-utils-test-secret';
  const sigDataId = '999888';
  const sigReqId = 'test-req-id';
  const sigTs = '1704908010';
  const manifest = buildMercadoPagoWebhookSignatureManifest(sigDataId, sigReqId, sigTs);
  const sigV1 = computeMercadoPagoWebhookSignature(sigSecret, manifest);
  const sigHeaders: Record<string, unknown> = {
    'x-signature': `ts=${sigTs},v1=${sigV1}`,
    'x-request-id': sigReqId,
  };
  const sigQuery: Record<string, unknown> = { 'data.id': sigDataId };
  const sigOk = verifyMercadoPagoWebhookSignature({ secret: sigSecret, headers: sigHeaders, query: sigQuery });
  console.log('    manifest:', JSON.stringify(manifest));
  console.log('    verifyMercadoPagoWebhookSignature (sintético):', sigOk ? 'OK' : 'FALHOU');
  if (!sigOk) throw new Error('Round-trip de assinatura webhook falhou');

  const envSig = verifyMercadoPagoWebhookSignatureFromEnv(sigHeaders, sigQuery);
  console.log(
    '    verifyMercadoPagoWebhookSignatureFromEnv:',
    process.env.MERCADOPAGO_WEBHOOK_SECRET ? (envSig ? 'OK' : 'falso (secret real ≠ sintético)') : 'skip (sem MERCADOPAGO_WEBHOOK_SECRET)'
  );

  section('[5] payments — assertMercadoPagoPaymentId');
  try {
    assertMercadoPagoPaymentId('não-numérico');
    console.log('    ERRO: deveria ter lançado');
    process.exit(1);
  } catch (e) {
    if (e instanceof MercadoPagoPaymentError) console.log('    OK: rejeita id inválido');
    else throw e;
  }
  console.log('    OK id:', assertMercadoPagoPaymentId(12345678));

  section('[6] payments — search (API)');
  const search = await searchMercadoPagoPayments({ limit: 5, offset: 0 });
  const results = search.results ?? [];
  console.log('    total (paging):', search.paging?.total ?? '(n/d)', '| retornados:', results.length);
  if (results.length > 0 && results[0].id) {
    const firstId = results[0].id!;
    section('[7] payments — get por id (API)');
    const pay = await getMercadoPagoPaymentById(firstId);
    console.log('    id:', pay.id, '| status:', getMercadoPagoPaymentStatus(pay));
  } else {
    console.log('    (sem pagamentos recentes — skip GET por id)');
  }

  const payerEmail =
    process.env.MERCADOPAGO_TEST_PAYER_EMAIL?.trim() || 'test_user@mail.com';
  const externalRef = `mp_utils_${Date.now()}`;

  section('[8] checkoutPro — create + get + search');
  const pref = await createCheckoutProPreferenceWithAppPaths({
    externalReference: externalRef,
    title: '[TESTE] Mobicycle — utils',
    itemId: 'mp_utils_test',
    amount: 5,
    payer: { email: payerEmail, name: 'Test', surname: 'User' },
    successPath: '/dashboard?mp=test_ok',
    pendingPath: '/dashboard?mp=test_pending',
    failurePath: '/dashboard?mp=test_fail',
  });
  console.log('    create preference_id:', pref.preferenceId);
  console.log('    checkoutUrl:', pref.checkoutUrl);
  console.log('    pickCheckoutRedirectUrl:', pickCheckoutRedirectUrl(pref.raw) || '(vazio)');

  const fetched = await getCheckoutProPreferenceResult(pref.preferenceId);
  console.log('    get external_reference:', fetched.externalReference);
  console.log('    get checkoutUrl:', fetched.checkoutUrl || '(vazio)');

  const prefSearch = await searchCheckoutProPreferencesByExternalReference(externalRef, { limit: 10 });
  const prefElements = prefSearch.elements ?? [];
  console.log('    search por external_reference: elementos:', prefElements.length);

  console.log('\n[mp:utils-test] Concluído. Abra checkoutUrl no browser para testar pagamento sandbox.');
  console.log('    payer.email:', payerEmail);

  process.exit(0);
}

main().catch((err) => {
  console.error('[mp:utils-test] Erro:', err?.message ?? err);
  process.exit(1);
});
