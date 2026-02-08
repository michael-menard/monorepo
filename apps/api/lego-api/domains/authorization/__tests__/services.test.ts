import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAuthorizationService } from '../application/services.js'
import type { UserQuotaRepository, UserAddonRepository } from '../ports/index.js'
import type { UserQuotaRow, Tier, ActiveAddon } from '../types.js'

/**
 * Authorization Service Unit Tests
 *
 * Tests business logic using mock repositories.
 * No real database calls.
 */

// Mock implementations
const mockQuotaRow: UserQuotaRow = {
  userId: 'user-123',
  tier: 'free-tier',
  mocsCount: 3,
  wishlistsCount: 1,
  galleriesCount: 0,
  setlistsCount: 0,
  storageUsedMb: 20,
  mocsLimit: 5,
  wishlistsLimit: 1,
  galleriesLimit: 0,
  setlistsLimit: 0,
  storageLimitMb: 50,
  chatHistoryDays: 7,
  isAdult: false,
  isSuspended: false,
  suspendedAt: null,
  suspendedReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockAdminQuotaRow: UserQuotaRow = {
  ...mockQuotaRow,
  userId: 'admin-123',
  tier: 'admin',
  mocsLimit: null,
  wishlistsLimit: null,
  galleriesLimit: null,
  setlistsLimit: null,
  storageLimitMb: null,
  chatHistoryDays: null,
}

const mockProQuotaRow: UserQuotaRow = {
  ...mockQuotaRow,
  userId: 'pro-user-123',
  tier: 'pro-tier',
  mocsCount: 10,
  galleriesCount: 5,
  mocsLimit: 100,
  wishlistsLimit: 20,
  galleriesLimit: 20,
  storageLimitMb: 1000,
  chatHistoryDays: 30,
  isAdult: true,
}

const mockAddons: ActiveAddon[] = [
  {
    type: 'extra-mocs',
    quantity: 10,
    expiresAt: null,
  },
]

function createMockQuotaRepo(overrides: Partial<UserQuotaRepository> = {}): UserQuotaRepository {
  return {
    findByUserId: vi.fn().mockResolvedValue({ ok: true, data: mockQuotaRow }),
    create: vi.fn().mockResolvedValue(mockQuotaRow),
    findOrCreate: vi.fn().mockResolvedValue(mockQuotaRow),
    reserveQuota: vi.fn().mockResolvedValue(true),
    releaseQuota: vi.fn().mockResolvedValue(undefined),
    updateStorageUsage: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    updateTier: vi.fn().mockResolvedValue({ ok: true, data: mockQuotaRow }),
    setAdultStatus: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    suspend: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    unsuspend: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    ...overrides,
  }
}

function createMockAddonRepo(overrides: Partial<UserAddonRepository> = {}): UserAddonRepository {
  return {
    findActiveByUserId: vi.fn().mockResolvedValue([]),
    findAllByUserId: vi.fn().mockResolvedValue([]),
    addAddon: vi.fn().mockResolvedValue({ userId: 'user-123', addonType: 'extra-mocs', quantity: 10, purchasedAt: new Date(), expiresAt: null, paymentReference: null, createdAt: new Date() }),
    removeAddon: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    cleanupExpired: vi.fn().mockResolvedValue(0),
    ...overrides,
  }
}

describe('AuthorizationService', () => {
  let quotaRepo: UserQuotaRepository
  let addonRepo: UserAddonRepository
  let service: ReturnType<typeof createAuthorizationService>

  beforeEach(() => {
    quotaRepo = createMockQuotaRepo()
    addonRepo = createMockAddonRepo()
    service = createAuthorizationService({ quotaRepo, addonRepo })
  })

  describe('getUserPermissions', () => {
    it('returns permissions for free-tier user', async () => {
      const permissions = await service.getUserPermissions('user-123')

      expect(permissions.userId).toBe('user-123')
      expect(permissions.tier).toBe('free-tier')
      expect(permissions.isAdmin).toBe(false)
      expect(permissions.features).toContain('moc')
      expect(permissions.features).toContain('wishlist')
      expect(permissions.features).toContain('profile')
      expect(permissions.features).not.toContain('gallery')
      expect(permissions.features).not.toContain('chat')
    })

    it('returns unlimited quotas for admin users', async () => {
      vi.mocked(quotaRepo.findOrCreate).mockResolvedValue(mockAdminQuotaRow)

      const permissions = await service.getUserPermissions('admin-123')

      expect(permissions.tier).toBe('admin')
      expect(permissions.isAdmin).toBe(true)
      expect(permissions.quotas.mocs.limit).toBeNull()
      expect(permissions.quotas.mocs.remaining).toBeNull()
    })

    it('includes features for pro-tier user', async () => {
      vi.mocked(quotaRepo.findOrCreate).mockResolvedValue(mockProQuotaRow)

      const permissions = await service.getUserPermissions('pro-user-123')

      expect(permissions.tier).toBe('pro-tier')
      expect(permissions.features).toContain('gallery')
      expect(permissions.features).toContain('chat')
      expect(permissions.features).toContain('reviews')
      expect(permissions.features).not.toContain('setlist')
    })

    it('calculates remaining quota correctly', async () => {
      const permissions = await service.getUserPermissions('user-123')

      expect(permissions.quotas.mocs.current).toBe(3)
      expect(permissions.quotas.mocs.limit).toBe(5)
      expect(permissions.quotas.mocs.remaining).toBe(2)
    })

    it('applies addon bonuses to limits', async () => {
      vi.mocked(addonRepo.findActiveByUserId).mockResolvedValue(mockAddons)

      const permissions = await service.getUserPermissions('user-123')

      // Base limit is 5, addon adds 10, so effective limit is 15
      expect(permissions.quotas.mocs.limit).toBe(15)
      expect(permissions.quotas.mocs.remaining).toBe(12) // 15 - 3
    })

    it('returns minimal permissions on error', async () => {
      vi.mocked(quotaRepo.findOrCreate).mockRejectedValue(new Error('DB error'))

      const permissions = await service.getUserPermissions('user-123')

      expect(permissions.tier).toBe('free-tier')
      expect(permissions.isAdmin).toBe(false)
      expect(permissions.features).toHaveLength(3) // moc, wishlist, profile
    })
  })

  describe('hasFeature', () => {
    it('returns true for features in user tier', async () => {
      const permissions = await service.getUserPermissions('user-123')

      expect(service.hasFeature(permissions, 'moc')).toBe(true)
      expect(service.hasFeature(permissions, 'wishlist')).toBe(true)
      expect(service.hasFeature(permissions, 'profile')).toBe(true)
    })

    it('returns false for features above user tier', async () => {
      const permissions = await service.getUserPermissions('user-123')

      expect(service.hasFeature(permissions, 'gallery')).toBe(false)
      expect(service.hasFeature(permissions, 'chat')).toBe(false)
      expect(service.hasFeature(permissions, 'setlist')).toBe(false)
    })

    it('returns true for all features for admin', async () => {
      vi.mocked(quotaRepo.findOrCreate).mockResolvedValue(mockAdminQuotaRow)
      const permissions = await service.getUserPermissions('admin-123')

      expect(service.hasFeature(permissions, 'moc')).toBe(true)
      expect(service.hasFeature(permissions, 'gallery')).toBe(true)
      expect(service.hasFeature(permissions, 'chat')).toBe(true)
      expect(service.hasFeature(permissions, 'setlist')).toBe(true)
    })
  })

  describe('requireFeature', () => {
    it('returns ok for available features', async () => {
      const permissions = await service.getUserPermissions('user-123')

      const result = service.requireFeature(permissions, 'moc')

      expect(result.ok).toBe(true)
    })

    it('returns FEATURE_NOT_AVAILABLE for unavailable features', async () => {
      const permissions = await service.getUserPermissions('user-123')

      const result = service.requireFeature(permissions, 'gallery')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('FEATURE_NOT_AVAILABLE')
      }
    })

    it('returns ACCOUNT_SUSPENDED for suspended users', async () => {
      vi.mocked(quotaRepo.findOrCreate).mockResolvedValue({
        ...mockQuotaRow,
        isSuspended: true,
        suspendedReason: 'TOS violation',
      })
      const permissions = await service.getUserPermissions('user-123')

      const result = service.requireFeature(permissions, 'moc')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('ACCOUNT_SUSPENDED')
      }
    })
  })

  describe('requireAdult', () => {
    it('returns ok for adult-verified users', async () => {
      vi.mocked(quotaRepo.findOrCreate).mockResolvedValue(mockProQuotaRow)
      const permissions = await service.getUserPermissions('pro-user-123')

      const result = service.requireAdult(permissions)

      expect(result.ok).toBe(true)
    })

    it('returns ADULT_REQUIRED for non-verified users', async () => {
      const permissions = await service.getUserPermissions('user-123')

      const result = service.requireAdult(permissions)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('ADULT_REQUIRED')
      }
    })

    it('returns ACCOUNT_SUSPENDED for suspended users', async () => {
      vi.mocked(quotaRepo.findOrCreate).mockResolvedValue({
        ...mockQuotaRow,
        isSuspended: true,
      })
      const permissions = await service.getUserPermissions('user-123')

      const result = service.requireAdult(permissions)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('ACCOUNT_SUSPENDED')
      }
    })
  })

  describe('reserveQuota', () => {
    it('returns true when quota is available', async () => {
      const result = await service.reserveQuota('user-123', 'mocs')

      expect(result).toBe(true)
      expect(quotaRepo.reserveQuota).toHaveBeenCalledWith('user-123', 'mocs')
    })

    it('returns false when quota is exceeded', async () => {
      vi.mocked(quotaRepo.reserveQuota).mockResolvedValue(false)

      const result = await service.reserveQuota('user-123', 'mocs')

      expect(result).toBe(false)
    })
  })

  describe('releaseQuota', () => {
    it('calls repository to release quota', async () => {
      await service.releaseQuota('user-123', 'mocs')

      expect(quotaRepo.releaseQuota).toHaveBeenCalledWith('user-123', 'mocs')
    })
  })

  describe('updateTier', () => {
    it('updates tier and returns new permissions', async () => {
      vi.mocked(quotaRepo.updateTier).mockResolvedValue({
        ok: true,
        data: { ...mockQuotaRow, tier: 'pro-tier' as Tier },
      })
      vi.mocked(quotaRepo.findOrCreate).mockResolvedValue({
        ...mockQuotaRow,
        tier: 'pro-tier',
        mocsLimit: 100,
        galleriesLimit: 20,
      })

      const result = await service.updateTier('user-123', 'pro-tier')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.tier).toBe('pro-tier')
        expect(result.data.features).toContain('gallery')
      }
    })

    it('returns NOT_FOUND when user does not exist', async () => {
      vi.mocked(quotaRepo.updateTier).mockResolvedValue({ ok: false, error: 'NOT_FOUND' })

      const result = await service.updateTier('nonexistent', 'pro-tier')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('NOT_FOUND')
      }
    })
  })

  describe('setAdultStatus', () => {
    it('sets adult status successfully', async () => {
      const result = await service.setAdultStatus('user-123', true)

      expect(result.ok).toBe(true)
      expect(quotaRepo.setAdultStatus).toHaveBeenCalledWith('user-123', true)
    })

    it('returns NOT_FOUND when user does not exist', async () => {
      vi.mocked(quotaRepo.setAdultStatus).mockResolvedValue({ ok: false, error: 'NOT_FOUND' })

      const result = await service.setAdultStatus('nonexistent', true)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('NOT_FOUND')
      }
    })
  })

  describe('suspendUser', () => {
    it('suspends user successfully', async () => {
      const result = await service.suspendUser('user-123', 'TOS violation')

      expect(result.ok).toBe(true)
      expect(quotaRepo.suspend).toHaveBeenCalledWith('user-123', 'TOS violation')
    })

    it('returns NOT_FOUND when user does not exist', async () => {
      vi.mocked(quotaRepo.suspend).mockResolvedValue({ ok: false, error: 'NOT_FOUND' })

      const result = await service.suspendUser('nonexistent', 'TOS violation')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('NOT_FOUND')
      }
    })
  })

  describe('unsuspendUser', () => {
    it('unsuspends user successfully', async () => {
      const result = await service.unsuspendUser('user-123')

      expect(result.ok).toBe(true)
      expect(quotaRepo.unsuspend).toHaveBeenCalledWith('user-123')
    })

    it('returns NOT_FOUND when user does not exist', async () => {
      vi.mocked(quotaRepo.unsuspend).mockResolvedValue({ ok: false, error: 'NOT_FOUND' })

      const result = await service.unsuspendUser('nonexistent')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('NOT_FOUND')
      }
    })
  })

  describe('getRequiredTier', () => {
    it('returns free-tier for basic features', () => {
      expect(service.getRequiredTier('moc')).toBe('free-tier')
      expect(service.getRequiredTier('wishlist')).toBe('free-tier')
      expect(service.getRequiredTier('profile')).toBe('free-tier')
    })

    it('returns pro-tier for premium features', () => {
      expect(service.getRequiredTier('gallery')).toBe('pro-tier')
      expect(service.getRequiredTier('chat')).toBe('pro-tier')
      expect(service.getRequiredTier('reviews')).toBe('pro-tier')
    })

    it('returns power-tier for advanced features', () => {
      expect(service.getRequiredTier('setlist')).toBe('power-tier')
      expect(service.getRequiredTier('privacy_advanced')).toBe('power-tier')
    })
  })

  describe('hasQuotaAvailable', () => {
    it('returns true when quota has remaining capacity', async () => {
      const permissions = await service.getUserPermissions('user-123')

      expect(service.hasQuotaAvailable(permissions, 'mocs')).toBe(true)
    })

    it('returns false when quota is exhausted', async () => {
      vi.mocked(quotaRepo.findOrCreate).mockResolvedValue({
        ...mockQuotaRow,
        mocsCount: 5, // at limit
      })
      const permissions = await service.getUserPermissions('user-123')

      expect(service.hasQuotaAvailable(permissions, 'mocs')).toBe(false)
    })

    it('returns true for admin regardless of counts', async () => {
      vi.mocked(quotaRepo.findOrCreate).mockResolvedValue(mockAdminQuotaRow)
      const permissions = await service.getUserPermissions('admin-123')

      expect(service.hasQuotaAvailable(permissions, 'mocs')).toBe(true)
      expect(service.hasQuotaAvailable(permissions, 'galleries')).toBe(true)
    })
  })
})
