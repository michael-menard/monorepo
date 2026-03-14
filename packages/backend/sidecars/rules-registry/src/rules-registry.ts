/**
 * Core Compute Functions for Rules Registry
 * WINT-4020: Create Rules Registry Sidecar
 *
 * DB-backed compute functions exported for direct-call by MCP wrappers (ARCH-001).
 *
 * AC-2: getRules — query with optional filters
 * AC-3: proposeRule — create with status=proposed
 * AC-4: promoteRule — promote proposed -> active with source reference requirement
 */

import { eq, and, sql, SQL } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { rules } from '@repo/knowledge-base/src/db'
import { detectConflicts, normalizeRuleText } from './conflict-detector.js'
import {
  type GetRulesQuery,
  type ProposeRuleInput,
  type PromoteRuleInput,
  type Rule,
} from './__types__/index.js'

// Re-export normalizeRuleText for use by index.ts
export { normalizeRuleText }

// ============================================================================
// Helper: DB row to Rule shape
// ============================================================================

/**
 * Map Drizzle DB row to Rule type (camelCase -> snake_case transformation).
 */
function toRule(row: {
  id: string
  ruleText: string
  ruleType: 'gate' | 'lint' | 'prompt_injection'
  scope: string
  severity: 'error' | 'warning' | 'info'
  status: 'proposed' | 'active' | 'deprecated'
  sourceStoryId: string | null
  sourceLessonId: string | null
  createdAt: Date
  updatedAt: Date
}): Rule {
  return {
    id: row.id,
    rule_text: row.ruleText,
    rule_type: row.ruleType,
    scope: row.scope,
    severity: row.severity,
    status: row.status,
    source_story_id: row.sourceStoryId,
    source_lesson_id: row.sourceLessonId,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  }
}

// ============================================================================
// getRules
// ============================================================================

/**
 * Query rules with optional filters.
 *
 * AC-2: Returns rules filtered by type, scope, status (AND combination).
 * Defaults to all rules when no filters supplied.
 *
 * @param query - Optional filter params: type, scope, status
 * @returns Array of matching rules
 */
export async function getRules(query: GetRulesQuery = {}): Promise<Rule[]> {
  const { type, scope, status } = query

  logger.info('[rules-registry] getRules called', { type, scope, status })

  try {
    const conditions: SQL[] = []

    if (type !== undefined) {
      conditions.push(eq(rules.ruleType, type))
    }
    if (scope !== undefined) {
      conditions.push(eq(rules.scope, scope))
    }
    if (status !== undefined) {
      conditions.push(eq(rules.status, status))
    }

    const rows =
      conditions.length > 0
        ? await db
            .select()
            .from(rules)
            .where(and(...conditions))
        : await db.select().from(rules)

    const result = rows.map(toRule)

    logger.info('[rules-registry] getRules succeeded', { count: result.length })
    return result
  } catch (error) {
    logger.warn('[rules-registry] getRules failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

// ============================================================================
// proposeRule
// ============================================================================

/**
 * Result from proposeRule — success with rule or conflict.
 */
export type ProposeRuleResult =
  | { ok: true; data: Rule }
  | { ok: false; error: string; conflicting_ids: string[] }

/**
 * Propose a new rule with status=proposed.
 *
 * AC-3: Stores rule with status=proposed on success.
 * AC-10: Returns conflict info if non-deprecated duplicate exists.
 *
 * @param input - Rule proposal payload
 * @returns ProposeRuleResult with created rule or conflict info
 */
export async function proposeRule(input: ProposeRuleInput): Promise<ProposeRuleResult> {
  logger.info('[rules-registry] proposeRule called', {
    rule_type: input.rule_type,
    scope: input.scope,
    severity: input.severity,
  })

  // AC-10: Check for conflicts before inserting
  const conflictingIds = await detectConflicts(input.rule_text)
  if (conflictingIds.length > 0) {
    return {
      ok: false,
      error: 'Conflict: rule already exists',
      conflicting_ids: conflictingIds,
    }
  }

  try {
    const [inserted] = await db
      .insert(rules)
      .values({
        ruleText: input.rule_text,
        ruleType: input.rule_type,
        scope: input.scope ?? 'global',
        severity: input.severity,
        status: 'proposed',
        sourceStoryId: input.source_story_id ?? null,
        sourceLessonId: input.source_lesson_id ?? null,
      })
      .returning()

    const rule = toRule(inserted)
    logger.info('[rules-registry] proposeRule succeeded', { id: rule.id })
    return { ok: true, data: rule }
  } catch (error) {
    logger.warn('[rules-registry] proposeRule DB insert failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

// ============================================================================
// promoteRule
// ============================================================================

/**
 * Result from promoteRule — success with updated rule or error.
 */
export type PromoteRuleResult =
  | { ok: true; data: Rule }
  | { ok: false; error: string; status: 404 | 409 | 422 }

/**
 * Promote a rule from proposed to active.
 *
 * AC-4: Requires source_story_id or source_lesson_id; returns 422 if neither present.
 *       Returns 404 if rule not found, 409 if already active.
 *
 * @param id - UUID of the rule to promote
 * @param input - Promotion payload with source reference
 * @returns PromoteRuleResult
 */
export async function promoteRule(id: string, input: PromoteRuleInput): Promise<PromoteRuleResult> {
  // AC-4: source reference is required
  if (!input.source_story_id && !input.source_lesson_id) {
    return {
      ok: false,
      error: 'source_story_id or source_lesson_id required to promote',
      status: 422,
    }
  }

  logger.info('[rules-registry] promoteRule called', { id })

  try {
    // Fetch the rule first
    const [existing] = await db.select().from(rules).where(eq(rules.id, id)).limit(1)

    if (!existing) {
      return { ok: false, error: 'Rule not found', status: 404 }
    }

    if (existing.status === 'active') {
      return { ok: false, error: 'Rule is already active', status: 409 }
    }

    // Promote to active
    const [updated] = await db
      .update(rules)
      .set({
        status: 'active',
        sourceStoryId: input.source_story_id ?? existing.sourceStoryId,
        sourceLessonId: input.source_lesson_id ?? existing.sourceLessonId,
        updatedAt: sql`NOW()`,
      })
      .where(eq(rules.id, id))
      .returning()

    const rule = toRule(updated)
    logger.info('[rules-registry] promoteRule succeeded', { id: rule.id })
    return { ok: true, data: rule }
  } catch (error) {
    logger.warn('[rules-registry] promoteRule failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}
