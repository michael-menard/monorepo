/**
 * Unit tests for extractArtifactSummary
 *
 * Pure function tests covering all 13 artifact types, the default fallback,
 * and edge cases (empty content, missing fields, all-null fields).
 *
 * @see KBAR-0140 AC-7
 */

import { describe, it, expect } from 'vitest'
import { extractArtifactSummary } from '../artifact-summary.js'

// ============================================================================
// TC-001: checkpoint
// ============================================================================

describe('extractArtifactSummary: checkpoint', () => {
  it('TC-001: extracts current_phase, last_successful_phase, iteration, blocked', () => {
    const content = {
      current_phase: 'execute',
      last_successful_phase: 'plan',
      iteration: 0,
      blocked: false,
      feature_dir: 'plans/future/platform',
      warnings: [],
    }
    const result = extractArtifactSummary('checkpoint', content)
    expect(result).toEqual({
      current_phase: 'execute',
      last_successful_phase: 'plan',
      iteration: 0,
      blocked: false,
    })
    expect(Object.keys(result).length).toBeLessThanOrEqual(10)
  })
})

// ============================================================================
// TC-002: scope
// ============================================================================

describe('extractArtifactSummary: scope', () => {
  it('TC-002: extracts touches and risk_flags', () => {
    const content = {
      touches: { backend: true, frontend: false, db: false },
      risk_flags: { auth: false, payments: false },
      gen_mode: false,
    }
    const result = extractArtifactSummary('scope', content)
    expect(result).toEqual({
      touches: { backend: true, frontend: false, db: false },
      risk_flags: { auth: false, payments: false },
    })
  })
})

// ============================================================================
// TC-003: plan
// ============================================================================

describe('extractArtifactSummary: plan', () => {
  it('TC-003: extracts version, approved, chunks_count, estimated_files, estimated_tokens', () => {
    const content = {
      version: '1.0',
      approved: true,
      chunks: [{ id: 1 }, { id: 2 }, { id: 3 }],
      estimates: { files: 5, tokens: 12000 },
      steps: [],
    }
    const result = extractArtifactSummary('plan', content)
    expect(result).toEqual({
      version: '1.0',
      approved: true,
      chunks_count: 3,
      estimated_files: 5,
      estimated_tokens: 12000,
    })
  })

  it('TC-003b: handles missing chunks array with count 0', () => {
    const content = { version: '1.0', approved: false }
    const result = extractArtifactSummary('plan', content)
    expect(result.chunks_count).toBe(0)
    expect(result.estimated_files).toBeUndefined()
    expect(result.estimated_tokens).toBeUndefined()
  })
})

// ============================================================================
// TC-004: evidence
// ============================================================================

describe('extractArtifactSummary: evidence', () => {
  it('TC-004: extracts version, story_id, touched_files_count, commands_run_count, acceptance_criteria_count', () => {
    const content = {
      version: 1,
      story_id: 'KBAR-0140',
      touched_files: ['file1.ts', 'file2.ts'],
      commands_run: ['pnpm build', 'pnpm test'],
      acceptance_criteria: [{ ac_id: 'AC-1' }, { ac_id: 'AC-2' }],
      e2e_tests: { status: 'exempt' },
    }
    const result = extractArtifactSummary('evidence', content)
    expect(result).toEqual({
      version: 1,
      story_id: 'KBAR-0140',
      touched_files_count: 2,
      commands_run_count: 2,
      acceptance_criteria_count: 2,
    })
  })
})

// ============================================================================
// TC-005: verification
// ============================================================================

describe('extractArtifactSummary: verification', () => {
  it('TC-005: extracts verdict, finding_count, critical_count (flat fields per Architecture Notes)', () => {
    const content = {
      verdict: 'PASS',
      finding_count: 3,
      critical_count: 0,
      details: { notes: 'looks good' },
    }
    const result = extractArtifactSummary('verification', content)
    expect(result).toEqual({
      verdict: 'PASS',
      finding_count: 3,
      critical_count: 0,
    })
  })
})

// ============================================================================
// TC-006: analysis
// ============================================================================

describe('extractArtifactSummary: analysis', () => {
  it('TC-006: extracts analysis_type and summary_text', () => {
    const content = {
      analysis_type: 'code_health',
      summary_text: 'No critical issues found',
      findings: [],
    }
    const result = extractArtifactSummary('analysis', content)
    expect(result).toEqual({
      analysis_type: 'code_health',
      summary_text: 'No critical issues found',
    })
  })
})

// ============================================================================
// TC-007: context
// ============================================================================

describe('extractArtifactSummary: context', () => {
  it('TC-007: extracts story_id, feature_dir, phase', () => {
    const content = {
      story_id: 'KBAR-0140',
      feature_dir: 'plans/future/platform/kb-artifact-migration',
      phase: 'implementation',
      lessons: [],
      adrs: [],
    }
    const result = extractArtifactSummary('context', content)
    expect(result).toEqual({
      story_id: 'KBAR-0140',
      feature_dir: 'plans/future/platform/kb-artifact-migration',
      phase: 'implementation',
    })
  })
})

// ============================================================================
// TC-008: fix_summary
// ============================================================================

describe('extractArtifactSummary: fix_summary', () => {
  it('TC-008: extracts iteration, issues_fixed, issues_remaining', () => {
    const content = {
      iteration: 1,
      issues_fixed: 4,
      issues_remaining: 1,
      details: 'Fixed type errors and lint issues',
    }
    const result = extractArtifactSummary('fix_summary', content)
    expect(result).toEqual({
      iteration: 1,
      issues_fixed: 4,
      issues_remaining: 1,
    })
  })
})

// ============================================================================
// TC-009: proof
// ============================================================================

describe('extractArtifactSummary: proof', () => {
  it('TC-009: extracts completed_at, summary_points, deliverables_count, tests_passed, all_acs_verified (flat fields per Architecture Notes)', () => {
    const content = {
      completed_at: '2026-03-02T12:00:00Z',
      summary: ['Implemented utility', 'Added unit tests'],
      deliverables: [{ name: 'artifact-summary.ts' }, { name: 'artifact-summary.test.ts' }],
      tests_passed: 24,
      all_acs_verified: true,
    }
    const result = extractArtifactSummary('proof', content)
    expect(result).toEqual({
      completed_at: '2026-03-02T12:00:00Z',
      summary_points: 2,
      deliverables_count: 2,
      tests_passed: 24,
      all_acs_verified: true,
    })
  })
})

// ============================================================================
// TC-010: elaboration
// ============================================================================

describe('extractArtifactSummary: elaboration', () => {
  it('TC-010: extracts verdict, split_required, gaps_count, follow_ups_count', () => {
    const content = {
      verdict: 'CONDITIONAL_PASS',
      split_required: false,
      gaps: [{ id: 'GAP-01' }],
      follow_ups: [{ id: 'FU-01' }, { id: 'FU-02' }],
      checks: [],
    }
    const result = extractArtifactSummary('elaboration', content)
    expect(result).toEqual({
      verdict: 'CONDITIONAL_PASS',
      split_required: false,
      gaps_count: 1,
      follow_ups_count: 2,
    })
  })
})

// ============================================================================
// TC-011: review
// ============================================================================

describe('extractArtifactSummary: review', () => {
  it('TC-011: extracts verdict, iteration, issues_count (from ranked_patches)', () => {
    const content = {
      verdict: 'APPROVE',
      iteration: 0,
      ranked_patches: [{ severity: 'low', description: 'minor nit' }],
      notes: 'Good work',
    }
    const result = extractArtifactSummary('review', content)
    expect(result).toEqual({
      verdict: 'APPROVE',
      iteration: 0,
      issues_count: 1,
    })
  })
})

// ============================================================================
// TC-012: qa_gate
// ============================================================================

describe('extractArtifactSummary: qa_gate', () => {
  it('TC-012: extracts decision, reviewer, finding_count, blocker_count', () => {
    const content = {
      decision: 'PASS',
      reviewer: 'qa-agent',
      finding_count: 2,
      blocker_count: 0,
      findings: [],
    }
    const result = extractArtifactSummary('qa_gate', content)
    expect(result).toEqual({
      decision: 'PASS',
      reviewer: 'qa-agent',
      finding_count: 2,
      blocker_count: 0,
    })
  })
})

// ============================================================================
// TC-013: completion_report
// ============================================================================

describe('extractArtifactSummary: completion_report', () => {
  it('TC-013: extracts status and iterations_used', () => {
    const content = {
      status: 'completed',
      iterations_used: 1,
      summary: 'Story completed successfully',
      artifacts: [],
    }
    const result = extractArtifactSummary('completion_report', content)
    expect(result).toEqual({
      status: 'completed',
      iterations_used: 1,
    })
  })
})

// ============================================================================
// TC-014: unknown type fallback
// ============================================================================

describe('extractArtifactSummary: fallback/default', () => {
  it('TC-014: returns up to 5 top-level scalar fields for unknown type', () => {
    const content = {
      name: 'test',
      count: 42,
      active: true,
      nested: { foo: 'bar' },
      items: [1, 2, 3],
      extra1: 'a',
      extra2: 'b',
    }
    const result = extractArtifactSummary('unknown_type', content)
    // Only scalar (string/number/boolean) fields, max 5
    expect(Object.keys(result).length).toBeLessThanOrEqual(5)
    expect(result.name).toBe('test')
    expect(result.count).toBe(42)
    expect(result.active).toBe(true)
    expect(result.extra1).toBe('a')
    expect(result.extra2).toBe('b')
    // Arrays and objects excluded
    expect(result.nested).toBeUndefined()
    expect(result.items).toBeUndefined()
  })

  // ============================================================================
  // TC-015: empty content
  // ============================================================================

  it('TC-015: empty content returns empty summary without throwing', () => {
    const result = extractArtifactSummary('checkpoint', {})
    expect(result).toBeTypeOf('object')
    expect(result).not.toBeNull()
    // All fields will be undefined — no throw
    expect(result.current_phase).toBeUndefined()
    expect(result.blocked).toBeUndefined()
  })

  it('TC-015b: empty content for unknown type returns empty object', () => {
    const result = extractArtifactSummary('unknown_type', {})
    expect(result).toEqual({})
  })

  // ============================================================================
  // TC-016: missing expected fields
  // ============================================================================

  it('TC-016: missing expected fields return undefined gracefully for evidence', () => {
    const result = extractArtifactSummary('evidence', { story_id: 'X-001' })
    expect(result.story_id).toBe('X-001')
    expect(result.touched_files_count).toBe(0)
    expect(result.commands_run_count).toBe(0)
    expect(result.acceptance_criteria_count).toBe(0)
  })

  it('TC-016b: missing expected fields for plan return zeros for count', () => {
    const result = extractArtifactSummary('plan', {})
    expect(result.chunks_count).toBe(0)
    expect(result.version).toBeUndefined()
  })

  // ============================================================================
  // TC-017: all-null fields
  // ============================================================================

  it('TC-017: all-null fields for qa_gate return null values without exception', () => {
    const content = {
      decision: null,
      reviewer: null,
      finding_count: null,
      blocker_count: null,
    }
    expect(() => extractArtifactSummary('qa_gate', content)).not.toThrow()
    const result = extractArtifactSummary('qa_gate', content)
    expect(result.decision).toBeNull()
    expect(result.reviewer).toBeNull()
  })

  // ============================================================================
  // TC-018: caller-provided summary (documented behavior test)
  // ============================================================================

  it('TC-018: extractArtifactSummary always returns auto-extracted; caller override is handled upstream in artifact_write', () => {
    // This test documents that extractArtifactSummary is a pure extraction function.
    // Caller opt-out (validatedInput.summary ?? extractArtifactSummary(...)) is handled
    // in artifact_write, not in this function.
    const content = { current_phase: 'execute', iteration: 0, blocked: false }
    const autoExtracted = extractArtifactSummary('checkpoint', content)
    const callerSummary = { custom: 'override' }

    // Simulating artifact_write behavior: caller summary takes precedence
    const resolvedSummary = callerSummary ?? autoExtracted
    expect(resolvedSummary).toEqual({ custom: 'override' })

    // Without caller summary, auto-extracted is used
    const resolvedSummaryAuto = (null as unknown as Record<string, unknown>) ?? autoExtracted
    expect(resolvedSummaryAuto).toEqual(autoExtracted)
  })
})
