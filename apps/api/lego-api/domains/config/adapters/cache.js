/**
 * In-Memory Feature Flag Cache (WISH-2009 - AC17)
 *
 * Simple Map-based cache with TTL.
 * MVP implementation - can be replaced with Redis adapter later.
 */
/**
 * Create an in-memory feature flag cache
 */
export function createInMemoryCache() {
    // Cache structure: environment -> { flags: Map<flagKey, FeatureFlag>, expiresAt: number }
    const cache = new Map();
    return {
        /**
         * Get all cached flags for an environment
         * Returns null if cache miss or expired
         */
        get(environment) {
            const cached = cache.get(environment);
            // Cache miss
            if (!cached) {
                return null;
            }
            // Check expiration
            if (Date.now() > cached.expiresAt) {
                // Expired - remove and return null
                cache.delete(environment);
                return null;
            }
            return cached;
        },
        /**
         * Set all flags for an environment with TTL
         */
        set(environment, flags, ttlMs) {
            const flagsMap = new Map();
            for (const flag of flags) {
                flagsMap.set(flag.flagKey, flag);
            }
            cache.set(environment, {
                flags: flagsMap,
                expiresAt: Date.now() + ttlMs,
            });
        },
        /**
         * Get a single cached flag
         * Returns null if cache miss or expired
         */
        getFlag(environment, flagKey) {
            const cached = this.get(environment);
            if (!cached) {
                return null;
            }
            return cached.flags.get(flagKey) ?? null;
        },
        /**
         * Invalidate cache for an environment
         */
        invalidate(environment) {
            cache.delete(environment);
        },
        /**
         * Invalidate all caches
         */
        invalidateAll() {
            cache.clear();
        },
    };
}
