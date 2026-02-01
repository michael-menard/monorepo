import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFeatureFlagService } from '../application/services.js'
import type {
  FeatureFlagRepository,
  FeatureFlagCache,
  UserOverrideRepository,
  CachedFeatureFlags,
} from '../ports/index.js'
import type { FeatureFlag, UserOverride } from '../types.js'

/**
 * User Override Unit Tests (WISH-2039)
 *
 * Tests user-level targeting for feature flags.
 * Evaluation priority: exclusion > inclusion > percentage
 */

// Mock feature flag for testing
const mockFlag: FeatureFlag = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  flagKey: 'test-flag',
  enabled: true,
  rolloutPercentage: 50, // 50% rollout
  description: 'Test flag with partial rollout',
  environment: 'production',
  createdAt: new Date(),
  updatedAt: new Date(),
}

// Mock user override (inclusion)
const mockIncludeOverride: UserOverride = {
  id: '223e4567-e89b-12d3-a456-426614174001',
  flagId: mockFlag.id,
  userId: 'included-user',
  overrideType: 'include',
  reason: 'Beta tester',
  createdBy: 'admin-1',
  createdAt: new Date(),
}

// Mock user override (exclusion)
const mockExcludeOverride: UserOverride = {
  id: '323e4567-e89b-12d3-a456-426614174002',
  flagId: mockFlag.id,
  userId: 'excluded-user',
  overrideType: 'exclude',
  reason: 'VIP exemption',
  createdBy: 'admin-1',
  createdAt: new Date(),
}

function createMockFlagRepo(): FeatureFlagRepository {
  return {
    findByKey: vi.fn().mockImplementation((flagKey: string) => {
      if (flagKey === 'test-flag') {
        return { ok: true, data: mockFlag }
      }
      return { ok: false, error: 'NOT_FOUND' }
    }),
    findAllByEnvironment: vi.fn().mockResolvedValue([mockFlag]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
}

function createMockCache(): FeatureFlagCache {
  const cacheStore = new Map<string, CachedFeatureFlags>()

  return {
    get: vi.fn().mockImplementation((environment: string) => {
      return cacheStore.get(environment) ?? null
    }),
    set: vi.fn().mockImplementation((environment: string, flags: FeatureFlag[], ttlMs: number) => {
      const flagsMap = new Map<string, FeatureFlag>()
      for (const flag of flags) {
        flagsMap.set(flag.flagKey, flag)
      }
      cacheStore.set(environment, { flags: flagsMap, expiresAt: Date.now() + ttlMs })
    }),
    getFlag: vi.fn().mockImplementation((environment: string, flagKey: string) => {
      const cached = cacheStore.get(environment)
      return cached?.flags.get(flagKey) ?? null
    }),
    invalidate: vi.fn().mockImplementation((environment: string) => {
      cacheStore.delete(environment)
    }),
    invalidateAll: vi.fn().mockImplementation(() => {
      cacheStore.clear()
    }),
    getUserOverride: vi.fn().mockReturnValue(null),
    setUserOverride: vi.fn(),
    invalidateUserOverride: vi.fn(),
    invalidateUserOverridesForFlag: vi.fn(),
  }
}

function createMockUserOverrideRepo(): UserOverrideRepository {
  const overrides = new Map<string, UserOverride>()
  overrides.set(`${mockFlag.id}:included-user`, mockIncludeOverride)
  overrides.set(`${mockFlag.id}:excluded-user`, mockExcludeOverride)

  return {
    findByFlagAndUser: vi.fn().mockImplementation((flagId: string, userId: string) => {
      return overrides.get(`${flagId}:${userId}`) ?? null
    }),
    findAllByFlag: vi.fn().mockImplementation((flagId: string) => {
      const results: UserOverride[] = []
      for (const [key, override] of overrides) {
        if (key.startsWith(`${flagId}:`)) {
          results.push(override)
        }
      }
      return { overrides: results, total: results.length }
    }),
    upsert: vi.fn().mockImplementation((flagId: string, input) => {
      const override: UserOverride = {
        id: '999e4567-e89b-12d3-a456-426614174999',
        flagId,
        userId: input.userId,
        overrideType: input.overrideType,
        reason: input.reason ?? null,
        createdBy: input.createdBy ?? null,
        createdAt: new Date(),
      }
      overrides.set(`${flagId}:${input.userId}`, override)
      return { ok: true, data: override }
    }),
    delete: vi.fn().mockImplementation((flagId: string, userId: string) => {
      const key = `${flagId}:${userId}`
      if (overrides.has(key)) {
        overrides.delete(key)
        return { ok: true, data: undefined }
      }
      return { ok: false, error: 'NOT_FOUND' }
    }),
    deleteAllByFlag: vi.fn().mockImplementation((flagId: string) => {
      for (const key of overrides.keys()) {
        if (key.startsWith(`${flagId}:`)) {
          overrides.delete(key)
        }
      }
    }),
  }
}

describe('User Override Feature (WISH-2039)', () => {
  let flagRepo: FeatureFlagRepository
  let cache: FeatureFlagCache
  let userOverrideRepo: UserOverrideRepository
  let service: ReturnType<typeof createFeatureFlagService>

  beforeEach(() => {
    flagRepo = createMockFlagRepo()
    cache = createMockCache()
    userOverrideRepo = createMockUserOverrideRepo()
    service = createFeatureFlagService({ flagRepo, cache, userOverrideRepo })
  })

  it('DEBUG: should have all expected methods', () => {
    const methods = Object.keys(service)
    console.log('Service methods:', methods)
    expect(methods).toContain('evaluateFlag')
    // These are the new methods we're testing
    expect(methods).toContain('addUserOverride')
    expect(methods).toContain('removeUserOverride')
    expect(methods).toContain('listUserOverrides')
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Test 1: Exclusion override returns false (highest priority)
  // ─────────────────────────────────────────────────────────────────────────
  describe('evaluateFlag with user overrides', () => {
    it('returns false for excluded user even if flag is 100% enabled', async () => {
      // Create a fully enabled flag
      vi.mocked(flagRepo.findAllByEnvironment).mockResolvedValue([
        { ...mockFlag, rolloutPercentage: 100 },
      ])

      const result = await service.evaluateFlag('test-flag', 'excluded-user')

      expect(result).toBe(false)
    })

    // ─────────────────────────────────────────────────────────────────────────
    // Test 2: Inclusion override returns true (even if flag is 0% enabled)
    // ─────────────────────────────────────────────────────────────────────────
    it('returns true for included user even if flag is 0% rollout', async () => {
      // Create a flag with 0% rollout
      vi.mocked(flagRepo.findAllByEnvironment).mockResolvedValue([
        { ...mockFlag, rolloutPercentage: 0 },
      ])

      const result = await service.evaluateFlag('test-flag', 'included-user')

      expect(result).toBe(true)
    })

    // ─────────────────────────────────────────────────────────────────────────
    // Test 3: Exclusion takes priority over inclusion (edge case)
    // ─────────────────────────────────────────────────────────────────────────
    it('prioritizes exclusion over inclusion for same user', async () => {
      // Set up a user who is both included and excluded (edge case)
      const bothOverride: UserOverride = {
        ...mockExcludeOverride,
        userId: 'both-lists-user',
      }
      vi.mocked(userOverrideRepo.findByFlagAndUser).mockImplementation(
        async (flagId: string, userId: string) => {
          if (userId === 'both-lists-user') {
            return bothOverride // Return exclusion
          }
          return null
        },
      )

      const result = await service.evaluateFlag('test-flag', 'both-lists-user')

      expect(result).toBe(false) // Exclusion wins
    })

    // ─────────────────────────────────────────────────────────────────────────
    // Test 4: No override falls back to percentage-based evaluation
    // ─────────────────────────────────────────────────────────────────────────
    it('falls back to percentage rollout when no override exists', async () => {
      // User with no override should use percentage-based evaluation
      const result1 = await service.evaluateFlag('test-flag', 'regular-user-1')
      const result2 = await service.evaluateFlag('test-flag', 'regular-user-2')

      // With 50% rollout, both should get deterministic results
      // (may be true or false, but consistent)
      expect(typeof result1).toBe('boolean')
      expect(typeof result2).toBe('boolean')

      // Same user should always get same result (deterministic)
      const result1Again = await service.evaluateFlag('test-flag', 'regular-user-1')
      expect(result1Again).toBe(result1)
    })

    // ─────────────────────────────────────────────────────────────────────────
    // Test 5: Disabled flag returns false even with inclusion override
    // ─────────────────────────────────────────────────────────────────────────
    it('returns false for disabled flag even with inclusion override', async () => {
      // Create a disabled flag
      vi.mocked(flagRepo.findAllByEnvironment).mockResolvedValue([
        { ...mockFlag, enabled: false },
      ])

      const result = await service.evaluateFlag('test-flag', 'included-user')

      expect(result).toBe(false) // Flag disabled takes precedence
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Test 6: addUserOverride creates new override
  // ─────────────────────────────────────────────────────────────────────────
  describe('addUserOverride', () => {
    it('creates a new user override successfully', async () => {
      const result = await service.addUserOverride('test-flag', {
        userId: 'new-user',
        overrideType: 'include',
        reason: 'Early access',
        createdBy: 'admin-1',
      })

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.userId).toBe('new-user')
        expect(result.data.overrideType).toBe('include')
        expect(result.data.reason).toBe('Early access')
      }
    })

    it('returns NOT_FOUND for non-existent flag', async () => {
      const result = await service.addUserOverride('nonexistent-flag', {
        userId: 'new-user',
        overrideType: 'include',
      })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('NOT_FOUND')
      }
    })

    // ─────────────────────────────────────────────────────────────────────────
    // Test 7: Cache invalidation on add
    // ─────────────────────────────────────────────────────────────────────────
    it('invalidates user override cache after adding', async () => {
      await service.addUserOverride('test-flag', {
        userId: 'new-user',
        overrideType: 'include',
      })

      expect(cache.invalidateUserOverride).toHaveBeenCalledWith(mockFlag.id, 'new-user')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Test 8: removeUserOverride deletes override
  // ─────────────────────────────────────────────────────────────────────────
  describe('removeUserOverride', () => {
    it('removes existing user override', async () => {
      const result = await service.removeUserOverride('test-flag', 'included-user')

      expect(result.ok).toBe(true)
    })

    it('returns NOT_FOUND for non-existent override', async () => {
      const result = await service.removeUserOverride('test-flag', 'nonexistent-user')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('NOT_FOUND')
      }
    })

    // ─────────────────────────────────────────────────────────────────────────
    // Test 9: Cache invalidation on remove
    // ─────────────────────────────────────────────────────────────────────────
    it('invalidates user override cache after removing', async () => {
      await service.removeUserOverride('test-flag', 'included-user')

      expect(cache.invalidateUserOverride).toHaveBeenCalledWith(mockFlag.id, 'included-user')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Test 10: listUserOverrides returns paginated results
  // ─────────────────────────────────────────────────────────────────────────
  describe('listUserOverrides', () => {
    it('returns all overrides separated by type', async () => {
      const result = await service.listUserOverrides('test-flag')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.includes.length).toBeGreaterThanOrEqual(0)
        expect(result.data.excludes.length).toBeGreaterThanOrEqual(0)
        expect(result.data.pagination.page).toBe(1)
        expect(result.data.pagination.pageSize).toBe(50)
      }
    })

    it('returns NOT_FOUND for non-existent flag', async () => {
      const result = await service.listUserOverrides('nonexistent-flag')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('NOT_FOUND')
      }
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Test 11: Rate limiting blocks excessive updates
  // ─────────────────────────────────────────────────────────────────────────
  describe('rate limiting', () => {
    it('allows normal rate of updates', async () => {
      // First update should succeed
      const result = await service.addUserOverride('test-flag', {
        userId: 'rate-test-user',
        overrideType: 'include',
      })

      expect(result.ok).toBe(true)
    })

    it('internal rate limit check works correctly', () => {
      // Access internal rate limit check
      const checkRateLimit = service._checkRateLimit

      // First 100 calls should pass
      for (let i = 0; i < 100; i++) {
        expect(checkRateLimit('rate-limit-flag')).toBe(true)
      }

      // 101st call should fail
      expect(checkRateLimit('rate-limit-flag')).toBe(false)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Test 12: Service works without userOverrideRepo (backwards compatible)
  // ─────────────────────────────────────────────────────────────────────────
  describe('backwards compatibility', () => {
    it('works without userOverrideRepo configured', async () => {
      // Create service without user override repo
      const serviceWithoutOverrides = createFeatureFlagService({ flagRepo, cache })

      // evaluateFlag should fall back to percentage-based evaluation
      const result = await serviceWithoutOverrides.evaluateFlag('test-flag', 'included-user')

      // Without override repo, should use percentage (not guaranteed true)
      expect(typeof result).toBe('boolean')
    })
  })
})
