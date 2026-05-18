import rateLimit from 'express-rate-limit';
import { default as RedisStore } from 'rate-limit-redis';
import { redisClient } from '../config/cache.ts';

export type RateLimiters = {
  authLimiter: ReturnType<typeof rateLimit>;
  apiLimiter: ReturnType<typeof rateLimit>;
};

/**
 * S17: limites por IP — Redis em produção/cluster; em dev sem Redis usa store em memória.
 */
export function createRateLimiters(redisOk: boolean): RateLimiters {
  const authRedisStore = redisOk
    ? new RedisStore({
        sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      })
    : undefined;

  const apiRedisStore = redisOk
    ? new RedisStore({
        sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      })
    : undefined;

  const authLimiter = rateLimit({
    ...(authRedisStore ? { store: authRedisStore } : {}),
    windowMs: 15 * 60 * 1000,
    max: 15,
    message: { error: 'Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const apiLimiter = rateLimit({
    ...(apiRedisStore ? { store: apiRedisStore } : {}),
    windowMs: 60 * 1000,
    max: 120,
    message: { error: 'Limite de requisições excedido. Tente novamente em instantes.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  return { authLimiter, apiLimiter };
}
