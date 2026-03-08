/**
 * Unit Tests for computeAudit
 * WINT-4010: Create Cohesion Sidecar
 *
 * Tests computeAudit with injectable mock DB fixtures:
 * - MockDbWithPopulatedGraph: franken feature detection + packageName filter
 * - MockDbEmpty: graceful empty result (AC-8)
 * - MockDbThrowsOnQuery: error path + logger behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computeAudit } from '../compute-audit.js'
import type { DrizzleDb } from '../compute-audit.js'

// ============================================================================
// Mock DB Fixtures
// ============================================================================

/**
 * Build a chainable mock Drizzle query that resolves with the provided rows.
 */
function buildMockDb(rows: Record<string, any>[]): DrizzleDb {
  const mockWhere = vi.fn().mockResolvedValue(rows)
  const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere })
  const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin })
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

  return { select: mockSelect } as unknown as DrizzleDb
}

/**
 * MockDbWithPopulatedGraph: 3 features.
 * - feature-complete: has all 4 CRUD stages
 * - feature-incomplete: only has read + update (missing create + delete)
 * - feature-other-pkg: in @repo/other, has only create (missing read, update, delete)
 */
function makeMockDbWithPopulatedGraph(): DrizzleDb {
  const rows = [
    // feature-complete — all 4 CRUD
    { features: { id: 'feat-complete', featureName: 'complete-feature', packageName: '@repo/ui' }, capabilities: { id: 'cap-1', lifecycleStage: 'create', featureId: 'feat-complete' } },
    { features: { id: 'feat-complete', featureName: 'complete-feature', packageName: '@repo/ui' }, capabilities: { id: 'cap-2', lifecycleStage: 'read', featureId: 'feat-complete' } },
    { features: { id: 'feat-complete', featureName: 'complete-feature', packageName: '@repo/ui' }, capabilities: { id: 'cap-3', lifecycleStage: 'update', featureId: 'feat-complete' } },
    { features: { id: 'feat-complete', featureName: 'complete-feature', packageName: '@repo/ui' }, capabilities: { id: 'cap-4', lifecycleStage: 'delete', featureId: 'feat-complete' } },

    // feature-incomplete — missing create + delete
    { features: { id: 'feat-incomplete', featureName: 'incomplete-feature', packageName: '@repo/ui' }, capabilities: { id: 'cap-5', lifecycleStage: 'read', featureId: 'feat-incomplete' } },
    { features: { id: 'feat-incomplete', featureName: 'incomplete-feature', packageName: '@repo/ui' }, capabilities: { id: 'cap-6', lifecycleStage: 'update', featureId: 'feat-incomplete' } },

    // feature-other-pkg — in @repo/other, missing read, update, delete
    { features: { id: 'feat-other', featureName: 'other-feature', packageName: '@repo/other' }, capabilities: { id: 'cap-7', lifecycleStage: 'create', featureId: 'feat-other' } },
  ]
  return buildMockDb(rows)
}

/**
 * MockDbEmpty: empty graph returns gracefully (AC-8).
 */
function makeMockDbEmpty(): DrizzleDb {
  return buildMockDb([])
}

/**
 * MockDbThrowsOnQuery: simulates DB error.
 */
function makeMockDbThrowsOnQuery(): DrizzleDb {
  const mockWhere = vi.fn().mockRejectedValue(new Error('DB connection failed'))
  const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere })
  const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin })
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

  return { select: mockSelect } as unknown as DrizzleDb
}

// ============================================================================
// Tests
// ============================================================================

describe('computeAudit', () => {
  describe('MockDbWithPopulatedGraph — franken feature detection', () => {
    it('identifies franken-features (features with < 4 CRUD stages)', async () => {
      const db = makeMockDbWithPopulatedGraph()
      const result = await computeAudit(db)

      // feat-incomplete (read + update only) should be franken
      // feat-other (create only) should be franken
      // feat-complete (all 4) should NOT be franken
      const frankenIds = result.frankenFeatures.map(f => f.featureId)
      expect(frankenIds).toContain('feat-incomplete')
      expect(frankenIds).toContain('feat-other')
      expect(frankenIds).not.toContain('feat-complete')
    })

    it('returns correct missingCapabilities for incomplete feature', async () => {
      const db = makeMockDbWithPopulatedGraph()
      const result = await computeAudit(db)

      const incomplete = result.frankenFeatures.find(f => f.featureId === 'feat-incomplete')
      expect(incomplete).toBeDefined()
      expect(incomplete?.missingCapabilities).toContain('create')
      expect(incomplete?.missingCapabilities).toContain('delete')
      expect(incomplete?.missingCapabilities).not.toContain('read')
      expect(incomplete?.missingCapabilities).not.toContain('update')
    })

    it('returns correct coverageSummary', async () => {
      const db = makeMockDbWithPopulatedGraph()
      const result = await computeAudit(db)

      expect(result.coverageSummary.totalFeatures).toBe(3)
      expect(result.coverageSummary.completeCount).toBe(1) // feat-complete
      expect(result.coverageSummary.incompleteCount).toBe(2) // feat-incomplete + feat-other
    })

    it('filters by packageName (AC-3)', async () => {
      const db = makeMockDbWithPopulatedGraph()
      const result = await computeAudit(db, '@repo/ui')

      // Should only see @repo/ui features: feat-complete + feat-incomplete
      expect(result.coverageSummary.totalFeatures).toBe(2)
      expect(result.coverageSummary.completeCount).toBe(1)
      expect(result.coverageSummary.incompleteCount).toBe(1)

      const frankenIds = result.frankenFeatures.map(f => f.featureId)
      expect(frankenIds).not.toContain('feat-other') // @repo/other filtered out
    })

    it('returns empty frankenFeatures when packageName has no matches', async () => {
      const db = makeMockDbWithPopulatedGraph()
      const result = await computeAudit(db, '@repo/nonexistent')

      expect(result.frankenFeatures).toHaveLength(0)
      expect(result.coverageSummary.totalFeatures).toBe(0)
      expect(result.coverageSummary.completeCount).toBe(0)
      expect(result.coverageSummary.incompleteCount).toBe(0)
    })
  })

  describe('MockDbEmpty — graceful empty result (AC-8)', () => {
    it('returns graceful empty result when graph is empty', async () => {
      const db = makeMockDbEmpty()
      const result = await computeAudit(db)

      expect(result.frankenFeatures).toEqual([])
      expect(result.coverageSummary).toEqual({
        totalFeatures: 0,
        completeCount: 0,
        incompleteCount: 0,
      })
    })

    it('does not throw when graph is empty', async () => {
      const db = makeMockDbEmpty()
      await expect(computeAudit(db)).resolves.not.toThrow()
    })
  })

  describe('MockDbThrowsOnQuery — error path', () => {
    it('returns graceful empty result on DB error', async () => {
      const db = makeMockDbThrowsOnQuery()
      const result = await computeAudit(db)

      expect(result.frankenFeatures).toEqual([])
      expect(result.coverageSummary).toEqual({
        totalFeatures: 0,
        completeCount: 0,
        incompleteCount: 0,
      })
    })

    it('does not throw on DB error', async () => {
      const db = makeMockDbThrowsOnQuery()
      await expect(computeAudit(db)).resolves.not.toThrow()
    })
  })
})
