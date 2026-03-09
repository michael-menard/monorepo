/**
 * Gate Validation Compute Function
 * WINT-3010: Create Gatekeeper Sidecar
 *
 * Validates stage-specific proof artifacts for each pipeline gate stage.
 * Returns a discriminated union result: { ok: true, data } | { ok: false, error, missing_proofs }
 *
 * AC-5: Per-stage proof validation for all 4 stages
 * AC-6: ok:true includes { passed: true, stage, story_id, timestamp }
 * AC-7: ok:false includes { error: 'Gate check failed', missing_proofs: [...] }
 * AC-11: Returns GateCheckHttpResponse discriminated union
 */

import type {
  GateCheckRequest,
  GateCheckHttpResponse,
  ElabCompleteProof,
  ScopeOkProof,
  PatchCompleteProof,
  PostBootstrapProof,
} from './__types__/index.js'

// ============================================================================
// Per-stage validation helpers
// AC-5: Each stage enforces its own required proof conditions
// ============================================================================

function validatePostBootstrap(proof: PostBootstrapProof): string[] {
  const missing: string[] = []
  if (!proof.setup_complete) {
    missing.push('proof.setup_complete must be true')
  }
  if (!proof.worktree_path) {
    missing.push('proof.worktree_path is required')
  }
  return missing
}

function validateElabComplete(proof: ElabCompleteProof): string[] {
  const missing: string[] = []
  if (proof.elab_verdict === 'FAIL') {
    missing.push('proof.elab_verdict must be PASS or CONDITIONAL_PASS')
  }
  if (!proof.gaps_resolved) {
    missing.push('proof.gaps_resolved must be true')
  }
  return missing
}

function validateScopeOk(proof: ScopeOkProof): string[] {
  const missing: string[] = []
  if (proof.no_scope_files && proof.touched_files === 0) {
    // no_scope_files=true + touched_files=0 is a valid special case (empty scope)
    // This is a CONDITIONAL_PASS scenario — still passes gate
  }
  if (!proof.no_scope_files && proof.touched_files === 0) {
    missing.push('proof.touched_files must be > 0 when no_scope_files is false')
  }
  return missing
}

function validatePatchComplete(proof: PatchCompleteProof): string[] {
  const missing: string[] = []
  if (!proof.build_passed) {
    missing.push('proof.build_passed must be true')
  }
  if (!proof.tests_passed) {
    missing.push('proof.tests_passed must be true')
  }
  if (proof.coverage_pct < 80) {
    missing.push(`proof.coverage_pct must be >= 80 (got ${proof.coverage_pct})`)
  }
  return missing
}

// ============================================================================
// Main gate check compute function
// ============================================================================

/**
 * Validate a gate check request against per-stage proof requirements.
 *
 * Direct-call function — not an HTTP handler.
 * Called by both the HTTP route handler (gate.ts) and the MCP wrapper.
 *
 * @param request - Validated GateCheckRequest (already parsed by Zod)
 * @returns GateCheckHttpResponse discriminated union
 */
export function gateCheck(request: GateCheckRequest): GateCheckHttpResponse {
  let missingProofs: string[]

  switch (request.stage) {
    case 'POST_BOOTSTRAP':
      missingProofs = validatePostBootstrap(request.proof)
      break
    case 'ELAB_COMPLETE':
      missingProofs = validateElabComplete(request.proof)
      break
    case 'SCOPE_OK':
      missingProofs = validateScopeOk(request.proof)
      break
    case 'PATCH_COMPLETE':
      missingProofs = validatePatchComplete(request.proof)
      break
  }

  if (missingProofs.length > 0) {
    // AC-7: ok:false with missing_proofs on validation failure (422)
    return {
      ok: false,
      error: 'Gate check failed',
      missing_proofs: missingProofs,
    }
  }

  // AC-6: ok:true with { passed: true, stage, story_id, timestamp }
  return {
    ok: true,
    data: {
      passed: true,
      stage: request.stage,
      story_id: request.story_id,
      timestamp: new Date().toISOString(),
    },
  }
}
