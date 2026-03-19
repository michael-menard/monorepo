/**
 * Analytics Schema — analytics PostgreSQL schema
 *
 * Database: KB DB (@repo/knowledge-base, port 5433)
 * Schema:   analytics
 *
 * Token usage, A/B model experiments, and model assignments for
 * tracking AI cost and performance across workflow runs.
 */

import { pgSchema, text, timestamp, uuid, integer, numeric } from 'drizzle-orm/pg-core'

const analytics = pgSchema('analytics')

// PARTITIONED TABLE — managed via migration 1100_cdbe5010_partition_telemetry.sql
// Physical DB: RANGE-partitioned on logged_at. Composite PK (id, logged_at).
// Drizzle ORM does not natively express PARTITION BY — this definition reflects the column
// signature only. Partitioning and indexes are handled entirely in SQL migration 1100.
// Partitions: story_token_usage_default (historical), story_token_usage_y<YYYY>m<MM> (monthly).
// No dependent FKs — this table is append-only analytics data.
export const storyTokenUsage = analytics.table('story_token_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: text('story_id').notNull(),
  feature: text('feature'),
  phase: text('phase').notNull(),
  agent: text('agent'),
  iteration: integer('iteration').default(0),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  totalTokens: integer('total_tokens').notNull().default(0),
  loggedAt: timestamp('logged_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const changeTelemetry = analytics.table('change_telemetry', {
  id: uuid('id').primaryKey().defaultRandom(),
  experimentId: uuid('experiment_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const modelExperiments = analytics.table('model_experiments', {
  id: uuid('id').primaryKey().defaultRandom(),
  changeType: text('change_type').notNull(),
  fileType: text('file_type').notNull(),
  controlModel: text('control_model').notNull(),
  challengerModel: text('challenger_model').notNull(),
  status: text('status').notNull().default('active'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  concludedAt: timestamp('concluded_at', { withTimezone: true }),
  controlSampleSize: integer('control_sample_size'),
  challengerSampleSize: integer('challenger_sample_size'),
  controlSuccessRate: numeric('control_success_rate', { precision: 5, scale: 4 }),
  challengerSuccessRate: numeric('challenger_success_rate', { precision: 5, scale: 4 }),
  minSamplePerArm: integer('min_sample_per_arm').notNull().default(50),
  maxWindowRows: integer('max_window_rows'),
  maxWindowDays: integer('max_window_days'),
  winner: text('winner'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const modelAssignments = analytics.table('model_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentPattern: text('agent_pattern').notNull(),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  tier: integer('tier').notNull(),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
