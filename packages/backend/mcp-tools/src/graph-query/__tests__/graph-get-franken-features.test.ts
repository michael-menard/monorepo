/* eslint-disable import/order */
import { randomUUID } from 'crypto'
import { describe, it, expect, vi, beforeEach } from 'vitest'
/* eslint-enable import/order */

// Hoist mock functions for @repo/db and @repo/knowledge-base/db
const {
  mockSelect,
  mockFrom,
  mockInnerJoin,
  mockWhere,
  mockWarn,
  mockFeatures,
  mockCapabilities,
  mockEq,
  mockIsNotNull,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
  mockInnerJoin: vi.fn(),
  mockWhere: vi.fn(),
  mockWarn: vi.fn(),
  mockFeatures: {
    id: 'id',
    featureName: 'feature_name',
    packageName: 'package_name',
  },
  mockCapabilities: {
    featureId: 'feature_id',
    lifecycleStage: 'lifecycle_stage',
  },
  mockEq: vi.fn((a, b) => ({ type: 'eq', a, b })),
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
  isNotNull: mockIsNotNull,
}))

vi.mock('@repo/logger', () => ({
  logger: {
    warn: mockWarn,
  },
}))

import { graph_get_franken_features } from '../graph-get-franken-features'

const featureId1 = randomUUID()
const featureId2 = randomUUID()

// Build a mock query chain: db.select().from().innerJoin().where() → returns rows
function setupMockChain(rows: unknown[]) {
  mockWhere.mockResolvedValue(rows)
  mockInnerJoin.mockReturnValue({ where: mockWhere })
  mockFrom.mockReturnValue({ innerJoin: mockInnerJoin })
  mockSelect.mockReturnValue({ from: mockFrom })
}

describe('graph_get_franken_features', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns feature with missing capabilities when < 4 CRUD types present (AC-5)', async () => {
    // Feature has only create + read, missing update + delete
    setupMockChain([
      {
        featureId: featureId1,
        featureName: 'incomplete-feature',
        packageName: '@repo/ui',
        lifecycleStage: 'create',
      },
      {
        featureId: featureId1,
        featureName: 'incomplete-feature',
        packageName: '@repo/ui',
        lifecycleStage: 'read',
      },
    ])

    const result = await graph_get_franken_features({})

    expect(result).toHaveLength(1)
    expect(result[0].featureId).toBe(featureId1)
    expect(result[0].featureName).toBe('incomplete-feature')
    expect(result[0].missingCapabilities).toContain('update')
    expect(result[0].missingCapabilities).toContain('delete')
    expect(result[0].missingCapabilities).not.toContain('create')
    expect(result[0].missingCapabilities).not.toContain('read')
  })

  it('excludes feature with all 4 CRUD types from results (AC-5)', async () => {
    // Feature has all 4 CRUD types — should be excluded
    setupMockChain([
      { featureId: featureId1, featureName: 'complete-feature', packageName: '@repo/api', lifecycleStage: 'create' },
      { featureId: featureId1, featureName: 'complete-feature', packageName: '@repo/api', lifecycleStage: 'read' },
      { featureId: featureId1, featureName: 'complete-feature', packageName: '@repo/api', lifecycleStage: 'update' },
      { featureId: featureId1, featureName: 'complete-feature', packageName: '@repo/api', lifecycleStage: 'delete' },
    ])

    const result = await graph_get_franken_features({})

    expect(result).toHaveLength(0)
  })

  it('returns empty array when no features have linked capabilities (AC-5)', async () => {
    setupMockChain([])

    const result = await graph_get_franken_features({})

    expect(result).toHaveLength(0)
  })

  it('filters by packageName when provided (AC-5)', async () => {
    // Two features, only one matches the package filter
    setupMockChain([
      {
        featureId: featureId1,
        featureName: 'feature-in-ui',
        packageName: '@repo/ui',
        lifecycleStage: 'create',
      },
      {
        featureId: featureId2,
        featureName: 'feature-in-api',
        packageName: '@repo/api',
        lifecycleStage: 'create',
      },
    ])

    const result = await graph_get_franken_features({ packageName: '@repo/ui' })

    expect(result).toHaveLength(1)
    expect(result[0].featureName).toBe('feature-in-ui')
  })

  it('handles multiple features, returns only Franken ones (AC-5)', async () => {
    setupMockChain([
      // featureId1: missing update, delete
      { featureId: featureId1, featureName: 'franken-feature', packageName: '@repo/api', lifecycleStage: 'create' },
      { featureId: featureId1, featureName: 'franken-feature', packageName: '@repo/api', lifecycleStage: 'read' },
      // featureId2: complete (all 4)
      { featureId: featureId2, featureName: 'complete-feature', packageName: '@repo/api', lifecycleStage: 'create' },
      { featureId: featureId2, featureName: 'complete-feature', packageName: '@repo/api', lifecycleStage: 'read' },
      { featureId: featureId2, featureName: 'complete-feature', packageName: '@repo/api', lifecycleStage: 'update' },
      { featureId: featureId2, featureName: 'complete-feature', packageName: '@repo/api', lifecycleStage: 'delete' },
    ])

    const result = await graph_get_franken_features({})

    expect(result).toHaveLength(1)
    expect(result[0].featureName).toBe('franken-feature')
    expect(result[0].missingCapabilities).toContain('update')
    expect(result[0].missingCapabilities).toContain('delete')
  })

  it('catches DB errors, logs warning, and returns empty array (AC-9)', async () => {
    mockWhere.mockRejectedValue(new Error('Connection timeout'))
    mockInnerJoin.mockReturnValue({ where: mockWhere })
    mockFrom.mockReturnValue({ innerJoin: mockInnerJoin })
    mockSelect.mockReturnValue({ from: mockFrom })

    const result = await graph_get_franken_features({})

    expect(result).toEqual([])
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining('[mcp-tools] Failed to get Franken-features:'),
      expect.stringContaining('Connection timeout'),
    )
  })

  it('throws ZodError for invalid input (AC-8)', async () => {
    // packageName exceeds 255 chars
    const longName = 'a'.repeat(256)

    await expect(graph_get_franken_features({ packageName: longName })).rejects.toThrow()
  })

  it('does not include capabilities with null lifecycleStage in CRUD counts (AC-5)', async () => {
    // Feature has create, read, and null (should count only create + read → 2 present → still franken)
    setupMockChain([
      { featureId: featureId1, featureName: 'feature-with-nulls', packageName: '@repo/api', lifecycleStage: 'create' },
      { featureId: featureId1, featureName: 'feature-with-nulls', packageName: '@repo/api', lifecycleStage: null },
    ])

    const result = await graph_get_franken_features({})

    expect(result).toHaveLength(1)
    expect(result[0].missingCapabilities).toContain('read')
    expect(result[0].missingCapabilities).toContain('update')
    expect(result[0].missingCapabilities).toContain('delete')
  })
})
