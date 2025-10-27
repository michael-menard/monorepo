import { z } from 'zod'

// Cache configuration schema
export const CacheConfigSchema = z.object({
  maxAge: z
    .number()
    .positive()
    .default(5 * 60 * 1000), // 5 minutes default
  maxSize: z.number().positive().default(100), // 100 items default
  storage: z.enum(['memory', 'localStorage', 'sessionStorage', 'cache']).default('memory'),
  keyPrefix: z.string().default('cache_'),
  compress: z.boolean().default(false),
  encrypt: z.boolean().default(false),
})

// Cache entry schema
export const CacheEntrySchema = z.object({
  key: z.string(),
  data: z.unknown(),
  timestamp: z.number(),
  expiresAt: z.number().optional(),
  size: z.number().optional(),
  hits: z.number().default(0),
  lastAccessed: z.number(),
})

// Cache statistics schema
export const CacheStatsSchema = z.object({
  hits: z.number(),
  misses: z.number(),
  size: z.number(),
  maxSize: z.number(),
  hitRate: z.number(),
  averageAge: z.number(),
  oldestEntry: z.number().optional(),
  newestEntry: z.number().optional(),
})

// Image cache entry schema
export const ImageCacheEntrySchema = z.object({
  url: z.string().url(),
  dataUrl: z.string(),
  timestamp: z.number(),
  expiresAt: z.number().optional(),
  size: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  format: z.string().optional(),
})

// RTK Query cache configuration schema
export const RTKQueryCacheConfigSchema = z.object({
  keepUnusedDataFor: z.number().positive().default(60), // 60 seconds default
  refetchOnMountOrArgChange: z.boolean().default(false),
  refetchOnFocus: z.boolean().default(true),
  refetchOnReconnect: z.boolean().default(true),
  pollingInterval: z.number().positive().optional(),
  skip: z.boolean().default(false),
})

// Type exports
export type CacheConfig = z.infer<typeof CacheConfigSchema>
export type CacheEntry = z.infer<typeof CacheEntrySchema>
export type CacheStats = z.infer<typeof CacheStatsSchema>
export type ImageCacheEntry = z.infer<typeof ImageCacheEntrySchema>
export type RTKQueryCacheConfig = z.infer<typeof RTKQueryCacheConfigSchema>
