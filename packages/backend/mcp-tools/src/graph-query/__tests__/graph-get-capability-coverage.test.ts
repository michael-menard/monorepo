/* eslint-disable import/order */
import { randomUUID } from 'crypto'
import { describe, it, expect, vi, beforeEach } from 'vitest'
/* eslint-enable import/order */

// Hoist mock functions
const {
  mockSelect,
  mockFrom,
  mockWhere,
  mockLimit,
  mockThen,
  mockWarn,
  mockFeatures,
  mockCapabilities,
  mockEq,
  mockOr,
  mockIsNotNull,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
  mockWhere: vi.fn(),
  mockLimit: vi.fn(),
  mockThen: vi.fn(),
  mockWarn: vi.fn(),
  mockFeatures: {
    id: 'id',
    featureName: 'feature_name',
    packageName: 'package_name',
  },
  mockCapabilities: {
    featureId: 'feature_id',
    lifecycleStage: 'lifecycle_stage',
    maturityLevel: 'maturity_level',
  },
  mockEq: vi.fn((a, b) => ({ type: 'eq', a, b })),
  mockOr: vi.fn((...args) => ({ type: 'or', args })),
  mockIsNotNull: vi.fn(a => ({ type: 'isNotNull', a })),
}))

vi.mock('@repo/db', () => ({
  db: {
    select: mockSelect,
  },
}))

vi.mock('@repo/knowledge-base/db', () => ({
  features: mockFeatures,
  capabilities: mockCapabilities,
}))

vi.mock('drizzle-orm', () => ({
  eq: mockEq,
  or: mockOr,
  isNotNull: mockIsNotNull,
}))

vi.mock('@repo/logger', () => ({
  logger: {
    warn: mockWarn,
  },
}))

import { graph_get_capability_coverage } from '../graph-get-capability-coverage'

const featureUuid = randomUUID()

// Feature lookup chain: db.select().from().where().limit(1) → [feature]
// Capabilities query chain: db.select().from().where().then(filterFn) → capabilities[]
function setupMockChains(
  featureRow: unknown[] | null,
  capRows: unknown[],
) {
  let callCount = 0

  mockSelect.mockImplementation(() => {
    callCount++
    const currentCall = callCount

    const whereChain = {
      where: vi.fn(() => {
        if (currentCall === 1) {
          // Feature lookup
          return { limit: vi.fn().mockResolvedValue(featureRow ?? []) }
        }
        // Capabilities query - has .then()
        return {
          then: vi.fn(cb => Promise.resolve(cb(capRows))),
        }
      }),
    }
    return { from: vi.fn(() => whereChain) }
  })
}

describe('graph_get_capability_coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when feature not found by UUID (AC-6)', async () => {
    setupMockChains([], [])

    const result = await graph_get_capability_coverage({ featureId: featureUuid })

    expect(result).toBeNull()
  })

  it('returns null when feature not found by name (AC-6)', async () => {
    setupMockChains([], [])

    const result = await graph_get_capability_coverage({ featureId: 'nonexistent-feature' })

    expect(result).toBeNull()
  })

  it('returns correct CRUD counts and maturity distribution (AC-6)', async () => {
    const featureRow = {
      id: featureUuid,
      featureName: 'user-authentication',
      packageName: '@repo/api',
      featureType: 'service',
      filePath: null,
      description: null,
      tags: null,
      metadata: null,
      isActive: true,
      deprecatedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const caps = [
      { id: randomUUID(), featureId: featureUuid, lifecycleStage: 'create', maturityLevel: 'stable' },
      { id: randomUUID(), featureId: featureUuid, lifecycleStage: 'create', maturityLevel: 'beta' },
      { id: randomUUID(), featureId: featureUuid, lifecycleStage: 'read', maturityLevel: 'stable' },
      { id: randomUUID(), featureId: featureUuid, lifecycleStage: 'read', maturityLevel: 'stable' },
      { id: randomUUID(), featureId: featureUuid, lifecycleStage: 'read', maturityLevel: 'stable' },
      { id: randomUUID(), featureId: featureUuid, lifecycleStage: 'update', maturityLevel: 'beta' },
      { id: randomUUID(), featureId: featureUuid, lifecycleStage: 'update', maturityLevel: 'stable' },
      { id: randomUUID(), featureId: featureUuid, lifecycleStage: 'delete', maturityLevel: 'stable' },
    ]

    setupMockChains([featureRow], caps)

    const result = await graph_get_capability_coverage({ featureId: featureUuid })

    expect(result).not.toBeNull()
    expect(result!.featureId).toBe(featureUuid)
    expect(result!.capabilities.create).toBe(2)
    expect(result!.capabilities.read).toBe(3)
    expect(result!.capabilities.update).toBe(2)
    expect(result!.capabilities.delete).toBe(1)
    expect(result!.totalCount).toBe(8)
    expect(result!.maturityLevels['stable']).toBe(6)
    expect(result!.maturityLevels['beta']).toBe(2)
  })

  it('returns zero counts when feature has no linked capabilities (AC-6)', async () => {
    const featureRow = {
      id: featureUuid,
      featureName: 'empty-feature',
      packageName: '@repo/api',
      featureType: 'service',
      filePath: null,
      description: null,
      tags: null,
      metadata: null,
      isActive: true,
      deprecatedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    setupMockChains([featureRow], [])

    const result = await graph_get_capability_coverage({ featureId: featureUuid })

    expect(result).not.toBeNull()
    expect(result!.capabilities.create).toBe(0)
    expect(result!.capabilities.read).toBe(0)
    expect(result!.capabilities.update).toBe(0)
    expect(result!.capabilities.delete).toBe(0)
    expect(result!.totalCount).toBe(0)
    expect(result!.maturityLevels).toEqual({})
  })

  it('uses unknown maturity level for capabilities without maturityLevel (AC-6)', async () => {
    const featureRow = {
      id: featureUuid,
      featureName: 'feature-unknown-maturity',
      packageName: '@repo/api',
      featureType: 'service',
      filePath: null,
      description: null,
      tags: null,
      metadata: null,
      isActive: true,
      deprecatedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const caps = [
      { id: randomUUID(), featureId: featureUuid, lifecycleStage: 'read', maturityLevel: null },
    ]

    setupMockChains([featureRow], caps)

    const result = await graph_get_capability_coverage({ featureId: featureUuid })

    expect(result).not.toBeNull()
    expect(result!.maturityLevels['unknown']).toBe(1)
  })

  it('catches DB errors, logs warning, and returns null (AC-9)', async () => {
    mockSelect.mockImplementation(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockRejectedValue(new Error('DB connection failed')),
        })),
      })),
    }))

    const result = await graph_get_capability_coverage({ featureId: featureUuid })

    expect(result).toBeNull()
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining('[mcp-tools] Failed to get capability coverage:'),
      expect.stringContaining('DB connection failed'),
    )
  })

  it('throws ZodError for empty featureId string (AC-8)', async () => {
    await expect(graph_get_capability_coverage({ featureId: '' })).rejects.toThrow()
  })
})
