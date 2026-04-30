import { Redis } from '@upstash/redis'

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.warn('Warning: Upstash Redis environment variables are missing. Caching will be disabled.')
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
})

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
