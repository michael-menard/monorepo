/**
 * Unit tests for API Docs Worker
 *
 * Covers:
 * (a) Happy path — worker produces success:true with proposed changes
 * (b) Empty changedFiles — success:true with empty proposedChanges + warning
 * (c) Worker error — success:false without throwing
 *
 * AC-14: Unit tests for api-docs worker
 */

import { describe, expect, it, vi } from 'vitest'
import { generateApiDocsChanges } from '../api-docs-worker.js'
import type { ApiDocsWorkerNodeConfig } from '../api-docs-worker.js'
import type { MergeEventPayload } from '../../../graphs/doc-graph.js'

// ============================================================================
// Mock dependencies
// ============================================================================

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('../../../runner/node-factory.js', () => ({
  createLLMNode: vi.fn((name: string, fn: unknown) => fn),
  createToolNode: vi.fn((name: string, fn: unknown) => fn),
}))

// ============================================================================
// Shared fixture factory (OPP-001)
// ============================================================================

export function createMockMergeEventPayload(
  overrides: Partial<MergeEventPayload> = {},
): MergeEventPayload {
  return {
    storyId: 'APIP-1040',
    mergeCommitSha: 'abc123def456',
    mergedBranch: 'feature/APIP-1040',
    mergedAt: '2026-02-25T10:00:00.000Z',
    diffSummary: 'Added new API handler for wishlist operations',
    changedFiles: [
      'apps/api/src/handlers/wishlist.ts',
      'apps/api/src/routes/wishlist.ts',
    ],
    ...overrides,
  }
}

const defaultConfig: ApiDocsWorkerNodeConfig = {
  enabled: true,
  dryRun: false,
  timeoutMs: 120000,
  model: 'gpt-4o-mini',
  filePatterns: ['apps/api/', 'handlers/', 'routes/'],
}

// ============================================================================
// Tests
// ============================================================================

describe('api-docs-worker', () => {
  describe('generateApiDocsChanges', () => {
    it('HP-1: happy path — returns DocWorkerResult with success:true and proposed changes', async () => {
      const mergeEvent = createMockMergeEventPayload()

      const result = await generateApiDocsChanges(mergeEvent, defaultConfig)

      expect(result.success).toBe(true)
      expect(result.workerName).toBe('api-docs')
      expect(result.proposedChanges).toHaveLength(1)
      expect(result.proposedChanges[0].operation).toMatch(/create|update/)
      expect(result.proposedChanges[0].workerName).toBe('api-docs')
      expect(result.error).toBeNull()
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
      expect(result.model).toBe('gpt-4o-mini')
    })

    it('HP-1: validates DocWorkerResult shape via schema fields', async () => {
      const mergeEvent = createMockMergeEventPayload()

      const result = await generateApiDocsChanges(mergeEvent, defaultConfig)

      // Verify shape matches DocWorkerResultSchema
      expect(result).toMatchObject({
        workerName: 'api-docs',
        success: expect.any(Boolean),
        filesUpdated: expect.any(Array),
        proposedChanges: expect.any(Array),
        durationMs: expect.any(Number),
        error: null,
        warnings: expect.any(Array),
        model: expect.any(String),
      })
    })

    it('ED-1: empty changedFiles — success:true with empty proposedChanges and non-empty warnings', async () => {
      const mergeEvent = createMockMergeEventPayload({ changedFiles: [] })

      const result = await generateApiDocsChanges(mergeEvent, defaultConfig)

      expect(result.success).toBe(true)
      expect(result.proposedChanges).toHaveLength(0)
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings[0]).toContain('api-docs')
      expect(result.error).toBeNull()
    })

    it('ED-1: no relevant files in changedFiles — success:true with empty proposedChanges + warning', async () => {
      const mergeEvent = createMockMergeEventPayload({
        changedFiles: ['packages/core/app-component-library/src/Button.tsx'],
      })

      const result = await generateApiDocsChanges(mergeEvent, defaultConfig)

      expect(result.success).toBe(true)
      expect(result.proposedChanges).toHaveLength(0)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('EC-1: worker error — success:false with error set, does NOT throw', async () => {
      // Simulate error by passing null as mergeEvent
      const result = await generateApiDocsChanges(null, defaultConfig)

      expect(result.success).toBe(false)
      expect(result.error).not.toBeNull()
      expect(result.proposedChanges).toHaveLength(0)
      // Verify it does NOT throw — the test itself succeeds
    })

    it('EC-1: error thrown inside worker — caught in result.error, not thrown', async () => {
      // Pass a broken config that triggers an error
      const brokenConfig = {
        ...defaultConfig,
        filePatterns: null as unknown as string[],
      }

      // Should not throw
      await expect(
        generateApiDocsChanges(createMockMergeEventPayload(), brokenConfig),
      ).resolves.toMatchObject({
        success: false,
        error: expect.any(String),
      })
    })

    it('proposed change has valid operation (not delete)', async () => {
      const mergeEvent = createMockMergeEventPayload()
      const result = await generateApiDocsChanges(mergeEvent, defaultConfig)

      for (const change of result.proposedChanges) {
        expect(['create', 'update']).toContain(change.operation)
      }
    })
  })
})
