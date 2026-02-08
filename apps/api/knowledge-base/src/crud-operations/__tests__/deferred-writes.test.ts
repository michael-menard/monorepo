/**
 * Unit tests for deferred-writes module (KBMEM-022)
 *
 * Tests the deferred KB writes queueing and processing functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'node:fs/promises'
import {
  kb_queue_deferred_write,
  kb_list_deferred_writes,
  kb_process_deferred_writes,
  kb_clear_deferred_writes,
  withDeferredFallback,
  readDeferredWritesFile,
  writeDeferredWritesFile,
  DeferredOperationTypeSchema,
  DeferredWriteEntrySchema,
  DeferredWritesFileSchema,
  KbQueueDeferredWriteInputSchema,
  KbListDeferredWritesInputSchema,
  KbProcessDeferredWritesInputSchema,
  MAX_RETRY_COUNT,
  type DeferredWriteEntry,
  type DeferredWritesFile,
} from '../deferred-writes.js'

// Mock file system
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  access: vi.fn(),
  mkdir: vi.fn(),
}))

describe('Deferred Writes Module (KBMEM-022)', () => {
  const testFilePath = '/test/DEFERRED-KB-WRITES.yaml'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Schema Validation', () => {
    it('should validate DeferredOperationType values', () => {
      const validTypes = [
        'kb_add',
        'kb_add_decision',
        'kb_add_constraint',
        'kb_add_lesson',
        'kb_add_runbook',
        'kb_add_task',
        'kb_update',
        'kb_update_task',
        'kb_update_work_state',
      ]

      for (const type of validTypes) {
        expect(() => DeferredOperationTypeSchema.parse(type)).not.toThrow()
      }

      expect(() => DeferredOperationTypeSchema.parse('invalid_type')).toThrow()
    })

    it('should validate DeferredWriteEntry schema', () => {
      const validEntry: DeferredWriteEntry = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        operation: 'kb_add',
        payload: { content: 'test' },
        timestamp: new Date().toISOString(),
        error: 'Connection failed',
        retry_count: 0,
      }

      expect(() => DeferredWriteEntrySchema.parse(validEntry)).not.toThrow()
    })

    it('should require uuid format for entry id', () => {
      const invalidEntry = {
        id: 'not-a-uuid',
        operation: 'kb_add',
        payload: { content: 'test' },
        timestamp: new Date().toISOString(),
        error: 'Connection failed',
        retry_count: 0,
      }

      expect(() => DeferredWriteEntrySchema.parse(invalidEntry)).toThrow()
    })

    it('should validate DeferredWritesFile schema', () => {
      const validFile: DeferredWritesFile = {
        version: '1.0',
        writes: [],
        updated_at: new Date().toISOString(),
      }

      expect(() => DeferredWritesFileSchema.parse(validFile)).not.toThrow()
    })

    it('should validate KbQueueDeferredWriteInput schema', () => {
      const validInput = {
        operation: 'kb_add_task',
        payload: { title: 'Test task' },
        error: 'Connection timeout',
        story_id: 'WISH-2045',
        agent: 'dev-implement-leader',
      }

      expect(() => KbQueueDeferredWriteInputSchema.parse(validInput)).not.toThrow()
    })

    it('should validate KbListDeferredWritesInput schema', () => {
      const validInput = {
        limit: 50,
        operation: 'kb_add',
        story_id: 'WISH-2045',
      }

      expect(() => KbListDeferredWritesInputSchema.parse(validInput)).not.toThrow()
    })

    it('should enforce limit constraints', () => {
      // Max 200
      expect(() =>
        KbListDeferredWritesInputSchema.parse({ limit: 201 }),
      ).toThrow()

      // Positive only
      expect(() =>
        KbListDeferredWritesInputSchema.parse({ limit: 0 }),
      ).toThrow()
    })

    it('should validate KbProcessDeferredWritesInput schema', () => {
      const validInput = {
        dry_run: true,
        limit: 100,
        operation: 'kb_add_decision',
        story_id: 'WISH-2045',
      }

      expect(() => KbProcessDeferredWritesInputSchema.parse(validInput)).not.toThrow()
    })
  })

  describe('readDeferredWritesFile', () => {
    it('should return empty writes array when file does not exist', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))

      const result = await readDeferredWritesFile(testFilePath)

      expect(result.version).toBe('1.0')
      expect(result.writes).toEqual([])
      expect(result.updated_at).toBeDefined()
    })

    it('should parse existing file content', async () => {
      const existingData: DeferredWritesFile = {
        version: '1.0',
        writes: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            operation: 'kb_add',
            payload: { content: 'test' },
            timestamp: '2026-02-04T10:00:00.000Z',
            error: 'Connection failed',
            retry_count: 1,
          },
        ],
        updated_at: '2026-02-04T10:00:00.000Z',
      }

      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existingData))

      const result = await readDeferredWritesFile(testFilePath)

      expect(result.writes).toHaveLength(1)
      expect(result.writes[0].operation).toBe('kb_add')
    })
  })

  describe('writeDeferredWritesFile', () => {
    it('should create directory and write file', async () => {
      const data: DeferredWritesFile = {
        version: '1.0',
        writes: [],
        updated_at: new Date().toISOString(),
      }

      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      await writeDeferredWritesFile(testFilePath, data)

      expect(fs.mkdir).toHaveBeenCalledWith('/test', { recursive: true })
      expect(fs.writeFile).toHaveBeenCalledWith(
        testFilePath,
        JSON.stringify(data, null, 2),
        'utf-8',
      )
    })
  })

  describe('kb_queue_deferred_write', () => {
    it('should queue a new write', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      const result = await kb_queue_deferred_write(
        {
          operation: 'kb_add_task',
          payload: { title: 'Test task' },
          error: 'Connection timeout',
          story_id: 'WISH-2045',
        },
        testFilePath,
      )

      expect(result.success).toBe(true)
      expect(result.id).toBeDefined()
      expect(result.message).toContain('kb_add_task')
    })

    it('should append to existing writes', async () => {
      const existingData: DeferredWritesFile = {
        version: '1.0',
        writes: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            operation: 'kb_add',
            payload: { content: 'existing' },
            timestamp: '2026-02-04T10:00:00.000Z',
            error: 'Error',
            retry_count: 0,
          },
        ],
        updated_at: '2026-02-04T10:00:00.000Z',
      }

      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existingData))
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)

      let writtenData: DeferredWritesFile | null = null
      vi.mocked(fs.writeFile).mockImplementation(async (_path, content) => {
        writtenData = JSON.parse(content as string)
      })

      await kb_queue_deferred_write(
        {
          operation: 'kb_add_decision',
          payload: { title: 'New decision' },
          error: 'Timeout',
        },
        testFilePath,
      )

      expect(writtenData).not.toBeNull()
      expect(writtenData!.writes).toHaveLength(2)
    })
  })

  describe('kb_list_deferred_writes', () => {
    it('should list all writes when no filter', async () => {
      const existingData: DeferredWritesFile = {
        version: '1.0',
        writes: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            operation: 'kb_add',
            payload: { content: 'test1' },
            timestamp: '2026-02-04T10:00:00.000Z',
            error: 'Error',
            retry_count: 0,
          },
          {
            id: '123e4567-e89b-12d3-a456-426614174002',
            operation: 'kb_add_task',
            payload: { title: 'task' },
            timestamp: '2026-02-04T10:01:00.000Z',
            error: 'Error',
            retry_count: 0,
            story_id: 'WISH-2045',
          },
        ],
        updated_at: '2026-02-04T10:01:00.000Z',
      }

      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existingData))

      const result = await kb_list_deferred_writes({}, testFilePath)

      expect(result.success).toBe(true)
      expect(result.total).toBe(2)
      expect(result.writes).toHaveLength(2)
    })

    it('should filter by operation', async () => {
      const existingData: DeferredWritesFile = {
        version: '1.0',
        writes: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            operation: 'kb_add',
            payload: { content: 'test1' },
            timestamp: '2026-02-04T10:00:00.000Z',
            error: 'Error',
            retry_count: 0,
          },
          {
            id: '123e4567-e89b-12d3-a456-426614174002',
            operation: 'kb_add_task',
            payload: { title: 'task' },
            timestamp: '2026-02-04T10:01:00.000Z',
            error: 'Error',
            retry_count: 0,
          },
        ],
        updated_at: '2026-02-04T10:01:00.000Z',
      }

      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existingData))

      const result = await kb_list_deferred_writes(
        { operation: 'kb_add_task' },
        testFilePath,
      )

      expect(result.writes).toHaveLength(1)
      expect(result.writes[0].operation).toBe('kb_add_task')
    })

    it('should filter by story_id', async () => {
      const existingData: DeferredWritesFile = {
        version: '1.0',
        writes: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            operation: 'kb_add',
            payload: { content: 'test1' },
            timestamp: '2026-02-04T10:00:00.000Z',
            error: 'Error',
            retry_count: 0,
          },
          {
            id: '123e4567-e89b-12d3-a456-426614174002',
            operation: 'kb_add_task',
            payload: { title: 'task' },
            timestamp: '2026-02-04T10:01:00.000Z',
            error: 'Error',
            retry_count: 0,
            story_id: 'WISH-2045',
          },
        ],
        updated_at: '2026-02-04T10:01:00.000Z',
      }

      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existingData))

      const result = await kb_list_deferred_writes(
        { story_id: 'WISH-2045' },
        testFilePath,
      )

      expect(result.writes).toHaveLength(1)
      expect(result.writes[0].story_id).toBe('WISH-2045')
    })
  })

  describe('kb_process_deferred_writes', () => {
    it('should return dry run results without processing', async () => {
      const existingData: DeferredWritesFile = {
        version: '1.0',
        writes: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            operation: 'kb_add',
            payload: { content: 'test1' },
            timestamp: '2026-02-04T10:00:00.000Z',
            error: 'Error',
            retry_count: 0,
          },
        ],
        updated_at: '2026-02-04T10:00:00.000Z',
      }

      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existingData))

      const result = await kb_process_deferred_writes(
        { dry_run: true },
        testFilePath,
      )

      expect(result.success).toBe(true)
      expect(result.dry_run).toBe(true)
      expect(result.total).toBe(1)
      expect(result.processed).toBe(0)
      expect(result.writes[0].status).toBe('skipped')
    })

    it('should return error when no processor provided', async () => {
      const existingData: DeferredWritesFile = {
        version: '1.0',
        writes: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            operation: 'kb_add',
            payload: { content: 'test1' },
            timestamp: '2026-02-04T10:00:00.000Z',
            error: 'Error',
            retry_count: 0,
          },
        ],
        updated_at: '2026-02-04T10:00:00.000Z',
      }

      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existingData))

      const result = await kb_process_deferred_writes(
        { dry_run: false },
        testFilePath,
      )

      expect(result.success).toBe(false)
      expect(result.message).toContain('No processor provided')
    })

    it('should process writes with processor', async () => {
      const existingData: DeferredWritesFile = {
        version: '1.0',
        writes: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            operation: 'kb_add',
            payload: { content: 'test1' },
            timestamp: '2026-02-04T10:00:00.000Z',
            error: 'Error',
            retry_count: 0,
          },
        ],
        updated_at: '2026-02-04T10:00:00.000Z',
      }

      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existingData))
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      const processor = vi.fn().mockResolvedValue({ success: true })

      const result = await kb_process_deferred_writes(
        { dry_run: false },
        testFilePath,
        processor,
      )

      expect(result.success).toBe(true)
      expect(result.succeeded).toBe(1)
      expect(result.failed).toBe(0)
      expect(processor).toHaveBeenCalledTimes(1)
    })

    it('should skip writes that exceed max retry count', async () => {
      const existingData: DeferredWritesFile = {
        version: '1.0',
        writes: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            operation: 'kb_add',
            payload: { content: 'test1' },
            timestamp: '2026-02-04T10:00:00.000Z',
            error: 'Error',
            retry_count: MAX_RETRY_COUNT,
          },
        ],
        updated_at: '2026-02-04T10:00:00.000Z',
      }

      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existingData))
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      const processor = vi.fn()

      const result = await kb_process_deferred_writes(
        { dry_run: false },
        testFilePath,
        processor,
      )

      expect(result.writes[0].status).toBe('skipped')
      expect(result.writes[0].error).toContain('Max retries')
      expect(processor).not.toHaveBeenCalled()
    })
  })

  describe('kb_clear_deferred_writes', () => {
    it('should clear all writes', async () => {
      const existingData: DeferredWritesFile = {
        version: '1.0',
        writes: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            operation: 'kb_add',
            payload: { content: 'test1' },
            timestamp: '2026-02-04T10:00:00.000Z',
            error: 'Error',
            retry_count: 0,
          },
          {
            id: '123e4567-e89b-12d3-a456-426614174002',
            operation: 'kb_add_task',
            payload: { title: 'task' },
            timestamp: '2026-02-04T10:01:00.000Z',
            error: 'Error',
            retry_count: 0,
          },
        ],
        updated_at: '2026-02-04T10:01:00.000Z',
      }

      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existingData))
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)

      let writtenData: DeferredWritesFile | null = null
      vi.mocked(fs.writeFile).mockImplementation(async (_path, content) => {
        writtenData = JSON.parse(content as string)
      })

      const result = await kb_clear_deferred_writes(testFilePath)

      expect(result.cleared).toBe(2)
      expect(result.message).toContain('2')
      expect(writtenData!.writes).toHaveLength(0)
    })
  })

  describe('withDeferredFallback', () => {
    it('should return result on success', async () => {
      const operation = vi.fn().mockResolvedValue({ data: 'success' })

      const result = await withDeferredFallback(operation, {
        operation: 'kb_add',
        payload: { content: 'test' },
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.result).toEqual({ data: 'success' })
      }
    })

    it('should queue write on connection error', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))

      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      const result = await withDeferredFallback(operation, {
        operation: 'kb_add',
        payload: { content: 'test' },
        story_id: 'WISH-2045',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.queued).toBe(true)
        expect(result.id).toBeDefined()
      }
    })

    it('should re-throw non-connection errors', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Validation failed'))

      await expect(
        withDeferredFallback(operation, {
          operation: 'kb_add',
          payload: { content: 'test' },
        }),
      ).rejects.toThrow('Validation failed')
    })
  })

  describe('Constants', () => {
    it('should have MAX_RETRY_COUNT of 5', () => {
      expect(MAX_RETRY_COUNT).toBe(5)
    })
  })
})
