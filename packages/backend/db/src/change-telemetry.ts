// @ts-nocheck
/**
 * Change Telemetry Database Schema
 *
 * Defines the wint.change_telemetry table for capturing per-change-attempt data
 * as raw input for the model affinity learning system (APIP-3020).
 *
 * Story: APIP-3010 - Change Telemetry Table and Instrumentation
 *
 * Schema Notes:
 * - In the 'wint' PostgreSQL schema namespace
 * - change_type and file_type use TEXT + CHECK constraints with 'unknown' placeholder
 *   pending APIP-1020 ADR confirmation
 * - outcome uses CHECK constraint: ('pass', 'fail', 'abort', 'budget_exhausted')
 * - writeTelemetry() instrumentation is GATED on APIP-1030 (see AC-7)
 */

import { sql } from 'drizzle-orm'
import { check, index, integer, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'
import { pgSchema } from 'drizzle-orm/pg-core'

const wintSchema = pgSchema('wint')

// ============================================================================
// Change Telemetry Table
// ============================================================================

/**
 * Change Telemetry Table
 *
 * Append-style table capturing one row per change attempt in the autonomous
 * development pipeline. High write volume expected at scale — telemetry must
 * not block the change loop on write failure (handled in writeTelemetry()).
 */
export const changeTelemetry = wintSchema.table(
  'change_telemetry',
  {
    // Primary key
    id: uuid('id').primaryKey().defaultRandom().notNull(),

    // Story linkage (text, no FK constraint — story_id may be from any source)
    storyId: text('story_id').notNull(),

    // Model / affinity fields
    modelId: text('model_id').notNull(),
    affinityKey: text('affinity_key').notNull(),

    // Change classification — CHECK constraints, 'unknown' placeholder (APIP-1020 pending)
    changeType: text('change_type').notNull().default('unknown'),
    fileType: text('file_type').notNull().default('unknown'),

    // Outcome — CHECK constraint
    outcome: text('outcome').notNull(),

    // Token usage
    tokensIn: integer('tokens_in').notNull().default(0),
    tokensOut: integer('tokens_out').notNull().default(0),

    // Escalation / retry metadata (nullable)
    escalatedTo: text('escalated_to'),
    retryCount: integer('retry_count').notNull().default(0),

    // Error capture (nullable — only set on fail/abort outcomes)
    errorCode: text('error_code'),
    errorMessage: text('error_message'),

    // Timing (nullable — not all callers will measure)
    durationMs: integer('duration_ms'),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    // CHECK constraint: outcome must be one of the 4 defined values
    outcomeCheck: check(
      'chk_change_telemetry_outcome',
      sql`${table.outcome} IN ('pass', 'fail', 'abort', 'budget_exhausted')`,
    ),
    // CHECK constraint: change_type with 'unknown' placeholder (APIP-1020 expansion pending)
    changeTypeCheck: check(
      'chk_change_telemetry_change_type',
      sql`${table.changeType} IN ('unknown', 'add', 'modify', 'delete', 'rename', 'refactor')`,
    ),
    // CHECK constraint: file_type with 'unknown' placeholder (APIP-1020 expansion pending)
    fileTypeCheck: check(
      'chk_change_telemetry_file_type',
      sql`${table.fileType} IN ('unknown', 'ts', 'tsx', 'sql', 'yaml', 'json', 'md', 'sh', 'other')`,
    ),
    // Index: story_id lookups
    storyIdIdx: index('idx_change_telemetry_story_id').on(table.storyId),
    // Index: affinity learning queries
    affinityIdx: index('idx_change_telemetry_affinity').on(table.affinityKey),
    // Index: time-range queries
    createdAtIdx: index('idx_change_telemetry_created_at').on(table.createdAt),
  }),
)

// ============================================================================
// Drizzle-Zod Insert / Select Schemas
// ============================================================================

/**
 * Insert schema for change_telemetry rows.
 * Use this for validating data before inserting via Drizzle.
 */
export const insertChangeTelemetrySchema = createInsertSchema(changeTelemetry)

/**
 * Select schema for change_telemetry rows.
 * Use this for validating data returned from Drizzle queries.
 */
export const selectChangeTelemetrySchema = createSelectSchema(changeTelemetry)

export type InsertChangeTelemetry = z.infer<typeof insertChangeTelemetrySchema>
export type SelectChangeTelemetry = z.infer<typeof selectChangeTelemetrySchema>
