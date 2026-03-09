/**
 * Unit Tests for Gate Check Compute Function
 * WINT-3010: Create Gatekeeper Sidecar
 *
 * AC-14: >=80% coverage on gate-check.ts
 * AC-5: All 4 stages covered, pass+fail paths
 * AC-6: ok:true returns { passed: true, stage, story_id, timestamp }
 * AC-7: ok:false returns { error: 'Gate check failed', missing_proofs: [...] }
 *
 * Boundary conditions:
 *   - CONDITIONAL_PASS (elab_verdict: 'CONDITIONAL_PASS', gaps_resolved: true)
 *   - no_scope_files=true + touched_files=0 (valid empty scope)
 *   - coverage_pct boundary (79 = fail, 80 = pass)
 */

import { describe, it, expect } from 'vitest'
import { gateCheck } from '../gate-check.js'

// ============================================================================
// POST_BOOTSTRAP stage
// ============================================================================

describe('gateCheck — POST_BOOTSTRAP', () => {
  it('passes when setup_complete=true and worktree_path provided', () => {
    const result = gateCheck({
      stage: 'POST_BOOTSTRAP',
      story_id: 'WINT-3010',
      proof: {
        story_id: 'WINT-3010',
        setup_complete: true,
        worktree_path: '/tree/story/WINT-3010',
      },
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.passed).toBe(true)
      expect(result.data.stage).toBe('POST_BOOTSTRAP')
      expect(result.data.story_id).toBe('WINT-3010')
      expect(result.data.timestamp).toBeTruthy()
    }
  })

  it('fails when setup_complete=false', () => {
    const result = gateCheck({
      stage: 'POST_BOOTSTRAP',
      story_id: 'WINT-3010',
      proof: {
        story_id: 'WINT-3010',
        setup_complete: false,
        worktree_path: '/tree/story/WINT-3010',
      },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('Gate check failed')
      expect(result.missing_proofs).toContain('proof.setup_complete must be true')
    }
  })

  it('fails when worktree_path is empty string', () => {
    const result = gateCheck({
      stage: 'POST_BOOTSTRAP',
      story_id: 'WINT-3010',
      proof: {
        story_id: 'WINT-3010',
        setup_complete: true,
        worktree_path: '',
      },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('Gate check failed')
      expect(result.missing_proofs).toContain('proof.worktree_path is required')
    }
  })

  it('accepts extra fields via passthrough', () => {
    const result = gateCheck({
      stage: 'POST_BOOTSTRAP',
      story_id: 'WINT-3010',
      proof: {
        story_id: 'WINT-3010',
        setup_complete: true,
        worktree_path: '/tree/story/WINT-3010',
        extra_field: 'value', // extra field should not cause failure
      } as any,
    })

    expect(result.ok).toBe(true)
  })
})

// ============================================================================
// ELAB_COMPLETE stage
// ============================================================================

describe('gateCheck — ELAB_COMPLETE', () => {
  it('passes when elab_verdict=PASS and gaps_resolved=true', () => {
    const result = gateCheck({
      stage: 'ELAB_COMPLETE',
      story_id: 'WINT-3010',
      proof: {
        story_id: 'WINT-3010',
        elab_verdict: 'PASS',
        gaps_resolved: true,
      },
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.stage).toBe('ELAB_COMPLETE')
    }
  })

  it('passes when elab_verdict=CONDITIONAL_PASS and gaps_resolved=true (boundary condition)', () => {
    const result = gateCheck({
      stage: 'ELAB_COMPLETE',
      story_id: 'WINT-3010',
      proof: {
        story_id: 'WINT-3010',
        elab_verdict: 'CONDITIONAL_PASS',
        gaps_resolved: true,
      },
    })

    expect(result.ok).toBe(true)
  })

  it('fails when elab_verdict=FAIL', () => {
    const result = gateCheck({
      stage: 'ELAB_COMPLETE',
      story_id: 'WINT-3010',
      proof: {
        story_id: 'WINT-3010',
        elab_verdict: 'FAIL',
        gaps_resolved: true,
      },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.missing_proofs).toContain('proof.elab_verdict must be PASS or CONDITIONAL_PASS')
    }
  })

  it('fails when gaps_resolved=false', () => {
    const result = gateCheck({
      stage: 'ELAB_COMPLETE',
      story_id: 'WINT-3010',
      proof: {
        story_id: 'WINT-3010',
        elab_verdict: 'PASS',
        gaps_resolved: false,
      },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.missing_proofs).toContain('proof.gaps_resolved must be true')
    }
  })

  it('returns multiple missing_proofs when multiple fields fail', () => {
    const result = gateCheck({
      stage: 'ELAB_COMPLETE',
      story_id: 'WINT-3010',
      proof: {
        story_id: 'WINT-3010',
        elab_verdict: 'FAIL',
        gaps_resolved: false,
      },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.missing_proofs?.length).toBeGreaterThan(1)
    }
  })
})

// ============================================================================
// SCOPE_OK stage
// ============================================================================

describe('gateCheck — SCOPE_OK', () => {
  it('passes when no_scope_files=false and touched_files>0', () => {
    const result = gateCheck({
      stage: 'SCOPE_OK',
      story_id: 'WINT-3010',
      proof: {
        story_id: 'WINT-3010',
        touched_files: 5,
        no_scope_files: false,
      },
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.stage).toBe('SCOPE_OK')
    }
  })

  it('passes when no_scope_files=true and touched_files=0 (valid empty scope boundary condition)', () => {
    const result = gateCheck({
      stage: 'SCOPE_OK',
      story_id: 'WINT-3010',
      proof: {
        story_id: 'WINT-3010',
        touched_files: 0,
        no_scope_files: true,
      },
    })

    // no_scope_files=true + touched_files=0 is a valid CONDITIONAL_PASS scenario
    expect(result.ok).toBe(true)
  })

  it('fails when no_scope_files=false and touched_files=0', () => {
    const result = gateCheck({
      stage: 'SCOPE_OK',
      story_id: 'WINT-3010',
      proof: {
        story_id: 'WINT-3010',
        touched_files: 0,
        no_scope_files: false,
      },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.missing_proofs).toContain(
        'proof.touched_files must be > 0 when no_scope_files is false',
      )
    }
  })
})

// ============================================================================
// PATCH_COMPLETE stage
// ============================================================================

describe('gateCheck — PATCH_COMPLETE', () => {
  it('passes when build_passed=true, tests_passed=true, coverage_pct=80', () => {
    const result = gateCheck({
      stage: 'PATCH_COMPLETE',
      story_id: 'WINT-3010',
      proof: {
        story_id: 'WINT-3010',
        build_passed: true,
        tests_passed: true,
        coverage_pct: 80,
      },
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.stage).toBe('PATCH_COMPLETE')
    }
  })

  it('passes when coverage_pct=100', () => {
    const result = gateCheck({
      stage: 'PATCH_COMPLETE',
      story_id: 'WINT-3010',
      proof: {
        story_id: 'WINT-3010',
        build_passed: true,
        tests_passed: true,
        coverage_pct: 100,
      },
    })

    expect(result.ok).toBe(true)
  })

  it('fails when build_passed=false', () => {
    const result = gateCheck({
      stage: 'PATCH_COMPLETE',
      story_id: 'WINT-3010',
      proof: {
        story_id: 'WINT-3010',
        build_passed: false,
        tests_passed: true,
        coverage_pct: 90,
      },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.missing_proofs).toContain('proof.build_passed must be true')
    }
  })

  it('fails when tests_passed=false', () => {
    const result = gateCheck({
      stage: 'PATCH_COMPLETE',
      story_id: 'WINT-3010',
      proof: {
        story_id: 'WINT-3010',
        build_passed: true,
        tests_passed: false,
        coverage_pct: 90,
      },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.missing_proofs).toContain('proof.tests_passed must be true')
    }
  })

  it('fails when coverage_pct=79 (below 80 boundary)', () => {
    const result = gateCheck({
      stage: 'PATCH_COMPLETE',
      story_id: 'WINT-3010',
      proof: {
        story_id: 'WINT-3010',
        build_passed: true,
        tests_passed: true,
        coverage_pct: 79,
      },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.missing_proofs).toContain('proof.coverage_pct must be >= 80 (got 79)')
    }
  })

  it('returns multiple missing_proofs for all failures', () => {
    const result = gateCheck({
      stage: 'PATCH_COMPLETE',
      story_id: 'WINT-3010',
      proof: {
        story_id: 'WINT-3010',
        build_passed: false,
        tests_passed: false,
        coverage_pct: 50,
      },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.missing_proofs?.length).toBe(3)
    }
  })
})

// ============================================================================
// Response shape verification (AC-6, AC-7)
// ============================================================================

describe('gateCheck — response shape', () => {
  it('AC-6: ok:true data includes passed, stage, story_id, timestamp', () => {
    const result = gateCheck({
      stage: 'POST_BOOTSTRAP',
      story_id: 'WINT-TEST',
      proof: {
        story_id: 'WINT-TEST',
        setup_complete: true,
        worktree_path: '/tree/story/WINT-TEST',
      },
    })

    expect(result).toMatchObject({
      ok: true,
      data: {
        passed: true,
        stage: 'POST_BOOTSTRAP',
        story_id: 'WINT-TEST',
      },
    })
    if (result.ok) {
      expect(typeof result.data.timestamp).toBe('string')
      expect(result.data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    }
  })

  it('AC-7: ok:false includes error string and missing_proofs array', () => {
    const result = gateCheck({
      stage: 'POST_BOOTSTRAP',
      story_id: 'WINT-TEST',
      proof: {
        story_id: 'WINT-TEST',
        setup_complete: false,
        worktree_path: '',
      },
    })

    expect(result).toMatchObject({
      ok: false,
      error: 'Gate check failed',
    })
    if (!result.ok) {
      expect(Array.isArray(result.missing_proofs)).toBe(true)
      expect((result.missing_proofs?.length ?? 0)).toBeGreaterThan(0)
    }
  })
})
