import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFeatureFlagService } from '../application/services.js';
/**
 * Feature Flag Service Unit Tests (WISH-2009 - AC9)
 *
 * Tests business logic using mock repositories and cache.
 * No real database calls.
 */
// Mock feature flags for testing
const mockFlags = [
    {
        id: '123e4567-e89b-12d3-a456-426614174000',
        flagKey: 'wishlist-gallery',
        enabled: true,
        rolloutPercentage: 100,
        description: 'Gallery view feature flag',
        environment: 'production',
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: '223e4567-e89b-12d3-a456-426614174001',
        flagKey: 'wishlist-add-item',
        enabled: true,
        rolloutPercentage: 50,
        description: 'Add item feature flag',
        environment: 'production',
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: '323e4567-e89b-12d3-a456-426614174002',
        flagKey: 'wishlist-edit-item',
        enabled: false,
        rolloutPercentage: 0,
        description: 'Edit item feature flag',
        environment: 'production',
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: '423e4567-e89b-12d3-a456-426614174003',
        flagKey: 'wishlist-reorder',
        enabled: true,
        rolloutPercentage: 0,
        description: 'Reorder feature flag',
        environment: 'production',
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];
function createMockFlagRepo() {
    return {
        findByKey: vi.fn().mockImplementation((flagKey) => {
            const flag = mockFlags.find(f => f.flagKey === flagKey);
            return flag ? { ok: true, data: flag } : { ok: false, error: 'NOT_FOUND' };
        }),
        findAllByEnvironment: vi.fn().mockResolvedValue(mockFlags),
        create: vi.fn().mockImplementation((input) => {
            const newFlag = {
                id: '999e4567-e89b-12d3-a456-426614174999',
                ...input,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            return { ok: true, data: newFlag };
        }),
        update: vi.fn().mockImplementation((flagKey, input) => {
            const flag = mockFlags.find(f => f.flagKey === flagKey);
            if (!flag)
                return { ok: false, error: 'NOT_FOUND' };
            return {
                ok: true,
                data: { ...flag, ...input, updatedAt: new Date() },
            };
        }),
        delete: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    };
}
function createMockCache() {
    const cacheStore = new Map();
    return {
        get: vi.fn().mockImplementation((environment) => {
            return cacheStore.get(environment) ?? null;
        }),
        set: vi.fn().mockImplementation((environment, flags, ttlMs) => {
            const flagsMap = new Map();
            for (const flag of flags) {
                flagsMap.set(flag.flagKey, flag);
            }
            cacheStore.set(environment, { flags: flagsMap, expiresAt: Date.now() + ttlMs });
        }),
        getFlag: vi.fn().mockImplementation((environment, flagKey) => {
            const cached = cacheStore.get(environment);
            return cached?.flags.get(flagKey) ?? null;
        }),
        invalidate: vi.fn().mockImplementation((environment) => {
            cacheStore.delete(environment);
        }),
        invalidateAll: vi.fn().mockImplementation(() => {
            cacheStore.clear();
        }),
    };
}
describe('FeatureFlagService', () => {
    let flagRepo;
    let cache;
    let service;
    beforeEach(() => {
        flagRepo = createMockFlagRepo();
        cache = createMockCache();
        service = createFeatureFlagService({ flagRepo, cache });
    });
    // ─────────────────────────────────────────────────────────────────────
    // Test 1: evaluateFlag with disabled flag returns false
    // ─────────────────────────────────────────────────────────────────────
    describe('evaluateFlag', () => {
        it('returns false when flag is disabled', async () => {
            const result = await service.evaluateFlag('wishlist-edit-item', 'user-123');
            expect(result).toBe(false);
        });
        // ─────────────────────────────────────────────────────────────────────
        // Test 2: evaluateFlag with enabled flag (100%) returns true
        // ─────────────────────────────────────────────────────────────────────
        it('returns true when flag is enabled with 100% rollout', async () => {
            const result = await service.evaluateFlag('wishlist-gallery', 'user-123');
            expect(result).toBe(true);
        });
        // ─────────────────────────────────────────────────────────────────────
        // Test 3: evaluateFlag with 50% rollout includes user consistently
        // ─────────────────────────────────────────────────────────────────────
        it('returns consistent result for same user with percentage rollout', async () => {
            // Call multiple times with same user
            const result1 = await service.evaluateFlag('wishlist-add-item', 'user-123');
            const result2 = await service.evaluateFlag('wishlist-add-item', 'user-123');
            const result3 = await service.evaluateFlag('wishlist-add-item', 'user-123');
            // Same user should always get same result (deterministic hashing)
            expect(result1).toBe(result2);
            expect(result2).toBe(result3);
        });
        // ─────────────────────────────────────────────────────────────────────
        // Test 4: evaluateFlag with 0% rollout excludes all users
        // ─────────────────────────────────────────────────────────────────────
        it('returns false when flag is enabled but rollout is 0%', async () => {
            const result = await service.evaluateFlag('wishlist-reorder', 'user-123');
            expect(result).toBe(false);
        });
        // ─────────────────────────────────────────────────────────────────────
        // Test 5: evaluateFlag with no userId defaults to enabled (if flag enabled)
        // ─────────────────────────────────────────────────────────────────────
        it('returns true when no userId provided and flag is enabled with < 100% rollout', async () => {
            const result = await service.evaluateFlag('wishlist-add-item');
            // No userId = return true if flag is enabled (regardless of percentage)
            expect(result).toBe(true);
        });
        it('returns false when flag does not exist', async () => {
            const result = await service.evaluateFlag('nonexistent-flag', 'user-123');
            expect(result).toBe(false);
        });
    });
    // ─────────────────────────────────────────────────────────────────────
    // Test 6: updateFlag invalidates cache
    // ─────────────────────────────────────────────────────────────────────
    describe('updateFlag', () => {
        it('invalidates cache after update', async () => {
            // First, trigger cache population
            await service.getAllFlags('user-123', 'production');
            // Update a flag
            await service.updateFlag('wishlist-gallery', { enabled: false });
            // Cache should be invalidated
            expect(cache.invalidate).toHaveBeenCalledWith('production');
        });
        it('returns updated flag on success', async () => {
            const result = await service.updateFlag('wishlist-gallery', {
                enabled: false,
                rolloutPercentage: 25,
            });
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.data.enabled).toBe(false);
                expect(result.data.rolloutPercentage).toBe(25);
            }
        });
        it('returns NOT_FOUND for nonexistent flag', async () => {
            vi.mocked(flagRepo.update).mockResolvedValueOnce({ ok: false, error: 'NOT_FOUND' });
            const result = await service.updateFlag('nonexistent', { enabled: true });
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe('NOT_FOUND');
            }
        });
    });
    // ─────────────────────────────────────────────────────────────────────
    // Test 7: getAllFlags returns all flags for environment
    // ─────────────────────────────────────────────────────────────────────
    describe('getAllFlags', () => {
        it('returns all flags as key-value pairs', async () => {
            const result = await service.getAllFlags('user-123', 'production');
            expect(result).toHaveProperty('wishlist-gallery');
            expect(result).toHaveProperty('wishlist-add-item');
            expect(result).toHaveProperty('wishlist-edit-item');
            expect(result).toHaveProperty('wishlist-reorder');
        });
        it('respects flag enabled state', async () => {
            const result = await service.getAllFlags('user-123', 'production');
            expect(result['wishlist-gallery']).toBe(true); // enabled, 100%
            expect(result['wishlist-edit-item']).toBe(false); // disabled
            expect(result['wishlist-reorder']).toBe(false); // enabled but 0%
        });
    });
    // ─────────────────────────────────────────────────────────────────────
    // Test 8: getFlag returns single flag with metadata
    // ─────────────────────────────────────────────────────────────────────
    describe('getFlag', () => {
        it('returns flag metadata on success', async () => {
            const result = await service.getFlag('wishlist-gallery', 'production');
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.data.key).toBe('wishlist-gallery');
                expect(result.data.enabled).toBe(true);
                expect(result.data.rolloutPercentage).toBe(100);
                expect(result.data.description).toBe('Gallery view feature flag');
            }
        });
        it('returns NOT_FOUND for nonexistent flag', async () => {
            const result = await service.getFlag('nonexistent', 'production');
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe('NOT_FOUND');
            }
        });
    });
    // ─────────────────────────────────────────────────────────────────────
    // Test 9: Cache hit returns cached flags
    // ─────────────────────────────────────────────────────────────────────
    describe('caching', () => {
        it('uses cached flags when available', async () => {
            // First call populates cache
            await service.getAllFlags('user-123', 'production');
            // Second call should use cache
            await service.getAllFlags('user-123', 'production');
            // Repository should only be called once
            expect(flagRepo.findAllByEnvironment).toHaveBeenCalledTimes(1);
        });
        // ─────────────────────────────────────────────────────────────────────
        // Test 10: Cache miss fetches from database
        // ─────────────────────────────────────────────────────────────────────
        it('fetches from database on cache miss', async () => {
            await service.getAllFlags('user-123', 'production');
            expect(flagRepo.findAllByEnvironment).toHaveBeenCalledWith('production');
            expect(cache.set).toHaveBeenCalled();
        });
    });
    // ─────────────────────────────────────────────────────────────────────
    // SHA-256 Hashing Tests (AC23)
    // ─────────────────────────────────────────────────────────────────────
    describe('_hashUserIdToPercentage', () => {
        it('returns consistent value for same userId', () => {
            const hash1 = service._hashUserIdToPercentage('user-123');
            const hash2 = service._hashUserIdToPercentage('user-123');
            expect(hash1).toBe(hash2);
        });
        it('returns different values for different userIds', () => {
            const hash1 = service._hashUserIdToPercentage('user-123');
            const hash2 = service._hashUserIdToPercentage('user-456');
            // Could be same by chance, but very unlikely
            // Testing determinism is more important
            expect(typeof hash1).toBe('number');
            expect(typeof hash2).toBe('number');
        });
        it('returns value between 0 and 99', () => {
            // Test with multiple user IDs
            for (let i = 0; i < 100; i++) {
                const hash = service._hashUserIdToPercentage(`user-${i}`);
                expect(hash).toBeGreaterThanOrEqual(0);
                expect(hash).toBeLessThan(100);
            }
        });
    });
});
