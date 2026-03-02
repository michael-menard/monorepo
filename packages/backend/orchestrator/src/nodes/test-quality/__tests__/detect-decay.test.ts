/**
 * Unit tests for decayDetector
 *
 * Uses inline snapshot pairs to verify decay detection logic.
 * Key scenario: mutation score drops below 0.60 floor → decayed === true
 *
 * APIP-4040 AC-12(c)
 */

import { describe, it, expect } from 'vitest'
import { detectDecay } from '../detect-decay.js'
import { TestQualityMonitorConfigSchema, type TestQualitySnapshot } from '../schemas.js'
import { DecayDetectionResultSchema } from '../schemas.js'

const defaultConfig = TestQualityMonitorConfigSchema.parse({})

/**
 * Creates a minimal snapshot for test purposes.
 */
function makeSnapshot(overrides: Partial<TestQualitySnapshot> = {}): TestQualitySnapshot {
  return {
    snapshotAt: new Date().toISOString(),
    status: 'pass',
    assertionCount: 100,
    testCount: 50,
    assertionDensityRatio: 2.0,
    orphanedTestCount: 0,
    criticalPathLineCoverage: 90,
    criticalPathBranchCoverage: 85,
    mutationScore: null,
    config: defaultConfig,
    ...overrides,
  }
}

describe('detectDecay', () => {
  describe('no previous snapshot (first run)', () => {
    it('returns decayed=false when previous is null', () => {
      const current = makeSnapshot()
      const result = detectDecay(current, null)

      expect(result.decayed).toBe(false)
      expect(result.decayedMetrics).toHaveLength(0)
      expect(result.previousSnapshotAt).toBeNull()
    })

    it('returns current snapshot timestamp', () => {
      const current = makeSnapshot()
      const result = detectDecay(current, null)

      expect(result.currentSnapshotAt).toBe(current.snapshotAt)
    })
  })

  describe('assertion density decay', () => {
    it('detects decay when density falls below floor', () => {
      const previous = makeSnapshot({ assertionDensityRatio: 2.0 })
      const current = makeSnapshot({
        assertionDensityRatio: 1.0, // Below default floor of 1.5
        config: defaultConfig,
      })

      const result = detectDecay(current, previous)

      expect(result.decayed).toBe(true)
      expect(result.decayedMetrics.some(m => m.metric === 'assertionDensityRatio')).toBe(true)
    })

    it('does not flag decay when density meets floor', () => {
      const previous = makeSnapshot({ assertionDensityRatio: 2.0 })
      const current = makeSnapshot({ assertionDensityRatio: 1.8 }) // above 1.5 floor

      const result = detectDecay(current, previous)

      expect(result.decayedMetrics.some(m => m.metric === 'assertionDensityRatio')).toBe(false)
    })
  })

  describe('orphaned test count decay', () => {
    it('detects decay when orphaned count exceeds maximum', () => {
      const previous = makeSnapshot({ orphanedTestCount: 0 })
      const current = makeSnapshot({ orphanedTestCount: 3 }) // above default max of 0

      const result = detectDecay(current, previous)

      expect(result.decayed).toBe(true)
      expect(result.decayedMetrics.some(m => m.metric === 'orphanedTestCount')).toBe(true)
    })

    it('does not flag when orphaned count is at floor', () => {
      const previous = makeSnapshot({ orphanedTestCount: 0 })
      const current = makeSnapshot({ orphanedTestCount: 0 })

      const result = detectDecay(current, previous)

      expect(result.decayedMetrics.some(m => m.metric === 'orphanedTestCount')).toBe(false)
    })
  })

  describe('critical path coverage decay', () => {
    it('detects decay when coverage falls below floor', () => {
      const previous = makeSnapshot({ criticalPathLineCoverage: 90 })
      const current = makeSnapshot({ criticalPathLineCoverage: 75 }) // below 80% floor (80 pct)

      const result = detectDecay(current, previous)

      expect(result.decayed).toBe(true)
      expect(result.decayedMetrics.some(m => m.metric === 'criticalPathLineCoverage')).toBe(true)
    })

    it('does not flag when coverage meets floor', () => {
      const previous = makeSnapshot({ criticalPathLineCoverage: 90 })
      const current = makeSnapshot({ criticalPathLineCoverage: 85 }) // above 80% floor

      const result = detectDecay(current, previous)

      expect(result.decayedMetrics.some(m => m.metric === 'criticalPathLineCoverage')).toBe(false)
    })
  })

  describe('mutation score decay (APIP-4040-B)', () => {
    it('detects decay when mutation score drops below 0.60 floor', () => {
      const previous = makeSnapshot({ mutationScore: 0.75 })
      const current = makeSnapshot({
        mutationScore: 0.45, // Below the 0.60 floor
      })

      const result = detectDecay(current, previous)

      expect(result.decayed).toBe(true)
      const mutationDecay = result.decayedMetrics.find(m => m.metric === 'mutationScore')
      expect(mutationDecay).toBeDefined()
      expect(mutationDecay?.currentValue).toBe(0.45)
      expect(mutationDecay?.floor).toBe(0.6)
    })

    it('does not flag when mutation score meets floor', () => {
      const previous = makeSnapshot({ mutationScore: 0.75 })
      const current = makeSnapshot({ mutationScore: 0.72 }) // above 0.60 floor

      const result = detectDecay(current, previous)

      expect(result.decayedMetrics.some(m => m.metric === 'mutationScore')).toBe(false)
    })

    it('skips mutation comparison when either snapshot has null score', () => {
      const previous = makeSnapshot({ mutationScore: null })
      const current = makeSnapshot({ mutationScore: null })

      const result = detectDecay(current, previous)

      expect(result.decayedMetrics.some(m => m.metric === 'mutationScore')).toBe(false)
    })

    it('skips mutation comparison when only current is null', () => {
      const previous = makeSnapshot({ mutationScore: 0.75 })
      const current = makeSnapshot({ mutationScore: null })

      const result = detectDecay(current, previous)

      expect(result.decayedMetrics.some(m => m.metric === 'mutationScore')).toBe(false)
    })
  })

  describe('multiple metric decay', () => {
    it('detects multiple decays simultaneously', () => {
      const previous = makeSnapshot({ assertionDensityRatio: 2.0, orphanedTestCount: 0 })
      const current = makeSnapshot({
        assertionDensityRatio: 1.0, // below floor
        orphanedTestCount: 5, // above max
      })

      const result = detectDecay(current, previous)

      expect(result.decayed).toBe(true)
      expect(result.decayedMetrics.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('schema validation', () => {
    it('returns result parseable by DecayDetectionResultSchema', () => {
      const previous = makeSnapshot()
      const current = makeSnapshot({ assertionDensityRatio: 1.0 })

      const result = detectDecay(current, previous)
      expect(() => DecayDetectionResultSchema.parse(result)).not.toThrow()
    })
  })
})
