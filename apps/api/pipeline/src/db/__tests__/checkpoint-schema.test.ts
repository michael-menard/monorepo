/**
 * Checkpoint Schema Unit Tests
 * Story APIP-5001: Test Database Setup for LangGraph Checkpoint Schema
 *
 * Tests validate:
 * - Table exports exist
 * - Zod schema generation and parsing
 * - Schema namespace completeness
 *
 * NOTE: These tests do NOT require a live database connection.
 *
 * @see APIP-5001 AC-6
 */

import { describe, expect, it } from 'vitest'
import {
  checkpoints,
  checkpointBlobs,
  checkpointWrites,
  checkpointMigrations,
  pipelineSchema,
  insertCheckpointSchema,
  selectCheckpointSchema,
  insertCheckpointBlobSchema,
  selectCheckpointBlobSchema,
  insertCheckpointWriteSchema,
  selectCheckpointWriteSchema,
  insertCheckpointMigrationSchema,
  selectCheckpointMigrationSchema,
} from '../schema.js'

describe('APIP-5001 - AC-6: Checkpoint Schema Tables', () => {
  it('should export all four checkpoint tables', () => {
    expect(checkpoints).toBeDefined()
    expect(checkpointBlobs).toBeDefined()
    expect(checkpointWrites).toBeDefined()
    expect(checkpointMigrations).toBeDefined()
  })

  it('should export pipelineSchema namespace with all tables', () => {
    expect(pipelineSchema).toBeDefined()
    expect(pipelineSchema.checkpoints).toBeDefined()
    expect(pipelineSchema.checkpointBlobs).toBeDefined()
    expect(pipelineSchema.checkpointWrites).toBeDefined()
    expect(pipelineSchema.checkpointMigrations).toBeDefined()
  })
})

describe('APIP-5001 - AC-6: Checkpoints Table Schema', () => {
  it('should generate insert and select Zod schemas for checkpoints', () => {
    expect(insertCheckpointSchema).toBeDefined()
    expect(selectCheckpointSchema).toBeDefined()
  })

  it('should parse a valid checkpoint insert', () => {
    const validInsert = {
      threadId: 'thread-abc-123',
      checkpointNs: '',
      checkpointId: 'ckpt-001',
      checkpoint: { v: 1, ts: '2026-01-01T00:00:00Z', id: 'ckpt-001', channel_values: {} },
      metadata: { source: 'input', step: 0, writes: {} },
    }

    const parsed = insertCheckpointSchema.parse(validInsert)
    expect(parsed.threadId).toBe('thread-abc-123')
    expect(parsed.checkpointId).toBe('ckpt-001')
    expect(parsed.checkpoint).toEqual(validInsert.checkpoint)
  })

  it('should accept optional parentCheckpointId', () => {
    const withParent = {
      threadId: 'thread-abc-123',
      checkpointNs: '',
      checkpointId: 'ckpt-002',
      parentCheckpointId: 'ckpt-001',
      checkpoint: { v: 1 },
      metadata: {},
    }

    const parsed = insertCheckpointSchema.parse(withParent)
    expect(parsed.parentCheckpointId).toBe('ckpt-001')
  })

  it('should accept null parentCheckpointId for root checkpoints', () => {
    const rootCheckpoint = {
      threadId: 'thread-root',
      checkpointNs: '',
      checkpointId: 'ckpt-root',
      parentCheckpointId: null,
      checkpoint: { v: 1 },
      metadata: {},
    }

    expect(() => insertCheckpointSchema.parse(rootCheckpoint)).not.toThrow()
  })
})

describe('APIP-5001 - AC-6: Checkpoint Blobs Table Schema', () => {
  it('should generate insert and select Zod schemas for checkpoint_blobs', () => {
    expect(insertCheckpointBlobSchema).toBeDefined()
    expect(selectCheckpointBlobSchema).toBeDefined()
  })

  it('should parse a valid checkpoint blob insert', () => {
    const validInsert = {
      threadId: 'thread-abc-123',
      checkpointNs: '',
      channel: 'messages',
      version: 'v1',
      type: 'msgpack',
    }

    const parsed = insertCheckpointBlobSchema.parse(validInsert)
    expect(parsed.channel).toBe('messages')
    expect(parsed.version).toBe('v1')
    expect(parsed.type).toBe('msgpack')
  })
})

describe('APIP-5001 - AC-6: Checkpoint Writes Table Schema', () => {
  it('should generate insert and select Zod schemas for checkpoint_writes', () => {
    expect(insertCheckpointWriteSchema).toBeDefined()
    expect(selectCheckpointWriteSchema).toBeDefined()
  })

  it('should parse a valid checkpoint write insert', () => {
    const validInsert = {
      threadId: 'thread-abc-123',
      checkpointNs: '',
      checkpointId: 'ckpt-001',
      taskId: 'task-xyz',
      idx: 0,
      channel: 'messages',
      blob: Buffer.from('test-data'),
    }

    const parsed = insertCheckpointWriteSchema.parse(validInsert)
    expect(parsed.taskId).toBe('task-xyz')
    expect(parsed.idx).toBe(0)
    expect(parsed.channel).toBe('messages')
  })
})

describe('APIP-5001 - AC-6: Checkpoint Migrations Table Schema', () => {
  it('should generate insert and select Zod schemas for checkpoint_migrations', () => {
    expect(insertCheckpointMigrationSchema).toBeDefined()
    expect(selectCheckpointMigrationSchema).toBeDefined()
  })

  it('should parse a valid migration version insert', () => {
    const validInsert = { v: 1 }
    const parsed = insertCheckpointMigrationSchema.parse(validInsert)
    expect(parsed.v).toBe(1)
  })
})

describe('APIP-5001 - AC-6: Zod Schema Type Safety', () => {
  it('should reject checkpoints with missing required fields', () => {
    const missingCheckpoint = {
      threadId: 'thread-abc-123',
      // Missing checkpointId and checkpoint
    }

    expect(() => insertCheckpointSchema.parse(missingCheckpoint)).toThrow()
  })

  it('should accept checkpoint_writes without blob (drizzle-zod custom type limitation)', () => {
    // NOTE: drizzle-zod does not enforce notNull() for custom types (like bytea).
    // The blob field is treated as optional in the generated Zod schema.
    // DB-level NOT NULL enforcement applies at INSERT time.
    // This is a known drizzle-zod limitation with customType() columns.
    const missingBlob = {
      threadId: 'thread-abc-123',
      checkpointNs: '',
      checkpointId: 'ckpt-001',
      taskId: 'task-xyz',
      idx: 0,
      channel: 'messages',
      // blob omitted — drizzle-zod allows this for custom types
    }

    // Should parse successfully (DB constraint enforced at insert time)
    const parsed = insertCheckpointWriteSchema.parse(missingBlob)
    expect(parsed.taskId).toBe('task-xyz')
  })
})
