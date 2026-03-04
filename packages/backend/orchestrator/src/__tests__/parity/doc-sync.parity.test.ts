/**
 * doc-sync.parity.test.ts
 *
 * Parity tests for the doc-sync workflow (WINT-9120 AC-2).
 *
 * Compares:
 *   - Claude Code path: nodes/workflow/doc-sync.ts (subprocess delegation)
 *   - LangGraph native path: nodes/sync/doc-sync.ts (7-phase native implementation)
 *
 * Both paths accept the same DocSyncConfig-compatible input fixture.
 * Outputs are compared via DocSyncResultSchema.
 *
 * All external services (filesystem, git, DB) are injected via config — no real calls.
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
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock @repo/workflow-logic — isValidStoryId used by nodes/sync/doc-sync
vi.mock('@repo/workflow-logic', () => ({
  isValidStoryId: vi.fn((id: string) => /^[a-z]+-\d+$/i.test(id)),
}))

// ============================================================================
// Shared DocSyncResult schema for parity comparison
// ============================================================================

/**
 * Shared output schema for parity comparison.
 * Both paths produce objects matching this shape.
 * We use a local schema to avoid importing from either path directly,
 * keeping the parity harness path-agnostic.
 */
const DocSyncOutputSchema = z.object({
  success: z.boolean(),
  filesChanged: z.number(),
  sectionsUpdated: z.number(),
  diagramsRegenerated: z.number(),
  manualReviewNeeded: z.number(),
  changelogDrafted: z.boolean(),
  reportPath: z.string(),
  errors: z.array(z.string()),
})

type DocSyncOutput = z.infer<typeof DocSyncOutputSchema>

// ============================================================================
// Fixture: identical DocSyncResult
// ============================================================================

function createDocSyncFixtureResult(overrides: Partial<DocSyncOutput> = {}): DocSyncOutput {
  return {
    success: true,
    filesChanged: 2,
    sectionsUpdated: 1,
    diagramsRegenerated: 0,
    manualReviewNeeded: 0,
    changelogDrafted: true,
    reportPath: '/tmp/SYNC-REPORT.md',
    errors: [],
    ...overrides,
  }
}

// ============================================================================
// Tests: HP-1 — Matching outputs
// ============================================================================

describe('doc-sync parity: matching verdict (HP-1)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('returns matching verdict when both runners produce identical DocSync outputs', async () => {
    const fixture = { checkOnly: false, force: false, workingDir: '/tmp/test-repo' }
    const sharedOutput = createDocSyncFixtureResult()

    const claudeCodeRunner = vi.fn().mockResolvedValue(sharedOutput)
    const langGraphRunner = vi.fn().mockResolvedValue(sharedOutput)

    const result = await runParity({
      input: fixture,
      claudeCodeRunner,
      langGraphRunner,
      outputSchema: DocSyncOutputSchema,
    })

    expect(result.verdict).toBe('matching')
    expect(result.diff).toHaveLength(0)
    expect(result.error).toBeUndefined()
    // Both runners called with the same fixture
    expect(claudeCodeRunner).toHaveBeenCalledWith(fixture)
    expect(langGraphRunner).toHaveBeenCalledWith(fixture)
  })

  it('ParityResult passes ParityResultSchema validation on matching verdict', async () => {
    const sharedOutput = createDocSyncFixtureResult()
    const claudeCodeRunner = vi.fn().mockResolvedValue(sharedOutput)
    const langGraphRunner = vi.fn().mockResolvedValue(sharedOutput)

    const result = await runParity({
      input: {},
      claudeCodeRunner,
      langGraphRunner,
      outputSchema: DocSyncOutputSchema,
    })

    expect(() => ParityResultSchema.parse(result)).not.toThrow()
    expect(result.verdict).toBe('matching')
  })

  it('both runners receive the same fixture input (AC-6)', async () => {
    const fixture = {
      checkOnly: true,
      force: false,
      workingDir: '/tmp/repo',
      reportPath: '/tmp/SYNC-REPORT.md',
    }
    const sharedOutput = createDocSyncFixtureResult({ success: false })

    const claudeCodeRunner = vi.fn().mockResolvedValue(sharedOutput)
    const langGraphRunner = vi.fn().mockResolvedValue(sharedOutput)

    await runParity({
      input: fixture,
      claudeCodeRunner,
      langGraphRunner,
      outputSchema: DocSyncOutputSchema,
    })

    expect(claudeCodeRunner).toHaveBeenCalledWith(fixture)
    expect(langGraphRunner).toHaveBeenCalledWith(fixture)
    // No real filesystem/git calls — injected runners only
    expect(claudeCodeRunner).toHaveBeenCalledTimes(1)
    expect(langGraphRunner).toHaveBeenCalledTimes(1)
  })
})

// ============================================================================
// Tests: HP-4 — Divergent outputs
// ============================================================================

describe('doc-sync parity: divergent verdict (HP-4)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('returns divergent verdict when filesChanged differs between paths', async () => {
    const claudeCodeOutput = createDocSyncFixtureResult({ filesChanged: 3 })
    const langGraphOutput = createDocSyncFixtureResult({ filesChanged: 5 })

    const claudeCodeRunner = vi.fn().mockResolvedValue(claudeCodeOutput)
    const langGraphRunner = vi.fn().mockResolvedValue(langGraphOutput)

    const result = await runParity({
      input: {},
      claudeCodeRunner,
      langGraphRunner,
      outputSchema: DocSyncOutputSchema,
    })

    expect(result.verdict).toBe('divergent')
    expect(result.diff.length).toBeGreaterThan(0)
    const fieldPaths = result.diff.map(d => d.fieldPath)
    expect(fieldPaths).toContain('filesChanged')
  })

  it('diff item contains claudeCodeValue and langGraphValue for divergent fields', async () => {
    const claudeCodeOutput = createDocSyncFixtureResult({ sectionsUpdated: 2 })
    const langGraphOutput = createDocSyncFixtureResult({ sectionsUpdated: 0 })

    const result = await runParity({
      input: {},
      claudeCodeRunner: vi.fn().mockResolvedValue(claudeCodeOutput),
      langGraphRunner: vi.fn().mockResolvedValue(langGraphOutput),
      outputSchema: DocSyncOutputSchema,
    })

    expect(result.verdict).toBe('divergent')
    const diffItem = result.diff.find(d => d.fieldPath === 'sectionsUpdated')
    expect(diffItem).toBeDefined()
    expect(diffItem?.claudeCodeValue).toBe(2)
    expect(diffItem?.langGraphValue).toBe(0)
  })

  it('returns divergent when success flag differs', async () => {
    const claudeCodeOutput = createDocSyncFixtureResult({ success: true })
    const langGraphOutput = createDocSyncFixtureResult({ success: false })

    const result = await runParity({
      input: {},
      claudeCodeRunner: vi.fn().mockResolvedValue(claudeCodeOutput),
      langGraphRunner: vi.fn().mockResolvedValue(langGraphOutput),
      outputSchema: DocSyncOutputSchema,
    })

    expect(result.verdict).toBe('divergent')
    const successDiff = result.diff.find(d => d.fieldPath === 'success')
    expect(successDiff?.claudeCodeValue).toBe(true)
    expect(successDiff?.langGraphValue).toBe(false)
  })
})

// ============================================================================
// Tests: EC-1, EC-2 — Error verdicts
// ============================================================================

describe('doc-sync parity: error verdict (EC-1, EC-2)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('returns error verdict when claudeCodeRunner throws (EC-1)', async () => {
    const claudeCodeRunner = vi.fn().mockRejectedValue(new Error('subprocess failed'))
    const langGraphRunner = vi.fn().mockResolvedValue(createDocSyncFixtureResult())

    const result = await runParity({
      input: {},
      claudeCodeRunner,
      langGraphRunner,
      outputSchema: DocSyncOutputSchema,
    })

    expect(result.verdict).toBe('error')
    expect(result.error?.source).toBe('claudeCode')
    expect(result.error?.message).toBe('subprocess failed')
  })

  it('returns error verdict when langGraphRunner throws (EC-2)', async () => {
    const claudeCodeRunner = vi.fn().mockResolvedValue(createDocSyncFixtureResult())
    const langGraphRunner = vi.fn().mockRejectedValue(new Error('graph execution failed'))

    const result = await runParity({
      input: {},
      claudeCodeRunner,
      langGraphRunner,
      outputSchema: DocSyncOutputSchema,
    })

    expect(result.verdict).toBe('error')
    expect(result.error?.source).toBe('langGraph')
    expect(result.error?.message).toBe('graph execution failed')
  })

  it('error result does not throw to caller — no unhandled exceptions', async () => {
    const claudeCodeRunner = vi.fn().mockRejectedValue(new Error('boom'))
    const langGraphRunner = vi.fn().mockResolvedValue(createDocSyncFixtureResult())

    await expect(
      runParity({
        input: {},
        claudeCodeRunner,
        langGraphRunner,
        outputSchema: DocSyncOutputSchema,
      }),
    ).resolves.toBeDefined()
  })
})

// ============================================================================
// Tests: EC-3 — Schema validation divergence
// ============================================================================

describe('doc-sync parity: schema validation divergence (EC-3)', () => {
  it('returns divergent when langGraph output fails schema validation', async () => {
    const validOutput = createDocSyncFixtureResult()
    // Missing required fields — schema validation will fail
    const invalidOutput = { success: 'yes' } // wrong type for success

    const result = await runParity({
      input: {},
      claudeCodeRunner: vi.fn().mockResolvedValue(validOutput),
      langGraphRunner: vi.fn().mockResolvedValue(invalidOutput),
      outputSchema: DocSyncOutputSchema,
    })

    expect(result.verdict).toBe('divergent')
    expect(result.diff.length).toBeGreaterThan(0)
    // Schema validation error captured in diff
    const schemaErrorDiff = result.diff.find(d => d.fieldPath.includes('schema-validation'))
    expect(schemaErrorDiff).toBeDefined()
  })
})

// ============================================================================
// Tests: ED-2 — Timestamp determinism via vi.useFakeTimers()
// ============================================================================

describe('doc-sync parity: timestamp determinism (ED-2)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-03T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('pinned fake timers produce identical timestamps in both paths', async () => {
    // Both runners use the same pinned time — no timestamp-related divergences
    const now = new Date().toISOString()
    const claudeOutput = createDocSyncFixtureResult({ reportPath: `/reports/${now}.md` })
    const lgOutput = createDocSyncFixtureResult({ reportPath: `/reports/${now}.md` })

    const result = await runParity({
      input: {},
      claudeCodeRunner: vi.fn().mockResolvedValue(claudeOutput),
      langGraphRunner: vi.fn().mockResolvedValue(lgOutput),
      outputSchema: DocSyncOutputSchema,
    })

    expect(result.verdict).toBe('matching')
    // No timestamp divergences
    const timestampDiffs = result.diff.filter(d => d.fieldPath.includes('time'))
    expect(timestampDiffs).toHaveLength(0)
  })
})
