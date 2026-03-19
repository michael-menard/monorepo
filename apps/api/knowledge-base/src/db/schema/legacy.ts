/**
 * Legacy Schema — public schema tables
 *
 * These tables use the default public schema (pgTable) and were part of
 * the original KB schema before the workflow.* schema migration.
 * They are retained here until the code that references them is updated.
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  index,
  integer,
  real,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { stories } from './workflow.js'
import { knowledgeEntries } from './kb.js'

// ============================================================================
// Tasks Table (Bucket C - Task Backlog)
// ============================================================================

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description'),
    sourceStoryId: text('source_story_id'),
    sourcePhase: text('source_phase'),
    sourceAgent: text('source_agent'),
    taskType: text('task_type').notNull(),
    priority: text('priority'),
    status: text('status').notNull().default('open'),
    blockedBy: uuid('blocked_by'),
    relatedKbEntries: text('related_kb_entries').array().$type<string[]>(),
    promotedToStory: text('promoted_to_story'),
    tags: text('tags').array(),
    estimatedEffort: text('estimated_effort'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    completedAt: timestamp('completed_at'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    deletedBy: text('deleted_by'),
  },
  table => ({
    statusIdx: index('idx_tasks_status').on(table.status),
    sourceStoryIdx: index('idx_tasks_source_story').on(table.sourceStoryId),
    typePriorityIdx: index('idx_tasks_type_priority').on(table.taskType, table.priority),
    createdAtIdx: index('idx_tasks_created_at').on(table.createdAt),
  }),
)

// ============================================================================
// Work State History Table (Bucket B - Session State)
// ============================================================================

export const workStateHistory = pgTable(
  'work_state_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: text('story_id')
      .notNull()
      .references(() => stories.storyId, { onDelete: 'restrict' }),
    stateSnapshot: jsonb('state_snapshot').notNull(),
    archivedAt: timestamp('archived_at').notNull().defaultNow(),
  },
  table => ({
    storyIdx: index('idx_work_state_history_story').on(table.storyId),
    archivedAtIdx: index('idx_work_state_history_archived_at').on(table.archivedAt),
  }),
)

// ============================================================================
// Deferred Writes Table (async write queue)
// ============================================================================

export const deferredWrites = pgTable(
  'deferred_writes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    operation: text('operation').notNull(),
    payload: jsonb('payload').notNull().default({}),
    error: text('error'),
    retryCount: integer('retry_count').notNull().default(0),
    lastRetry: timestamp('last_retry', { withTimezone: true }),
    storyId: text('story_id'),
    agent: text('agent'),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    unprocessedIdx: index('idx_deferred_writes_unprocessed')
      .on(table.createdAt)
      .where(sql`processed_at IS NULL`),
    unprocessedOperationIdx: index('idx_deferred_writes_unprocessed_operation')
      .on(table.operation)
      .where(sql`processed_at IS NULL`),
    unprocessedStoryIdx: index('idx_deferred_writes_unprocessed_story')
      .on(table.storyId)
      .where(sql`processed_at IS NULL AND story_id IS NOT NULL`),
  }),
)

// ============================================================================
// Task Audit Log Table
// ============================================================================

export const taskAuditLog = pgTable(
  'task_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    operation: text('operation').notNull(),
    previousValue: jsonb('previous_value'),
    newValue: jsonb('new_value'),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
    userContext: jsonb('user_context'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    taskIdIdx: index('idx_task_audit_log_task_id').on(table.taskId),
    timestampIdx: index('idx_task_audit_log_timestamp').on(table.timestamp),
    taskTimestampIdx: index('idx_task_audit_log_task_timestamp').on(table.taskId, table.timestamp),
  }),
)

// ============================================================================
// Story Audit Log Table
// ============================================================================

export const storyAuditLog = pgTable(
  'story_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: text('story_id')
      .notNull()
      .references(() => stories.storyId, { onDelete: 'cascade' }),
    operation: text('operation').notNull(),
    previousValue: jsonb('previous_value'),
    newValue: jsonb('new_value'),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
    userContext: jsonb('user_context'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('idx_story_audit_log_story_id').on(table.storyId),
    timestampIdx: index('idx_story_audit_log_timestamp').on(table.timestamp),
    storyTimestampIdx: index('idx_story_audit_log_story_timestamp').on(
      table.storyId,
      table.timestamp,
    ),
  }),
)

// ============================================================================
// Story Knowledge Links Table
// ============================================================================

export const storyKnowledgeLinks = pgTable(
  'story_knowledge_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: text('story_id')
      .notNull()
      .references(() => stories.storyId, { onDelete: 'restrict' }),
    kbEntryId: uuid('kb_entry_id')
      .notNull()
      .references(() => knowledgeEntries.id, { onDelete: 'restrict' }),
    linkType: text('link_type').notNull(),
    confidence: real('confidence').default(1.0),
    createdBy: text('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyKbUnique: uniqueIndex('idx_story_knowledge_links_unique').on(
      table.storyId,
      table.kbEntryId,
      table.linkType,
    ),
    storyIdIdx: index('idx_story_knowledge_links_story_id').on(table.storyId),
    kbEntryIdx: index('idx_story_knowledge_links_kb_entry').on(table.kbEntryId),
  }),
)

export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert
export type WorkStateHistory = typeof workStateHistory.$inferSelect
