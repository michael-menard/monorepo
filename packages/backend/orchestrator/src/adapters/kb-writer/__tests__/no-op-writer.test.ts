/**
 * No-Op Writer Tests
 *
 * @see LNGG-0050 AC-3, AC-6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NoOpKbWriter } from '../no-op-writer.js'
import { logger } from '@repo/logger'

// Mock logger
vi.mock('@repo/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}))

describe('NoOpKbWriter', () => {
  let writer: NoOpKbWriter

  beforeEach(() => {
    writer = new NoOpKbWriter()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('addLesson', () => {
    it('returns success:false', async () => {
      const result = await writer.addLesson({
        content: 'Test lesson',
        storyId: 'LNGG-0050',
        role: 'all',
      })

      expect(result.success).toBe(false)
      expect(result.skipped).toBe(false)
    })

    it('returns KB unavailable error', async () => {
      const result = await writer.addLesson({
        content: 'Test lesson',
        storyId: 'LNGG-0050',
        role: 'all',
      })

      expect(result.error).toBe('KB dependencies not configured')
    })

    it('logs warning', async () => {
      await writer.addLesson({
        content: 'Test lesson',
        storyId: 'LNGG-0050',
        role: 'all',
      })

      expect(logger.warn).toHaveBeenCalledWith(
        'KB write skipped - dependencies not configured',
        expect.objectContaining({ entryType: 'lesson' }),
      )
    })
  })

  describe('addDecision', () => {
    it('returns success:false', async () => {
      const result = await writer.addDecision({
        content: 'Test decision',
        storyId: 'LNGG-0050',
        role: 'all',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('KB dependencies not configured')
    })

    it('logs warning', async () => {
      await writer.addDecision({
        content: 'Test decision',
        storyId: 'LNGG-0050',
        role: 'all',
      })

      expect(logger.warn).toHaveBeenCalledWith(
        'KB write skipped - dependencies not configured',
        expect.objectContaining({ entryType: 'decision' }),
      )
    })
  })

  describe('addConstraint', () => {
    it('returns success:false', async () => {
      const result = await writer.addConstraint({
        content: 'Test constraint',
        storyId: 'LNGG-0050',
        role: 'all',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('KB dependencies not configured')
    })

    it('logs warning', async () => {
      await writer.addConstraint({
        content: 'Test constraint',
        storyId: 'LNGG-0050',
        role: 'all',
      })

      expect(logger.warn).toHaveBeenCalledWith(
        'KB write skipped - dependencies not configured',
        expect.objectContaining({ entryType: 'constraint' }),
      )
    })
  })

  describe('addRunbook', () => {
    it('returns success:false', async () => {
      const result = await writer.addRunbook({
        content: 'Test runbook',
        storyId: 'LNGG-0050',
        role: 'all',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('KB dependencies not configured')
    })

    it('logs warning', async () => {
      await writer.addRunbook({
        content: 'Test runbook',
        storyId: 'LNGG-0050',
        role: 'all',
      })

      expect(logger.warn).toHaveBeenCalledWith(
        'KB write skipped - dependencies not configured',
        expect.objectContaining({ entryType: 'runbook' }),
      )
    })
  })

  describe('addNote', () => {
    it('returns success:false', async () => {
      const result = await writer.addNote({
        content: 'Test note',
        role: 'all',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('KB dependencies not configured')
    })

    it('logs warning', async () => {
      await writer.addNote({
        content: 'Test note',
        role: 'all',
      })

      expect(logger.warn).toHaveBeenCalledWith(
        'KB write skipped - dependencies not configured',
        expect.objectContaining({ entryType: 'note' }),
      )
    })
  })

  describe('addMany', () => {
    it('returns batch failure with correct counts', async () => {
      const result = await writer.addMany([
        { entryType: 'lesson', content: 'Lesson 1', storyId: 'LNGG-0050', role: 'all' },
        { entryType: 'decision', content: 'Decision 1', storyId: 'LNGG-0050', role: 'all' },
        { entryType: 'note', content: 'Note 1', role: 'all' },
      ])

      expect(result.totalRequests).toBe(3)
      expect(result.successCount).toBe(0)
      expect(result.skippedCount).toBe(0)
      expect(result.errorCount).toBe(3)
    })

    it('returns error for each request', async () => {
      const result = await writer.addMany([
        { entryType: 'lesson', content: 'Lesson 1', storyId: 'LNGG-0050', role: 'all' },
        { entryType: 'decision', content: 'Decision 1', storyId: 'LNGG-0050', role: 'all' },
      ])

      expect(result.results.length).toBe(2)
      expect(result.results[0].success).toBe(false)
      expect(result.results[1].success).toBe(false)
      expect(result.errors.length).toBe(2)
    })

    it('logs warning', async () => {
      await writer.addMany([
        { entryType: 'lesson', content: 'Lesson 1', storyId: 'LNGG-0050', role: 'all' },
      ])

      expect(logger.warn).toHaveBeenCalledWith(
        'Batch KB write skipped - dependencies not configured',
        expect.objectContaining({ totalRequests: 1 }),
      )
    })

    it('handles empty batch', async () => {
      const result = await writer.addMany([])

      expect(result.totalRequests).toBe(0)
      expect(result.successCount).toBe(0)
      expect(result.errorCount).toBe(0)
    })
  })

  describe('error handling', () => {
    it('does not throw exceptions', async () => {
      // All methods should return results, not throw
      await expect(
        writer.addLesson({ content: 'Test', storyId: 'TEST-1', role: 'all' }),
      ).resolves.toBeDefined()
      await expect(
        writer.addDecision({ content: 'Test', storyId: 'TEST-1', role: 'all' }),
      ).resolves.toBeDefined()
      await expect(
        writer.addConstraint({ content: 'Test', storyId: 'TEST-1', role: 'all' }),
      ).resolves.toBeDefined()
      await expect(
        writer.addRunbook({ content: 'Test', storyId: 'TEST-1', role: 'all' }),
      ).resolves.toBeDefined()
      await expect(writer.addNote({ content: 'Test', role: 'all' })).resolves.toBeDefined()
      await expect(writer.addMany([])).resolves.toBeDefined()
    })

    it('error messages are clear', async () => {
      const result = await writer.addLesson({
        content: 'Test',
        storyId: 'TEST-1',
        role: 'all',
      })

      expect(result.error).toContain('dependencies')
      expect(result.error).toContain('not configured')
    })
  })
})
