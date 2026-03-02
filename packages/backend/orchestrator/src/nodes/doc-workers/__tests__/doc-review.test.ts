/**
 * Unit tests for DocReviewNode
 *
 * Covers:
 * (a) All workers succeeded → docReviewPassed:true
 * (b) 3 of 6 workers failed → commitBlocked:true (below threshold)
 * (c) KB Sync Worker proposed entry deletion → commitBlocked:true (EC-3)
 *
 * AC-15
 */

import { describe, expect, it, vi, beforeAll } from 'vitest'
import type { DocGraphState, DocWorkerResult, ProposedFileChange, DocGraphConfig } from '../../../graphs/doc-graph.js'
import { createMockMergeEventPayload } from './api-docs-worker.test.js'

vi.mock('@repo/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

// Mock @langchain/langgraph - must use factory function to avoid hoisting issues
vi.mock('@langchain/langgraph', () => {
  const overwrite = <T>(_: T, b: T): T => b
  const append = <T>(current: T[], update: T[]): T[] => [...current, ...update]

  const Annotation = Object.assign(
    (config: unknown) => ({ ...config }),
    {
      Root: (fields: unknown) => ({
        State: {} as unknown,
        fields,
      }),
    },
  )

  return {
    Annotation,
    StateGraph: vi.fn().mockImplementation(() => ({
      addNode: vi.fn().mockReturnThis(),
      addEdge: vi.fn().mockReturnThis(),
      addConditionalEdges: vi.fn().mockReturnThis(),
      compile: vi.fn().mockReturnValue({ invoke: vi.fn() }),
    })),
    END: '__end__',
    START: '__start__',
    Send: vi.fn((nodeName: string, state: unknown) => ({ nodeName, state })),
  }
})

// ============================================================================
// Helpers
// ============================================================================

function createSuccessWorkerResult(workerName: DocWorkerResult['workerName']): DocWorkerResult {
  return {
    workerName,
    success: true,
    filesUpdated: [],
    proposedChanges: [],
    durationMs: 100,
    error: null,
    warnings: [],
    model: 'gpt-4o-mini',
  }
}

function createFailureWorkerResult(workerName: DocWorkerResult['workerName']): DocWorkerResult {
  return {
    workerName,
    success: false,
    filesUpdated: [],
    proposedChanges: [],
    durationMs: 50,
    error: 'Worker failed',
    warnings: [],
    model: 'gpt-4o-mini',
  }
}

function createDefaultConfig(): DocGraphConfig {
  return {
    workerConfigs: {
      apiDocs: { enabled: true, dryRun: false, timeoutMs: 120000, model: 'test', filePatterns: [] },
      componentDocs: { enabled: true, dryRun: false, timeoutMs: 120000, model: 'test', filePatterns: [] },
      architectureDocs: { enabled: true, dryRun: false, timeoutMs: 120000, model: 'test', filePatterns: [] },
      readmeGuides: { enabled: true, dryRun: false, timeoutMs: 120000, model: 'test', filePatterns: [] },
      kbSync: { enabled: true, dryRun: false, timeoutMs: 10000, model: 'none', dedupeThreshold: 0.85 },
      changelog: { enabled: true, dryRun: false, timeoutMs: 120000, model: 'test', changelogPath: 'CHANGELOG.md' },
    },
    docReview: { minSuccessThreshold: 4 },
    dryRun: false,
    commitMessage: 'docs(auto): sync documentation for {storyId}',
  }
}

function createMockDocGraphState(
  workerResults: DocWorkerResult[],
  overrides: Partial<DocGraphState> = {},
): DocGraphState {
  return {
    mergeEvent: createMockMergeEventPayload(),
    workerResults,
    docReviewResult: null,
    proposedFileChanges: [],
    commitResult: null,
    docGraphComplete: false,
    expectedWorkers: 6,
    config: createDefaultConfig(),
    ...overrides,
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('DocReviewNode', () => {
  let createDocReviewNode: typeof import('../../../graphs/doc-graph.js')['createDocReviewNode']

  beforeAll(async () => {
    const module = await import('../../../graphs/doc-graph.js')
    createDocReviewNode = module.createDocReviewNode
  })

  it('HP-5: all 6 workers succeeded → docReviewPassed:true, commitBlocked:false', async () => {
    const workerResults: DocWorkerResult[] = [
      createSuccessWorkerResult('api-docs'),
      createSuccessWorkerResult('component-docs'),
      createSuccessWorkerResult('architecture-docs'),
      createSuccessWorkerResult('readme-guides'),
      createSuccessWorkerResult('kb-sync'),
      createSuccessWorkerResult('changelog'),
    ]

    const state = createMockDocGraphState(workerResults)
    const config = createDefaultConfig()
    const docReviewNode = createDocReviewNode(config)
    const result = await docReviewNode(state)

    expect(result.docReviewResult?.docReviewPassed).toBe(true)
    expect(result.docReviewResult?.commitBlocked).toBe(false)
    expect(result.docReviewResult?.commitBlockedReason).toBeNull()
    expect(result.docReviewResult?.workerSuccessCount).toBe(6)
    expect(result.docReviewResult?.workerFailureCount).toBe(0)
  })

  it('EC-4: 3 of 6 workers failed → commitBlocked:true (below minSuccessThreshold=4)', async () => {
    const workerResults: DocWorkerResult[] = [
      createSuccessWorkerResult('api-docs'),
      createSuccessWorkerResult('component-docs'),
      createSuccessWorkerResult('architecture-docs'),
      createFailureWorkerResult('readme-guides'),
      createFailureWorkerResult('kb-sync'),
      createFailureWorkerResult('changelog'),
    ]

    const state = createMockDocGraphState(workerResults)
    const config = createDefaultConfig()
    const docReviewNode = createDocReviewNode(config)
    const result = await docReviewNode(state)

    expect(result.docReviewResult?.docReviewPassed).toBe(false)
    expect(result.docReviewResult?.commitBlocked).toBe(true)
    expect(result.docReviewResult?.commitBlockedReason).toBeTruthy()
    expect(result.docReviewResult?.commitBlockedReason).toContain('minimum required: 4')
    expect(result.docReviewResult?.workerSuccessCount).toBe(3)
    expect(result.docReviewResult?.workerFailureCount).toBe(3)
  })

  it('EC-3: KB Sync Worker proposed entry deletion → commitBlocked:true regardless of other workers', async () => {
    const kbSyncResultWithDeletion: DocWorkerResult = {
      workerName: 'kb-sync',
      success: true,
      filesUpdated: [],
      proposedChanges: [
        {
          filePath: 'docs/kb/old-entry.md',
          operation: 'delete' as unknown as 'create' | 'update',
          content: '',
          reason: 'should not happen',
          workerName: 'kb-sync',
        } as ProposedFileChange,
      ],
      durationMs: 100,
      error: null,
      warnings: [],
      model: 'none',
    }

    const workerResults: DocWorkerResult[] = [
      createSuccessWorkerResult('api-docs'),
      createSuccessWorkerResult('component-docs'),
      createSuccessWorkerResult('architecture-docs'),
      createSuccessWorkerResult('readme-guides'),
      kbSyncResultWithDeletion,
      createSuccessWorkerResult('changelog'),
    ]

    const state = createMockDocGraphState(workerResults)
    const config = createDefaultConfig()
    const docReviewNode = createDocReviewNode(config)
    const result = await docReviewNode(state)

    expect(result.docReviewResult?.commitBlocked).toBe(true)
    expect(result.docReviewResult?.docReviewPassed).toBe(false)
    expect(result.docReviewResult?.commitBlockedReason).toContain('KB Sync Worker proposed entry deletion')
  })

  it('configurable minSuccessThreshold: threshold=6 → fails with 5/6 success', async () => {
    const strictConfig = createDefaultConfig()
    strictConfig.docReview.minSuccessThreshold = 6

    const workerResults: DocWorkerResult[] = [
      createSuccessWorkerResult('api-docs'),
      createSuccessWorkerResult('component-docs'),
      createSuccessWorkerResult('architecture-docs'),
      createSuccessWorkerResult('readme-guides'),
      createSuccessWorkerResult('kb-sync'),
      createFailureWorkerResult('changelog'),
    ]

    const state = createMockDocGraphState(workerResults)
    const docReviewNode = createDocReviewNode(strictConfig)
    const result = await docReviewNode(state)

    expect(result.docReviewResult?.commitBlocked).toBe(true)
    expect(result.docReviewResult?.workerSuccessCount).toBe(5)
  })
})
