/**
 * KB Writer Adapter Tests
 *
 * @see LNGG-0050 AC-2, AC-6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { KbWriterAdapter } from '../kb-writer-adapter.js'
import type { KbDeps } from '../__types__/index.js'

describe('KbWriterAdapter', () => {
  let mockKbDeps: KbDeps
  let mockKbSearchFn: ReturnType<typeof vi.fn>
  let mockKbAddFn: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockKbDeps = {
      db: {},
      embeddingClient: {},
    }

    mockKbSearchFn = vi.fn()
    mockKbAddFn = vi.fn()
  })

  describe('deduplication logic', () => {
    it('writes entry when similarity is below threshold (0.84)', async () => {
      mockKbSearchFn.mockResolvedValue({
        results: [
          {
            id: 'existing-1',
            content: 'Similar content',
            role: 'all',
            tags: null,
            relevance_score: 0.84,
          },
        ],
        metadata: { total: 1, fallback_mode: false },
      })

      mockKbAddFn.mockResolvedValue({
        id: 'new-entry-1',
        success: true,
      })

      const adapter = new KbWriterAdapter(mockKbDeps, mockKbSearchFn, mockKbAddFn, 0.85)

      const result = await adapter.addLesson({
        content: 'New lesson content',
        storyId: 'LNGG-0050',
        role: 'all',
      })

      expect(result.success).toBe(true)
      expect(result.skipped).toBe(false)
      expect(mockKbAddFn).toHaveBeenCalled()
    })

    it('skips entry when similarity equals threshold (0.85)', async () => {
      mockKbSearchFn.mockResolvedValue({
        results: [
          {
            id: 'existing-1',
            content: 'Similar content',
            role: 'all',
            tags: null,
            relevance_score: 0.85,
          },
        ],
        metadata: { total: 1, fallback_mode: false },
      })

      const adapter = new KbWriterAdapter(mockKbDeps, mockKbSearchFn, mockKbAddFn, 0.85)

      const result = await adapter.addLesson({
        content: 'Duplicate lesson content',
        storyId: 'LNGG-0050',
        role: 'all',
      })

      expect(result.success).toBe(false)
      expect(result.skipped).toBe(true)
      expect(result.similarity).toBe(0.85)
      expect(mockKbAddFn).not.toHaveBeenCalled()
    })

    it('skips entry when similarity is above threshold (0.86)', async () => {
      mockKbSearchFn.mockResolvedValue({
        results: [
          {
            id: 'existing-1',
            content: 'Similar content',
            role: 'all',
            tags: null,
            relevance_score: 0.86,
          },
        ],
        metadata: { total: 1, fallback_mode: false },
      })

      const adapter = new KbWriterAdapter(mockKbDeps, mockKbSearchFn, mockKbAddFn, 0.85)

      const result = await adapter.addLesson({
        content: 'Duplicate lesson content',
        storyId: 'LNGG-0050',
        role: 'all',
      })

      expect(result.success).toBe(false)
      expect(result.skipped).toBe(true)
      expect(result.similarity).toBe(0.86)
      expect(mockKbAddFn).not.toHaveBeenCalled()
    })

    it('skips exact duplicate (1.0 similarity)', async () => {
      mockKbSearchFn.mockResolvedValue({
        results: [
          {
            id: 'existing-1',
            content: 'Exact same content',
            role: 'all',
            tags: null,
            relevance_score: 1.0,
          },
        ],
        metadata: { total: 1, fallback_mode: false },
      })

      const adapter = new KbWriterAdapter(mockKbDeps, mockKbSearchFn, mockKbAddFn, 0.85)

      const result = await adapter.addLesson({
        content: 'Exact same content',
        storyId: 'LNGG-0050',
        role: 'all',
      })

      expect(result.success).toBe(false)
      expect(result.skipped).toBe(true)
      expect(result.similarity).toBe(1.0)
    })

    it('writes when no similar entries found', async () => {
      mockKbSearchFn.mockResolvedValue({
        results: [],
        metadata: { total: 0, fallback_mode: false },
      })

      mockKbAddFn.mockResolvedValue({
        id: 'new-entry-1',
        success: true,
      })

      const adapter = new KbWriterAdapter(mockKbDeps, mockKbSearchFn, mockKbAddFn, 0.85)

      const result = await adapter.addLesson({
        content: 'Completely new content',
        storyId: 'LNGG-0050',
        role: 'all',
      })

      expect(result.success).toBe(true)
      expect(mockKbAddFn).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('returns error result when kbSearchFn fails', async () => {
      mockKbSearchFn.mockRejectedValue(new Error('Search failed'))

      const adapter = new KbWriterAdapter(mockKbDeps, mockKbSearchFn, mockKbAddFn, 0.85)

      const result = await adapter.addLesson({
        content: 'Test content',
        storyId: 'LNGG-0050',
        role: 'all',
      })

      expect(result.success).toBe(false)
      expect(result.skipped).toBe(false)
      expect(result.error).toContain('Search failed')
    })

    it('returns error result when kbAddFn fails', async () => {
      mockKbSearchFn.mockResolvedValue({
        results: [],
        metadata: { total: 0, fallback_mode: false },
      })

      mockKbAddFn.mockResolvedValue({
        success: false,
        error: 'DB connection failed',
      })

      const adapter = new KbWriterAdapter(mockKbDeps, mockKbSearchFn, mockKbAddFn, 0.85)

      const result = await adapter.addLesson({
        content: 'Test content',
        storyId: 'LNGG-0050',
        role: 'all',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('DB connection failed')
    })

    it('handles kbAddFn exception', async () => {
      mockKbSearchFn.mockResolvedValue({
        results: [],
        metadata: { total: 0, fallback_mode: false },
      })

      mockKbAddFn.mockRejectedValue(new Error('Network error'))

      const adapter = new KbWriterAdapter(mockKbDeps, mockKbSearchFn, mockKbAddFn, 0.85)

      const result = await adapter.addLesson({
        content: 'Test content',
        storyId: 'LNGG-0050',
        role: 'all',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network error')
    })

    it('handles non-Error exception (e.g., string thrown)', async () => {
      mockKbSearchFn.mockResolvedValue({
        results: [],
        metadata: { total: 0, fallback_mode: false },
      })

      mockKbAddFn.mockRejectedValue('String error thrown')

      const adapter = new KbWriterAdapter(mockKbDeps, mockKbSearchFn, mockKbAddFn, 0.85)

      const result = await adapter.addLesson({
        content: 'Test content',
        storyId: 'LNGG-0050',
        role: 'all',
      })

      expect(result.success).toBe(false)
      expect(result.skipped).toBe(false)
      expect(result.error).toContain('String error thrown')
    })
  })

  describe('entry type methods', () => {
    beforeEach(() => {
      mockKbSearchFn.mockResolvedValue({
        results: [],
        metadata: { total: 0, fallback_mode: false },
      })

      mockKbAddFn.mockResolvedValue({
        id: 'test-id',
        success: true,
      })
    })

    it('addLesson works', async () => {
      const adapter = new KbWriterAdapter(mockKbDeps, mockKbSearchFn, mockKbAddFn, 0.85)

      const result = await adapter.addLesson({
        content: 'Lesson content',
        storyId: 'LNGG-0050',
        role: 'all',
      })

      expect(result.success).toBe(true)
      expect(mockKbAddFn).toHaveBeenCalledWith(
        expect.objectContaining({
          entryType: 'lesson',
        }),
        mockKbDeps,
      )
    })

    it('addDecision works', async () => {
      const adapter = new KbWriterAdapter(mockKbDeps, mockKbSearchFn, mockKbAddFn, 0.85)

      const result = await adapter.addDecision({
        content: 'Decision content',
        storyId: 'LNGG-0050',
        role: 'all',
      })

      expect(result.success).toBe(true)
      expect(mockKbAddFn).toHaveBeenCalledWith(
        expect.objectContaining({
          entryType: 'decision',
        }),
        mockKbDeps,
      )
    })

    it('addConstraint works', async () => {
      const adapter = new KbWriterAdapter(mockKbDeps, mockKbSearchFn, mockKbAddFn, 0.85)

      const result = await adapter.addConstraint({
        content: 'Constraint content',
        storyId: 'LNGG-0050',
        role: 'dev',
      })

      expect(result.success).toBe(true)
      expect(mockKbAddFn).toHaveBeenCalledWith(
        expect.objectContaining({
          entryType: 'constraint',
        }),
        mockKbDeps,
      )
    })

    it('addRunbook works', async () => {
      const adapter = new KbWriterAdapter(mockKbDeps, mockKbSearchFn, mockKbAddFn, 0.85)

      const result = await adapter.addRunbook({
        content: 'Runbook content',
        storyId: 'LNGG-0050',
        role: 'all',
      })

      expect(result.success).toBe(true)
      expect(mockKbAddFn).toHaveBeenCalledWith(
        expect.objectContaining({
          entryType: 'runbook',
        }),
        mockKbDeps,
      )
    })

    it('addNote works', async () => {
      const adapter = new KbWriterAdapter(mockKbDeps, mockKbSearchFn, mockKbAddFn, 0.85)

      const result = await adapter.addNote({
        content: 'Note content',
        storyId: 'LNGG-0050',
        role: 'all',
      })

      expect(result.success).toBe(true)
      expect(mockKbAddFn).toHaveBeenCalledWith(
        expect.objectContaining({
          entryType: 'note',
        }),
        mockKbDeps,
      )
    })
  })

  describe('batch operations', () => {
    beforeEach(() => {
      mockKbSearchFn.mockResolvedValue({
        results: [],
        metadata: { total: 0, fallback_mode: false },
      })

      mockKbAddFn.mockResolvedValue({
        id: 'test-id',
        success: true,
      })
    })

    it('processes all successes correctly', async () => {
      const adapter = new KbWriterAdapter(mockKbDeps, mockKbSearchFn, mockKbAddFn, 0.85)

      const result = await adapter.addMany([
        { entryType: 'lesson', content: 'Lesson 1', storyId: 'LNGG-0050', role: 'all' },
        { entryType: 'decision', content: 'Decision 1', storyId: 'LNGG-0050', role: 'all' },
        { entryType: 'note', content: 'Note 1', role: 'all' },
      ])

      expect(result.totalRequests).toBe(3)
      expect(result.successCount).toBe(3)
      expect(result.skippedCount).toBe(0)
      expect(result.errorCount).toBe(0)
    })

    it('handles partial failures correctly', async () => {
      mockKbAddFn
        .mockResolvedValueOnce({ id: 'id-1', success: true })
        .mockResolvedValueOnce({ success: false, error: 'Failed' })
        .mockResolvedValueOnce({ id: 'id-3', success: true })

      const adapter = new KbWriterAdapter(mockKbDeps, mockKbSearchFn, mockKbAddFn, 0.85)

      const result = await adapter.addMany([
        { entryType: 'lesson', content: 'Lesson 1', storyId: 'LNGG-0050', role: 'all' },
        { entryType: 'decision', content: 'Decision 1', storyId: 'LNGG-0050', role: 'all' },
        { entryType: 'note', content: 'Note 1', role: 'all' },
      ])

      expect(result.totalRequests).toBe(3)
      expect(result.successCount).toBe(2)
      expect(result.errorCount).toBe(1)
      expect(result.errors).toContain('Failed')
    })

    it('handles all duplicates correctly', async () => {
      mockKbSearchFn.mockResolvedValue({
        results: [
          {
            id: 'existing-1',
            content: 'Similar',
            role: 'all',
            tags: null,
            relevance_score: 0.9,
          },
        ],
        metadata: { total: 1, fallback_mode: false },
      })

      const adapter = new KbWriterAdapter(mockKbDeps, mockKbSearchFn, mockKbAddFn, 0.85)

      const result = await adapter.addMany([
        { entryType: 'lesson', content: 'Lesson 1', storyId: 'LNGG-0050', role: 'all' },
        { entryType: 'decision', content: 'Decision 1', storyId: 'LNGG-0050', role: 'all' },
      ])

      expect(result.totalRequests).toBe(2)
      expect(result.successCount).toBe(0)
      expect(result.skippedCount).toBe(2)
      expect(result.errorCount).toBe(0)
    })

    it('provides accurate metadata for mixed results', async () => {
      mockKbSearchFn
        .mockResolvedValueOnce({
          results: [],
          metadata: { total: 0, fallback_mode: false },
        })
        .mockResolvedValueOnce({
          results: [
            {
              id: 'existing',
              content: 'Similar',
              role: 'all',
              tags: null,
              relevance_score: 0.9,
            },
          ],
          metadata: { total: 1, fallback_mode: false },
        })
        .mockResolvedValueOnce({
          results: [],
          metadata: { total: 0, fallback_mode: false },
        })

      mockKbAddFn
        .mockResolvedValueOnce({ id: 'id-1', success: true })
        .mockResolvedValueOnce({ success: false, error: 'Failed' })

      const adapter = new KbWriterAdapter(mockKbDeps, mockKbSearchFn, mockKbAddFn, 0.85)

      const result = await adapter.addMany([
        { entryType: 'lesson', content: 'Lesson 1', storyId: 'LNGG-0050', role: 'all' },
        { entryType: 'decision', content: 'Decision 1', storyId: 'LNGG-0050', role: 'all' },
        { entryType: 'note', content: 'Note 1', role: 'all' },
      ])

      expect(result.totalRequests).toBe(3)
      expect(result.successCount).toBe(1)
      expect(result.skippedCount).toBe(1)
      expect(result.errorCount).toBe(1)
    })

    it('handles exception in batch operation with non-Error thrown', async () => {
      mockKbSearchFn.mockRejectedValue('Non-error exception')

      const adapter = new KbWriterAdapter(mockKbDeps, mockKbSearchFn, mockKbAddFn, 0.85)

      const result = await adapter.addMany([
        { entryType: 'lesson', content: 'Lesson 1', storyId: 'LNGG-0050', role: 'all' },
        { entryType: 'note', content: 'Note 1', role: 'all' },
      ])

      expect(result.totalRequests).toBe(2)
      expect(result.successCount).toBe(0)
      expect(result.errorCount).toBe(2)
      expect(result.errors).toHaveLength(2)
      expect(result.errors[0]).toContain('Non-error exception')
    })
  })
})
