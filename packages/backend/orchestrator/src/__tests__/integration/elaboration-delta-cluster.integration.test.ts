/**
 * Integration tests for the elaboration delta cluster.
 *
 * Tests the end-to-end flow of: delta_detect → delta_review → escape_hatch
 * using the runElaboration() convenience function with real node implementations.
 *
 * All tests use structurerConfig: { enabled: false } to prevent LLM calls.
 * All tests use recalculateReadiness: false and persistToDb: false.
 *
 * ORCH-3010: Integration tests for elaboration delta cluster
 */

import { describe, it, expect, vi } from 'vitest'
import { runElaboration } from '../../graphs/elaboration.js'
import type { ElaborationConfig } from '../../graphs/elaboration.js'
import type { SynthesizedStory } from '../../nodes/story/synthesize.js'
import type { FinalAcceptanceCriterion } from '../../nodes/story/synthesize.js'
import type { TestHint } from '../../nodes/story/synthesize.js'
import type { KnownUnknown } from '../../nodes/story/synthesize.js'
import type { DeltaDetectionResult } from '../../nodes/elaboration/delta-detect.js'
import type { DeltaReviewResult } from '../../nodes/elaboration/delta-review.js'
import type { EscapeHatchResult } from '../../nodes/elaboration/escape-hatch.js'

vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

// ============================================================================
// Fixture builders
// ============================================================================

function createTestAC(id: string, description: string): FinalAcceptanceCriterion {
  return {
    id,
    description,
    fromBaseline: false,
    enhancedFromGaps: false,
    relatedGapIds: [],
    priority: 2,
  }
}

function createTestHint(id: string, description: string): TestHint {
  return {
    id,
    description,
    category: 'unit',
    priority: 2,
  }
}

function createTestKnownUnknown(id: string, description: string): KnownUnknown {
  return {
    id,
    description,
    source: 'story_content',
    impact: 'medium',
    acknowledged: false,
  }
}

function createElaborationTestStory(overrides: Partial<SynthesizedStory> = {}): SynthesizedStory {
  return {
    storyId: 'orch-3010',
    title: 'Integration Test Story',
    description: 'A story for integration testing the elaboration delta cluster',
    domain: 'orchestrator',
    synthesizedAt: new Date().toISOString(),
    synthesisNotes: 'Generated for integration testing',
    acceptanceCriteria: [
      createTestAC('AC-1', 'The system must process delta detection correctly'),
      createTestAC('AC-2', 'The system must perform delta review on changed sections'),
    ],
    nonGoals: [],
    testHints: [createTestHint('TH-1', 'Verify delta detection output contains all changed items')],
    knownUnknowns: [
      createTestKnownUnknown('KU-1', 'Performance characteristics under high load are unknown'),
    ],
    constraints: [],
    affectedFiles: [],
    dependencies: [],
    tags: [],
    readinessScore: 75,
    isReady: true,
    commitmentBaseline: undefined,
    ...overrides,
  } as SynthesizedStory
}

function createElaborationConfig(overrides: Partial<ElaborationConfig> = {}): Partial<ElaborationConfig> {
  return {
    recalculateReadiness: false,
    persistToDb: false,
    structurerConfig: { enabled: false },
    ...overrides,
  }
}

function createMultiSectionModifiedStory(base: SynthesizedStory): SynthesizedStory {
  // Add 1 AC + 1 testHint + 1 knownUnknown to trigger 3+ sections
  return {
    ...base,
    acceptanceCriteria: [
      ...base.acceptanceCriteria,
      createTestAC('AC-3', 'New AC for multi-section test'),
    ],
    testHints: [
      ...base.testHints,
      createTestHint('TH-2', 'New test hint for multi-section coverage test'),
    ],
    knownUnknowns: [
      ...base.knownUnknowns,
      createTestKnownUnknown('KU-2', 'Another unknown for multi-section test'),
    ],
  }
}

// ============================================================================
// HP-1: One AC added → success, detected, reviewed, escape hatch not triggered
// AC-3: delta_detect detects story changes
// ============================================================================

describe('HP-1: one AC added between iterations', () => {
  it(
    'detects change, reviews it, escape hatch not triggered, aggregated findings passed',
    async () => {
      const previousStory = createElaborationTestStory()
      const currentStory: SynthesizedStory = {
        ...previousStory,
        acceptanceCriteria: [
          ...previousStory.acceptanceCriteria,
          createTestAC('AC-3', 'New acceptance criterion added in this iteration'),
        ],
      }

      const config = createElaborationConfig()
      const result = await runElaboration(currentStory, previousStory, config)

      expect(result.success).toBe(true)
      expect(result.storyId).toBe('orch-3010')

      // Delta detection should have found the added AC
      const detection = result.deltaDetectionResult as DeltaDetectionResult | null
      expect(detection).not.toBeNull()
      expect(detection!.detected).toBe(true)
      expect(detection!.stats.totalChanges).toBeGreaterThan(0)
      expect(detection!.stats.addedCount).toBeGreaterThanOrEqual(1)

      // Delta review should have run
      const review = result.deltaReviewResult as DeltaReviewResult | null
      expect(review).not.toBeNull()
      expect(review!.reviewed).toBe(true)
      expect(review!.sectionsReviewed).toContain('acceptanceCriteria')

      // Escape hatch should NOT be triggered (only 1 section changed)
      const escapeHatch = result.escapeHatchResult as EscapeHatchResult | null
      expect(escapeHatch).not.toBeNull()
      expect(escapeHatch!.evaluated).toBe(true)
      expect(escapeHatch!.triggered).toBe(false)

      // Aggregated findings should indicate pass
      expect(result.aggregatedFindings).not.toBeNull()
      expect(result.aggregatedFindings!.passed).toBe(true)
    },
    5000,
  )
})

// ============================================================================
// HP-2: Identical stories → totalChanges: 0, delta review has no findings
// AC-4: delta_detect returns totalChanges: 0 when stories are identical
// ============================================================================

describe('HP-2: identical stories produce no deltas', () => {
  it(
    'detects zero changes, delta review has no findings, aggregated findings passed',
    async () => {
      const story = createElaborationTestStory()
      const config = createElaborationConfig()

      const result = await runElaboration(story, story, config)

      // Should complete for this story
      expect(result.storyId).toBe('orch-3010')

      // Delta detection should report 0 actual changes
      const detection = result.deltaDetectionResult as DeltaDetectionResult | null
      expect(detection).not.toBeNull()
      expect(detection!.stats.totalChanges).toBe(0)

      // Delta review runs but finds no sections with actual changes
      const review = result.deltaReviewResult as DeltaReviewResult | null
      if (review !== null) {
        // If review ran, it should have found nothing to review
        expect(review.sectionsReviewed).toHaveLength(0)
        expect(review.findings).toHaveLength(0)
        expect(review.passed).toBe(true)
      }

      // Overall should be in a passed state (no changes = nothing to fail)
      expect(result.aggregatedFindings).not.toBeNull()
      expect(result.aggregatedFindings!.passed).toBe(true)
    },
    5000,
  )
})

// ============================================================================
// HP-3: Null previousStory → success, all items treated as "added"
// ============================================================================

describe('HP-3: null previousStory initial elaboration', () => {
  it(
    'treats all items as added, runs full delta detection, succeeds',
    async () => {
      const currentStory = createElaborationTestStory()
      const config = createElaborationConfig()

      const result = await runElaboration(currentStory, null, config)

      expect(result.storyId).toBe('orch-3010')

      // With no previous story, all items are considered "added"
      const detection = result.deltaDetectionResult as DeltaDetectionResult | null
      expect(detection).not.toBeNull()
      // addedCount should reflect all ACs, testHints, knownUnknowns
      expect(detection!.stats.addedCount).toBeGreaterThan(0)

      // Should complete without errors
      expect(result.errors).toHaveLength(0)
    },
    5000,
  )
})

// ============================================================================
// EC-1: 3+ sections changed + low triggerThreshold → escape hatch triggered
// AC-5: escape_hatch triggers when cross-cutting threshold met
// ============================================================================

describe('EC-1: escape hatch triggers with 3+ sections changed', () => {
  it(
    'triggers escape hatch when changes span 3 sections with low triggerThreshold',
    async () => {
      const previousStory = createElaborationTestStory()
      const currentStory = createMultiSectionModifiedStory(previousStory)

      const config = createElaborationConfig({
        escapeHatchConfig: {
          triggerThreshold: 0.1,      // Low threshold to trigger easily
          minTriggers: 1,
          crossCuttingSectionThreshold: 3, // 3 sections triggers cross-cutting
          evaluateAttackImpact: true,
          evaluateCrossCutting: true,
          evaluateScopeExpansion: true,
          evaluateConsistency: true,
          readinessDropThreshold: 10,
        },
      })

      const result = await runElaboration(currentStory, previousStory, config)

      expect(result.storyId).toBe('orch-3010')

      // Escape hatch should be triggered
      const escapeHatch = result.escapeHatchResult as EscapeHatchResult | null
      expect(escapeHatch).not.toBeNull()
      expect(escapeHatch!.evaluated).toBe(true)
      expect(escapeHatch!.triggered).toBe(true)

      // Aggregated findings should reflect that escape hatch was triggered (not passed)
      expect(result.aggregatedFindings).not.toBeNull()
      expect(result.aggregatedFindings!.escapeHatchTriggered).toBe(true)
      expect(result.aggregatedFindings!.passed).toBe(false)
    },
    5000,
  )
})

// ============================================================================
// EC-2: Critical finding (TBD text in AC) → aggregatedFindings.passed: false
// AC-11: delta_review fails on critical findings (TBD pattern)
// ============================================================================

describe('EC-2: critical finding causes aggregated findings to fail', () => {
  it(
    'marks aggregatedFindings.passed as false when delta review finds critical TBD AC',
    async () => {
      const previousStory = createElaborationTestStory()
      // Add an AC with TBD placeholder content — triggers critical finding
      const currentStory: SynthesizedStory = {
        ...previousStory,
        acceptanceCriteria: [
          ...previousStory.acceptanceCriteria,
          createTestAC('AC-99', 'TBD: implementation details to be determined later'),
        ],
      }

      const config = createElaborationConfig({
        deltaReviewConfig: {
          failOnCritical: true,
          failOnMajor: false,
          reviewAdded: true,
          reviewModified: true,
          reviewRemoved: true,
          maxFindingsPerSection: 10,
          minSeverity: 'info',
        },
      })

      const result = await runElaboration(currentStory, previousStory, config)

      expect(result.storyId).toBe('orch-3010')

      // Delta review should find critical finding
      const review = result.deltaReviewResult as DeltaReviewResult | null
      expect(review).not.toBeNull()
      expect(review!.reviewed).toBe(true)
      expect(review!.findingsBySeverity.critical).toBeGreaterThan(0)
      expect(review!.passed).toBe(false)

      // Aggregated findings should fail
      expect(result.aggregatedFindings).not.toBeNull()
      expect(result.aggregatedFindings!.passed).toBe(false)
      expect(result.aggregatedFindings!.criticalCount).toBeGreaterThan(0)
    },
    5000,
  )
})

// ============================================================================
// ED-1: Empty story + null previous → success, no crash
// ============================================================================

describe('ED-1: empty story with null previous does not crash', () => {
  it(
    'handles empty story with no ACs, testHints, or knownUnknowns gracefully',
    async () => {
      const emptyStory = createElaborationTestStory({
        acceptanceCriteria: [],
        testHints: [],
        knownUnknowns: [],
        nonGoals: [],
        constraints: [],
        affectedFiles: [],
        dependencies: [],
      })

      const config = createElaborationConfig()

      const result = await runElaboration(emptyStory, null, config)

      expect(result.storyId).toBe('orch-3010')
      expect(result.errors).toHaveLength(0)
      // Should complete without errors
      expect(result.phase).not.toBe('error')
    },
    5000,
  )
})

// ============================================================================
// ED-2: High triggerThreshold (0.99) → escape hatch NOT triggered
// ============================================================================

describe('ED-2: high triggerThreshold prevents escape hatch from triggering', () => {
  it(
    'does not trigger escape hatch when threshold is very high (0.99)',
    async () => {
      const previousStory = createElaborationTestStory()
      const currentStory = createMultiSectionModifiedStory(previousStory)

      const config = createElaborationConfig({
        escapeHatchConfig: {
          triggerThreshold: 0.99,     // Very high threshold
          minTriggers: 1,
          crossCuttingSectionThreshold: 3,
          evaluateAttackImpact: true,
          evaluateCrossCutting: true,
          evaluateScopeExpansion: true,
          evaluateConsistency: true,
          readinessDropThreshold: 10,
        },
      })

      const result = await runElaboration(currentStory, previousStory, config)

      expect(result.storyId).toBe('orch-3010')

      // Escape hatch should NOT be triggered because no trigger has confidence >= 0.99
      const escapeHatch = result.escapeHatchResult as EscapeHatchResult | null
      expect(escapeHatch).not.toBeNull()
      expect(escapeHatch!.evaluated).toBe(true)
      expect(escapeHatch!.triggered).toBe(false)
    },
    5000,
  )
})

// ============================================================================
// AC-8: Timing — all tests complete under 5 seconds (enforced by vitest timeout)
// ============================================================================

describe('AC-8: timing — workflow completes within 5 seconds', () => {
  it(
    'full elaboration run with delta detection, review, and escape hatch completes in time',
    async () => {
      const previousStory = createElaborationTestStory()
      const currentStory: SynthesizedStory = {
        ...previousStory,
        acceptanceCriteria: [
          ...previousStory.acceptanceCriteria,
          createTestAC('AC-3', 'Timing test: new criterion must be processed quickly'),
        ],
      }

      const config = createElaborationConfig()

      const start = Date.now()
      const result = await runElaboration(currentStory, previousStory, config)
      const elapsed = Date.now() - start

      expect(result.storyId).toBe('orch-3010')
      expect(elapsed).toBeLessThan(5000)
      // durationMs in result should also be reasonable
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
      expect(result.durationMs).toBeLessThan(5000)
    },
    5000,
  )
})
