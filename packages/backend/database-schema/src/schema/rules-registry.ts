/**
 * Rules Registry Database Schema
 *
 * Defines the wint.rules table for storing enforceable rules with
 * a propose/promote lifecycle.
 *
 * Story: WINT-4020 - Create Rules Registry Sidecar
 *
 * Schema Isolation:
 * - Table lives in the 'wint' PostgreSQL schema namespace
 * - Isolated from application data (public schema)
 */

import { index, pgEnum, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'
import { wintSchema } from './wint.js'

// ============================================================================
// Enums
// ============================================================================

/**
 * Rule type enum — defines the enforcement category for a rule.
 */
export const ruleTypeEnum = pgEnum('rule_type', ['gate', 'lint', 'prompt_injection'])

/**
 * Rule severity enum — defines how strictly a rule is enforced.
 */
export const ruleSeverityEnum = pgEnum('rule_severity', ['error', 'warning', 'info'])

/**
 * Rule status enum — defines the lifecycle state of a rule.
 */
export const ruleStatusEnum = pgEnum('rule_status', ['proposed', 'active', 'deprecated'])

// ============================================================================
// Table Definition
// ============================================================================

/**
 * wint.rules — enforceable rules with propose/promote lifecycle.
 *
 * AC-3, AC-4: Drizzle table definition for rules registry.
 */
export const rules = wintSchema.table(
  'rules',
  {
    /** UUID primary key */
    id: uuid('id').primaryKey().defaultRandom(),
    /** The rule text — the actual rule content (case-insensitive duplicate check) */
    ruleText: text('rule_text').notNull(),
    /** Enforcement category: gate, lint, or prompt_injection */
    ruleType: ruleTypeEnum('rule_type').notNull(),
    /** Scope: 'global' or a story/feature ID (e.g., 'WINT-4020') */
    scope: text('scope').notNull().default('global'),
    /** Enforcement severity */
    severity: ruleSeverityEnum('severity').notNull(),
    /** Lifecycle status: proposed -> active -> deprecated */
    status: ruleStatusEnum('status').notNull().default('proposed'),
    /** Story ID that originated this rule (nullable) */
    sourceStoryId: text('source_story_id'),
    /** Lesson ID that originated this rule (nullable) */
    sourceLessonId: text('source_lesson_id'),
    /** Row creation timestamp */
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    /** Row last-update timestamp */
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    /** Index for filtering by status (most common query) */
    statusIdx: index('idx_rules_status').on(table.status),
    /** Index for filtering by rule type */
    ruleTypeIdx: index('idx_rules_rule_type').on(table.ruleType),
    /** Index for filtering by scope */
    scopeIdx: index('idx_rules_scope').on(table.scope),
    /** Composite index for common type+status filter */
    typeStatusIdx: index('idx_rules_type_status').on(table.ruleType, table.status),
  }),
)

// ============================================================================
// Zod Schemas (auto-generated via drizzle-zod)
// ============================================================================

export const insertRuleSchema = createInsertSchema(rules)
export const selectRuleSchema = createSelectSchema(rules)
export type InsertRule = z.infer<typeof insertRuleSchema>
export type SelectRule = z.infer<typeof selectRuleSchema>
