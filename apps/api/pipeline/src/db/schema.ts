/**
 * Pipeline Database Schema - LangGraph Checkpoint Tables
 *
 * Drizzle ORM table definitions for LangGraph checkpoint storage.
 * These tables match the schema used by @langchain/langgraph-checkpoint-postgres.
 *
 * Tables:
 * - checkpoints: Primary checkpoint storage per thread/run/step
 * - checkpoint_blobs: Binary data blobs referenced by checkpoints
 * - checkpoint_writes: Pending writes (tasks not yet committed to checkpoint)
 * - checkpoint_migrations: Schema migration tracking
 *
 * NOTE: The column definitions mirror the LangGraph postgres checkpoint
 * saver schema. Do NOT rename columns — LangGraph uses them by convention.
 *
 * @see APIP-5001 AC-2, AC-6
 * @see APIP-5007 for LangGraph agent integration (supersedes migration runner)
 */

import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  primaryKey,
  customType,
} from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

/**
 * Custom Drizzle column type for PostgreSQL BYTEA columns.
 * Handles serialization between Buffer/Uint8Array and pg's bytea wire format.
 */
const bytea = customType<{ data: Buffer; driverData: Buffer; notNull: false; default: false }>({
  dataType() {
    return 'bytea'
  },
  toDriver(value: Buffer): Buffer {
    return value
  },
  fromDriver(value: Buffer): Buffer {
    return value
  },
})

/**
 * Checkpoints table.
 *
 * Stores LangGraph checkpoint state per thread/run/checkpoint combination.
 * Each row represents a point-in-time snapshot of a graph's state.
 *
 * Primary key: (thread_id, checkpoint_ns, checkpoint_id)
 * - thread_id: Identifies the conversation/agent thread
 * - checkpoint_ns: Namespace within the thread (usually empty string for root)
 * - checkpoint_id: UUID identifying the specific checkpoint
 */
export const checkpoints = pgTable(
  'checkpoints',
  {
    threadId: text('thread_id').notNull(),
    checkpointNs: text('checkpoint_ns').notNull().default(''),
    checkpointId: text('checkpoint_id').notNull(),
    parentCheckpointId: text('parent_checkpoint_id'),
    type: text('type'),
    checkpoint: jsonb('checkpoint').notNull(),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    pk: primaryKey({ columns: [table.threadId, table.checkpointNs, table.checkpointId] }),
  }),
)

/**
 * Checkpoint blobs table.
 *
 * Stores binary data blobs referenced by checkpoints.
 * Large state values are stored here to keep the checkpoints table lean.
 *
 * Primary key: (thread_id, checkpoint_ns, channel, version)
 */
export const checkpointBlobs = pgTable(
  'checkpoint_blobs',
  {
    threadId: text('thread_id').notNull(),
    checkpointNs: text('checkpoint_ns').notNull().default(''),
    channel: text('channel').notNull(),
    version: text('version').notNull(),
    type: text('type').notNull(),
    blob: bytea('blob'),
  },
  table => ({
    pk: primaryKey({
      columns: [table.threadId, table.checkpointNs, table.channel, table.version],
    }),
  }),
)

/**
 * Checkpoint writes table.
 *
 * Records pending writes from LangGraph tasks before they are committed
 * to a checkpoint. This supports at-least-once delivery semantics.
 *
 * Primary key: (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
 */
export const checkpointWrites = pgTable(
  'checkpoint_writes',
  {
    threadId: text('thread_id').notNull(),
    checkpointNs: text('checkpoint_ns').notNull().default(''),
    checkpointId: text('checkpoint_id').notNull(),
    taskId: text('task_id').notNull(),
    idx: integer('idx').notNull(),
    channel: text('channel').notNull(),
    type: text('type'),
    blob: bytea('blob').notNull(),
  },
  table => ({
    pk: primaryKey({
      columns: [table.threadId, table.checkpointNs, table.checkpointId, table.taskId, table.idx],
    }),
  }),
)

/**
 * Checkpoint migrations table.
 *
 * Tracks which schema migrations have been applied.
 * Used by the provisional migration runner (APIP-5001).
 * Will be superseded by APIP-5007.
 */
export const checkpointMigrations = pgTable('checkpoint_migrations', {
  v: integer('v').primaryKey(),
})

// ============================================================================
// Zod Schemas (generated from Drizzle table definitions)
// ============================================================================

export const insertCheckpointSchema = createInsertSchema(checkpoints)
export const selectCheckpointSchema = createSelectSchema(checkpoints)

export type InsertCheckpoint = z.infer<typeof insertCheckpointSchema>
export type SelectCheckpoint = z.infer<typeof selectCheckpointSchema>

export const insertCheckpointBlobSchema = createInsertSchema(checkpointBlobs)
export const selectCheckpointBlobSchema = createSelectSchema(checkpointBlobs)

export type InsertCheckpointBlob = z.infer<typeof insertCheckpointBlobSchema>
export type SelectCheckpointBlob = z.infer<typeof selectCheckpointBlobSchema>

export const insertCheckpointWriteSchema = createInsertSchema(checkpointWrites)
export const selectCheckpointWriteSchema = createSelectSchema(checkpointWrites)

export type InsertCheckpointWrite = z.infer<typeof insertCheckpointWriteSchema>
export type SelectCheckpointWrite = z.infer<typeof selectCheckpointWriteSchema>

export const insertCheckpointMigrationSchema = createInsertSchema(checkpointMigrations)
export const selectCheckpointMigrationSchema = createSelectSchema(checkpointMigrations)

export type InsertCheckpointMigration = z.infer<typeof insertCheckpointMigrationSchema>
export type SelectCheckpointMigration = z.infer<typeof selectCheckpointMigrationSchema>

/**
 * Pipeline schema namespace — all checkpoint tables.
 * Use when passing schema to Drizzle for type-safe queries.
 */
export const pipelineSchema = {
  checkpoints,
  checkpointBlobs,
  checkpointWrites,
  checkpointMigrations,
}
