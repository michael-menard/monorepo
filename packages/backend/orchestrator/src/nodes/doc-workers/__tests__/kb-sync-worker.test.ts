/**
 * Unit tests for KB Sync Worker
 *
 * Covers:
 * (a) Happy path — kbSearchFn called before kbAddFn
 * (b) Dedup skip — similarity >= 0.85 → no kbAddFn call
 * (c) Auto-generated tags verification
 * (d) Error path — success:false without throwing
 *
 * AC-7, AC-14
 */

import { describe, expect, it, vi } from 'vitest'
import { generateKbSyncChanges } from '../kb-sync-worker.js'
import type { KbSyncWorkerNodeConfig } from '../kb-sync-worker.js'
import { createMockMergeEventPayload } from './api-docs-worker.test.js'

vi.mock('@repo/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

vi.mock('../../../runner/node-factory.js', () => ({
  createLLMNode: vi.fn((name: string, fn: unknown) => fn),
  createToolNode: vi.fn((name: string, fn: unknown) => fn),
}))

describe('kb-sync-worker', () => {
  describe('generateKbSyncChanges', () => {
    it('HP-3: happy path — kbSearchFn called before kbAddFn', async () => {
      const callOrder: string[] = []

      const kbSearchFn = vi.fn().mockImplementation(async () => {
        callOrder.push('search')
        return { results: [] }
      })

      const kbAddFn = vi.fn().mockImplementation(async () => {
        callOrder.push('add')
        return { id: 'kb-001', success: true }
      })

      const config: KbSyncWorkerNodeConfig = {
        enabled: true,
        dryRun: false,
        timeoutMs: 10000,
        model: 'none',
        kbSearchFn,
        kbAddFn,
        dedupeThreshold: 0.85,
      }

      const mergeEvent = createMockMergeEventPayload()
      const result = await generateKbSyncChanges(mergeEvent, config)

      // kbSearchFn must be called before kbAddFn
      expect(kbSearchFn).toHaveBeenCalledOnce()
      expect(kbAddFn).toHaveBeenCalledOnce()
      expect(callOrder[0]).toBe('search')
      expect(callOrder[1]).toBe('add')

      expect(result.success).toBe(true)
      expect(result.workerName).toBe('kb-sync')
      expect(result.error).toBeNull()
    })

    it('HP-3: proposed entries have auto-generated tags', async () => {
      const kbSearchFn = vi.fn().mockResolvedValue({ results: [] })
      const kbAddFn = vi.fn().mockResolvedValue({ id: 'kb-001', success: true })

      const config: KbSyncWorkerNodeConfig = {
        enabled: true,
        dryRun: false,
        timeoutMs: 10000,
        model: 'none',
        kbSearchFn,
        kbAddFn,
        dedupeThreshold: 0.85,
      }

      const mergeEvent = createMockMergeEventPayload({ storyId: 'APIP-1040' })
      await generateKbSyncChanges(mergeEvent, config)

      // Verify kbAddFn was called with correct tags
      const addCallArgs = kbAddFn.mock.calls[0][0]
      expect(addCallArgs.tags).toContain('auto-generated')
      expect(addCallArgs.tags).toContain('source:APIP-1040')
    })

    it('EC-2: dedup skip — similarity >= 0.85, kbAddFn NOT called', async () => {
      const kbSearchFn = vi.fn().mockResolvedValue({
        results: [
          {
            id: 'existing-001',
            content: 'existing similar content',
            tags: ['auto-generated'],
            relevance_score: 0.90,
          },
        ],
      })

      const kbAddFn = vi.fn()

      const config: KbSyncWorkerNodeConfig = {
        enabled: true,
        dryRun: false,
        timeoutMs: 10000,
        model: 'none',
        kbSearchFn,
        kbAddFn,
        dedupeThreshold: 0.85,
      }

      const mergeEvent = createMockMergeEventPayload()
      const result = await generateKbSyncChanges(mergeEvent, config)

      // kbSearchFn called, kbAddFn NOT called (duplicate detected)
      expect(kbSearchFn).toHaveBeenCalledOnce()
      expect(kbAddFn).not.toHaveBeenCalled()

      // success:true with warning about dedup skip
      expect(result.success).toBe(true)
      expect(result.proposedChanges).toHaveLength(0)
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings[0]).toContain('similar content exists')
    })

    it('EC-2: exact threshold 0.85 is treated as duplicate', async () => {
      const kbSearchFn = vi.fn().mockResolvedValue({
        results: [{ id: 'e1', content: 'c', tags: null, relevance_score: 0.85 }],
      })
      const kbAddFn = vi.fn()

      const config: KbSyncWorkerNodeConfig = {
        enabled: true,
        dryRun: false,
        timeoutMs: 10000,
        model: 'none',
        kbSearchFn,
        kbAddFn,
        dedupeThreshold: 0.85,
      }

      const result = await generateKbSyncChanges(createMockMergeEventPayload(), config)

      expect(kbAddFn).not.toHaveBeenCalled()
      expect(result.success).toBe(true)
    })

    it('ED-1: empty changedFiles — success:true with empty proposedChanges + warning', async () => {
      const config: KbSyncWorkerNodeConfig = {
        enabled: true,
        dryRun: false,
        timeoutMs: 10000,
        model: 'none',
        dedupeThreshold: 0.85,
      }

      const mergeEvent = createMockMergeEventPayload({ changedFiles: [] })
      const result = await generateKbSyncChanges(mergeEvent, config)

      expect(result.success).toBe(true)
      expect(result.proposedChanges).toHaveLength(0)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('EC-1: worker error — success:false without throwing', async () => {
      const result = await generateKbSyncChanges(null, {
        enabled: true,
        dryRun: false,
        timeoutMs: 10000,
        model: 'none',
        dedupeThreshold: 0.85,
      })

      expect(result.success).toBe(false)
      expect(result.error).not.toBeNull()
    })

    it('kbSearchFn error — caught in result.error, not thrown', async () => {
      const kbSearchFn = vi.fn().mockRejectedValue(new Error('KB search failed'))

      const config: KbSyncWorkerNodeConfig = {
        enabled: true,
        dryRun: false,
        timeoutMs: 10000,
        model: 'none',
        kbSearchFn,
        dedupeThreshold: 0.85,
      }

      const result = await generateKbSyncChanges(createMockMergeEventPayload(), config)

      expect(result.success).toBe(false)
      expect(result.error).toContain('KB search failed')
    })

    it('no kbSearchFn — falls back to file-based sync record', async () => {
      const config: KbSyncWorkerNodeConfig = {
        enabled: true,
        dryRun: false,
        timeoutMs: 10000,
        model: 'none',
        dedupeThreshold: 0.85,
      }

      const mergeEvent = createMockMergeEventPayload()
      const result = await generateKbSyncChanges(mergeEvent, config)

      expect(result.success).toBe(true)
      // Should propose a file-based sync record
      expect(result.proposedChanges).toHaveLength(1)
      expect(result.proposedChanges[0].operation).not.toBe('delete')
      expect(result.warnings.length).toBeGreaterThan(0)
    })
  })
})
