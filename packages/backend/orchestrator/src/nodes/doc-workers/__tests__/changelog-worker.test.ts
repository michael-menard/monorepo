/**
 * Unit tests for Changelog Worker
 * AC-14
 */

import { describe, expect, it, vi } from 'vitest'
import { generateChangelogChanges } from '../changelog-worker.js'
import type { ChangelogWorkerNodeConfig } from '../changelog-worker.js'
import { createMockMergeEventPayload } from './api-docs-worker.test.js'

vi.mock('@repo/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

vi.mock('../../../runner/node-factory.js', () => ({
  createLLMNode: vi.fn((name: string, fn: unknown) => fn),
  createToolNode: vi.fn((name: string, fn: unknown) => fn),
}))

const defaultConfig: ChangelogWorkerNodeConfig = {
  enabled: true,
  dryRun: false,
  timeoutMs: 120000,
  model: 'gpt-4o-mini',
  changelogPath: 'CHANGELOG.md',
}

describe('changelog-worker', () => {
  describe('generateChangelogChanges', () => {
    it('HP-1: happy path — returns DocWorkerResult with success:true and proposed changelog entry', async () => {
      const mergeEvent = createMockMergeEventPayload()

      const result = await generateChangelogChanges(mergeEvent, defaultConfig)

      expect(result.success).toBe(true)
      expect(result.workerName).toBe('changelog')
      expect(result.proposedChanges).toHaveLength(1)
      expect(result.proposedChanges[0].filePath).toBe('CHANGELOG.md')
      expect(result.proposedChanges[0].content).toContain('[DRAFT]')
      expect(result.proposedChanges[0].content).toContain('APIP-1040')
      expect(result.error).toBeNull()
    })

    it('HP-1: changelog content includes semver bump type', async () => {
      const mergeEvent = createMockMergeEventPayload({
        changedFiles: ['packages/core/logger/index.ts'],
      })

      const result = await generateChangelogChanges(mergeEvent, defaultConfig)

      expect(result.success).toBe(true)
      expect(result.proposedChanges[0].content).toMatch(/Features|Bug Fixes|Breaking Changes/)
    })

    it('ED-1: empty changedFiles — success:true with empty proposedChanges + warning', async () => {
      const mergeEvent = createMockMergeEventPayload({ changedFiles: [] })
      const result = await generateChangelogChanges(mergeEvent, defaultConfig)

      expect(result.success).toBe(true)
      expect(result.proposedChanges).toHaveLength(0)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('EC-1: worker error — success:false without throwing', async () => {
      const result = await generateChangelogChanges(null, defaultConfig)

      expect(result.success).toBe(false)
      expect(result.error).not.toBeNull()
    })

    it('proposed changelog uses update operation (not delete)', async () => {
      const mergeEvent = createMockMergeEventPayload()
      const result = await generateChangelogChanges(mergeEvent, defaultConfig)

      for (const change of result.proposedChanges) {
        expect(['create', 'update']).toContain(change.operation)
      }
    })
  })
})
