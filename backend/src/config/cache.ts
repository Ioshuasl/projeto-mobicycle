import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const isProd = process.env.NODE_ENV === 'production';

export const redisClient = createClient({
  url: redisUrl,
  socket: {
    connectTimeout: isProd ? 10_000 : 2_500,
    reconnectStrategy: isProd ? undefined : () => false,
  },
});

redisClient.on('error', (err) => {
  if (redisClient.isOpen) console.error('Redis Client Error', err);
});

/**
 * Em produção: conexão obrigatória (lança se falhar).
 * Em desenvolvimento: opcional — retorna false e o servidor usa rate limit em memória.
 * REDIS_DISABLED=1: não conecta (apenas fora de produção).
 */
export async function connectRedis(): Promise<boolean> {
  if (process.env.REDIS_DISABLED === '1') {
    if (isProd) {
      throw new Error('REDIS_DISABLED=1 cannot be used in production');
    }
    console.warn('[Redis] Skipped (REDIS_DISABLED=1). Rate limits use in-memory store.');
    return false;
  }
  if (redisClient.isOpen) return true;

  try {
    await redisClient.connect();
    console.log('[Redis] Connected successfully');
    return true;
  } catch (err) {
    if (isProd) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[Redis] Unavailable in development — rate limits use in-memory store.', msg);
    return false;
  }
}
