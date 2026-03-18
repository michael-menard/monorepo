/**
 * Conflict Detector for Rules Registry
 * WINT-4020: Create Rules Registry Sidecar
 *
 * Detects duplicate rules via case-insensitive, trimmed text comparison.
 *
 * AC-10: Returns conflicting IDs when a non-deprecated rule with identical
 *        rule_text (normalized) already exists.
 */

import { sql } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { rules } from '@repo/knowledge-base/db'

/**
 * Normalize rule_text for conflict detection.
 * Applies lowercase + trim to eliminate case/whitespace variants.
 */
export function normalizeRuleText(text: string): string {
  return text.toLowerCase().trim()
}

/**
 * Check whether a non-deprecated rule with the same normalized text already exists.
 *
 * @param ruleText - The proposed rule_text (will be normalized internally)
 * @returns Array of conflicting rule IDs (empty if no conflicts)
 */
export async function detectConflicts(ruleText: string): Promise<string[]> {
  const normalized = normalizeRuleText(ruleText)

  try {
    const existing = await db
      .select({ id: rules.id })
      .from(rules)
      .where(
        // status != 'deprecated' AND lower(trim(rule_text)) = normalized
        sql`${rules.status} != 'deprecated' AND lower(trim(${rules.ruleText})) = ${normalized}`,
      )

    const ids = existing.map(r => r.id)

    if (ids.length > 0) {
      logger.info('[rules-registry] Conflict detected', { normalized, conflicting_ids: ids })
    }

    return ids
  } catch (error) {
    logger.warn('[rules-registry] detectConflicts DB query failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}
