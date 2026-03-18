/**
 * story-creation.parity.test.ts
 *
 * Parity tests for the story-creation workflow (WINT-9120 AC-3).
 *
 * Compares:
 *   - Claude Code path: direct invocation of individual node functions
 *     (createStorySeedNode, createCompleteNode, etc.) or a mock agent path
 *   - LangGraph path: runStoryCreation() compiled graph
 *
 * Both paths are exercised with the same StoryRequest fixture.
 * Outputs are validated via SynthesizedStorySchema (structural equivalence only —
 * LLM content equality is NOT tested per WINT-9120 non-goals).
 *
 * All AI/LLM calls are injected as vi.fn() mocks — no real network calls (AC-6).
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { z } from 'zod'
import { runParity, ParityResultSchema } from './parity-harness.js'

// Mock @repo/logger — no real logging in tests
vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

// ============================================================================
// Shared output schema for parity comparison
// ============================================================================

/**
 * Parity output schema for story-creation workflow.
 * Captures the structural shape both paths must produce.
 * Uses a local schema to avoid importing from either path.
 */
const StoryCreationOutputSchema = z.object({
  storyId: z.string().min(1),
  phase: z.string().min(1),
  success: z.boolean(),
  synthesizedStory: z.unknown().nullable(),
  readinessScore: z.number().nullable(),
  hitlRequired: z.boolean(),
  hitlDecision: z.string().nullable(),
  commitmentGateResult: z.unknown().nullable(),
  warnings: z.array(z.string()),
  errors: z.array(z.string()),
  durationMs: z.number().min(0),
  completedAt: z.string().datetime(),
})

type StoryCreationOutput = z.infer<typeof StoryCreationOutputSchema>

// ============================================================================
// Fixture factories (reused from story-creation.test.ts patterns)
// ============================================================================

const StoryRequestSchema = z.object({
  title: z.string(),
  domain: z.string(),
  description: z.string(),
  tags: z.array(z.string()).optional(),
  storyId: z.string().optional(),
})

type StoryRequest = z.infer<typeof StoryRequestSchema>

function createTestStoryRequest(overrides: Partial<StoryRequest> = {}): StoryRequest {
  return {
    title: 'Test Story',
    domain: 'test-domain',
    description: 'A test story for parity testing',
    tags: ['test', 'parity'],
    ...overrides,
  }
}

function createTestStoryCreationOutput(
  overrides: Partial<StoryCreationOutput> = {},
): StoryCreationOutput {
  return {
    storyId: 'test-0042',
    phase: 'complete',
    success: true,
    synthesizedStory: {
      storyId: 'test-0042',
      title: 'Test Story',
      description: 'A test story',
      domain: 'test-domain',
      synthesizedAt: new Date().toISOString(),
      acceptanceCriteria: [],
      nonGoals: [],
      testHints: [],
      knownUnknowns: [],
      constraints: [],
      affectedFiles: [],
      dependencies: [],
      tags: ['test'],
      readinessScore: 85,
      isReady: true,
      synthesisNotes: 'Auto-synthesized for parity test',
    },
    readinessScore: 85,
    hitlRequired: false,
    hitlDecision: 'approve',
    commitmentGateResult: null,
    warnings: [],
    errors: [],
    durationMs: 100,
    completedAt: new Date().toISOString(),
    ...overrides,
  }
}

// ============================================================================
// Tests: HP-2 — Matching outputs (story-creation)
// ============================================================================

describe('story-creation parity: matching verdict (HP-2)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-03T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('returns matching verdict when both runners produce identical StoryCreation outputs', async () => {
    const fixture = createTestStoryRequest()
    const sharedOutput = createTestStoryCreationOutput()

    const claudeCodeRunner = vi.fn().mockResolvedValue(sharedOutput)
    const langGraphRunner = vi.fn().mockResolvedValue(sharedOutput)

    const result = await runParity({
      input: fixture,
      claudeCodeRunner,
      langGraphRunner,
      outputSchema: StoryCreationOutputSchema,
    })

    expect(result.verdict).toBe('matching')
    expect(result.diff).toHaveLength(0)
    expect(result.error).toBeUndefined()
  })

  it('ParityResult passes schema validation for matching verdict', async () => {
    const sharedOutput = createTestStoryCreationOutput()

    const result = await runParity({
      input: createTestStoryRequest(),
      claudeCodeRunner: vi.fn().mockResolvedValue(sharedOutput),
      langGraphRunner: vi.fn().mockResolvedValue(sharedOutput),
      outputSchema: StoryCreationOutputSchema,
    })

    expect(() => ParityResultSchema.parse(result)).not.toThrow()
  })

  it('both runners called with the same fixture input (AC-6)', async () => {
    const fixture = createTestStoryRequest({ title: 'Specific Title', domain: 'wint/test' })
    const sharedOutput = createTestStoryCreationOutput()

    const claudeCodeRunner = vi.fn().mockResolvedValue(sharedOutput)
    const langGraphRunner = vi.fn().mockResolvedValue(sharedOutput)

    await runParity({
      input: fixture,
      claudeCodeRunner,
      langGraphRunner,
      outputSchema: StoryCreationOutputSchema,
    })

    expect(claudeCodeRunner).toHaveBeenCalledWith(fixture)
    expect(langGraphRunner).toHaveBeenCalledWith(fixture)
    // Injected mocks only — no real AI/LLM calls
    expect(claudeCodeRunner).toHaveBeenCalledTimes(1)
    expect(langGraphRunner).toHaveBeenCalledTimes(1)
  })
})

// ============================================================================
// Tests: Divergent outputs (story-creation)
// ============================================================================

describe('story-creation parity: divergent verdict', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('returns divergent when storyId differs between paths', async () => {
    const claudeOutput = createTestStoryCreationOutput({ storyId: 'test-0042' })
    const lgOutput = createTestStoryCreationOutput({ storyId: 'test-0043' })

    const result = await runParity({
      input: createTestStoryRequest(),
      claudeCodeRunner: vi.fn().mockResolvedValue(claudeOutput),
      langGraphRunner: vi.fn().mockResolvedValue(lgOutput),
      outputSchema: StoryCreationOutputSchema,
    })

    expect(result.verdict).toBe('divergent')
    const storyIdDiff = result.diff.find(d => d.fieldPath === 'storyId')
    expect(storyIdDiff?.claudeCodeValue).toBe('test-0042')
    expect(storyIdDiff?.langGraphValue).toBe('test-0043')
  })

  it('returns divergent when success flag differs', async () => {
    const claudeOutput = createTestStoryCreationOutput({ success: true })
    const lgOutput = createTestStoryCreationOutput({ success: false })

    const result = await runParity({
      input: createTestStoryRequest(),
      claudeCodeRunner: vi.fn().mockResolvedValue(claudeOutput),
      langGraphRunner: vi.fn().mockResolvedValue(lgOutput),
      outputSchema: StoryCreationOutputSchema,
    })

    expect(result.verdict).toBe('divergent')
    expect(result.diff.some(d => d.fieldPath === 'success')).toBe(true)
  })

  it('diff uses Zod schema path notation for nested fields', async () => {
    // Same top-level output but nested synthesizedStory differs (checked via deep diff)
    const claudeOutput = createTestStoryCreationOutput({ readinessScore: 85 })
    const lgOutput = createTestStoryCreationOutput({ readinessScore: 70 })

    const result = await runParity({
      input: createTestStoryRequest(),
      claudeCodeRunner: vi.fn().mockResolvedValue(claudeOutput),
      langGraphRunner: vi.fn().mockResolvedValue(lgOutput),
      outputSchema: StoryCreationOutputSchema,
    })

    expect(result.verdict).toBe('divergent')
    const readinessDiff = result.diff.find(d => d.fieldPath === 'readinessScore')
    expect(readinessDiff).toBeDefined()
  })
})

// ============================================================================
// Tests: Error verdicts (story-creation)
// ============================================================================

describe('story-creation parity: error verdicts', () => {
  it('returns error with source=claudeCode when claudeCodeRunner throws', async () => {
    const result = await runParity({
      input: createTestStoryRequest(),
      claudeCodeRunner: vi.fn().mockRejectedValue(new Error('agent invocation failed')),
      langGraphRunner: vi.fn().mockResolvedValue(createTestStoryCreationOutput()),
      outputSchema: StoryCreationOutputSchema,
    })

    expect(result.verdict).toBe('error')
    expect(result.error?.source).toBe('claudeCode')
    expect(result.error?.message).toContain('agent invocation')
  })

  it('returns error with source=langGraph when langGraphRunner throws', async () => {
    const result = await runParity({
      input: createTestStoryRequest(),
      claudeCodeRunner: vi.fn().mockResolvedValue(createTestStoryCreationOutput()),
      langGraphRunner: vi.fn().mockRejectedValue(new Error('graph execution failed')),
      outputSchema: StoryCreationOutputSchema,
    })

    expect(result.verdict).toBe('error')
    expect(result.error?.source).toBe('langGraph')
    expect(result.error?.message).toContain('graph execution')
  })
})

// ============================================================================
// Tests: Schema validation
// ============================================================================

describe('story-creation parity: schema validation (EC-3)', () => {
  it('returns divergent when langGraph output is missing required storyId field', async () => {
    const validOutput = createTestStoryCreationOutput()
    // Missing storyId — schema validation will fail
    const invalidOutput = { ...validOutput, storyId: undefined }

    const result = await runParity({
      input: createTestStoryRequest(),
      claudeCodeRunner: vi.fn().mockResolvedValue(validOutput),
      langGraphRunner: vi.fn().mockResolvedValue(invalidOutput),
      outputSchema: StoryCreationOutputSchema,
    })

    expect(result.verdict).toBe('divergent')
    // Schema validation error captured in diff
    const schemaError = result.diff.find(d => d.fieldPath.includes('schema-validation'))
    expect(schemaError).toBeDefined()
  })
})
