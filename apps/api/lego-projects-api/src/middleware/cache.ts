import { Request, Response, NextFunction } from 'express';
import { cacheUtils, CACHE_TTL } from '../utils/redis';

// Cache middleware options
interface CacheOptions {
  ttl?: number;
  key?: string | ((req: Request) => string);
  condition?: (req: Request) => boolean;
  invalidatePattern?: string;
}

// Default cache options
const defaultCacheOptions: Required<CacheOptions> = {
  ttl: CACHE_TTL.MEDIUM,
  key: (req: Request) => `${req.method}:${req.originalUrl}`,
  condition: () => true,
  invalidatePattern: '',
};

// Cache middleware factory
export const createCacheMiddleware = (options: CacheOptions = {}) => {
  const finalOptions = { ...defaultCacheOptions, ...options };

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Check if caching should be skipped
    if (!finalOptions.condition(req)) {
      return next();
    }

    // Generate cache key
    const cacheKey =
      typeof finalOptions.key === 'function' ? finalOptions.key(req) : finalOptions.key;

    try {
      // Try to get cached response
      const cached = await cacheUtils.get(cacheKey);

      if (cached !== null) {
        return res.json(cached);
      }

      // Store original send method
      const originalSend = res.json;

      // Override send method to cache response
      res.json = function (data: any) {
        // Cache the response
        cacheUtils.set(cacheKey, data, finalOptions.ttl).catch((err) => {
          console.error('Failed to cache response:', err);
        });

        // Call original send method
        return originalSend.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

// Cache invalidation middleware
export const createCacheInvalidationMiddleware = (pattern: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original send method
    const originalSend = res.json;

    // Override send method to invalidate cache after successful operation
    res.json = function (data: any) {
      // Invalidate cache after successful operation
      cacheUtils.invalidatePattern(pattern).catch((err) => {
        console.error('Failed to invalidate cache:', err);
      });

      // Call original send method
      return originalSend.call(this, data);
    };

    next();
  };
};

// Specific cache middlewares for different endpoints
export const galleryCache = createCacheMiddleware({
  ttl: CACHE_TTL.MEDIUM,
  key: (req: Request) => {
    const userId = req.user?.id || 'public';
    const { cursor, limit, albumId, search, tag, flagged, type } = req.query as Record<string, any>;
    return `gallery:${userId}:${cursor || 0}:${limit || 20}:${albumId || 'all'}:${tag || ''}:${flagged || ''}:${type || 'all'}:${search || ''}`;
  },
  condition: (req: Request) => req.method === 'GET',
});

export const galleryCacheInvalidation = createCacheInvalidationMiddleware('gallery:*');

export const mocCache = createCacheMiddleware({
  ttl: CACHE_TTL.LONG,
  key: (req: Request) => {
    const userId = req.user?.id || 'public';
    const { page, limit, search } = req.query;
    return `moc:${userId}:${page || 1}:${limit || 20}:${search || ''}`;
  },
  condition: (req: Request) => req.method === 'GET',
});

export const mocCacheInvalidation = createCacheInvalidationMiddleware('moc:*');

export const wishlistCache = createCacheMiddleware({
  ttl: CACHE_TTL.MEDIUM,
  key: (req: Request) => {
    const userId = req.user?.id || 'public';
    const { page, limit } = req.query;
    return `wishlist:${userId}:${page || 1}:${limit || 20}`;
  },
  condition: (req: Request) => req.method === 'GET',
});

export const wishlistCacheInvalidation = createCacheInvalidationMiddleware('wishlist:*');

export const profileCache = createCacheMiddleware({
  ttl: CACHE_TTL.LONG,
  key: (req: Request) => {
    const userId = req.user?.id || 'public';
    return `profile:${userId}`;
  },
  condition: (req: Request) => req.method === 'GET',
});

export const profileCacheInvalidation = createCacheInvalidationMiddleware('profile:*');

// Utility function to manually invalidate cache
export const invalidateCache = async (pattern: string) => {
  try {
    await cacheUtils.invalidatePattern(pattern);
    console.log(`Cache invalidated for pattern: ${pattern}`);
  } catch (error) {
    console.error(`Failed to invalidate cache for pattern ${pattern}:`, error);
  }
};

// Utility function to manually set cache
export const setCache = async (key: string, value: any, ttl: number = CACHE_TTL.MEDIUM) => {
  try {
    await cacheUtils.set(key, value, ttl);
    console.log(`Cache set for key: ${key}`);
  } catch (error) {
    console.error(`Failed to set cache for key ${key}:`, error);
  }
};

// Utility function to manually get cache
export const getCache = async <T = any>(key: string): Promise<T | null> => {
  try {
    return await cacheUtils.get<T>(key);
  } catch (error) {
    console.error(`Failed to get cache for key ${key}:`, error);
    return null;
  }
};
