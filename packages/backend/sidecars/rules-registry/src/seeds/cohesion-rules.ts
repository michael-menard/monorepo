/**
 * Seed Script: Cohesion Rules
 * WINT-4050: Seed Initial Cohesion Rules into the Rules Registry
 *
 * Seeds 4 canonical cohesion rules into wint.rules table via proposeRule() → promoteRule().
 * Idempotent: proposeRule() returns a conflict response for existing rules; the script handles
 * this gracefully without error or duplication.
 *
 * AC-1: 4 canonical rules proposed and promoted with status=active
 * AC-2: Idempotent — re-run detects conflicts and skips without error
 * AC-3: All promoted rules carry source_story_id = 'WINT-4050'
 * AC-5: upload/replace rule stored as rule_type: prompt_injection (advisory)
 * AC-8: Invocable via pnpm seed:cohesion-rules --filter @repo/sidecar-rules-registry
 */

import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { logger } from '@repo/logger'
import { proposeRule, promoteRule } from '../rules-registry.js'
import type { ProposeRuleInput } from '../__types__/index.js'

// ============================================================================
// Constants
// ============================================================================

const SOURCE_STORY_ID = 'WINT-4050'

// ============================================================================
// Canonical Cohesion Rule Definitions (AC-1, AC-5)
// ============================================================================

/**
 * The 4 canonical cohesion rules for the WINT platform.
 *
 * AC-5 decision: upload/replace rule stored as rule_type: prompt_injection (advisory)
 * because the CRUD_STAGES constant in compute-check.ts does not include 'upload' or 'replace'.
 * A gate rule cannot be enforced without cohesion sidecar extension (deferred to WINT-4120).
 */
export const COHESION_RULE_DEFINITIONS: ProposeRuleInput[] = [
  {
    rule_text: 'A feature with a create capability must have a corresponding delete capability',
    rule_type: 'gate',
    scope: 'global',
    severity: 'error',
    source_story_id: SOURCE_STORY_ID,
  },
  {
    rule_text: 'A feature with a delete capability must have a corresponding create capability',
    rule_type: 'gate',
    scope: 'global',
    severity: 'error',
    source_story_id: SOURCE_STORY_ID,
  },
  {
    rule_text: 'A feature with an update capability must have a corresponding read capability',
    rule_type: 'gate',
    scope: 'global',
    severity: 'warning',
    source_story_id: SOURCE_STORY_ID,
  },
  {
    rule_text:
      'A feature with an upload capability must have a corresponding replace or update capability',
    rule_type: 'prompt_injection',
    scope: 'global',
    severity: 'warning',
    source_story_id: SOURCE_STORY_ID,
  },
]

// ============================================================================
// Seed Result Type
// ============================================================================

export const SeedResultSchema = z.object({
  proposed: z.number(),
  promoted: z.number(),
  conflicts: z.number(),
  failures: z.number(),
})

export type SeedResult = z.infer<typeof SeedResultSchema>

// ============================================================================
// Seed Function (AC-1, AC-2, AC-3)
// ============================================================================

/**
 * Seed canonical cohesion rules into the rules registry.
 *
 * Idempotent: safe to run multiple times. Conflicts are detected via proposeRule()
 * and handled gracefully — no duplicates created, no errors thrown.
 *
 * @param rules - Rule definitions to seed (defaults to COHESION_RULE_DEFINITIONS)
 * @returns Summary counts: proposed, promoted, conflicts, failures
 */
export async function seedCohesionRules(
  rules: ProposeRuleInput[] = COHESION_RULE_DEFINITIONS,
): Promise<SeedResult> {
  const result: SeedResult = { proposed: 0, promoted: 0, conflicts: 0, failures: 0 }

  for (const ruleDef of rules) {
    // Step 1: Propose rule
    const proposeResult = await proposeRule(ruleDef)

    if (!proposeResult.ok) {
      // Conflict = rule already exists; skip promote (AC-2 idempotency)
      logger.info('[seed:cohesion-rules] Rule already exists — skipping promote', {
        rule_text: ruleDef.rule_text,
        conflicting_ids: proposeResult.conflicting_ids,
      })
      result.conflicts++
      continue
    }

    result.proposed++

    // Step 2: Promote rule to active (AC-3: source_story_id attached)
    const promoteResult = await promoteRule(proposeResult.data.id, {
      source_story_id: SOURCE_STORY_ID,
    })

    if (!promoteResult.ok) {
      logger.warn('[seed:cohesion-rules] Failed to promote rule', {
        rule_id: proposeResult.data.id,
        rule_text: ruleDef.rule_text,
        error: promoteResult.error,
      })
      result.failures++
      continue
    }

    result.promoted++
    logger.info('[seed:cohesion-rules] Rule seeded successfully', {
      id: promoteResult.data.id,
      rule_type: promoteResult.data.rule_type,
      severity: promoteResult.data.severity,
    })
  }

  // Structured summary log (AC-8 evidence; observability)
  logger.info('[seed:cohesion-rules] Seed complete', {
    proposed: result.proposed,
    promoted: result.promoted,
    conflicts: result.conflicts,
    failures: result.failures,
  })

  return result
}

// ============================================================================
// CLI Entrypoint (AC-8)
// ============================================================================

// Only execute when this file is run directly (not when imported by tests)
const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] !== undefined &&
  process.argv[1] === fileURLToPath(import.meta.url)

if (isMain) {
  seedCohesionRules()
    .then(result => {
      if (result.failures > 0) {
        logger.warn('[seed:cohesion-rules] Completed with failures — check logs above', result)
        process.exit(1)
      } else {
        logger.info('[seed:cohesion-rules] Completed successfully', result)
        process.exit(0)
      }
    })
    .catch(error => {
      logger.warn('[seed:cohesion-rules] Seed failed with uncaught error', {
        error: error instanceof Error ? error.message : String(error),
      })
      process.exit(1)
    })
}
