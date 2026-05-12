/**
 * Testa POST https://api.mercadopago.com/oauth/token (client_credentials).
 * Uso: preencha MERCADOPAGO_CLIENT_ID e MERCADOPAGO_CLIENT_SECRET no .env
 *       npm run mp:oauth-test
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  isMercadoPagoOAuthConfigured,
  requestMercadoPagoClientCredentialsToken,
} from '../src/utils/mercadopago/oauth.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
dotenv.config({ path: path.join(root, '.env.example') });
dotenv.config({ path: path.join(root, '.env'), override: true });

function maskToken(t: string): string {
  if (t.length <= 16) return `${t.slice(0, 6)}…`;
  return `${t.slice(0, 12)}…${t.slice(-8)}`;
}

async function main() {
  if (!isMercadoPagoOAuthConfigured()) {
    console.error(
      '[mp:oauth-test] Defina MERCADOPAGO_CLIENT_ID e MERCADOPAGO_CLIENT_SECRET no arquivo .env (não commite segredos).'
    );
    process.exit(1);
  }

  try {
    const data = await requestMercadoPagoClientCredentialsToken();
    console.log('[mp:oauth-test] Sucesso.');
    console.log('  token_type:', data.token_type ?? '(n/d)');
    console.log('  expires_in:', data.expires_in ?? '(n/d)');
    console.log('  live_mode:', data.live_mode ?? '(n/d)');
    console.log('  user_id:', data.user_id ?? '(n/d)');
    if (data.access_token) {
      console.log('  access_token:', maskToken(data.access_token), '(mascarado)');
    }
    process.exit(0);
  } catch (e: unknown) {
    console.error('[mp:oauth-test] Falha:', e instanceof Error ? e.message : e);
    if (e && typeof e === 'object' && 'body' in e) {
      console.error('  detalhe:', JSON.stringify((e as { body: unknown }).body));
    }
    process.exit(1);
  }
}

main();
