import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

let redisClient: Redis | null = null;
let isRedisAvailable = false;

// L1 In-Memory High-Speed Cache Layer (Sub-millisecond access)
interface MemoryCacheItem {
  data: any;
  expiresAt: number;
}
const memoryCache = new Map<string, MemoryCacheItem>();

const cleanMemoryCache = () => {
  const now = Date.now();
  for (const [key, item] of memoryCache.entries()) {
    if (item.expiresAt > 0 && item.expiresAt <= now) {
      memoryCache.delete(key);
    }
  }
};
// Periodically purge stale L1 cache entries every 60s
setInterval(cleanMemoryCache, 60000).unref();

try {
  redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 5) {
        return null;
      }
      return Math.min(times * 200, 2000);
    },
    lazyConnect: false,
    enableReadyCheck: true,
  });

  redisClient.on("connect", () => {
    isRedisAvailable = true;
    console.log("[Redis] Connected successfully to", REDIS_URL.replace(/:\/\/.*@/, "://***@"));
  });

  redisClient.on("ready", () => {
    isRedisAvailable = true;
  });

  redisClient.on("error", (err) => {
    isRedisAvailable = false;
    console.warn(`[Redis] Connection warning: ${err.message}. Fallback to L1 in-memory / DB direct.`);
  });

  redisClient.on("close", () => {
    isRedisAvailable = false;
  });
} catch (error: any) {
  console.warn(`[Redis] Initialization warning: ${error?.message || error}. Continuing with DB direct.`);
  redisClient = null;
  isRedisAvailable = false;
}

export const getRedisClient = (): Redis | null => {
  return isRedisAvailable ? redisClient : null;
};

/**
 * Retrieve JSON cached item (L1 in-memory -> L2 Redis)
 */
export const getCache = async <T>(key: string): Promise<T | null> => {
  const now = Date.now();

  // 1. Check L1 Memory Cache (0.05ms)
  const memItem = memoryCache.get(key);
  if (memItem) {
    if (memItem.expiresAt === 0 || memItem.expiresAt > now) {
      return memItem.data as T;
    }
    memoryCache.delete(key);
  }

  // 2. Check L2 Redis Cache
  if (!isRedisAvailable || !redisClient) return null;
  try {
    const raw = await redisClient.get(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as T;

    // Populate L1 cache for subsequent instantaneous reads
    memoryCache.set(key, {
      data: parsed,
      expiresAt: now + 60 * 1000, // 1 min in L1
    });

    return parsed;
  } catch (err) {
    console.warn(`[Redis] getCache error for key ${key}:`, err);
    return null;
  }
};

/**
 * Set JSON cached item with optional TTL (default 180 seconds = 3 mins for active hot data)
 */
export const setCache = async (key: string, data: any, ttlSeconds = 180): Promise<void> => {
  const expiresAt = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0;

  // 1. Set L1 Memory Cache
  memoryCache.set(key, { data, expiresAt });

  // 2. Set L2 Redis Cache
  if (!isRedisAvailable || !redisClient) return;
  try {
    const value = JSON.stringify(data);
    if (ttlSeconds > 0) {
      await redisClient.set(key, value, "EX", ttlSeconds);
    } else {
      await redisClient.set(key, value);
    }
  } catch (err) {
    console.warn(`[Redis] setCache error for key ${key}:`, err);
  }
};

/**
 * Delete a specific cache key
 */
export const delCache = async (key: string): Promise<void> => {
  memoryCache.delete(key);
  if (!isRedisAvailable || !redisClient) return;
  try {
    await redisClient.del(key);
  } catch (err) {
    console.warn(`[Redis] delCache error for key ${key}:`, err);
  }
};

/**
 * Invalidate cache keys by pattern (e.g. "cache:schedules:*")
 */
export const delCacheByPattern = async (pattern: string): Promise<void> => {
  // Clear L1 memory keys matching prefix/regex pattern
  const regexPattern = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
  for (const key of memoryCache.keys()) {
    if (regexPattern.test(key)) {
      memoryCache.delete(key);
    }
  }

  // Clear L2 Redis keys
  if (!isRedisAvailable || !redisClient) return;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch (err) {
    console.warn(`[Redis] delCacheByPattern error for pattern ${pattern}:`, err);
  }
};

/**
 * Invalidate showtime seat specific cache keys
 */
export const invalidateScheduleSeatCache = async (scheduleId?: string): Promise<void> => {
  try {
    if (scheduleId) {
      await delCacheByPattern(`cache:schedule_seats:${scheduleId}*`);
    } else {
      await delCacheByPattern("cache:schedule_seats:*");
    }
  } catch (err) {
    console.warn("[Redis] invalidateScheduleSeatCache error:", err);
  }
};

/**
 * Invalidate all schedule and seat cache keys
 */
export const invalidateScheduleCache = async (scheduleId?: string): Promise<void> => {
  try {
    await delCacheByPattern("cache:schedules:*");
    await delCacheByPattern("cache:movies:schedules:*");
    if (scheduleId) {
      await delCache(`cache:schedule:${scheduleId}`);
      await invalidateScheduleSeatCache(scheduleId);
    } else {
      await delCacheByPattern("cache:schedule:*");
      await invalidateScheduleSeatCache();
    }
  } catch (err) {
    console.warn("[Redis] invalidateScheduleCache error:", err);
  }
};
