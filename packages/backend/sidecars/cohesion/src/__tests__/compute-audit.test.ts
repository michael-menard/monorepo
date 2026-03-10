/**
 * Unit Tests for computeAudit
 * WINT-4010: Create Cohesion Sidecar
 *
 * AC-10: ≥80% branch coverage
 * AC-8: MockDbEmpty scenario returns graceful empty result
 * AC-6: db is injected as parameter
 */

import { describe, it, expect, vi } from 'vitest'
import { computeAudit } from '../compute-audit.js'
import type { DrizzleDb } from '../compute-audit.js'

// ============================================================================
// Mock DB Fixtures
// ============================================================================

type MockRow = {
  featureId: string
  featureName: string
  packageName: string | null
  lifecycleStage: string | null
}

/**
 * Build a thenable object that is also awaitable (Promise-like).
 * - Direct await (no packageName filter): resolves to allRows
 * - .where() call (packageName filter): resolves to filteredRows (pre-filtered by caller)
 *
 * CR-1/CR-2 fix: leftJoin replaces innerJoin; packageName filtering moves to SQL WHERE.
 * These mocks mirror the new call chain:
 *   db.select().from().leftJoin()          → direct await (no filter)
 *   db.select().from().leftJoin().where()  → filtered await (caller provides filtered rows)
 */
function makeLeftJoinResult(allRows: MockRow[], filteredRows?: MockRow[]) {
  const whereRows = filteredRows ?? allRows
  const result: any = {
    where: () => Promise.resolve(whereRows),
  }
  // Make the result directly awaitable (PromiseLike) for the no-filter path
  result.then = (onFulfilled: (v: MockRow[]) => unknown, onRejected: (e: unknown) => unknown) =>
    Promise.resolve(allRows).then(onFulfilled, onRejected)
  return result
}

const ALL_ROWS: MockRow[] = [
  // wish — all 4 CRUD stages
  { featureId: 'uuid-wish', featureName: 'wish', packageName: '@repo/wish', lifecycleStage: 'create' },
  { featureId: 'uuid-wish', featureName: 'wish', packageName: '@repo/wish', lifecycleStage: 'read' },
  { featureId: 'uuid-wish', featureName: 'wish', packageName: '@repo/wish', lifecycleStage: 'update' },
  { featureId: 'uuid-wish', featureName: 'wish', packageName: '@repo/wish', lifecycleStage: 'delete' },
  // wint — only create + read (missing update, delete)
  { featureId: 'uuid-wint', featureName: 'wint', packageName: '@repo/wint', lifecycleStage: 'create' },
  { featureId: 'uuid-wint', featureName: 'wint', packageName: '@repo/wint', lifecycleStage: 'read' },
  // kfmb — only create (missing read, update, delete)
  { featureId: 'uuid-kfmb', featureName: 'kfmb', packageName: '@repo/kfmb', lifecycleStage: 'create' },
]

const WINT_ROWS: MockRow[] = ALL_ROWS.filter(r => r.packageName === '@repo/wint')

/**
 * MockDbWithPopulatedGraph — 3 features: wish (complete), wint (incomplete), kfmb (incomplete)
 * filteredRows: pre-filtered rows the DB would return for a packageName WHERE clause.
 */
function createMockDbPopulated(filteredRows?: MockRow[]): DrizzleDb {
  return {
    select: () => ({
      from: () => ({
        leftJoin: () => makeLeftJoinResult(ALL_ROWS, filteredRows),
      }),
    }),
  } as any
}

/**
 * MockDbEmpty — no features in graph (WINT-4030 not yet run)
 * AC-8: Must return graceful empty result
 */
function createMockDbEmpty(): DrizzleDb {
  return {
    select: () => ({
      from: () => ({
        leftJoin: () => makeLeftJoinResult([]),
      }),
    }),
  } as any
}

/**
 * MockDbThrowsOnQuery — simulates DB connection failure
 */
function createMockDbThrows(): DrizzleDb {
  const throwingResult: any = {
    where: () => Promise.reject(new Error('DB connection failed')),
  }
  throwingResult.then = (_onFulfilled: unknown, onRejected: (e: unknown) => unknown) =>
    Promise.reject(new Error('DB connection failed')).then(undefined, onRejected)

  return {
    select: () => ({
      from: () => ({
        leftJoin: () => throwingResult,
      }),
    }),
  } as any
}

// ============================================================================
// Tests
// ============================================================================

describe('computeAudit', () => {
  describe('MockDbWithPopulatedGraph', () => {
    it('HP-1: returns all franken-features when graph is populated', async () => {
      const db = createMockDbPopulated()
      const result = await computeAudit({}, db)

      expect(result.frankenFeatures).toHaveLength(2)
      expect(result.coverageSummary.totalFeatures).toBe(3)
      expect(result.coverageSummary.completeCount).toBe(1)
      expect(result.coverageSummary.incompleteCount).toBe(2)
    })

    it('HP-1: identifies wint as franken-feature with missing update and delete', async () => {
      const db = createMockDbPopulated()
      const result = await computeAudit({}, db)

      const wint = result.frankenFeatures.find(f => f.featureId === 'uuid-wint')
      expect(wint).toBeDefined()
      expect(wint!.featureName).toBe('wint')
      expect(wint!.missingCapabilities).toContain('update')
      expect(wint!.missingCapabilities).toContain('delete')
      expect(wint!.missingCapabilities).not.toContain('create')
      expect(wint!.missingCapabilities).not.toContain('read')
    })

    it('HP-1: identifies kfmb as franken-feature with 3 missing capabilities', async () => {
      const db = createMockDbPopulated()
      const result = await computeAudit({}, db)

      const kfmb = result.frankenFeatures.find(f => f.featureId === 'uuid-kfmb')
      expect(kfmb).toBeDefined()
      expect(kfmb!.missingCapabilities).toHaveLength(3)
      expect(kfmb!.missingCapabilities).toContain('read')
      expect(kfmb!.missingCapabilities).toContain('update')
      expect(kfmb!.missingCapabilities).toContain('delete')
    })

    it('HP-2: filters by packageName — returns only wint features', async () => {
      // The DB WHERE clause filters to WINT_ROWS; mock simulates that pre-filtering.
      const db = createMockDbPopulated(WINT_ROWS)
      const result = await computeAudit({ packageName: '@repo/wint' }, db)

      expect(result.frankenFeatures).toHaveLength(1)
      expect(result.frankenFeatures[0].featureId).toBe('uuid-wint')
      expect(result.coverageSummary.totalFeatures).toBe(1)
      expect(result.coverageSummary.incompleteCount).toBe(1)
      expect(result.coverageSummary.completeCount).toBe(0)
    })

    it('HP-2: null packageName treated as no filter — returns all features', async () => {
      // null packageName skips the WHERE clause; mock returns all rows directly.
      const db = createMockDbPopulated()
      const result = await computeAudit({ packageName: null }, db)

      expect(result.coverageSummary.totalFeatures).toBe(3)
    })

    it('wish is NOT in frankenFeatures (has all 4 CRUD stages)', async () => {
      const db = createMockDbPopulated()
      const result = await computeAudit({}, db)

      const wish = result.frankenFeatures.find(f => f.featureId === 'uuid-wish')
      expect(wish).toBeUndefined()
    })
  })

  describe('MockDbEmpty — graceful empty result (AC-8)', () => {
    it('AC-8: returns empty frankenFeatures and zero counts when graph is empty', async () => {
      const db = createMockDbEmpty()
      const result = await computeAudit({}, db)

      expect(result.frankenFeatures).toHaveLength(0)
      expect(result.coverageSummary.totalFeatures).toBe(0)
      expect(result.coverageSummary.completeCount).toBe(0)
      expect(result.coverageSummary.incompleteCount).toBe(0)
    })

    it('AC-8: empty result is not an error — no throw', async () => {
      const db = createMockDbEmpty()
      await expect(computeAudit({}, db)).resolves.not.toThrow()
    })
  })

  describe('MockDbThrowsOnQuery — error path', () => {
    it('EC-4: throws when DB fails (caught by route handler)', async () => {
      const db = createMockDbThrows()
      await expect(computeAudit({}, db)).rejects.toThrow('DB connection failed')
    })

    it('EC-4: logs warning on DB error', async () => {
      const db = createMockDbThrows()
      const { logger } = await import('@repo/logger')
      const warnSpy = vi.spyOn(logger, 'warn')

      await expect(computeAudit({}, db)).rejects.toThrow()
      expect(warnSpy).toHaveBeenCalledWith(
        '[cohesion] computeAudit failed',
        expect.objectContaining({ error: 'DB connection failed' }),
      )
    })
  })
})
