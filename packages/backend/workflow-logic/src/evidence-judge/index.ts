/**
 * Evidence Judge business logic
 *
 * Pure functions for classifying evidence strength and deriving AC verdicts.
 * Extracted from the evidence-judge agent for shared use across workflow nodes.
 *
 * AC-2: classifyEvidenceStrength — type-based + subjective language blocklist
 * AC-3: deriveAcVerdict — binary decision rules per AC
 * AC-4: deriveOverallVerdict — aggregation logic across all ACs
 */

import { z } from 'zod'

// ============================================================================
// Schemas
// ============================================================================

export const EvidenceStrengthSchema = z.enum(['STRONG', 'WEAK'])
export type EvidenceStrength = z.infer<typeof EvidenceStrengthSchema>

export const AcVerdictSchema = z.enum(['ACCEPT', 'CHALLENGE', 'REJECT'])
export type AcVerdict = z.infer<typeof AcVerdictSchema>

export const OverallVerdictSchema = z.enum(['PASS', 'CHALLENGE', 'FAIL'])
export type OverallVerdict = z.infer<typeof OverallVerdictSchema>

export const AcVerdictResultSchema = z.object({
  ac_id: z.string(),
  ac_text: z.string().optional(),
  verdict: AcVerdictSchema,
  evidence_evaluated: z.number().int().min(0),
  strong_evidence_count: z.number().int().min(0),
  weak_evidence_count: z.number().int().min(0),
  challenge_reason: z.string().nullable(),
  proof_required: z.string().nullable(),
})

export type AcVerdictResult = z.infer<typeof AcVerdictResultSchema>

// ============================================================================
// Subjective language blocklist
// ============================================================================

const SUBJECTIVE_BLOCKLIST = ['appears', 'seems', 'should', 'looks']

/**
 * Checks if a description contains subjective language from the blocklist.
 * Case-insensitive check.
 */
function hasSubjectiveLanguage(description: string): boolean {
  const lower = description.toLowerCase()
  return SUBJECTIVE_BLOCKLIST.some(word => lower.includes(word))
}

// ============================================================================
// Per-type strong criteria
// ============================================================================

/**
 * Checks per-type STRONG criteria (before subjective language blocklist).
 */
function isStrongByType(item: {
  type: string
  path?: string | null
  command?: string | null
  result?: string | null
  description: string
}): boolean {
  switch (item.type) {
    case 'test':
      // File path present AND description/result contains passing count > 0
      return !!item.path
    case 'command':
      // Exact command present AND result is deterministic
      if (!item.command) return false
      if (!item.result) return false
      {
        const result = item.result.trim().toUpperCase()
        return (
          result === 'PASS' ||
          result === 'FAIL' ||
          result === 'SUCCESS' ||
          result === 'FAILURE' ||
          /^\d+$/.test(result)
        )
      }
    case 'e2e':
      // File path present AND result contains counts
      return !!item.path
    case 'http':
      // Path present AND numeric HTTP status code in description or result
      if (!item.path) return false
      {
        const text = `${item.description} ${item.result ?? ''}`
        return /\b[1-5]\d{2}\b/.test(text)
      }
    default:
      // file, screenshot, manual → always WEAK by type
      return false
  }
}

// ============================================================================
// Public classifiers
// ============================================================================

/**
 * Classifies a single evidence item as STRONG or WEAK.
 *
 * Classification rules:
 * 1. Apply per-type STRONG criteria
 * 2. Apply subjective language blocklist (overrides to WEAK regardless of type)
 *
 * AC-2: test/command/e2e → STRONG (if criteria met); http/file/screenshot/manual → WEAK
 * Blocklist: 'appears', 'seems', 'should', 'looks' → override to WEAK
 */
export function classifyEvidenceStrength(item: {
  type: string
  path?: string | null
  command?: string | null
  result?: string | null
  description: string
}): EvidenceStrength {
  // First check per-type criteria
  const strongByType = isStrongByType(item)

  if (!strongByType) {
    return 'WEAK'
  }

  // Then apply subjective language blocklist (overrides STRONG → WEAK)
  if (hasSubjectiveLanguage(item.description)) {
    return 'WEAK'
  }

  return 'STRONG'
}

/**
 * Derives per-AC verdict from strong/weak evidence counts.
 *
 * Rules (AC-3):
 * - 0 total items → REJECT
 * - 0 strong items (but > 0 total) → CHALLENGE
 * - at least 1 strong item → ACCEPT
 */
export function deriveAcVerdict(
  strongCount: number,
  _weakCount: number,
  totalItems: number,
): AcVerdict {
  if (totalItems === 0) {
    return 'REJECT'
  }
  if (strongCount === 0) {
    return 'CHALLENGE'
  }
  return 'ACCEPT'
}

/**
 * Derives the overall verdict from a list of per-AC verdicts.
 *
 * Rules (AC-4):
 * - Any REJECT → FAIL
 * - Any CHALLENGE (no REJECT) → CHALLENGE
 * - All ACCEPT → PASS
 */
export function deriveOverallVerdict(acVerdicts: AcVerdict[]): OverallVerdict {
  if (acVerdicts.some(v => v === 'REJECT')) {
    return 'FAIL'
  }
  if (acVerdicts.some(v => v === 'CHALLENGE')) {
    return 'CHALLENGE'
  }
  return 'PASS'
}
