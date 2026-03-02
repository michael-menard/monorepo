/**
 * Graph-level routing tests for Documentation Graph
 *
 * Covers:
 * - graph.compile() succeeds
 * - dispatch node returns 6 Send objects for all enabled workers
 * - conditional edges after doc-review gate commit correctly
 * - dryRun:true prevents fs.writeFile calls (AC-17)
 * - aggregate sentinel count check (AC-19)
 *
 * AC-15, AC-16, AC-17, AC-19
 */

import { describe, expect, it, vi, beforeAll } from 'vitest'
import type {
  DocGraphState,
  DocWorkerResult,
  DocGraphConfig,
} from '../doc-graph.js'
import { createMockMergeEventPayload } from '../../nodes/doc-workers/__tests__/api-docs-worker.test.js'

// ============================================================================
// Mock dependencies
// ============================================================================

vi.mock('@repo/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

// fs mock for AC-17 dryRun test
vi.mock('node:fs/promises', () => ({
  default: {
    writeFile: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
    rename: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
  },
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  rename: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}))

vi.mock('node:util', () => ({
  promisify: vi.fn().mockReturnValue(vi.fn().mockResolvedValue({ stdout: '' })),
}))

// Mock @langchain/langgraph with proper Annotation mock
vi.mock('@langchain/langgraph', () => {
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
      compile: vi.fn().mockReturnValue({
        invoke: vi.fn().mockResolvedValue({}),
        stream: vi.fn(),
      }),
    })),
    END: '__end__',
    START: '__start__',
    Send: vi.fn().mockImplementation((nodeName: string, state: unknown) => ({ nodeName, state })),
  }
})

// ============================================================================
// Helpers
// ============================================================================

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

function createMockDocGraphState(overrides: Partial<DocGraphState> = {}): DocGraphState {
  return {
    mergeEvent: createMockMergeEventPayload(),
    workerResults: [],
    docReviewResult: null,
    proposedFileChanges: [],
    commitResult: null,
    docGraphComplete: false,
    expectedWorkers: 6,
    config: createDefaultConfig(),
    ...overrides,
  }
}

function createSuccessWorkerResult(workerName: DocWorkerResult['workerName']): DocWorkerResult {
  return {
    workerName,
    success: true,
    filesUpdated: [],
    proposedChanges: [],
    durationMs: 50,
    error: null,
    warnings: [],
    model: 'test',
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('createDocGraph', () => {
  let createDocGraph: typeof import('../doc-graph.js')['createDocGraph']
  let createDocGraphWithWorkers: typeof import('../doc-graph.js')['createDocGraphWithWorkers']

  beforeAll(async () => {
    const module = await import('../doc-graph.js')
    createDocGraph = module.createDocGraph
    createDocGraphWithWorkers = module.createDocGraphWithWorkers
  })

  it('HP-7: graph.compile() succeeds without throwing', () => {
    expect(() => createDocGraph()).not.toThrow()
  })

  it('HP-7: createDocGraph with custom config compiles successfully', () => {
    expect(() =>
      createDocGraph({
        dryRun: true,
        docReview: { minSuccessThreshold: 4 },
      }),
    ).not.toThrow()
  })

  it('HP-7: createDocGraphWithWorkers with mock workers compiles successfully', () => {
    const mockWorker = vi.fn().mockResolvedValue({})

    expect(() =>
      createDocGraphWithWorkers(
        { dryRun: true },
        {
          'doc-worker-api-docs': mockWorker,
          'doc-worker-component-docs': mockWorker,
          'doc-worker-architecture-docs': mockWorker,
          'doc-worker-readme-guides': mockWorker,
          'doc-worker-kb-sync': mockWorker,
          'doc-worker-changelog': mockWorker,
        },
      ),
    ).not.toThrow()
  })
})

describe('createDispatchNode', () => {
  let createDispatchNode: typeof import('../doc-graph.js')['createDispatchNode']

  beforeAll(async () => {
    const module = await import('../doc-graph.js')
    createDispatchNode = module.createDispatchNode
  })

  it('HP-4: dispatch node returns 6 Send objects when all 6 workers enabled', async () => {
    const config = createDefaultConfig()
    const dispatch = createDispatchNode(config)
    const state = createMockDocGraphState()

    const sends = await dispatch(state)

    expect(sends).toHaveLength(6)
    const nodeNames = sends.map((s: { nodeName: string }) => s.nodeName)
    expect(nodeNames).toContain('doc-worker-api-docs')
    expect(nodeNames).toContain('doc-worker-component-docs')
    expect(nodeNames).toContain('doc-worker-architecture-docs')
    expect(nodeNames).toContain('doc-worker-readme-guides')
    expect(nodeNames).toContain('doc-worker-kb-sync')
    expect(nodeNames).toContain('doc-worker-changelog')
  })

  it('HP-4: disabled worker is excluded from Send array', async () => {
    const config = createDefaultConfig()
    config.workerConfigs.apiDocs = { ...config.workerConfigs.apiDocs, enabled: false }

    const dispatch = createDispatchNode(config)
    const state = createMockDocGraphState()

    const sends = await dispatch(state)

    expect(sends).toHaveLength(5)
    const nodeNames = sends.map((s: { nodeName: string }) => s.nodeName)
    expect(nodeNames).not.toContain('doc-worker-api-docs')
  })

  it('HP-4: all workers disabled → empty Send array', async () => {
    const config = createDefaultConfig()
    config.workerConfigs.apiDocs = { ...config.workerConfigs.apiDocs, enabled: false }
    config.workerConfigs.componentDocs = { ...config.workerConfigs.componentDocs, enabled: false }
    config.workerConfigs.architectureDocs = { ...config.workerConfigs.architectureDocs, enabled: false }
    config.workerConfigs.readmeGuides = { ...config.workerConfigs.readmeGuides, enabled: false }
    config.workerConfigs.kbSync = { ...config.workerConfigs.kbSync, enabled: false }
    config.workerConfigs.changelog = { ...config.workerConfigs.changelog, enabled: false }

    const dispatch = createDispatchNode(config)
    const state = createMockDocGraphState()

    const sends = await dispatch(state)

    expect(sends).toHaveLength(0)
  })

  it('Send objects contain expectedWorkers count matching enabled workers', async () => {
    const config = createDefaultConfig()
    const dispatch = createDispatchNode(config)
    const state = createMockDocGraphState()

    const sends = await dispatch(state)

    expect(sends.length).toBe(6)
    for (const send of sends) {
      const sentState = (send as { state: DocGraphState }).state
      expect(sentState.expectedWorkers).toBe(6)
    }
  })
})

describe('createAggregateNode (AC-19)', () => {
  let createAggregateNode: typeof import('../doc-graph.js')['createAggregateNode']

  beforeAll(async () => {
    const module = await import('../doc-graph.js')
    createAggregateNode = module.createAggregateNode
  })

  it('AC-19: passes through when all workers completed', async () => {
    const workerResults = [
      createSuccessWorkerResult('api-docs'),
      createSuccessWorkerResult('component-docs'),
      createSuccessWorkerResult('architecture-docs'),
      createSuccessWorkerResult('readme-guides'),
      createSuccessWorkerResult('kb-sync'),
      createSuccessWorkerResult('changelog'),
    ]

    const state = createMockDocGraphState({ workerResults, expectedWorkers: 6 })
    const aggregateNode = createAggregateNode()
    const result = await aggregateNode(state)

    // Aggregate is a pass-through — returns empty object
    expect(result).toEqual({})
  })

  it('AC-19: logs warning when worker count mismatch', async () => {
    const { logger } = await import('@repo/logger')
    const warnSpy = vi.spyOn(logger, 'warn')

    const workerResults = [
      createSuccessWorkerResult('api-docs'),
      createSuccessWorkerResult('component-docs'),
    ]

    const state = createMockDocGraphState({ workerResults, expectedWorkers: 6 })
    const aggregateNode = createAggregateNode()
    await aggregateNode(state)

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('mismatch'),
      expect.objectContaining({ received: 2, expected: 6 }),
    )
  })
})

describe('conditional routing after doc-review (AC-16)', () => {
  let createDocReviewNode: typeof import('../doc-graph.js')['createDocReviewNode']

  beforeAll(async () => {
    const module = await import('../doc-graph.js')
    createDocReviewNode = module.createDocReviewNode
  })

  it('HP-7: commitBlocked:false when all workers succeed', async () => {
    const config = createDefaultConfig()
    const docReviewNode = createDocReviewNode(config)

    const workerResults = [
      createSuccessWorkerResult('api-docs'),
      createSuccessWorkerResult('component-docs'),
      createSuccessWorkerResult('architecture-docs'),
      createSuccessWorkerResult('readme-guides'),
      createSuccessWorkerResult('kb-sync'),
      createSuccessWorkerResult('changelog'),
    ]
    const state = createMockDocGraphState({ workerResults })

    const result = await docReviewNode(state)

    expect(result.docReviewResult?.commitBlocked).toBe(false)
  })

  it('HP-7: commitBlocked:true when below threshold', async () => {
    const config = createDefaultConfig()
    const docReviewNode = createDocReviewNode(config)

    const workerResults: DocWorkerResult[] = [
      createSuccessWorkerResult('api-docs'),
      createSuccessWorkerResult('component-docs'),
      { ...createSuccessWorkerResult('architecture-docs'), success: false, error: 'failed' },
      { ...createSuccessWorkerResult('readme-guides'), success: false, error: 'failed' },
      { ...createSuccessWorkerResult('kb-sync'), success: false, error: 'failed' },
      { ...createSuccessWorkerResult('changelog'), success: false, error: 'failed' },
    ]

    const state = createMockDocGraphState({ workerResults })
    const result = await docReviewNode(state)

    expect(result.docReviewResult?.commitBlocked).toBe(true)
  })
})

describe('dryRun prevents filesystem writes (AC-17)', () => {
  it('HP-10: dryRun:true — commit node does not call fs.writeFile and returns committed:false', async () => {
    // Import fs mock and commit node after mocks are set up
    const fs = await import('node:fs/promises')
    const { createCommitNode } = await import('../doc-graph.js')

    const writeFileSpy = vi.mocked(fs.writeFile)
    writeFileSpy.mockClear()

    const config: DocGraphConfig = { ...createDefaultConfig(), dryRun: true }
    const commitNode = createCommitNode(config)

    const proposedChanges = [
      {
        filePath: 'docs/test.md',
        operation: 'update' as const,
        content: 'test content',
        reason: 'test',
        workerName: 'api-docs' as const,
      },
    ]

    const state = createMockDocGraphState({
      proposedFileChanges: proposedChanges,
      docReviewResult: {
        docReviewPassed: true,
        commitBlocked: false,
        commitBlockedReason: null,
        workerSuccessCount: 6,
        workerFailureCount: 0,
      },
    })

    const result = await commitNode(state)

    // dryRun:true → fs.writeFile never called
    expect(writeFileSpy).not.toHaveBeenCalled()
    expect(result.commitResult?.committed).toBe(false)
    expect(result.commitResult?.error).toContain('dry-run')
    expect(result.docGraphComplete).toBe(true)
  })
})
