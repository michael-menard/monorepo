/**
 * Zod Schemas for Gatekeeper Sidecar
 * WINT-3010: Create Gatekeeper Sidecar
 *
 * Uses Zod-first approach per CLAUDE.md — no TypeScript interfaces.
 * AC-10: All types defined via z.object(), z.enum(), z.discriminatedUnion() — no interface keywords.
 * AC-11: GateCheckHttpResponseSchema uses z.discriminatedUnion('ok', [...]) with missing_proofs? on ok:false variant.
 */

import { z } from 'zod'

// ============================================================================
// Gate Stage Enum
// AC-4: 4 stages: POST_BOOTSTRAP, ELAB_COMPLETE, SCOPE_OK, PATCH_COMPLETE
// ============================================================================

export const GateStageSchema = z.enum([
  'POST_BOOTSTRAP',
  'ELAB_COMPLETE',
  'SCOPE_OK',
  'PATCH_COMPLETE',
])

export type GateStage = z.infer<typeof GateStageSchema>

// ============================================================================
// Per-stage proof schemas
// AC-5: Each stage has its own required proof fields matching artifact structures
// ARCH-001: Use .passthrough() on proof sub-objects to allow extra fields
// ============================================================================

/**
 * POST_BOOTSTRAP proof — mirrors CHECKPOINT artifact structure
 * AC-5: { proof: { checkpoint: { phase: "setup_complete" } } }
 */
export const PostBootstrapProofSchema = z
  .object({
    checkpoint: z
      .object({
        phase: z.string().min(1, 'checkpoint.phase is required'),
      })
      .passthrough(),
  })
  .passthrough()

export type PostBootstrapProof = z.infer<typeof PostBootstrapProofSchema>

/**
 * ELAB_COMPLETE proof — mirrors ELAB artifact structure
 * AC-5: { proof: { elab: { verdict: "PASS"|"CONDITIONAL_PASS", findings: string[] } } }
 */
export const ElabCompleteProofSchema = z
  .object({
    elab: z
      .object({
        verdict: z.enum(['PASS', 'CONDITIONAL_PASS', 'FAIL']),
        findings: z.array(z.string()),
      })
      .passthrough(),
  })
  .passthrough()

export type ElabCompleteProof = z.infer<typeof ElabCompleteProofSchema>

/**
 * SCOPE_OK proof — mirrors SCOPE artifact structure
 * AC-5: { proof: { scope: { included_files: string[] } } }
 *    OR { proof: { scope: { no_scope_files: true } } }
 */
export const ScopeOkProofSchema = z
  .object({
    scope: z
      .object({
        included_files: z.array(z.string()).optional(),
        no_scope_files: z.boolean().optional(),
      })
      .passthrough(),
  })
  .passthrough()

export type ScopeOkProof = z.infer<typeof ScopeOkProofSchema>

/**
 * PATCH_COMPLETE proof — mirrors EVIDENCE artifact structure
 * AC-5: { proof: { evidence: { touched_files: number > 0 } } }
 */
export const PatchCompleteProofSchema = z
  .object({
    evidence: z
      .object({
        touched_files: z.number().int().min(0),
      })
      .passthrough(),
  })
  .passthrough()

export type PatchCompleteProof = z.infer<typeof PatchCompleteProofSchema>

// ============================================================================
// Gate Check Request — discriminated union on stage
// ARCH-001: z.discriminatedUnion('stage', [...]) at request level
// ============================================================================

export const GateCheckRequestSchema = z.discriminatedUnion('stage', [
  z.object({
    stage: z.literal('POST_BOOTSTRAP'),
    story_id: z.string().min(1, 'story_id is required'),
    proof: PostBootstrapProofSchema,
  }),
  z.object({
    stage: z.literal('ELAB_COMPLETE'),
    story_id: z.string().min(1, 'story_id is required'),
    proof: ElabCompleteProofSchema,
  }),
  z.object({
    stage: z.literal('SCOPE_OK'),
    story_id: z.string().min(1, 'story_id is required'),
    proof: ScopeOkProofSchema,
  }),
  z.object({
    stage: z.literal('PATCH_COMPLETE'),
    story_id: z.string().min(1, 'story_id is required'),
    proof: PatchCompleteProofSchema,
  }),
])

export type GateCheckRequest = z.infer<typeof GateCheckRequestSchema>

// ============================================================================
// Gate Check Result (compute layer output)
// AC-6: ok:true includes { passed: true, stage, story_id, timestamp }
// ============================================================================

export const GateCheckPassedResultSchema = z.object({
  passed: z.literal(true),
  stage: GateStageSchema,
  story_id: z.string(),
  timestamp: z.string(),
})

export type GateCheckPassedResult = z.infer<typeof GateCheckPassedResultSchema>

// ============================================================================
// Gate Check Response — discriminated union on ok
// AC-11: ok:false variant includes missing_proofs?: z.array(z.string()).optional()
// ARCH-003: missing_proofs populated on 422, absent on 400/404/405
// ============================================================================

export const GateCheckHttpResponseSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    data: GateCheckPassedResultSchema,
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
    missing_proofs: z.array(z.string()).optional(),
  }),
])

export type GateCheckHttpResponse = z.infer<typeof GateCheckHttpResponseSchema>
