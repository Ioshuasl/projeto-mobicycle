import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = createClient({ url: redisUrl });

redisClient.on('error', (err) => console.error('Redis Client Error', err));

export async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log('[Redis] Connected successfully');
  }
}

export async function cached<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  if (!redisClient.isOpen) return fn();
  
  const cachedValue = await redisClient.get(key);
  if (cachedValue) return JSON.parse(cachedValue.toString());
  
  const result = await fn();
  await redisClient.setEx(key, ttlSeconds, JSON.stringify(result));
  return result;
}

export async function invalidate(pattern: string) {
  if (!redisClient.isOpen) return;
  const keys = await redisClient.keys(pattern);
  if (keys.length > 0) {
    await redisClient.del(keys);
  }
}
