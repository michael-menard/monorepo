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
 * Build a chainable mock Drizzle query using leftJoin (CR-1 fix).
 *
 * @param allRows - Rows returned when no packageName filter is applied (direct await)
 * @param whereResult - Rows returned when .where() is called (packageName filter path).
 *                      Defaults to allRows if not provided (no-filter tests).
 *
 * The leftJoin result is both thenable (direct await) and has .where() for the filter path,
 * mirroring the new CR-2 SQL-WHERE pattern:
 *   db.select().from(features).leftJoin()          → direct await → allRows
 *   db.select().from(features).leftJoin().where()  → filtered await → whereResult
 */
function buildMockDb(rows: Record<string, any>[], whereResult?: Record<string, any>[]): DrizzleDb {
  const resolvedWhereRows = whereResult ?? rows
  const leftJoinResult: any = {
    where: vi.fn().mockResolvedValue(resolvedWhereRows),
  }
  // Make leftJoinResult directly awaitable (PromiseLike) for the no-filter path
  leftJoinResult.then = (onFulfilled: any, onRejected: any) =>
    Promise.resolve(rows).then(onFulfilled, onRejected)

  const mockLeftJoin = vi.fn().mockReturnValue(leftJoinResult)
  const mockFrom = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin })
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

  return { select: mockSelect } as unknown as DrizzleDb
}

const POPULATED_ALL_ROWS = [
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
const UI_ROWS_ONLY = POPULATED_ALL_ROWS.filter(r => r.features.packageName === '@repo/ui')

/**
 * MockDbWithPopulatedGraph: 3 features.
 * - feature-complete: has all 4 CRUD stages
 * - feature-incomplete: only has read + update (missing create + delete)
 * - feature-other-pkg: in @repo/other, has only create (missing read, update, delete)
 *
 * @param packageName - When provided, pre-filters rows (simulating DB WHERE clause, CR-2).
 */
function makeMockDbWithPopulatedGraph(packageName?: string): DrizzleDb {
  if (packageName === '@repo/ui') return buildMockDb(POPULATED_ALL_ROWS, UI_ROWS_ONLY)
  if (packageName === '@repo/nonexistent') return buildMockDb(POPULATED_ALL_ROWS, [])
  return buildMockDb(POPULATED_ALL_ROWS)
}

/**
 * MockDbEmpty: empty graph returns gracefully (AC-8).
 */
function makeMockDbEmpty(): DrizzleDb {
  return buildMockDb([])
}

/**
 * MockDbThrowsOnQuery: simulates DB error on leftJoin (CR-1 fix).
 */
function makeMockDbThrowsOnQuery(): DrizzleDb {
  const throwingResult: any = {
    where: vi.fn().mockRejectedValue(new Error('DB connection failed')),
  }
  throwingResult.then = (_onFulfilled: any, onRejected: any) =>
    Promise.reject(new Error('DB connection failed')).then(undefined, onRejected)

  const mockLeftJoin = vi.fn().mockReturnValue(throwingResult)
  const mockFrom = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin })
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
      // Mock simulates DB WHERE clause returning only @repo/ui rows (CR-2).
      const db = makeMockDbWithPopulatedGraph('@repo/ui')
      const result = await computeAudit(db, '@repo/ui')

      // Should only see @repo/ui features: feat-complete + feat-incomplete
      expect(result.coverageSummary.totalFeatures).toBe(2)
      expect(result.coverageSummary.completeCount).toBe(1)
      expect(result.coverageSummary.incompleteCount).toBe(1)

      const frankenIds = result.frankenFeatures.map(f => f.featureId)
      expect(frankenIds).not.toContain('feat-other') // @repo/other filtered out
    })

    it('returns empty frankenFeatures when packageName has no matches', async () => {
      // Mock simulates DB WHERE clause returning no rows for unknown package (CR-2).
      const db = makeMockDbWithPopulatedGraph('@repo/nonexistent')
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
