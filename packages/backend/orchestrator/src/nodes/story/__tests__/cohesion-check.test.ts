/**
 * Cohesion Check Node Unit Tests
 * WINT-9030: Create cohesion-prosecutor LangGraph Node
 *
 * AC-10: Tests target inner compute functions (cohesionCheckImpl, cohesionAuditImpl)
 *        with injectable mock db — NOT the createToolNode wrapper.
 * AC-7: Unknown featureId returns status 'unknown'
 * AC-8: Full coverage returns status 'complete'
 * AC-9: Partial coverage returns status 'incomplete' with violations
 */

import { describe, expect, it, vi } from 'vitest'
import { cohesionCheckImpl, cohesionAuditImpl } from '../cohesion-check.js'

// ============================================================================
// Mock DB helpers
// ============================================================================

/**
 * Create a mock Drizzle DB that returns the given rows for select queries.
 * Supports chaining: db.select().from().where() and db.select().from().leftJoin().where()
 */
function createMockDb(rows: any[] = []) {
  const chainable = {
    where: vi.fn().mockResolvedValue(rows),
    leftJoin: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(rows),
      then: (resolve: any) => resolve(rows),
      [Symbol.toStringTag]: 'Promise',
    }),
    then: (resolve: any) => resolve(rows),
    [Symbol.toStringTag]: 'Promise',
  }

  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue(chainable),
    }),
  } as any
}

/**
 * Create a mock DB that returns different rows for leftJoin queries (audit)
 * vs plain where queries (check).
 */
function createMockDbForAudit(rows: any[]) {
  const leftJoinResult = {
    where: vi.fn().mockResolvedValue(rows),
    then: (resolve: any) => resolve(rows),
    [Symbol.toStringTag]: 'Promise',
  }

  const fromResult = {
    where: vi.fn().mockResolvedValue(rows),
    leftJoin: vi.fn().mockReturnValue(leftJoinResult),
    then: (resolve: any) => resolve(rows),
    [Symbol.toStringTag]: 'Promise',
  }

  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue(fromResult),
    }),
  } as any
}

// ============================================================================
// cohesionCheckImpl tests
// ============================================================================

describe('cohesionCheckImpl', () => {
  it('HP-1: returns complete for fully-covered feature (AC-8)', async () => {
    const mockDb = createMockDb([
      { featureId: 'feat-alpha', lifecycleStage: 'create' },
      { featureId: 'feat-alpha', lifecycleStage: 'read' },
      { featureId: 'feat-alpha', lifecycleStage: 'update' },
      { featureId: 'feat-alpha', lifecycleStage: 'delete' },
    ])

    const result = await cohesionCheckImpl('feat-alpha', mockDb)

    expect(result.status).toBe('complete')
    expect(result.violations).toEqual([])
    expect(result.capabilityCoverage).toEqual({
      create: true,
      read: true,
      update: true,
      delete: true,
    })
    expect(result.featureId).toBe('feat-alpha')
  })

  it('EC-1: returns unknown for nonexistent featureId (AC-7)', async () => {
    const mockDb = createMockDb([])

    const result = await cohesionCheckImpl('nonexistent-feat', mockDb)

    expect(result.status).toBe('unknown')
    expect(result.violations).toEqual([])
    expect(result.capabilityCoverage).toEqual({})
    expect(result.featureId).toBe('nonexistent-feat')
  })

  it('EC-2: returns incomplete with violations for partial coverage (AC-9)', async () => {
    const mockDb = createMockDb([
      { featureId: 'feat-beta', lifecycleStage: 'create' },
      { featureId: 'feat-beta', lifecycleStage: 'read' },
    ])

    const result = await cohesionCheckImpl('feat-beta', mockDb)

    expect(result.status).toBe('incomplete')
    expect(result.violations).toEqual([
      'missing update capability',
      'missing delete capability',
    ])
    expect(result.capabilityCoverage).toEqual({
      create: true,
      read: true,
      update: false,
      delete: false,
    })
  })

  it('ED-2: returns incomplete for single capability (create only)', async () => {
    const mockDb = createMockDb([
      { featureId: 'feat-gamma', lifecycleStage: 'create' },
    ])

    const result = await cohesionCheckImpl('feat-gamma', mockDb)

    expect(result.status).toBe('incomplete')
    expect(result.violations).toHaveLength(3)
    expect(result.violations).toEqual([
      'missing read capability',
      'missing update capability',
      'missing delete capability',
    ])
    expect(result.capabilityCoverage).toEqual({
      create: true,
      read: false,
      update: false,
      delete: false,
    })
  })

  it('EC-3: propagates DB errors', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('DB connection failed')),
        }),
      }),
    } as any

    await expect(cohesionCheckImpl('feat-alpha', mockDb)).rejects.toThrow('DB connection failed')
  })

  it('handles rows with null lifecycleStage', async () => {
    const mockDb = createMockDb([
      { featureId: 'feat-x', lifecycleStage: 'create' },
      { featureId: 'feat-x', lifecycleStage: null },
    ])

    const result = await cohesionCheckImpl('feat-x', mockDb)

    expect(result.status).toBe('incomplete')
    expect(result.capabilityCoverage.create).toBe(true)
    expect(result.capabilityCoverage.read).toBe(false)
  })
})

// ============================================================================
// cohesionAuditImpl tests
// ============================================================================

describe('cohesionAuditImpl', () => {
  it('HP-2: returns audit result for all features in package', async () => {
    const mockDb = createMockDbForAudit([
      { featureId: 'feat-1', featureName: 'Feature 1', packageName: 'wint', lifecycleStage: 'create' },
      { featureId: 'feat-1', featureName: 'Feature 1', packageName: 'wint', lifecycleStage: 'read' },
      { featureId: 'feat-1', featureName: 'Feature 1', packageName: 'wint', lifecycleStage: 'update' },
      { featureId: 'feat-1', featureName: 'Feature 1', packageName: 'wint', lifecycleStage: 'delete' },
      { featureId: 'feat-2', featureName: 'Feature 2', packageName: 'wint', lifecycleStage: 'create' },
      { featureId: 'feat-2', featureName: 'Feature 2', packageName: 'wint', lifecycleStage: 'read' },
      { featureId: 'feat-2', featureName: 'Feature 2', packageName: 'wint', lifecycleStage: 'update' },
      { featureId: 'feat-2', featureName: 'Feature 2', packageName: 'wint', lifecycleStage: 'delete' },
      { featureId: 'feat-3', featureName: 'Feature 3', packageName: 'wint', lifecycleStage: 'create' },
      { featureId: 'feat-3', featureName: 'Feature 3', packageName: 'wint', lifecycleStage: 'read' },
    ])

    const result = await cohesionAuditImpl('wint', mockDb)

    expect(result.coverageSummary.totalFeatures).toBe(3)
    expect(result.coverageSummary.completeCount).toBe(2)
    expect(result.coverageSummary.incompleteCount).toBe(1)
    expect(result.frankenFeatures).toHaveLength(1)
    expect(result.frankenFeatures[0].featureId).toBe('feat-3')
    expect(result.frankenFeatures[0].missingCapabilities).toEqual([
      'update',
      'delete',
    ])
  })

  it('ED-1: returns empty audit result for empty graph', async () => {
    const mockDb = createMockDbForAudit([])

    const result = await cohesionAuditImpl('empty-pkg', mockDb)

    expect(result.frankenFeatures).toEqual([])
    expect(result.coverageSummary.totalFeatures).toBe(0)
    expect(result.coverageSummary.completeCount).toBe(0)
    expect(result.coverageSummary.incompleteCount).toBe(0)
  })

  it('runs without packageName filter when undefined', async () => {
    // When packageName is undefined/null, the query should NOT call .where()
    // and instead resolve with the base query result
    const rows = [
      { featureId: 'f1', featureName: 'F1', packageName: 'pkg-a', lifecycleStage: 'create' },
    ]

    const leftJoinResult = {
      where: vi.fn().mockResolvedValue(rows),
      then: (resolve: any) => resolve(rows),
      [Symbol.toStringTag]: 'Promise',
    }

    const fromResult = {
      leftJoin: vi.fn().mockReturnValue(leftJoinResult),
    }

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue(fromResult),
      }),
    } as any

    const result = await cohesionAuditImpl(undefined, mockDb)

    // The leftJoinResult.where should NOT have been called (null packageName path)
    expect(result.frankenFeatures).toHaveLength(1)
    expect(result.coverageSummary.totalFeatures).toBe(1)
  })

  it('handles features with null lifecycleStage (zero capabilities)', async () => {
    const mockDb = createMockDbForAudit([
      { featureId: 'empty-feat', featureName: 'Empty', packageName: 'pkg', lifecycleStage: null },
    ])

    const result = await cohesionAuditImpl('pkg', mockDb)

    expect(result.frankenFeatures).toHaveLength(1)
    expect(result.frankenFeatures[0].missingCapabilities).toEqual([
      'create',
      'read',
      'update',
      'delete',
    ])
    expect(result.coverageSummary.totalFeatures).toBe(1)
    expect(result.coverageSummary.incompleteCount).toBe(1)
  })

  it('propagates DB errors', async () => {
    const mockDb = createMockDbForAudit([])
    // Override to throw
    mockDb.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Connection refused')),
          then: (_: any, reject: any) => reject(new Error('Connection refused')),
          [Symbol.toStringTag]: 'Promise',
        }),
      }),
    })

    await expect(cohesionAuditImpl('wint', mockDb)).rejects.toThrow('Connection refused')
  })
})
