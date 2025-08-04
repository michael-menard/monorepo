import { createClient } from 'redis';
import { z } from 'zod';

// Redis configuration schema
const RedisConfigSchema = z.object({
  url: z.string().default('redis://localhost:6379'),
  password: z.string().optional(),
  db: z.number().default(0),
  retryDelayOnFailover: z.number().default(100),
  maxRetriesPerRequest: z.number().default(3),
  enableReadyCheck: z.boolean().default(true),
  lazyConnect: z.boolean().default(true),
});

type RedisConfig = z.infer<typeof RedisConfigSchema>;

// Default configuration
const defaultConfig: RedisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
};

// Create Redis client
const createRedisClient = (config: Partial<RedisConfig> = {}) => {
  const finalConfig = RedisConfigSchema.parse({ ...defaultConfig, ...config });

  const client = createClient({
    url: finalConfig.url,
    password: finalConfig.password,
    database: finalConfig.db,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('Redis connection failed after 10 retries');
          return false;
        }
        return Math.min(retries * 100, 3000);
      },
    },
  });

  // Error handling
  client.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  client.on('connect', () => {
    console.log('Redis Client Connected');
  });

  client.on('ready', () => {
    console.log('Redis Client Ready');
  });

  client.on('end', () => {
    console.log('Redis Client Disconnected');
  });

  return client;
};

// Global Redis client instance
let redisClient: ReturnType<typeof createClient> | null = null;

// Get or create Redis client
export const getRedisClient = () => {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
};

// Connect to Redis
export const connectRedis = async () => {
  const client = getRedisClient();
  if (!client.isOpen) {
    try {
      await client.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }
  return client;
};

// Disconnect from Redis
export const disconnectRedis = async () => {
  if (redisClient && redisClient.isOpen) {
    await redisClient.disconnect();
    redisClient = null;
  }
};

// Cache utility functions
export const cacheUtils = {
  // Set cache with TTL
  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    const client = getRedisClient();
    if (!client.isOpen) {
      await client.connect();
    }

    const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
    await client.setEx(key, ttlSeconds, serializedValue);
  },

  // Get cache value
  async get<T = any>(key: string): Promise<T | null> {
    const client = getRedisClient();
    if (!client.isOpen) {
      await client.connect();
    }

    const value = await client.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  },

  // Delete cache key
  async del(key: string): Promise<void> {
    const client = getRedisClient();
    if (!client.isOpen) {
      await client.connect();
    }

    await client.del(key);
  },

  // Delete multiple cache keys by pattern
  async delPattern(pattern: string): Promise<void> {
    const client = getRedisClient();
    if (!client.isOpen) {
      await client.connect();
    }

    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  },

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    const client = getRedisClient();
    if (!client.isOpen) {
      await client.connect();
    }

    const result = await client.exists(key);
    return result === 1;
  },

  // Set cache if not exists
  async setNX(key: string, value: any, ttlSeconds: number = 3600): Promise<boolean> {
    const client = getRedisClient();
    if (!client.isOpen) {
      await client.connect();
    }

    const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
    const result = await client.setNX(key, serializedValue);

    if (result === 1 && ttlSeconds > 0) {
      await client.expire(key, ttlSeconds);
    }

    return result === 1;
  },

  // Get or set cache (cache-aside pattern)
  async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttlSeconds: number = 3600): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await fetchFn();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  },

  // Invalidate cache by pattern
  async invalidatePattern(pattern: string): Promise<void> {
    await this.delPattern(pattern);
  },

  // Generate cache key
  generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  },
};

// Cache key constants
export const CACHE_KEYS = {
  GALLERY: {
    ALL_IMAGES: 'gallery:images:all',
    USER_IMAGES: 'gallery:images:user',
    ALBUM: 'gallery:album',
    ALL_ALBUMS: 'gallery:albums:all',
    USER_ALBUMS: 'gallery:albums:user',
    SEARCH: 'gallery:search',
  },
  MOC: {
    ALL: 'moc:all',
    USER: 'moc:user',
    DETAIL: 'moc:detail',
    SEARCH: 'moc:search',
  },
  WISHLIST: {
    ALL: 'wishlist:all',
    USER: 'wishlist:user',
    ITEM: 'wishlist:item',
  },
  PROFILE: {
    USER: 'profile:user',
    AVATAR: 'profile:avatar',
  },
} as const;

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;

export default {
  getRedisClient,
  connectRedis,
  disconnectRedis,
  cacheUtils,
  CACHE_KEYS,
  CACHE_TTL,
};
