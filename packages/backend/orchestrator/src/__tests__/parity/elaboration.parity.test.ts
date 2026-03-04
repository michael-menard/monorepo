/**
 * elaboration.parity.test.ts
 *
 * Parity tests for the elaboration workflow (WINT-9120 AC-4).
 *
 * Compares:
 *   - Claude Code path: direct node invocation path (mock agent path)
 *   - LangGraph path: runElaboration() compiled graph
 *
 * Both paths accept the same SynthesizedStory + delta fixture.
 * Outputs are validated via ElaborationResultSchema (structural equivalence only).
 *
 * All AI/LLM calls are injected as vi.fn() mocks — no real network calls (AC-6).
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { z } from 'zod'
import { runParity, ParityResultSchema } from './parity-harness.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

// ============================================================================
// Shared output schema for parity comparison (ElaborationResult shape)
// ============================================================================

const ElaborationOutputSchema = z.object({
  storyId: z.string().min(1),
  phase: z.string().min(1),
  success: z.boolean(),
  deltaDetectionResult: z.unknown().nullable(),
  deltaReviewResult: z.unknown().nullable(),
  escapeHatchResult: z.unknown().nullable(),
  aggregatedFindings: z.unknown().nullable(),
  updatedReadinessResult: z.unknown().nullable(),
  previousReadinessScore: z.number().nullable(),
  newReadinessScore: z.number().nullable(),
  warnings: z.array(z.string()),
  errors: z.array(z.string()),
  durationMs: z.number().min(0),
  completedAt: z.string().datetime(),
  changeOutline: z.unknown().nullable(),
  totalEstimatedAtomicChanges: z.number().nullable(),
  splitRequired: z.boolean(),
  splitReason: z.string().nullable(),
})

type ElaborationOutput = z.infer<typeof ElaborationOutputSchema>

// ============================================================================
// Fixture factories
// ============================================================================

const SynthesizedStoryFixtureSchema = z.object({
  storyId: z.string(),
  title: z.string(),
  description: z.string(),
  domain: z.string(),
  synthesizedAt: z.string(),
  acceptanceCriteria: z.array(z.unknown()),
  constraints: z.array(z.string()),
  affectedFiles: z.array(z.string()),
  dependencies: z.array(z.string()),
  tags: z.array(z.string()),
  readinessScore: z.number(),
  isReady: z.boolean(),
  synthesisNotes: z.string(),
})

type SynthesizedStoryFixture = z.infer<typeof SynthesizedStoryFixtureSchema>

function createTestSynthesizedStory(
  overrides: Partial<SynthesizedStoryFixture> = {},
): SynthesizedStoryFixture {
  return {
    storyId: 'wint-0042',
    title: 'Test Elaboration Story',
    description: 'A story for parity testing elaboration',
    domain: 'wint/test',
    synthesizedAt: new Date().toISOString(),
    acceptanceCriteria: [{ id: 'AC-1', description: 'Test passes', fromBaseline: false }],
    constraints: ['Do not break existing API'],
    affectedFiles: ['src/nodes/elaboration/index.ts'],
    dependencies: [],
    tags: ['parity', 'test'],
    readinessScore: 80,
    isReady: true,
    synthesisNotes: 'Parity test fixture story',
    ...overrides,
  }
}

const ElaborationFixtureSchema = z.object({
  currentStory: SynthesizedStoryFixtureSchema,
  previousStory: SynthesizedStoryFixtureSchema.nullable(),
})

type ElaborationFixture = z.infer<typeof ElaborationFixtureSchema>

function createElaborationFixture(overrides: Partial<ElaborationFixture> = {}): ElaborationFixture {
  return {
    currentStory: createTestSynthesizedStory(),
    previousStory: null,
    ...overrides,
  }
}

function createTestElaborationOutput(
  overrides: Partial<ElaborationOutput> = {},
): ElaborationOutput {
  return {
    storyId: 'wint-0042',
    phase: 'complete',
    success: true,
    deltaDetectionResult: null,
    deltaReviewResult: null,
    escapeHatchResult: null,
    aggregatedFindings: {
      storyId: 'wint-0042',
      aggregatedAt: new Date().toISOString(),
      totalFindings: 0,
      criticalCount: 0,
      majorCount: 0,
      minorCount: 0,
      infoCount: 0,
      escapeHatchTriggered: false,
      sectionsNeedingAttention: [],
      recommendedStakeholders: [],
      passed: true,
      summary: 'Elaboration PASSED.',
    },
    updatedReadinessResult: null,
    previousReadinessScore: null,
    newReadinessScore: null,
    warnings: [],
    errors: [],
    durationMs: 150,
    completedAt: new Date().toISOString(),
    changeOutline: null,
    totalEstimatedAtomicChanges: null,
    splitRequired: false,
    splitReason: null,
    ...overrides,
  }
}

// ============================================================================
// Tests: HP-3 — Matching outputs (elaboration)
// ============================================================================

describe('elaboration parity: matching verdict (HP-3)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-03T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('returns matching verdict when both runners produce identical Elaboration outputs', async () => {
    const fixture = createElaborationFixture()
    const sharedOutput = createTestElaborationOutput()

    const claudeCodeRunner = vi.fn().mockResolvedValue(sharedOutput)
    const langGraphRunner = vi.fn().mockResolvedValue(sharedOutput)

    const result = await runParity({
      input: fixture,
      claudeCodeRunner,
      langGraphRunner,
      outputSchema: ElaborationOutputSchema,
    })

    expect(result.verdict).toBe('matching')
    expect(result.diff).toHaveLength(0)
    expect(result.error).toBeUndefined()
  })

  it('ParityResult passes schema validation for matching elaboration verdict', async () => {
    const sharedOutput = createTestElaborationOutput()

    const result = await runParity({
      input: createElaborationFixture(),
      claudeCodeRunner: vi.fn().mockResolvedValue(sharedOutput),
      langGraphRunner: vi.fn().mockResolvedValue(sharedOutput),
      outputSchema: ElaborationOutputSchema,
    })

    expect(() => ParityResultSchema.parse(result)).not.toThrow()
  })

  it('both runners receive the same SynthesizedStory + delta fixture (AC-6)', async () => {
    const fixture = createElaborationFixture({
      previousStory: createTestSynthesizedStory({ title: 'Previous Version' }),
    })
    const sharedOutput = createTestElaborationOutput()

    const claudeCodeRunner = vi.fn().mockResolvedValue(sharedOutput)
    const langGraphRunner = vi.fn().mockResolvedValue(sharedOutput)

    await runParity({
      input: fixture,
      claudeCodeRunner,
      langGraphRunner,
      outputSchema: ElaborationOutputSchema,
    })

    expect(claudeCodeRunner).toHaveBeenCalledWith(fixture)
    expect(langGraphRunner).toHaveBeenCalledWith(fixture)
  })
})

// ============================================================================
// Tests: Divergent outputs (elaboration)
// ============================================================================

describe('elaboration parity: divergent verdict', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('returns divergent when phase differs between paths', async () => {
    const claudeOutput = createTestElaborationOutput({ phase: 'complete' })
    const lgOutput = createTestElaborationOutput({ phase: 'error' })

    const result = await runParity({
      input: createElaborationFixture(),
      claudeCodeRunner: vi.fn().mockResolvedValue(claudeOutput),
      langGraphRunner: vi.fn().mockResolvedValue(lgOutput),
      outputSchema: ElaborationOutputSchema,
    })

    expect(result.verdict).toBe('divergent')
    const phaseDiff = result.diff.find(d => d.fieldPath === 'phase')
    expect(phaseDiff?.claudeCodeValue).toBe('complete')
    expect(phaseDiff?.langGraphValue).toBe('error')
  })

  it('returns divergent when splitRequired differs', async () => {
    const claudeOutput = createTestElaborationOutput({ splitRequired: false })
    const lgOutput = createTestElaborationOutput({ splitRequired: true })

    const result = await runParity({
      input: createElaborationFixture(),
      claudeCodeRunner: vi.fn().mockResolvedValue(claudeOutput),
      langGraphRunner: vi.fn().mockResolvedValue(lgOutput),
      outputSchema: ElaborationOutputSchema,
    })

    expect(result.verdict).toBe('divergent')
    expect(result.diff.some(d => d.fieldPath === 'splitRequired')).toBe(true)
  })

  it('diff shows both values for divergent warning arrays', async () => {
    const claudeOutput = createTestElaborationOutput({ warnings: [] })
    const lgOutput = createTestElaborationOutput({ warnings: ['Delta detection warning'] })

    const result = await runParity({
      input: createElaborationFixture(),
      claudeCodeRunner: vi.fn().mockResolvedValue(claudeOutput),
      langGraphRunner: vi.fn().mockResolvedValue(lgOutput),
      outputSchema: ElaborationOutputSchema,
    })

    expect(result.verdict).toBe('divergent')
    const lengthDiff = result.diff.find(d => d.fieldPath === 'warnings.length')
    expect(lengthDiff?.claudeCodeValue).toBe(0)
    expect(lengthDiff?.langGraphValue).toBe(1)
  })
})

// ============================================================================
// Tests: Error verdicts (elaboration)
// ============================================================================

describe('elaboration parity: error verdicts', () => {
  it('returns error with source=claudeCode when claude path throws', async () => {
    const result = await runParity({
      input: createElaborationFixture(),
      claudeCodeRunner: vi.fn().mockRejectedValue(new Error('elaboration node crashed')),
      langGraphRunner: vi.fn().mockResolvedValue(createTestElaborationOutput()),
      outputSchema: ElaborationOutputSchema,
    })

    expect(result.verdict).toBe('error')
    expect(result.error?.source).toBe('claudeCode')
    expect(result.error?.message).toBe('elaboration node crashed')
  })

  it('returns error with source=langGraph when LangGraph path throws', async () => {
    const result = await runParity({
      input: createElaborationFixture(),
      claudeCodeRunner: vi.fn().mockResolvedValue(createTestElaborationOutput()),
      langGraphRunner: vi.fn().mockRejectedValue(new Error('elaboration graph failed')),
      outputSchema: ElaborationOutputSchema,
    })

    expect(result.verdict).toBe('error')
    expect(result.error?.source).toBe('langGraph')
    expect(result.error?.message).toBe('elaboration graph failed')
  })
})

// ============================================================================
// Tests: Schema validation divergence (elaboration, EC-3)
// ============================================================================

describe('elaboration parity: schema validation divergence (EC-3)', () => {
  it('returns divergent when output has wrong type for durationMs', async () => {
    const validOutput = createTestElaborationOutput()
    // Invalid: durationMs as string instead of number
    const invalidOutput = { ...validOutput, durationMs: 'not-a-number' }

    const result = await runParity({
      input: createElaborationFixture(),
      claudeCodeRunner: vi.fn().mockResolvedValue(validOutput),
      langGraphRunner: vi.fn().mockResolvedValue(invalidOutput),
      outputSchema: ElaborationOutputSchema,
    })

    expect(result.verdict).toBe('divergent')
    const schemaError = result.diff.find(d => d.fieldPath.includes('schema-validation'))
    expect(schemaError).toBeDefined()
  })
})
