/**
 * Unit tests for Component Docs Worker
 * AC-14
 */

import { describe, expect, it, vi } from 'vitest'
import { generateComponentDocsChanges } from '../component-docs-worker.js'
import type { ComponentDocsWorkerNodeConfig } from '../component-docs-worker.js'
import { createMockMergeEventPayload } from './api-docs-worker.test.js'

vi.mock('@repo/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

vi.mock('../../../runner/node-factory.js', () => ({
  createLLMNode: vi.fn((name: string, fn: unknown) => fn),
  createToolNode: vi.fn((name: string, fn: unknown) => fn),
}))

const defaultConfig: ComponentDocsWorkerNodeConfig = {
  enabled: true,
  dryRun: false,
  timeoutMs: 120000,
  model: 'gpt-4o-mini',
  filePatterns: ['.tsx', '.jsx', 'components/'],
}

describe('component-docs-worker', () => {
  describe('generateComponentDocsChanges', () => {
    it('HP-1: happy path — returns DocWorkerResult with success:true and proposed changes', async () => {
      const mergeEvent = createMockMergeEventPayload({
        changedFiles: ['packages/core/app-component-library/src/components/Button.tsx'],
      })

      const result = await generateComponentDocsChanges(mergeEvent, defaultConfig)

      expect(result.success).toBe(true)
      expect(result.workerName).toBe('component-docs')
      expect(result.proposedChanges).toHaveLength(1)
      expect(result.error).toBeNull()
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
    })

    it('ED-1: empty changedFiles — success:true with empty proposedChanges + warning', async () => {
      const mergeEvent = createMockMergeEventPayload({ changedFiles: [] })
      const result = await generateComponentDocsChanges(mergeEvent, defaultConfig)

      expect(result.success).toBe(true)
      expect(result.proposedChanges).toHaveLength(0)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('EC-1: worker error — success:false without throwing', async () => {
      const result = await generateComponentDocsChanges(null, defaultConfig)

      expect(result.success).toBe(false)
      expect(result.error).not.toBeNull()
    })

    it('proposed change uses valid operation (not delete)', async () => {
      const mergeEvent = createMockMergeEventPayload({
        changedFiles: ['apps/web/main-app/src/components/Header.tsx'],
      })
      const result = await generateComponentDocsChanges(mergeEvent, defaultConfig)

      for (const change of result.proposedChanges) {
        expect(['create', 'update']).toContain(change.operation)
      }
    })
  })
})
