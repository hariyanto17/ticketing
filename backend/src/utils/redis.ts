import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

let redisClient: Redis | null = null;
let isRedisAvailable = false;

try {
  redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 5) {
        // Stop retrying after 5 attempts to avoid log spam
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
    // Log once or quietly ignore to prevent crash
    console.warn(`[Redis] Connection warning: ${err.message}. Graceful fallback to database.`);
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
 * Retrieve JSON cached item
 */
export const getCache = async <T>(key: string): Promise<T | null> => {
  if (!isRedisAvailable || !redisClient) return null;
  try {
    const raw = await redisClient.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[Redis] getCache error for key ${key}:`, err);
    return null;
  }
};

/**
 * Set JSON cached item with optional TTL (default 180 seconds = 3 mins for active hot data)
 */
export const setCache = async (key: string, data: any, ttlSeconds = 180): Promise<void> => {
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
 * Invalidate all schedule and seat cache keys
 */
export const invalidateScheduleCache = async (scheduleId?: string): Promise<void> => {
  try {
    await delCacheByPattern("cache:schedules:*");
    await delCacheByPattern("cache:movies:schedules:*");
    if (scheduleId) {
      await delCache(`cache:schedule:${scheduleId}`);
      await delCache(`cache:schedule_seats:${scheduleId}`);
    } else {
      await delCacheByPattern("cache:schedule:*");
      await delCacheByPattern("cache:schedule_seats:*");
    }
  } catch (err) {
    console.warn("[Redis] invalidateScheduleCache error:", err);
  }
};
