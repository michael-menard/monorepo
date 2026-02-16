/**
 * AC-4: KB Writer Integration Tests
 *
 * Tests KBWriterAdapter + NoOpKbWriter + factory with StoryFileAdapter
 * in deferred-write workflow scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { KbWriterAdapter } from '../../kb-writer/kb-writer-adapter.js'
import { NoOpKbWriter } from '../../kb-writer/no-op-writer.js'
import { createKbWriter } from '../../kb-writer/factory.js'
import { StoryFileAdapter } from '../../story-file-adapter.js'
import type { StoryArtifact } from '../../../artifacts/story-v2-compatible.js'
import type { KbDeps } from '../../kb-writer/__types__/index.js'

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('AC-4: KB Writer Integration', () => {
  let tmpDir: string
  let storyAdapter: StoryFileAdapter

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lngg-0070-kbwriter-'))
    storyAdapter = new StoryFileAdapter()
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  describe('Deferred writes with mock KB functions', () => {
    it('should write lesson entry to KB with story tagging', async () => {
      const addedEntries: Array<Record<string, unknown>> = []

      const mockKbSearch = vi.fn().mockResolvedValue({
        results: [],
        metadata: { total: 0, fallback_mode: false },
      })

      const mockKbAdd = vi.fn().mockImplementation(async (input: Record<string, unknown>) => {
        addedEntries.push(input)
        return { id: 'kb-entry-1', success: true }
      })

      const deps: KbDeps = { db: {}, embeddingClient: {} }
      const writer = new KbWriterAdapter(deps, mockKbSearch, mockKbAdd)

      const result = await writer.addLesson({
        content: 'Integration tests with real files catch schema mismatches that unit tests miss.',
        storyId: 'LNGG-0070',
        category: 'testing',
        domain: 'integration',
        severity: 'medium',
        role: 'dev',
        tags: ['integration-test', 'lesson'],
      })

      expect(result.success).toBe(true)
      expect(result.skipped).toBe(false)
      expect(addedEntries).toHaveLength(1)
      expect(addedEntries[0].storyId).toBe('LNGG-0070')
      expect(addedEntries[0].entryType).toBe('lesson')
    })

    it('should detect and skip duplicate entries', async () => {
      const mockKbSearch = vi.fn().mockResolvedValue({
        results: [
          {
            id: 'existing-1',
            content: 'Similar content already exists',
            role: 'dev',
            tags: ['lesson'],
            relevance_score: 0.92,
          },
        ],
        metadata: { total: 1, fallback_mode: false },
      })

      const mockKbAdd = vi.fn()

      const deps: KbDeps = { db: {}, embeddingClient: {} }
      const writer = new KbWriterAdapter(deps, mockKbSearch, mockKbAdd, 0.85)

      const result = await writer.addLesson({
        content: 'This is very similar to existing content in the KB.',
        storyId: 'LNGG-0070',
        role: 'dev',
      })

      expect(result.success).toBe(false)
      expect(result.skipped).toBe(true)
      expect(mockKbAdd).not.toHaveBeenCalled()
    })

    it('should batch write multiple entries', async () => {
      const addedEntries: Array<Record<string, unknown>> = []

      const mockKbSearch = vi.fn().mockResolvedValue({
        results: [],
        metadata: { total: 0, fallback_mode: false },
      })

      const mockKbAdd = vi.fn().mockImplementation(async (input: Record<string, unknown>) => {
        addedEntries.push(input)
        return { id: `kb-entry-${addedEntries.length}`, success: true }
      })

      const deps: KbDeps = { db: {}, embeddingClient: {} }
      const writer = new KbWriterAdapter(deps, mockKbSearch, mockKbAdd)

      const batchResult = await writer.addMany([
        {
          entryType: 'lesson',
          content: 'Lesson learned about testing patterns.',
          storyId: 'LNGG-0070',
          role: 'dev',
        },
        {
          entryType: 'decision',
          content: 'Decided to use temp directories for test isolation.',
          storyId: 'LNGG-0070',
          role: 'dev',
        },
        {
          entryType: 'note',
          content: 'Performance benchmarks are advisory, not blocking.',
          storyId: 'LNGG-0070',
          role: 'all',
        },
      ])

      expect(batchResult.totalRequests).toBe(3)
      expect(batchResult.successCount).toBe(3)
      expect(batchResult.errorCount).toBe(0)
      expect(addedEntries).toHaveLength(3)
    })
  })

  describe('No-op writer mode for CI environments', () => {
    it('should return error results without crashing', async () => {
      const noOpWriter = new NoOpKbWriter()

      const result = await noOpWriter.addLesson({
        content: 'This should not be written to KB.',
        storyId: 'TEST-001',
        role: 'dev',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('not configured')
    })

    it('should handle batch writes gracefully in no-op mode', async () => {
      const noOpWriter = new NoOpKbWriter()

      const batchResult = await noOpWriter.addMany([
        { entryType: 'lesson', content: 'Lesson content here.', storyId: 'TEST', role: 'dev' },
        { entryType: 'decision', content: 'Decision content here.', storyId: 'TEST', role: 'dev' },
      ])

      expect(batchResult.totalRequests).toBe(2)
      expect(batchResult.successCount).toBe(0)
      expect(batchResult.errorCount).toBe(2)
    })
  })

  describe('Factory creates correct writer type', () => {
    it('should create NoOpKbWriter when no dependencies provided', () => {
      const writer = createKbWriter({})
      expect(writer).toBeInstanceOf(NoOpKbWriter)
    })

    it('should create NoOpKbWriter when partial dependencies provided', () => {
      const writer = createKbWriter({
        kbDeps: { db: {}, embeddingClient: {} } as any,
      })
      expect(writer).toBeInstanceOf(NoOpKbWriter)
    })

    it('should create KbWriterAdapter when full dependencies provided', () => {
      const writer = createKbWriter({
        kbDeps: {
          db: {},
          embeddingClient: {},
          kbSearchFn: vi.fn(),
          kbAddFn: vi.fn(),
        },
      })
      expect(writer).toBeInstanceOf(KbWriterAdapter)
    })
  })

  describe('KB writes alongside story file operations', () => {
    it('should not interfere with story file operations', async () => {
      // Create story
      const storyDir = path.join(tmpDir, 'TEST-0040')
      await fs.mkdir(storyDir, { recursive: true })
      const storyPath = path.join(storyDir, 'TEST-0040.md')

      const story: StoryArtifact = {
        id: 'TEST-0040',
        title: 'KB Writer Integration',
        status: 'in-progress',
        epic: 'test',
      }
      await storyAdapter.write(storyPath, story)

      // Perform KB operations in parallel with story operations
      const noOpWriter = new NoOpKbWriter()

      const [kbResult, storyResult] = await Promise.all([
        noOpWriter.addLesson({
          content: 'Concurrent KB write should not affect story.',
          storyId: 'TEST-0040',
          role: 'dev',
        }),
        storyAdapter.read(storyPath),
      ])

      // Verify both operations completed without interference
      expect(kbResult.success).toBe(false) // No-op returns false
      expect(storyResult.id).toBe('TEST-0040')
      expect(storyResult.title).toBe('KB Writer Integration')
    })
  })
})
