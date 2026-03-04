/**
 * known-divergences.parity.test.ts
 *
 * Documents expected behavioral differences between Claude Code and LangGraph paths
 * (WINT-9120 AC-8, ED-1).
 *
 * Purpose: Some behavioral differences between the two paths are intentional —
 * for example, the Claude Code subprocess path may return slightly different
 * error shapes, or may include timing-related fields that the native LangGraph
 * implementation omits.
 *
 * These tests PASS with a divergent verdict because the divergences are documented
 * in the knownDivergences array. This prevents false parity failures from
 * expected/acceptable differences.
 *
 * Pattern:
 *   1. Run parity harness and get a divergent result
 *   2. Assert verdict is 'divergent'
 *   3. Assert knownDivergences array documents the specific divergence
 *   4. Test PASSES — divergence is expected and documented
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
// Known divergence: database_status field
//
// The Claude Code subprocess path (nodes/workflow/doc-sync.ts) does NOT include
// a database_status field in its output (the field was added in the native
// LangGraph port WINT-9020).
//
// This is a KNOWN acceptable divergence during the migration period —
// the Claude Code path will be deprecated once LangGraph cutover is complete.
// ============================================================================

describe('known divergences: doc-sync database_status field', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('documents expected divergence: database_status absent in Claude Code path (ED-1)', async () => {
    // Claude Code path: no database_status field
    const claudeCodeOutput = {
      success: true,
      filesChanged: 2,
      sectionsUpdated: 1,
      diagramsRegenerated: 0,
      manualReviewNeeded: 0,
      changelogDrafted: true,
      reportPath: '/tmp/SYNC-REPORT.md',
      errors: [],
      // database_status is intentionally absent in the subprocess path
    }

    // LangGraph path: includes database_status
    const langGraphOutput = {
      ...claudeCodeOutput,
      database_status: 'unavailable',
    }

    // We use a superset schema that accepts both shapes
    const SupersetSchema = z.object({
      success: z.boolean(),
      filesChanged: z.number(),
      sectionsUpdated: z.number(),
      diagramsRegenerated: z.number(),
      manualReviewNeeded: z.number(),
      changelogDrafted: z.boolean(),
      reportPath: z.string(),
      errors: z.array(z.string()),
      database_status: z.string().optional(),
    })

    const result = await runParity({
      input: {},
      claudeCodeRunner: vi.fn().mockResolvedValue(claudeCodeOutput),
      langGraphRunner: vi.fn().mockResolvedValue(langGraphOutput),
      outputSchema: SupersetSchema,
      knownDivergences: [
        'database_status: Claude Code subprocess path does not emit database_status; LangGraph native path (WINT-9020) does. Acceptable during migration.',
      ],
    })

    // Verdict is divergent because of the extra field
    expect(result.verdict).toBe('divergent')
    // Divergence IS documented
    expect(result.knownDivergences).toBeDefined()
    expect(result.knownDivergences?.length).toBeGreaterThan(0)
    expect(result.knownDivergences?.[0]).toContain('database_status')
    // Test PASSES — divergence expected and documented
  })

  it('ParityResult with knownDivergences passes schema validation', async () => {
    const SupersetSchema = z.object({
      success: z.boolean(),
      filesChanged: z.number(),
      sectionsUpdated: z.number(),
      diagramsRegenerated: z.number(),
      manualReviewNeeded: z.number(),
      changelogDrafted: z.boolean(),
      reportPath: z.string(),
      errors: z.array(z.string()),
      optionalExtra: z.string().optional(),
    })

    const result = await runParity({
      input: {},
      claudeCodeRunner: vi.fn().mockResolvedValue({
        success: true,
        filesChanged: 1,
        sectionsUpdated: 0,
        diagramsRegenerated: 0,
        manualReviewNeeded: 0,
        changelogDrafted: false,
        reportPath: '/tmp/r.md',
        errors: [],
      }),
      langGraphRunner: vi.fn().mockResolvedValue({
        success: true,
        filesChanged: 1,
        sectionsUpdated: 0,
        diagramsRegenerated: 0,
        manualReviewNeeded: 0,
        changelogDrafted: false,
        reportPath: '/tmp/r.md',
        errors: [],
        optionalExtra: 'present-in-langgraph-only',
      }),
      outputSchema: SupersetSchema,
      knownDivergences: [
        'optionalExtra: added by LangGraph native path, not present in subprocess',
      ],
    })

    expect(() => ParityResultSchema.parse(result)).not.toThrow()
    expect(result.knownDivergences).toContain(
      'optionalExtra: added by LangGraph native path, not present in subprocess',
    )
  })
})

// ============================================================================
// Known divergence: error format differences
//
// The Claude Code path may produce error strings like "Command failed: exit 1"
// while the LangGraph path produces structured error objects serialized as strings.
// Both are functionally equivalent; the format difference is documented.
// ============================================================================

describe('known divergences: error format differences', () => {
  it('documents known error format divergence between paths', async () => {
    const ErrorOutputSchema = z.object({
      success: z.boolean(),
      errors: z.array(z.string()),
    })

    const claudeOutput = {
      success: false,
      errors: ['Command failed: exit 1'],
    }

    const lgOutput = {
      success: false,
      errors: ['Phase 1 failed: git diff returned non-zero'],
    }

    const result = await runParity({
      input: {},
      claudeCodeRunner: vi.fn().mockResolvedValue(claudeOutput),
      langGraphRunner: vi.fn().mockResolvedValue(lgOutput),
      outputSchema: ErrorOutputSchema,
      knownDivergences: [
        'errors[0]: Claude Code subprocess path emits shell command errors; LangGraph native path emits phase-level error messages. Both indicate failure.',
      ],
    })

    // Divergent because error strings differ
    expect(result.verdict).toBe('divergent')
    expect(result.knownDivergences).toBeDefined()
    expect(result.knownDivergences?.[0]).toContain('errors[0]')
    // Test PASSES — divergence documented and expected
  })
})

// ============================================================================
// Known divergence: reportPath format
//
// The Claude Code path uses the workingDir-relative reportPath from config,
// while the LangGraph path may include an absolute path with OS-specific separators.
// ============================================================================

describe('known divergences: reportPath format', () => {
  it('documents known reportPath format divergence', async () => {
    const ReportSchema = z.object({
      success: z.boolean(),
      reportPath: z.string(),
      errors: z.array(z.string()),
    })

    const result = await runParity({
      input: { workingDir: '/tmp/repo' },
      claudeCodeRunner: vi.fn().mockResolvedValue({
        success: true,
        reportPath: 'SYNC-REPORT.md',
        errors: [],
      }),
      langGraphRunner: vi.fn().mockResolvedValue({
        success: true,
        reportPath: '/tmp/repo/SYNC-REPORT.md',
        errors: [],
      }),
      outputSchema: ReportSchema,
      knownDivergences: [
        'reportPath: Claude Code path returns relative path; LangGraph native path returns absolute path. Both resolve to the same file.',
      ],
    })

    expect(result.verdict).toBe('divergent')
    expect(result.knownDivergences?.[0]).toContain('reportPath')
  })
})
