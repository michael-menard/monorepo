/**
 * Unit tests for Architecture Docs Worker
 * AC-14
 */

import { describe, expect, it, vi } from 'vitest'
import { generateArchitectureDocsChanges } from '../architecture-docs-worker.js'
import type { ArchitectureDocsWorkerNodeConfig } from '../architecture-docs-worker.js'
import { createMockMergeEventPayload } from './api-docs-worker.test.js'

vi.mock('@repo/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

vi.mock('../../../runner/node-factory.js', () => ({
  createLLMNode: vi.fn((name: string, fn: unknown) => fn),
  createToolNode: vi.fn((name: string, fn: unknown) => fn),
}))

const defaultConfig: ArchitectureDocsWorkerNodeConfig = {
  enabled: true,
  dryRun: false,
  timeoutMs: 120000,
  model: 'gpt-4o-mini',
  filePatterns: ['architecture/', 'config/', '.config.ts', 'infra/'],
}

describe('architecture-docs-worker', () => {
  describe('generateArchitectureDocsChanges', () => {
    it('HP-1: happy path — returns DocWorkerResult with success:true and proposed changes', async () => {
      const mergeEvent = createMockMergeEventPayload({
        changedFiles: ['infra/terraform/main.tf', 'config/app.config.ts'],
      })

      const result = await generateArchitectureDocsChanges(mergeEvent, defaultConfig)

      expect(result.success).toBe(true)
      expect(result.workerName).toBe('architecture-docs')
      expect(result.proposedChanges).toHaveLength(1)
      expect(result.error).toBeNull()
    })

    it('ED-1: empty changedFiles — success:true with empty proposedChanges + warning', async () => {
      const mergeEvent = createMockMergeEventPayload({ changedFiles: [] })
      const result = await generateArchitectureDocsChanges(mergeEvent, defaultConfig)

      expect(result.success).toBe(true)
      expect(result.proposedChanges).toHaveLength(0)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('EC-1: worker error — success:false without throwing', async () => {
      const result = await generateArchitectureDocsChanges(null, defaultConfig)

      expect(result.success).toBe(false)
      expect(result.error).not.toBeNull()
    })
  })
})
