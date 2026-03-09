/**
 * Unit tests for deferred-writes module (KBMEM-022)
 *
 * Tests the DB-backed deferred KB writes queueing and processing functionality.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  kb_queue_deferred_write,
  kb_list_deferred_writes,
  kb_process_deferred_writes,
  kb_clear_deferred_writes,
  withDeferredFallback,
  DeferredOperationTypeSchema,
  DeferredWriteEntrySchema,
  KbQueueDeferredWriteInputSchema,
  KbListDeferredWritesInputSchema,
  KbProcessDeferredWritesInputSchema,
  MAX_RETRY_COUNT,
  type DeferredWriteEntry,
  type DeferredWritesDeps,
} from '../deferred-writes.js'

// ============================================================================
// Mock DB helpers
// ============================================================================

function createMockDb() {
  const insertReturning = vi.fn()
  const insertValues = vi.fn().mockReturnValue({ returning: insertReturning })
  const insertFn = vi.fn().mockReturnValue({ values: insertValues })

  const selectLimit = vi.fn()
  const selectOrderBy = vi.fn().mockReturnValue({ limit: selectLimit })
  const selectWhere = vi.fn().mockReturnValue({ orderBy: selectOrderBy })
  const selectFrom = vi.fn().mockReturnValue({ where: selectWhere })
  const selectFn = vi.fn().mockReturnValue({ from: selectFrom })

  const updateWhere = vi.fn()
  const updateSet = vi.fn().mockReturnValue({ where: updateWhere })
  const updateFn = vi.fn().mockReturnValue({ set: updateSet })

  const deleteReturning = vi.fn()
  const deleteWhere = vi.fn().mockReturnValue({ returning: deleteReturning })
  const deleteFn = vi.fn().mockReturnValue({ where: deleteWhere })

  const executeFn = vi.fn()

  return {
    db: {
      insert: insertFn,
      select: selectFn,
      update: updateFn,
      delete: deleteFn,
      execute: executeFn,
    } as unknown as DeferredWritesDeps['db'],
    mocks: {
      insertReturning,
      insertValues,
      insertFn,
      selectLimit,
      selectOrderBy,
      selectWhere,
      selectFrom,
      selectFn,
      updateWhere,
      updateSet,
      updateFn,
      deleteReturning,
      deleteWhere,
      deleteFn,
      executeFn,
    },
  }
}

describe('Deferred Writes Module (KBMEM-022)', () => {
  let mockDb: ReturnType<typeof createMockDb>

  beforeEach(() => {
    vi.clearAllMocks()
    mockDb = createMockDb()
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
        created_at: new Date(),
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
        created_at: new Date(),
        error: 'Connection failed',
        retry_count: 0,
      }

      expect(() => DeferredWriteEntrySchema.parse(invalidEntry)).toThrow()
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
      expect(() => KbListDeferredWritesInputSchema.parse({ limit: 201 })).toThrow()

      // Positive only
      expect(() => KbListDeferredWritesInputSchema.parse({ limit: 0 })).toThrow()
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

  describe('kb_queue_deferred_write', () => {
    it('should insert a new row and return the id', async () => {
      const testId = '123e4567-e89b-12d3-a456-426614174000'
      mockDb.mocks.insertReturning.mockResolvedValue([{ id: testId }])

      const result = await kb_queue_deferred_write(
        {
          operation: 'kb_add_task',
          payload: { title: 'Test task' },
          error: 'Connection timeout',
          story_id: 'WISH-2045',
        },
        { db: mockDb.db },
      )

      expect(result.success).toBe(true)
      expect(result.id).toBe(testId)
      expect(result.message).toContain('kb_add_task')
      expect(mockDb.mocks.insertFn).toHaveBeenCalledTimes(1)
    })
  })

  describe('kb_list_deferred_writes', () => {
    it('should list unprocessed writes', async () => {
      const now = new Date()
      const rows = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          operation: 'kb_add',
          payload: { content: 'test1' },
          createdAt: now,
          error: 'Error',
          retryCount: 0,
          lastRetry: null,
          storyId: null,
          agent: null,
          processedAt: null,
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          operation: 'kb_add_task',
          payload: { title: 'task' },
          createdAt: now,
          error: 'Error',
          retryCount: 0,
          lastRetry: null,
          storyId: 'WISH-2045',
          agent: null,
          processedAt: null,
        },
      ]

      // First select call returns rows, second returns count
      mockDb.mocks.selectLimit.mockResolvedValueOnce(rows)
      mockDb.mocks.selectWhere.mockReturnValueOnce({ count: 2 })

      // Override for the count query - need a separate chain
      const countFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 2 }]),
      })
      const countSelect = mockDb.mocks.selectFn
      // First call returns the rows chain, second call returns count chain
      countSelect.mockReturnValueOnce({ from: mockDb.mocks.selectFrom })
      countSelect.mockReturnValueOnce({ from: countFrom })

      // Reset and reconfigure
      mockDb = createMockDb()
      mockDb.mocks.selectLimit.mockResolvedValueOnce(rows)
      // For count query, mock select().from().where() to return [{count: 2}]
      const countWhere = vi.fn().mockResolvedValue([{ count: 2 }])
      const countFrom2 = vi.fn().mockReturnValue({ where: countWhere })
      mockDb.mocks.selectFn
        .mockReturnValueOnce({ from: mockDb.mocks.selectFrom }) // first select (rows)
        .mockReturnValueOnce({ from: countFrom2 }) // second select (count)

      const result = await kb_list_deferred_writes({}, { db: mockDb.db })

      expect(result.success).toBe(true)
      expect(result.total).toBe(2)
      expect(result.writes).toHaveLength(2)
    })

    it('should filter by operation', async () => {
      const now = new Date()
      const rows = [
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          operation: 'kb_add_task',
          payload: { title: 'task' },
          createdAt: now,
          error: 'Error',
          retryCount: 0,
          lastRetry: null,
          storyId: null,
          agent: null,
          processedAt: null,
        },
      ]

      mockDb.mocks.selectLimit.mockResolvedValueOnce(rows)
      const countWhere = vi.fn().mockResolvedValue([{ count: 1 }])
      const countFrom = vi.fn().mockReturnValue({ where: countWhere })
      mockDb.mocks.selectFn
        .mockReturnValueOnce({ from: mockDb.mocks.selectFrom })
        .mockReturnValueOnce({ from: countFrom })

      const result = await kb_list_deferred_writes(
        { operation: 'kb_add_task' },
        { db: mockDb.db },
      )

      expect(result.writes).toHaveLength(1)
      expect(result.writes[0].operation).toBe('kb_add_task')
    })
  })

  describe('kb_process_deferred_writes', () => {
    it('should return dry run results without processing', async () => {
      const now = new Date()
      const rows = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          operation: 'kb_add',
          payload: { content: 'test1' },
          createdAt: now,
          error: 'Error',
          retryCount: 0,
          lastRetry: null,
          storyId: null,
          agent: null,
          processedAt: null,
        },
      ]

      mockDb.mocks.selectLimit.mockResolvedValueOnce(rows)

      const result = await kb_process_deferred_writes(
        { dry_run: true },
        { db: mockDb.db },
      )

      expect(result.success).toBe(true)
      expect(result.dry_run).toBe(true)
      expect(result.total).toBe(1)
      expect(result.processed).toBe(0)
      expect(result.writes[0].status).toBe('skipped')
    })

    it('should return error when no processor provided', async () => {
      const now = new Date()
      const rows = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          operation: 'kb_add',
          payload: { content: 'test1' },
          createdAt: now,
          error: 'Error',
          retryCount: 0,
          lastRetry: null,
          storyId: null,
          agent: null,
          processedAt: null,
        },
      ]

      mockDb.mocks.selectLimit.mockResolvedValueOnce(rows)

      const result = await kb_process_deferred_writes(
        { dry_run: false },
        { db: mockDb.db },
      )

      expect(result.success).toBe(false)
      expect(result.message).toContain('No processor provided')
    })

    it('should process writes with processor and mark as processed', async () => {
      const now = new Date()
      const rows = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          operation: 'kb_add',
          payload: { content: 'test1' },
          createdAt: now,
          error: 'Error',
          retryCount: 0,
          lastRetry: null,
          storyId: null,
          agent: null,
          processedAt: null,
        },
      ]

      mockDb.mocks.selectLimit.mockResolvedValueOnce(rows)
      mockDb.mocks.updateWhere.mockResolvedValue(undefined)

      const processor = vi.fn().mockResolvedValue({ success: true })

      const result = await kb_process_deferred_writes(
        { dry_run: false },
        { db: mockDb.db },
        processor,
      )

      expect(result.success).toBe(true)
      expect(result.succeeded).toBe(1)
      expect(result.failed).toBe(0)
      expect(processor).toHaveBeenCalledTimes(1)
      // Should have called update to set processed_at
      expect(mockDb.mocks.updateFn).toHaveBeenCalledTimes(1)
    })

    it('should skip writes that exceed max retry count', async () => {
      const now = new Date()
      const rows = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          operation: 'kb_add',
          payload: { content: 'test1' },
          createdAt: now,
          error: 'Error',
          retryCount: MAX_RETRY_COUNT,
          lastRetry: null,
          storyId: null,
          agent: null,
          processedAt: null,
        },
      ]

      mockDb.mocks.selectLimit.mockResolvedValueOnce(rows)

      const processor = vi.fn()

      const result = await kb_process_deferred_writes(
        { dry_run: false },
        { db: mockDb.db },
        processor,
      )

      expect(result.writes[0].status).toBe('skipped')
      expect(result.writes[0].error).toContain('Max retries')
      expect(processor).not.toHaveBeenCalled()
    })

    it('should increment retry_count on failed processing', async () => {
      const now = new Date()
      const rows = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          operation: 'kb_add',
          payload: { content: 'test1' },
          createdAt: now,
          error: 'Error',
          retryCount: 1,
          lastRetry: null,
          storyId: null,
          agent: null,
          processedAt: null,
        },
      ]

      mockDb.mocks.selectLimit.mockResolvedValueOnce(rows)
      mockDb.mocks.updateWhere.mockResolvedValue(undefined)

      const processor = vi.fn().mockResolvedValue({ success: false, error: 'Still broken' })

      const result = await kb_process_deferred_writes(
        { dry_run: false },
        { db: mockDb.db },
        processor,
      )

      expect(result.failed).toBe(1)
      expect(result.writes[0].status).toBe('failed')
      // Should have called update to increment retry_count
      expect(mockDb.mocks.updateFn).toHaveBeenCalledTimes(1)
    })
  })

  describe('kb_clear_deferred_writes', () => {
    it('should delete all unprocessed writes', async () => {
      mockDb.mocks.deleteReturning.mockResolvedValue([
        { id: '123e4567-e89b-12d3-a456-426614174001' },
        { id: '123e4567-e89b-12d3-a456-426614174002' },
      ])

      const result = await kb_clear_deferred_writes({ db: mockDb.db })

      expect(result.cleared).toBe(2)
      expect(result.message).toContain('2')
      expect(mockDb.mocks.deleteFn).toHaveBeenCalledTimes(1)
    })
  })

  describe('withDeferredFallback', () => {
    it('should return result on success', async () => {
      const operation = vi.fn().mockResolvedValue({ data: 'success' })

      const result = await withDeferredFallback(operation, {
        operation: 'kb_add',
        payload: { content: 'test' },
        deps: { db: mockDb.db },
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.result).toEqual({ data: 'success' })
      }
    })

    it('should queue write on connection error', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
      const testId = '123e4567-e89b-12d3-a456-426614174999'
      mockDb.mocks.insertReturning.mockResolvedValue([{ id: testId }])

      const result = await withDeferredFallback(operation, {
        operation: 'kb_add',
        payload: { content: 'test' },
        story_id: 'WISH-2045',
        deps: { db: mockDb.db },
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.queued).toBe(true)
        expect(result.id).toBe(testId)
      }
    })

    it('should accept loss when DB queue also fails', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
      mockDb.mocks.insertReturning.mockRejectedValue(new Error('DB also down'))

      const result = await withDeferredFallback(operation, {
        operation: 'kb_add',
        payload: { content: 'test' },
        deps: { db: mockDb.db },
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.queued).toBe(false)
      }
    })

    it('should re-throw non-connection errors', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Validation failed'))

      await expect(
        withDeferredFallback(operation, {
          operation: 'kb_add',
          payload: { content: 'test' },
          deps: { db: mockDb.db },
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
