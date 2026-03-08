/**
 * Analytics Database Schema
 *
 * Defines tables in the 'analytics' PostgreSQL schema namespace.
 * This schema consolidates experiment tracking, model assignments, change telemetry,
 * and token usage analytics previously scattered across public and wint schemas.
 *
 * Story: CDTS-1010 — Create analytics schema
 *
 * Schema Notes:
 * - story_token_usage is moved from public to analytics (ALTER TABLE ... SET SCHEMA)
 * - model_experiments, model_assignments, change_telemetry are created fresh
 *   (wint schema was never applied in the live DB per CDTS-0020 audit)
 */

import {
  index,
  integer,
  numeric,
  pgSchema,
  text,
  timestamp,

  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

// ============================================================================
// Schema Namespace
// ============================================================================

export const analyticsSchema = pgSchema('analytics')

// ============================================================================
// Enums
// ============================================================================

/**
 * Experiment status enum for model_experiments table.
 * Tracks the lifecycle of a bake-off experiment between model candidates.
 */
export const analyticsExperimentStatusEnum = analyticsSchema.enum('experiment_status', [
  'active',
  'concluded',
  'expired',
])

// ============================================================================
// Tables
// ============================================================================

/**
 * Model Experiments Table
 *
 * Tracks bake-off experiments comparing control vs challenger LLM models for
 * specific change_type + file_type combinations (APIP-3060).
 * Only one active experiment is allowed per (change_type, file_type) pair
 * (enforced by partial unique index in migration).
 */
export const analyticsModelExperiments = analyticsSchema.table(
  'model_experiments',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    changeType: varchar('change_type', { length: 64 }).notNull(),
    fileType: varchar('file_type', { length: 64 }).notNull(),

    controlModel: varchar('control_model', { length: 128 }).notNull(),
    challengerModel: varchar('challenger_model', { length: 128 }).notNull(),

    status: analyticsExperimentStatusEnum('status').notNull().default('active'),

    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    concludedAt: timestamp('concluded_at', { withTimezone: true }),

    controlSampleSize: integer('control_sample_size'),
    challengerSampleSize: integer('challenger_sample_size'),

    controlSuccessRate: numeric('control_success_rate', { precision: 5, scale: 4 }),
    challengerSuccessRate: numeric('challenger_success_rate', { precision: 5, scale: 4 }),

    minSamplePerArm: integer('min_sample_per_arm').notNull().default(50),
    maxWindowRows: integer('max_window_rows'),
    maxWindowDays: integer('max_window_days'),

    winner: varchar('winner', { length: 128 }),
    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    // Partial unique index: only one active experiment per (change_type, file_type)
    // Note: partial index is defined in migration SQL — Drizzle doesn't support
    // partial unique indexes in schema definitions, so we use a regular index here
    // for type safety; the DB constraint is enforced by the migration.
    statusIdx: index('model_experiments_status_idx').on(table.status),
    startedAtIdx: index('model_experiments_started_at_idx').on(table.startedAt),
  }),
)

/**
 * Model Assignments Table
 *
 * DB-backed model assignment overrides (APIP-0040).
 * Allows dynamic per-agent-pattern model routing without code changes.
 * The most recently effective assignment for a given agent_pattern wins.
 */
export const analyticsModelAssignments = analyticsSchema.table(
  'model_assignments',
  {
    id: uuid('id').notNull().defaultRandom().primaryKey(),

    agentPattern: text('agent_pattern').notNull(),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    tier: integer('tier').notNull(),
    effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    agentPatternIdx: index('idx_model_assignments_agent_pattern').on(table.agentPattern),
    effectiveFromIdx: index('idx_model_assignments_effective_from').on(table.effectiveFrom),
  }),
)

/**
 * Change Telemetry Table (analytics schema)
 *
 * Captures per-change analytics records linked to model experiments.
 * Designed for lightweight analytics: tracks which experiment produced which
 * model swap, the outcome, and file context.
 */
export const analyticsChangeTelemetry = analyticsSchema.table(
  'change_telemetry',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    experimentId: uuid('experiment_id').references(() => analyticsModelExperiments.id),

    changeType: text('change_type').notNull(),
    filePath: text('file_path'),
    oldModel: text('old_model'),
    newModel: text('new_model'),
    outcome: text('outcome'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    experimentIdIdx: index('change_telemetry_experiment_id_idx').on(table.experimentId),
  }),
)

/**
 * Story Token Usage Table (moved from public schema)
 *
 * Token usage tracking for story workflow phases.
 * Used for cost analysis and bottleneck identification.
 * Originally defined in knowledge-base DB migrations (011_add_story_token_usage.sql).
 */
export const analyticsStoryTokenUsage = analyticsSchema.table(
  'story_token_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Story identification
    storyId: text('story_id').notNull(),
    feature: text('feature'),

    // Workflow context
    phase: text('phase').notNull(),
    agent: text('agent'),
    iteration: integer('iteration').default(0),

    // Token counts
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    totalTokens: integer('total_tokens').notNull().default(0),

    // Timestamps
    loggedAt: timestamp('logged_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('idx_story_token_usage_story_id').on(table.storyId),
    featureIdx: index('idx_story_token_usage_feature').on(table.feature),
    phaseIdx: index('idx_story_token_usage_phase').on(table.phase),
    featurePhaseIdx: index('idx_story_token_usage_feature_phase').on(
      table.feature,
      table.phase,
    ),
    loggedAtIdx: index('idx_story_token_usage_logged_at').on(table.loggedAt),
    phaseLoggedAtIdx: index('idx_story_token_usage_phase_logged_at').on(
      table.phase,
      table.loggedAt,
    ),
  }),
)

// ============================================================================
// Drizzle-Zod Insert / Select Schemas
// ============================================================================

export const insertAnalyticsModelExperimentsSchema = createInsertSchema(analyticsModelExperiments)
export const selectAnalyticsModelExperimentsSchema = createSelectSchema(analyticsModelExperiments)

export const insertAnalyticsModelAssignmentsSchema = createInsertSchema(analyticsModelAssignments)
export const selectAnalyticsModelAssignmentsSchema = createSelectSchema(analyticsModelAssignments)

export const insertAnalyticsChangeTelemetrySchema = createInsertSchema(analyticsChangeTelemetry)
export const selectAnalyticsChangeTelemetrySchema = createSelectSchema(analyticsChangeTelemetry)

export const insertAnalyticsStoryTokenUsageSchema = createInsertSchema(analyticsStoryTokenUsage)
export const selectAnalyticsStoryTokenUsageSchema = createSelectSchema(analyticsStoryTokenUsage)

// ============================================================================
// TypeScript Types (Zod-inferred per CLAUDE.md)
// ============================================================================

export type InsertAnalyticsModelExperiment = z.infer<
  typeof insertAnalyticsModelExperimentsSchema
>
export type SelectAnalyticsModelExperiment = z.infer<
  typeof selectAnalyticsModelExperimentsSchema
>

export type InsertAnalyticsModelAssignment = z.infer<
  typeof insertAnalyticsModelAssignmentsSchema
>
export type SelectAnalyticsModelAssignment = z.infer<
  typeof selectAnalyticsModelAssignmentsSchema
>

export type InsertAnalyticsChangeTelemetry = z.infer<typeof insertAnalyticsChangeTelemetrySchema>
export type SelectAnalyticsChangeTelemetry = z.infer<typeof selectAnalyticsChangeTelemetrySchema>

export type InsertAnalyticsStoryTokenUsage = z.infer<typeof insertAnalyticsStoryTokenUsageSchema>
export type SelectAnalyticsStoryTokenUsage = z.infer<typeof selectAnalyticsStoryTokenUsageSchema>
