/**
 * Unit Tests for Gate Check Compute Function
 * WINT-3010: Create Gatekeeper Sidecar
 *
 * AC-14: >=80% coverage on gate-check.ts
 * AC-5: All 4 stages covered, pass+fail paths — nested proof structures per AC-5 spec
 * AC-6: ok:true returns { passed: true, stage, story_id, timestamp }
 * AC-7: ok:false returns { error: 'Gate check failed', missing_proofs: [...] }
 *
 * Proof structures mirror real artifact shapes:
 *   POST_BOOTSTRAP: { proof: { checkpoint: { phase: "setup_complete" } } }
 *   ELAB_COMPLETE:  { proof: { elab: { verdict: "PASS"|"CONDITIONAL_PASS", findings: string[] } } }
 *   SCOPE_OK:       { proof: { scope: { included_files: string[] } } }
 *                OR { proof: { scope: { no_scope_files: true } } }
 *   PATCH_COMPLETE: { proof: { evidence: { touched_files: number > 0 } } }
 *
 * Boundary conditions:
 *   - CONDITIONAL_PASS (elab.verdict: 'CONDITIONAL_PASS', elab.findings: [...])
 *   - no_scope_files=true (valid empty scope)
 *   - touched_files=0 fails, touched_files=1 passes
 *   - elab.findings must be non-empty to pass
 */

import { describe, it, expect } from 'vitest'
import { gateCheck } from '../gate-check.js'

// ============================================================================
// POST_BOOTSTRAP stage
// AC-5: proof.checkpoint.phase must equal "setup_complete"
// ============================================================================

describe('gateCheck — POST_BOOTSTRAP', () => {
  it('passes when checkpoint.phase = "setup_complete"', () => {
    const result = gateCheck({
      stage: 'POST_BOOTSTRAP',
      story_id: 'WINT-3010',
      proof: {
        checkpoint: {
          phase: 'setup_complete',
        },
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

  it('fails when checkpoint.phase is missing', () => {
    const result = gateCheck({
      stage: 'POST_BOOTSTRAP',
      story_id: 'WINT-3010',
      proof: {
        checkpoint: {
          phase: '',
        },
      } as any,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('Gate check failed')
      expect(result.missing_proofs).toContain('proof.checkpoint.phase is required')
    }
  })

  it('fails when checkpoint.phase is not "setup_complete"', () => {
    const result = gateCheck({
      stage: 'POST_BOOTSTRAP',
      story_id: 'WINT-3010',
      proof: {
        checkpoint: {
          phase: 'in_progress',
        },
      },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('Gate check failed')
      expect(result.missing_proofs).toContain('proof.checkpoint.phase must be "setup_complete"')
    }
  })

  it('accepts extra fields via passthrough', () => {
    const result = gateCheck({
      stage: 'POST_BOOTSTRAP',
      story_id: 'WINT-3010',
      proof: {
        checkpoint: {
          phase: 'setup_complete',
          extra_field: 'value',
        },
        another_extra: true,
      } as any,
    })

    expect(result.ok).toBe(true)
  })
})

// ============================================================================
// ELAB_COMPLETE stage
// AC-5: proof.elab.verdict must be PASS or CONDITIONAL_PASS, findings non-empty
// ============================================================================

describe('gateCheck — ELAB_COMPLETE', () => {
  it('passes when elab.verdict=PASS and findings is non-empty', () => {
    const result = gateCheck({
      stage: 'ELAB_COMPLETE',
      story_id: 'WINT-3010',
      proof: {
        elab: {
          verdict: 'PASS',
          findings: ['All ACs are well-defined'],
        },
      },
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.stage).toBe('ELAB_COMPLETE')
    }
  })

  it('passes when elab.verdict=CONDITIONAL_PASS and findings is non-empty (boundary condition)', () => {
    const result = gateCheck({
      stage: 'ELAB_COMPLETE',
      story_id: 'WINT-3010',
      proof: {
        elab: {
          verdict: 'CONDITIONAL_PASS',
          findings: ['Minor gap in AC-3, acceptable risk'],
        },
      },
    })

    expect(result.ok).toBe(true)
  })

  it('fails when elab.verdict=FAIL', () => {
    const result = gateCheck({
      stage: 'ELAB_COMPLETE',
      story_id: 'WINT-3010',
      proof: {
        elab: {
          verdict: 'FAIL',
          findings: ['Critical gaps found'],
        },
      },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.missing_proofs).toContain('proof.elab.verdict must be PASS or CONDITIONAL_PASS')
    }
  })

  it('fails when elab.findings is empty array', () => {
    const result = gateCheck({
      stage: 'ELAB_COMPLETE',
      story_id: 'WINT-3010',
      proof: {
        elab: {
          verdict: 'PASS',
          findings: [],
        },
      },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.missing_proofs).toContain('proof.elab.findings must be a non-empty array')
    }
  })

  it('returns multiple missing_proofs when verdict=FAIL and findings empty', () => {
    const result = gateCheck({
      stage: 'ELAB_COMPLETE',
      story_id: 'WINT-3010',
      proof: {
        elab: {
          verdict: 'FAIL',
          findings: [],
        },
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
// AC-5: proof.scope.included_files (non-empty array) OR proof.scope.no_scope_files=true
// ============================================================================

describe('gateCheck — SCOPE_OK', () => {
  it('passes when scope.included_files is non-empty', () => {
    const result = gateCheck({
      stage: 'SCOPE_OK',
      story_id: 'WINT-3010',
      proof: {
        scope: {
          included_files: [
            'packages/backend/sidecars/gatekeeper/src/__types__/index.ts',
            'packages/backend/sidecars/gatekeeper/src/gate-check.ts',
          ],
        },
      },
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.stage).toBe('SCOPE_OK')
    }
  })

  it('passes when scope.no_scope_files=true (valid empty scope boundary condition)', () => {
    const result = gateCheck({
      stage: 'SCOPE_OK',
      story_id: 'WINT-3010',
      proof: {
        scope: {
          no_scope_files: true,
        },
      },
    })

    // no_scope_files=true is a valid CONDITIONAL_PASS scenario
    expect(result.ok).toBe(true)
  })

  it('fails when scope.included_files is empty and no_scope_files is not set', () => {
    const result = gateCheck({
      stage: 'SCOPE_OK',
      story_id: 'WINT-3010',
      proof: {
        scope: {
          included_files: [],
        },
      },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.missing_proofs).toContain(
        'proof.scope.included_files must be a non-empty array, or proof.scope.no_scope_files must be true',
      )
    }
  })

  it('fails when scope object has neither included_files nor no_scope_files', () => {
    const result = gateCheck({
      stage: 'SCOPE_OK',
      story_id: 'WINT-3010',
      proof: {
        scope: {},
      },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.missing_proofs?.length).toBeGreaterThan(0)
    }
  })
})

// ============================================================================
// PATCH_COMPLETE stage
// AC-5: proof.evidence.touched_files must be > 0
// ============================================================================

describe('gateCheck — PATCH_COMPLETE', () => {
  it('passes when evidence.touched_files > 0', () => {
    const result = gateCheck({
      stage: 'PATCH_COMPLETE',
      story_id: 'WINT-3010',
      proof: {
        evidence: {
          touched_files: 5,
        },
      },
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.stage).toBe('PATCH_COMPLETE')
    }
  })

  it('passes when evidence.touched_files = 1 (boundary: minimum valid value)', () => {
    const result = gateCheck({
      stage: 'PATCH_COMPLETE',
      story_id: 'WINT-3010',
      proof: {
        evidence: {
          touched_files: 1,
        },
      },
    })

    expect(result.ok).toBe(true)
  })

  it('fails when evidence.touched_files = 0 (boundary: must be > 0)', () => {
    const result = gateCheck({
      stage: 'PATCH_COMPLETE',
      story_id: 'WINT-3010',
      proof: {
        evidence: {
          touched_files: 0,
        },
      },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.missing_proofs).toContain('proof.evidence.touched_files must be > 0 (got 0)')
    }
  })

  it('fails when evidence.touched_files is missing', () => {
    const result = gateCheck({
      stage: 'PATCH_COMPLETE',
      story_id: 'WINT-3010',
      proof: {
        evidence: {} as any,
      },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.missing_proofs?.length).toBeGreaterThan(0)
    }
  })

  it('passes with large touched_files count', () => {
    const result = gateCheck({
      stage: 'PATCH_COMPLETE',
      story_id: 'WINT-3010',
      proof: {
        evidence: {
          touched_files: 42,
        },
      },
    })

    expect(result.ok).toBe(true)
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
        checkpoint: {
          phase: 'setup_complete',
        },
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
        checkpoint: {
          phase: 'wrong_phase',
        },
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
