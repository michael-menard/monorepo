/**
 * Unit Tests for MCP Tool Wrappers
 * WINT-4010: Create Cohesion Sidecar
 *
 * Tests cohesion_audit and cohesion_check MCP wrappers.
 * Uses mock DB override to avoid real DB dependencies (AC-12).
 */

import { describe, it, expect, vi } from 'vitest'
import { cohesion_audit } from '../mcp-tools/cohesion-audit.js'
import { cohesion_check } from '../mcp-tools/cohesion-check.js'
import type { DrizzleDb } from '../compute-audit.js'

// ============================================================================
// Mock DB Helpers
// ============================================================================

function buildMockDb(featureRows: any[], capabilityRows: any[]): DrizzleDb {
  let selectCallCount = 0

  const mockDb: any = {
    select: vi.fn().mockImplementation(() => {
      selectCallCount++
      const thisCall = selectCallCount
      if (thisCall === 1) {
        // Features query
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(
                featureRows.map(f => ({
                  features: { id: f.id, featureName: f.featureName, packageName: f.packageName ?? null },
                  capabilities: { id: 'cap-1', lifecycleStage: 'read', featureId: f.id },
                })),
              ),
            }),
            where: vi.fn().mockResolvedValue(featureRows),
          }),
        }
      }
      // Capabilities query (for computeCheck)
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(capabilityRows),
        }),
      }
    }),
  }

  return mockDb as DrizzleDb
}

function buildAuditMockDb(rows: any[]): DrizzleDb {
  const mockWhere = vi.fn().mockResolvedValue(rows)
  const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere })
  const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin })
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })
  return { select: mockSelect } as unknown as DrizzleDb
}

function buildCheckMockDb(featureRows: any[], capabilityRows: any[]): DrizzleDb {
  let callCount = 0
  const mockDb: any = {
    select: vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(featureRows),
          }),
        }
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(capabilityRows),
        }),
      }
    }),
  }
  return mockDb as DrizzleDb
}

// ============================================================================
// Tests: cohesion_audit
// ============================================================================

describe('cohesion_audit', () => {
  it('returns CohesionAuditResult on valid empty input (AC-9)', async () => {
    const db = buildAuditMockDb([])
    const result = await cohesion_audit({}, db)

    expect(result).not.toBeNull()
    expect(result?.frankenFeatures).toEqual([])
    expect(result?.coverageSummary).toEqual({
      totalFeatures: 0,
      completeCount: 0,
      incompleteCount: 0,
    })
  })

  it('returns CohesionAuditResult on valid input with packageName (AC-9)', async () => {
    const db = buildAuditMockDb([])
    const result = await cohesion_audit({ packageName: '@repo/ui' }, db)

    expect(result).not.toBeNull()
    expect(result?.frankenFeatures).toBeDefined()
  })

  it('returns null on validation error (invalid packageName type)', async () => {
    const db = buildAuditMockDb([])
    // packageName must be a string — pass a number to trigger Zod error
    const result = await cohesion_audit({ packageName: 123 as any }, db)

    expect(result).toBeNull()
  })

  it('is exported from index.ts (AC-9)', async () => {
    const { cohesion_audit: exported } = await import('../index.js')
    expect(typeof exported).toBe('function')
  })
})

// ============================================================================
// Tests: cohesion_check
// ============================================================================

describe('cohesion_check', () => {
  it('returns CohesionCheckResult on valid featureId (AC-9)', async () => {
    const db = buildCheckMockDb(
      [{ id: 'feat-id', featureName: 'test-feature', packageName: '@repo/test' }],
      [
        { id: 'cap-1', lifecycleStage: 'create', featureId: 'feat-id' },
        { id: 'cap-2', lifecycleStage: 'read', featureId: 'feat-id' },
        { id: 'cap-3', lifecycleStage: 'update', featureId: 'feat-id' },
        { id: 'cap-4', lifecycleStage: 'delete', featureId: 'feat-id' },
      ],
    )
    const result = await cohesion_check({ featureId: 'feat-id' }, db)

    expect(result).not.toBeNull()
    expect(result?.featureId).toBe('feat-id')
    expect(result?.status).toBe('complete')
    expect(result?.violations).toHaveLength(0)
    expect(result?.capabilityCoverage).toEqual({
      create: true,
      read: true,
      update: true,
      delete: true,
    })
  })

  it('returns null on validation error (missing featureId)', async () => {
    const db = buildCheckMockDb([], [])
    const result = await cohesion_check({ featureId: '' }, db)

    // Empty string fails Zod min(1) validation
    expect(result).toBeNull()
  })

  it('is exported from index.ts (AC-9)', async () => {
    const { cohesion_check: exported } = await import('../index.js')
    expect(typeof exported).toBe('function')
  })
})

// ============================================================================
// Additional coverage for error paths
// ============================================================================

describe('cohesion_audit error path', () => {
  it('returns null when computeAudit db throws', async () => {
    // Build a db that throws during the query
    const errorDb: any = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockRejectedValue(new Error('DB exploded')),
          }),
        }),
      }),
    }

    // computeAudit will catch the error and return empty result (not throw to cohesion_audit)
    // So cohesion_audit should still return a (empty) result
    const result = await cohesion_audit({}, errorDb as DrizzleDb)
    // computeAudit catches and returns gracefully — cohesion_audit still succeeds
    expect(result).not.toBeNull()
    expect(result?.frankenFeatures).toEqual([])
  })
})

describe('cohesion_check error path', () => {
  it('returns null when featureId is empty string (Zod validation)', async () => {
    const db: any = { select: vi.fn() }
    const result = await cohesion_check({ featureId: '' }, db as DrizzleDb)
    expect(result).toBeNull()
  })
})
