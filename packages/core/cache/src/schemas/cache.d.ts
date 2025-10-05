import { z } from 'zod';
export declare const CacheConfigSchema: z.ZodObject<{
    maxAge: z.ZodDefault<z.ZodNumber>;
    maxSize: z.ZodDefault<z.ZodNumber>;
    storage: z.ZodDefault<z.ZodEnum<["memory", "localStorage", "sessionStorage", "cache"]>>;
    keyPrefix: z.ZodDefault<z.ZodString>;
    compress: z.ZodDefault<z.ZodBoolean>;
    encrypt: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    maxAge: number;
    maxSize: number;
    storage: "memory" | "localStorage" | "sessionStorage" | "cache";
    keyPrefix: string;
    compress: boolean;
    encrypt: boolean;
}, {
    maxAge?: number | undefined;
    maxSize?: number | undefined;
    storage?: "memory" | "localStorage" | "sessionStorage" | "cache" | undefined;
    keyPrefix?: string | undefined;
    compress?: boolean | undefined;
    encrypt?: boolean | undefined;
}>;
export declare const CacheEntrySchema: z.ZodObject<{
    key: z.ZodString;
    data: z.ZodUnknown;
    timestamp: z.ZodNumber;
    expiresAt: z.ZodOptional<z.ZodNumber>;
    size: z.ZodOptional<z.ZodNumber>;
    hits: z.ZodDefault<z.ZodNumber>;
    lastAccessed: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    key: string;
    timestamp: number;
    hits: number;
    lastAccessed: number;
    size?: number | undefined;
    data?: unknown;
    expiresAt?: number | undefined;
}, {
    key: string;
    timestamp: number;
    lastAccessed: number;
    size?: number | undefined;
    data?: unknown;
    expiresAt?: number | undefined;
    hits?: number | undefined;
}>;
export declare const CacheStatsSchema: z.ZodObject<{
    hits: z.ZodNumber;
    misses: z.ZodNumber;
    size: z.ZodNumber;
    maxSize: z.ZodNumber;
    hitRate: z.ZodNumber;
    averageAge: z.ZodNumber;
    oldestEntry: z.ZodOptional<z.ZodNumber>;
    newestEntry: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    size: number;
    maxSize: number;
    hits: number;
    misses: number;
    hitRate: number;
    averageAge: number;
    oldestEntry?: number | undefined;
    newestEntry?: number | undefined;
}, {
    size: number;
    maxSize: number;
    hits: number;
    misses: number;
    hitRate: number;
    averageAge: number;
    oldestEntry?: number | undefined;
    newestEntry?: number | undefined;
}>;
export declare const ImageCacheEntrySchema: z.ZodObject<{
    url: z.ZodString;
    dataUrl: z.ZodString;
    timestamp: z.ZodNumber;
    expiresAt: z.ZodOptional<z.ZodNumber>;
    size: z.ZodNumber;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    format: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    size: number;
    url: string;
    timestamp: number;
    dataUrl: string;
    height?: number | undefined;
    width?: number | undefined;
    expiresAt?: number | undefined;
    format?: string | undefined;
}, {
    size: number;
    url: string;
    timestamp: number;
    dataUrl: string;
    height?: number | undefined;
    width?: number | undefined;
    expiresAt?: number | undefined;
    format?: string | undefined;
}>;
export declare const RTKQueryCacheConfigSchema: z.ZodObject<{
    keepUnusedDataFor: z.ZodDefault<z.ZodNumber>;
    refetchOnMountOrArgChange: z.ZodDefault<z.ZodBoolean>;
    refetchOnFocus: z.ZodDefault<z.ZodBoolean>;
    refetchOnReconnect: z.ZodDefault<z.ZodBoolean>;
    pollingInterval: z.ZodOptional<z.ZodNumber>;
    skip: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    keepUnusedDataFor: number;
    refetchOnMountOrArgChange: boolean;
    refetchOnFocus: boolean;
    refetchOnReconnect: boolean;
    skip: boolean;
    pollingInterval?: number | undefined;
}, {
    keepUnusedDataFor?: number | undefined;
    refetchOnMountOrArgChange?: boolean | undefined;
    refetchOnFocus?: boolean | undefined;
    refetchOnReconnect?: boolean | undefined;
    pollingInterval?: number | undefined;
    skip?: boolean | undefined;
}>;
export type CacheConfig = z.infer<typeof CacheConfigSchema>;
export type CacheEntry = z.infer<typeof CacheEntrySchema>;
export type CacheStats = z.infer<typeof CacheStatsSchema>;
export type ImageCacheEntry = z.infer<typeof ImageCacheEntrySchema>;
export type RTKQueryCacheConfig = z.infer<typeof RTKQueryCacheConfigSchema>;
//# sourceMappingURL=cache.d.ts.map