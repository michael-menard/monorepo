import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAdminService } from '../application/services.js'
import type { CognitoUserPort, AuditLogRepository, UserQuotaReadPort } from '../ports/index.js'
import type { AuthorizationService } from '../../authorization/application/index.js'
import type { CognitoUser, UserListResponse, BlockUserInput } from '../types.js'

/**
 * Admin Service Unit Tests
 *
 * Tests business logic using mock repositories and ports.
 * No real AWS Cognito or database calls.
 */

// Mock data
const mockCognitoUser: CognitoUser = {
  userId: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  userStatus: 'CONFIRMED',
  enabled: true,
  createdAt: '2024-01-01T00:00:00.000Z',
}

const mockUserListResponse: UserListResponse = {
  users: [mockCognitoUser],
  paginationToken: null,
}

const mockQuotaInfo = {
  userId: 'user-123',
  tier: 'free-tier' as const,
  isSuspended: false,
  suspendedAt: null,
  suspendedReason: null,
}

const mockSuspendedQuotaInfo = {
  userId: 'user-456',
  tier: 'free-tier' as const,
  isSuspended: true,
  suspendedAt: new Date('2024-01-15'),
  suspendedReason: 'security_incident: Suspicious activity detected',
}

function createMockCognitoClient(overrides: Partial<CognitoUserPort> = {}): CognitoUserPort {
  return {
    listUsers: vi.fn().mockResolvedValue({ ok: true, data: mockUserListResponse }),
    searchUsersByEmail: vi.fn().mockResolvedValue({ ok: true, data: mockUserListResponse }),
    getUser: vi.fn().mockResolvedValue({ ok: true, data: mockCognitoUser }),
    globalSignOut: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    ...overrides,
  }
}

function createMockAuditRepo(overrides: Partial<AuditLogRepository> = {}): AuditLogRepository {
  return {
    create: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue([]),
    ...overrides,
  }
}

function createMockQuotaReadRepo(overrides: Partial<UserQuotaReadPort> = {}): UserQuotaReadPort {
  return {
    findByUserId: vi.fn().mockResolvedValue(mockQuotaInfo),
    ...overrides,
  }
}

function createMockAuthService(overrides: Partial<AuthorizationService> = {}): AuthorizationService {
  return {
    suspendUser: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    unsuspendUser: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    getUserPermissions: vi.fn().mockResolvedValue({
      userId: 'user-123',
      tier: 'free-tier',
      isAdmin: false,
      features: ['moc', 'wishlist', 'profile'],
    }),
    ...overrides,
  } as unknown as AuthorizationService
}

describe('AdminService', () => {
  let cognitoClient: CognitoUserPort
  let auditRepo: AuditLogRepository
  let quotaReadRepo: UserQuotaReadPort
  let authService: AuthorizationService
  let service: ReturnType<typeof createAdminService>

  beforeEach(() => {
    cognitoClient = createMockCognitoClient()
    auditRepo = createMockAuditRepo()
    quotaReadRepo = createMockQuotaReadRepo()
    authService = createMockAuthService()
    service = createAdminService({
      cognitoClient,
      auditRepo,
      quotaReadRepo,
      authService,
    })
  })

  describe('listUsers', () => {
    it('returns paginated user list', async () => {
      const result = await service.listUsers('admin-123', 20)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.users).toHaveLength(1)
        expect(result.data.users[0].email).toBe('test@example.com')
      }
    })

    it('logs the search action', async () => {
      await service.listUsers('admin-123', 20, undefined, { ipAddress: '127.0.0.1' })

      expect(auditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          adminUserId: 'admin-123',
          actionType: 'search',
          result: 'success',
          ipAddress: '127.0.0.1',
        }),
      )
    })

    it('returns COGNITO_ERROR on Cognito failure', async () => {
      vi.mocked(cognitoClient.listUsers).mockResolvedValue({ ok: false, error: 'COGNITO_ERROR' })

      const result = await service.listUsers('admin-123', 20)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('COGNITO_ERROR')
      }
    })
  })

  describe('searchUsers', () => {
    it('searches users by email prefix', async () => {
      const result = await service.searchUsers('admin-123', 'test@')

      expect(result.ok).toBe(true)
      expect(cognitoClient.searchUsersByEmail).toHaveBeenCalledWith('test@', 20)
    })

    it('logs the search action with email filter', async () => {
      await service.searchUsers('admin-123', 'john@', 10)

      expect(auditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'search',
          details: expect.objectContaining({ emailPrefix: 'john@' }),
        }),
      )
    })
  })

  describe('getUserDetail', () => {
    it('returns combined Cognito and database user data', async () => {
      const result = await service.getUserDetail('admin-123', 'user-123')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.email).toBe('test@example.com')
        expect(result.data.tier).toBe('free-tier')
        expect(result.data.isSuspended).toBe(false)
      }
    })

    it('returns NOT_FOUND when user does not exist in Cognito', async () => {
      vi.mocked(cognitoClient.getUser).mockResolvedValue({ ok: false, error: 'NOT_FOUND' })

      const result = await service.getUserDetail('admin-123', 'nonexistent')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('NOT_FOUND')
      }
    })

    it('logs view action on success', async () => {
      await service.getUserDetail('admin-123', 'user-123')

      expect(auditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'view',
          targetUserId: 'user-123',
          result: 'success',
        }),
      )
    })

    it('logs view action on failure', async () => {
      vi.mocked(cognitoClient.getUser).mockResolvedValue({ ok: false, error: 'NOT_FOUND' })

      await service.getUserDetail('admin-123', 'nonexistent')

      expect(auditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'view',
          targetUserId: 'nonexistent',
          result: 'failure',
        }),
      )
    })
  })

  describe('revokeTokens', () => {
    it('revokes all user tokens via Cognito', async () => {
      const result = await service.revokeTokens('admin-123', 'user-123')

      expect(result.ok).toBe(true)
      expect(cognitoClient.globalSignOut).toHaveBeenCalledWith('user-123')
    })

    it('logs successful token revocation', async () => {
      await service.revokeTokens('admin-123', 'user-123')

      expect(auditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'revoke_tokens',
          targetUserId: 'user-123',
          result: 'success',
        }),
      )
    })

    it('returns NOT_FOUND when user does not exist', async () => {
      vi.mocked(cognitoClient.globalSignOut).mockResolvedValue({ ok: false, error: 'NOT_FOUND' })

      const result = await service.revokeTokens('admin-123', 'nonexistent')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('NOT_FOUND')
      }
    })
  })

  describe('blockUser', () => {
    const blockInput: BlockUserInput = {
      reason: 'security_incident',
      notes: 'Suspicious login attempts',
    }

    it('blocks user and revokes tokens', async () => {
      const result = await service.blockUser('admin-123', 'user-123', blockInput)

      expect(result.ok).toBe(true)
      expect(authService.suspendUser).toHaveBeenCalledWith(
        'user-123',
        'security_incident: Suspicious login attempts',
      )
      expect(cognitoClient.globalSignOut).toHaveBeenCalledWith('user-123')
    })

    it('returns NOT_FOUND when user does not exist in Cognito', async () => {
      vi.mocked(cognitoClient.getUser).mockResolvedValue({ ok: false, error: 'NOT_FOUND' })

      const result = await service.blockUser('admin-123', 'nonexistent', blockInput)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('NOT_FOUND')
      }
    })

    it('returns USER_ALREADY_BLOCKED when user is already suspended', async () => {
      vi.mocked(quotaReadRepo.findByUserId).mockResolvedValue(mockSuspendedQuotaInfo)

      const result = await service.blockUser('admin-123', 'user-456', blockInput)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('USER_ALREADY_BLOCKED')
      }
    })

    it('logs successful block action', async () => {
      await service.blockUser('admin-123', 'user-123', blockInput)

      expect(auditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'block',
          targetUserId: 'user-123',
          reason: 'security_incident',
          result: 'success',
        }),
      )
    })

    it('handles block without notes', async () => {
      const inputWithoutNotes: BlockUserInput = { reason: 'policy_violation' }

      const result = await service.blockUser('admin-123', 'user-123', inputWithoutNotes)

      expect(result.ok).toBe(true)
      expect(authService.suspendUser).toHaveBeenCalledWith('user-123', 'policy_violation')
    })
  })

  describe('unblockUser', () => {
    it('unblocks a suspended user', async () => {
      vi.mocked(quotaReadRepo.findByUserId).mockResolvedValue(mockSuspendedQuotaInfo)

      const result = await service.unblockUser('admin-123', 'user-456')

      expect(result.ok).toBe(true)
      expect(authService.unsuspendUser).toHaveBeenCalledWith('user-456')
    })

    it('returns NOT_FOUND when user does not exist', async () => {
      vi.mocked(quotaReadRepo.findByUserId).mockResolvedValue(null)

      const result = await service.unblockUser('admin-123', 'nonexistent')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('NOT_FOUND')
      }
    })

    it('returns USER_NOT_BLOCKED when user is not suspended', async () => {
      const result = await service.unblockUser('admin-123', 'user-123')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('USER_NOT_BLOCKED')
      }
    })

    it('logs successful unblock action', async () => {
      vi.mocked(quotaReadRepo.findByUserId).mockResolvedValue(mockSuspendedQuotaInfo)

      await service.unblockUser('admin-123', 'user-456')

      expect(auditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'unblock',
          targetUserId: 'user-456',
          result: 'success',
        }),
      )
    })
  })

  describe('getAuditLog', () => {
    const mockAuditEntries = [
      {
        id: 'audit-1',
        adminUserId: 'admin-123',
        actionType: 'block',
        targetUserId: 'user-456',
        reason: 'security_incident',
        result: 'success',
        createdAt: new Date(),
      },
    ]

    it('returns audit log entries', async () => {
      vi.mocked(auditRepo.list).mockResolvedValue(mockAuditEntries)

      const result = await service.getAuditLog('admin-123', { limit: 50 })

      expect(result).toHaveLength(1)
      expect(result[0].actionType).toBe('block')
    })

    it('filters by target user ID', async () => {
      await service.getAuditLog('admin-123', { limit: 50, targetUserId: 'user-456' })

      expect(auditRepo.list).toHaveBeenCalledWith(
        expect.objectContaining({ targetUserId: 'user-456' }),
      )
    })

    it('logs that admin viewed audit log', async () => {
      await service.getAuditLog('admin-123', { limit: 50 })

      expect(auditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'view',
          details: expect.objectContaining({ viewedAuditLog: true }),
        }),
      )
    })
  })
})
