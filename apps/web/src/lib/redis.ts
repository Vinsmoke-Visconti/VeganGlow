import { Redis } from '@upstash/redis'

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl || !redisToken) {
  console.warn('Warning: Upstash Redis environment variables are missing. Caching will be disabled.');
}

// Create client only if variables exist, otherwise create a proxy that logs errors but doesn't crash
export const redis = (redisUrl && redisToken) 
  ? new Redis({ url: redisUrl, token: redisToken })
  : new Proxy({} as Redis, {
      get: () => () => {
        console.warn('Redis command called but client is not configured.');
        return null;
      }
    });

// Helper functions for common patterns
export const cacheSet = async <T>(key: string, value: T, exSeconds: number = 3600) => {
  try {
    await redis.set(key, JSON.stringify(value), { ex: exSeconds })
  } catch (error) {
    console.error('Redis cacheSet error:', error)
  }
}

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  try {
    const data = await redis.get(key)
    if (!data) return null
    return typeof data === 'string' ? (JSON.parse(data) as T) : (data as T)
  } catch (error) {
    console.error('Redis cacheGet error:', error)
    return null
  }
}

export const cacheDelete = async (key: string | string[]) => {
  try {
    const keys = Array.isArray(key) ? key : [key]
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch (error) {
    console.error('Redis cacheDelete error:', error)
  }
}
