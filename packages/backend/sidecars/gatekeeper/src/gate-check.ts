/**
 * Gate Validation Compute Function
 * WINT-3010: Create Gatekeeper Sidecar
 *
 * Validates stage-specific proof artifacts for each pipeline gate stage.
 * Returns a discriminated union result: { ok: true, data } | { ok: false, error, missing_proofs }
 *
 * AC-5: Per-stage proof validation for all 4 stages, using nested artifact-mirroring structures
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
//       Proof fields mirror real artifact structures (checkpoint, elab, scope, evidence)
// ============================================================================

function validatePostBootstrap(proof: PostBootstrapProof): string[] {
  const missing: string[] = []
  if (!proof.checkpoint?.phase) {
    missing.push('proof.checkpoint.phase is required')
  } else if (proof.checkpoint.phase !== 'setup_complete') {
    missing.push('proof.checkpoint.phase must be "setup_complete"')
  }
  return missing
}

function validateElabComplete(proof: ElabCompleteProof): string[] {
  const missing: string[] = []
  if (proof.elab?.verdict === 'FAIL') {
    missing.push('proof.elab.verdict must be PASS or CONDITIONAL_PASS')
  }
  if (!proof.elab?.findings || proof.elab.findings.length === 0) {
    missing.push('proof.elab.findings must be a non-empty array')
  }
  return missing
}

function validateScopeOk(proof: ScopeOkProof): string[] {
  const missing: string[] = []
  const scope = proof.scope

  if (scope?.no_scope_files === true) {
    // no_scope_files=true is a valid special case (empty scope) — passes gate
    return missing
  }

  if (!scope?.included_files || scope.included_files.length === 0) {
    missing.push(
      'proof.scope.included_files must be a non-empty array, or proof.scope.no_scope_files must be true',
    )
  }
  return missing
}

function validatePatchComplete(proof: PatchCompleteProof): string[] {
  const missing: string[] = []
  const touched = proof.evidence?.touched_files

  if (touched === undefined || touched === null) {
    missing.push('proof.evidence.touched_files is required')
  } else if (touched <= 0) {
    missing.push(`proof.evidence.touched_files must be > 0 (got ${touched})`)
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
