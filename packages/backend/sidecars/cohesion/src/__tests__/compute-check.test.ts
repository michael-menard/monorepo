/**
 * Unit Tests for computeCheck
 * WINT-4010: Create Cohesion Sidecar
 *
 * Tests computeCheck with injectable mock DB fixtures for:
 * - complete: all 4 CRUD stages present
 * - incomplete: some stages missing
 * - unknown: feature not found
 * - DB error: graceful fallback
 */

import { describe, it, expect, vi } from 'vitest'
import { computeCheck } from '../compute-check.js'
import type { DrizzleDb } from '../compute-audit.js'

// ============================================================================
// Mock DB Factories
// ============================================================================

/**
 * Build a mock DB for computeCheck that:
 * 1. First select (features table) returns featureRows
 * 2. Second select (capabilities table) returns capabilityRows
 */
function buildMockDbForCheck(featureRows: any[], capabilityRows: any[]): DrizzleDb {
  let callCount = 0
  const mockDb: any = {
    select: vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // First call: features query
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(featureRows),
          }),
        }
      } else {
        // Second call: capabilities query
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(capabilityRows),
          }),
        }
      }
    }),
  }
  return mockDb as DrizzleDb
}

const FEATURE_ID = 'test-feature-uuid'

const MOCK_FEATURE_ROW = [
  { id: FEATURE_ID, featureName: 'test-feature', packageName: '@repo/ui' },
]

function makeCapabilityRows(stages: string[]) {
  return stages.map((stage, i) => ({
    id: `cap-${i}`,
    lifecycleStage: stage,
    featureId: FEATURE_ID,
  }))
}

// ============================================================================
// Tests
// ============================================================================

describe('computeCheck', () => {
  describe('complete — all 4 CRUD stages present', () => {
    it('returns status=complete when all 4 stages present', async () => {
      const db = buildMockDbForCheck(
        MOCK_FEATURE_ROW,
        makeCapabilityRows(['create', 'read', 'update', 'delete']),
      )
      const result = await computeCheck(db, FEATURE_ID)

      expect(result.featureId).toBe(FEATURE_ID)
      expect(result.status).toBe('complete')
      expect(result.violations).toHaveLength(0)
    })

    it('returns all capabilityCoverage=true when complete', async () => {
      const db = buildMockDbForCheck(
        MOCK_FEATURE_ROW,
        makeCapabilityRows(['create', 'read', 'update', 'delete']),
      )
      const result = await computeCheck(db, FEATURE_ID)

      expect(result.capabilityCoverage).toEqual({
        create: true,
        read: true,
        update: true,
        delete: true,
      })
    })
  })

  describe('incomplete — some stages missing', () => {
    it('returns status=incomplete when some stages missing', async () => {
      const db = buildMockDbForCheck(
        MOCK_FEATURE_ROW,
        makeCapabilityRows(['read', 'update']), // missing create + delete
      )
      const result = await computeCheck(db, FEATURE_ID)

      expect(result.status).toBe('incomplete')
    })

    it('returns violations for missing stages', async () => {
      const db = buildMockDbForCheck(
        MOCK_FEATURE_ROW,
        makeCapabilityRows(['read', 'update']),
      )
      const result = await computeCheck(db, FEATURE_ID)

      expect(result.violations).toContain('Missing create capability')
      expect(result.violations).toContain('Missing delete capability')
      expect(result.violations).not.toContain('Missing read capability')
      expect(result.violations).not.toContain('Missing update capability')
    })

    it('returns correct capabilityCoverage boolean map', async () => {
      const db = buildMockDbForCheck(
        MOCK_FEATURE_ROW,
        makeCapabilityRows(['read', 'update']),
      )
      const result = await computeCheck(db, FEATURE_ID)

      expect(result.capabilityCoverage).toEqual({
        create: false,
        read: true,
        update: true,
        delete: false,
      })
    })
  })

  describe('unknown — feature not found', () => {
    it('returns status=unknown when feature not found', async () => {
      const db = buildMockDbForCheck(
        [], // empty feature rows
        [],
      )
      const result = await computeCheck(db, FEATURE_ID)

      expect(result.status).toBe('unknown')
      expect(result.violations).toContain('Feature not found')
    })

    it('returns all capabilityCoverage=false when unknown', async () => {
      const db = buildMockDbForCheck([], [])
      const result = await computeCheck(db, FEATURE_ID)

      expect(result.capabilityCoverage).toEqual({
        create: false,
        read: false,
        update: false,
        delete: false,
      })
    })

    it('preserves featureId in response when unknown', async () => {
      const db = buildMockDbForCheck([], [])
      const result = await computeCheck(db, FEATURE_ID)

      expect(result.featureId).toBe(FEATURE_ID)
    })
  })

  describe('DB error path', () => {
    it('returns graceful result on DB error', async () => {
      const mockDb: any = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockRejectedValue(new Error('DB connection failed')),
          }),
        }),
      }

      const result = await computeCheck(mockDb as DrizzleDb, FEATURE_ID)

      expect(result.status).toBe('unknown')
      expect(result.featureId).toBe(FEATURE_ID)
    })

    it('does not throw on DB error', async () => {
      const mockDb: any = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockRejectedValue(new Error('DB failure')),
          }),
        }),
      }

      await expect(computeCheck(mockDb as DrizzleDb, FEATURE_ID)).resolves.not.toThrow()
    })
  })
})
