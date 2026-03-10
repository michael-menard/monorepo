/**
 * Unit Tests for computeCheck
 * WINT-4010: Create Cohesion Sidecar
 *
 * AC-10: ≥80% branch coverage
 * AC-4: Tests verify featureId, status, violations, capabilityCoverage shape
 * AC-8: unknown status when feature not found
 */

import { describe, it, expect, vi } from 'vitest'
import { computeCheck } from '../compute-check.js'
import type { DrizzleDb } from '../compute-check.js'

// ============================================================================
// Mock DB Fixtures
// ============================================================================

/**
 * Mock DB returning all 4 CRUD capabilities — complete feature
 */
function createMockDbComplete(): DrizzleDb {
  return {
    select: () => ({
      from: () => ({
        where: () =>
          Promise.resolve([
            { id: '1', featureId: 'uuid-wish', lifecycleStage: 'create' },
            { id: '2', featureId: 'uuid-wish', lifecycleStage: 'read' },
            { id: '3', featureId: 'uuid-wish', lifecycleStage: 'update' },
            { id: '4', featureId: 'uuid-wish', lifecycleStage: 'delete' },
          ]),
      }),
    }),
  } as any
}

/**
 * Mock DB returning only create + read — incomplete feature
 */
function createMockDbIncomplete(): DrizzleDb {
  return {
    select: () => ({
      from: () => ({
        where: () =>
          Promise.resolve([
            { id: '1', featureId: 'uuid-wint', lifecycleStage: 'create' },
            { id: '2', featureId: 'uuid-wint', lifecycleStage: 'read' },
          ]),
      }),
    }),
  } as any
}

/**
 * Mock DB returning empty — unknown feature
 * AC-8: Returns {status: 'unknown'} not error
 */
function createMockDbUnknown(): DrizzleDb {
  return {
    select: () => ({
      from: () => ({
        where: () => Promise.resolve([]),
      }),
    }),
  } as any
}

/**
 * Mock DB returning rows with null lifecycleStage
 */
function createMockDbNullStage(): DrizzleDb {
  return {
    select: () => ({
      from: () => ({
        where: () =>
          Promise.resolve([
            { id: '1', featureId: 'uuid-test', lifecycleStage: null },
            { id: '2', featureId: 'uuid-test', lifecycleStage: 'create' },
          ]),
      }),
    }),
  } as any
}

/**
 * Mock DB that throws on query
 */
function createMockDbThrows(): DrizzleDb {
  return {
    select: () => ({
      from: () => ({
        where: () => Promise.reject(new Error('DB connection failed')),
      }),
    }),
  } as any
}

// ============================================================================
// Tests
// ============================================================================

describe('computeCheck', () => {
  describe('HP-3: complete status for fully-covered feature', () => {
    it('returns complete status when all 4 CRUD stages present', async () => {
      const db = createMockDbComplete()
      const result = await computeCheck('uuid-wish', db)

      expect(result.featureId).toBe('uuid-wish')
      expect(result.status).toBe('complete')
      expect(result.violations).toHaveLength(0)
      expect(result.capabilityCoverage.create).toBe(true)
      expect(result.capabilityCoverage.read).toBe(true)
      expect(result.capabilityCoverage.update).toBe(true)
      expect(result.capabilityCoverage.delete).toBe(true)
    })
  })

  describe('HP-4: incomplete status for partial feature', () => {
    it('returns incomplete status with violations when update and delete are missing', async () => {
      const db = createMockDbIncomplete()
      const result = await computeCheck('uuid-wint', db)

      expect(result.featureId).toBe('uuid-wint')
      expect(result.status).toBe('incomplete')
      expect(result.violations).toContain('missing update capability')
      expect(result.violations).toContain('missing delete capability')
      expect(result.violations).not.toContain('missing create capability')
      expect(result.violations).not.toContain('missing read capability')
    })

    it('capabilityCoverage reflects partial coverage', async () => {
      const db = createMockDbIncomplete()
      const result = await computeCheck('uuid-wint', db)

      expect(result.capabilityCoverage.create).toBe(true)
      expect(result.capabilityCoverage.read).toBe(true)
      expect(result.capabilityCoverage.update).toBe(false)
      expect(result.capabilityCoverage.delete).toBe(false)
    })
  })

  describe('ED-2: unknown status for unknown featureId (AC-8)', () => {
    it('returns unknown status when no capabilities found', async () => {
      const db = createMockDbUnknown()
      const result = await computeCheck('nonexistent', db)

      expect(result.featureId).toBe('nonexistent')
      expect(result.status).toBe('unknown')
      expect(result.violations).toHaveLength(0)
      expect(result.capabilityCoverage).toEqual({})
    })

    it('does not throw for unknown feature — graceful result', async () => {
      const db = createMockDbUnknown()
      await expect(computeCheck('nonexistent', db)).resolves.not.toThrow()
    })
  })

  describe('null lifecycleStage handling', () => {
    it('ignores null lifecycleStage values', async () => {
      const db = createMockDbNullStage()
      const result = await computeCheck('uuid-test', db)

      // Only 'create' is non-null; result should be incomplete
      expect(result.status).toBe('incomplete')
      expect(result.capabilityCoverage.create).toBe(true)
      expect(result.capabilityCoverage.read).toBe(false)
    })
  })

  describe('EC-4: DB error path', () => {
    it('throws when DB fails (caught by route handler)', async () => {
      const db = createMockDbThrows()
      await expect(computeCheck('any-id', db)).rejects.toThrow('DB connection failed')
    })

    it('logs warning on DB error', async () => {
      const db = createMockDbThrows()
      const { logger } = await import('@repo/logger')
      const warnSpy = vi.spyOn(logger, 'warn')

      await expect(computeCheck('any-id', db)).rejects.toThrow()
      expect(warnSpy).toHaveBeenCalledWith(
        '[cohesion] computeCheck failed',
        expect.objectContaining({ error: 'DB connection failed', featureId: 'any-id' }),
      )
    })
  })
})
