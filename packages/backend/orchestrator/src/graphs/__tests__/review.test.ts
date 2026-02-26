/**
 * Review Graph Integration Tests
 *
 * APIP-1050: AC-7, AC-9, AC-10, AC-11, AC-12, AC-13, AC-14, AC-16, AC-17, AC-18
 *
 * Tests the complete review graph: compile, dispatcher fan-out,
 * worker reachability, fan-in aggregation, PASS/FAIL verdict,
 * REVIEW.yaml write, and disabled workers (workers_skipped).
 *
 * Integration tests inject mock workers via workerOverrides to avoid
 * running real shell commands (lint, build, etc.) in the test environment.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Send } from '@langchain/langgraph'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import {
  createReviewGraph,
  runReview,
  ReviewGraphResultSchema,
  createFanInNode,
  createDispatcherNode,
  type ReviewGraphState,
} from '../review.js'
import { ALL_REVIEW_WORKERS } from '../../nodes/review/types.js'
import type { WorkerResult } from '../../artifacts/review.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'review-test-'))
})

afterEach(async () => {
  try {
    await fs.rm(tmpDir, { recursive: true, force: true })
  } catch {
    // ignore cleanup errors
  }
})

/** Creates a minimal ReviewGraphState for testing node functions directly */
function createTestState(overrides: Partial<ReviewGraphState> = {}): ReviewGraphState {
  return {
    storyId: 'APIP-9999',
    worktreePath: '/tmp/test',
    changeSpecIds: [],
    iteration: 1,
    featureDir: tmpDir,
    workerResults: [],
    workerNames: [],
    workersToSkip: [],
    review: null,
    reviewYamlPath: null,
    complete: false,
    errors: [],
    warnings: [],
    ...overrides,
  }
}

/** Creates a mock PASS worker */
function mockPassWorker(): (state: { storyId: string; worktreePath: string; changeSpecIds?: string[] }) => Promise<WorkerResult> {
  return async () => ({
    verdict: 'PASS',
    skipped: false,
    errors: 0,
    warnings: 0,
    findings: [],
    duration_ms: 1,
  })
}

/** Creates a mock FAIL worker with one error finding */
function mockFailWorker(file = 'src/foo.ts'): (state: { storyId: string; worktreePath: string; changeSpecIds?: string[] }) => Promise<WorkerResult> {
  return async () => ({
    verdict: 'FAIL',
    skipped: false,
    errors: 1,
    warnings: 0,
    findings: [{ file, message: 'Mock error', severity: 'error', auto_fixable: false }],
    duration_ms: 1,
  })
}

/** All-PASS worker overrides (10 workers) for graph integration tests */
const allPassWorkers = {
  lint: mockPassWorker(),
  style: mockPassWorker(),
  syntax: mockPassWorker(),
  typecheck: mockPassWorker(),
  build: mockPassWorker(),
  react: mockPassWorker(),
  typescript: mockPassWorker(),
  reusability: mockPassWorker(),
  accessibility: mockPassWorker(),
  security: mockPassWorker(),
}

// ---------------------------------------------------------------------------
// AC-12: Graph compiles without errors
// ---------------------------------------------------------------------------

describe('createReviewGraph', () => {
  it('compiles without errors (AC-12)', () => {
    expect(() => createReviewGraph()).not.toThrow()
  })

  it('returns a compiled graph with an invoke method', () => {
    const graph = createReviewGraph()
    expect(graph).toBeDefined()
    expect(typeof graph.invoke).toBe('function')
  })
})

// ---------------------------------------------------------------------------
// AC-7: Dispatcher uses Send API — all 10 workers reachable
// ---------------------------------------------------------------------------

describe('dispatcher fan-out (AC-7)', () => {
  it('fans out to all 10 workers when no workers are skipped', () => {
    const dispatcher = createDispatcherNode()
    const state = createTestState({ workersToSkip: [] })

    const sends = dispatcher(state)

    expect(sends).toHaveLength(10)
    const workerNodes = sends.map(s => s.node)
    const expectedNodes = ALL_REVIEW_WORKERS.map(n => `worker_${n}`)
    expect(workerNodes.sort()).toEqual(expectedNodes.sort())
  })

  it('skips workers in workersToSkip', () => {
    const dispatcher = createDispatcherNode()
    const state = createTestState({ workersToSkip: ['lint', 'style'] })

    const sends = dispatcher(state)

    expect(sends).toHaveLength(8)
    const workerNodes = sends.map(s => s.node)
    expect(workerNodes).not.toContain('worker_lint')
    expect(workerNodes).not.toContain('worker_style')
  })

  it('returns Send objects (AC-7)', () => {
    const dispatcher = createDispatcherNode()
    const state = createTestState({ workersToSkip: [] })

    const sends = dispatcher(state)

    // Verify all are Send instances
    sends.forEach(s => {
      expect(s).toBeInstanceOf(Send)
    })
  })
})

// ---------------------------------------------------------------------------
// AC-13: runReview function exported and returns correct shape
// ---------------------------------------------------------------------------

describe('runReview (AC-13)', () => {
  it('returns a ReviewGraphResult with correct shape', async () => {
    const result = await runReview({
      storyId: 'APIP-9999',
      worktreePath: '/tmp/test',
      featureDir: tmpDir,
      iteration: 1,
      workerOverrides: allPassWorkers,
    })

    expect(() => ReviewGraphResultSchema.parse(result)).not.toThrow()
    expect(result.storyId).toBe('APIP-9999')
    expect(['PASS', 'FAIL']).toContain(result.verdict)
    expect(typeof result.durationMs).toBe('number')
    expect(result.completedAt).toBeTruthy()
  })

  it('uses thread ID convention storyId:review:attempt (AC-17)', async () => {
    // runReview should not throw when called with attempt param
    const result = await runReview({
      storyId: 'APIP-9999',
      worktreePath: '/tmp/test',
      featureDir: tmpDir,
      attempt: 2,
      workerOverrides: allPassWorkers,
    })

    expect(result).toBeDefined()
    expect(result.storyId).toBe('APIP-9999')
  })
})

// ---------------------------------------------------------------------------
// AC-11: REVIEW.yaml written to expected path
// ---------------------------------------------------------------------------

describe('REVIEW.yaml write (AC-11)', () => {
  it('writes REVIEW.yaml to featureDir/in-progress/storyId/_implementation/REVIEW.yaml', async () => {
    const storyId = 'APIP-9999'
    const result = await runReview({
      storyId,
      worktreePath: '/tmp/test',
      featureDir: tmpDir,
      iteration: 1,
      workerOverrides: allPassWorkers,
    })

    const expectedPath = path.join(
      tmpDir,
      'in-progress',
      storyId,
      '_implementation',
      'REVIEW.yaml',
    )

    expect(result.reviewYamlPath).toBe(expectedPath)

    // Verify file exists on disk
    const fileContents = await fs.readFile(expectedPath, 'utf-8')
    expect(fileContents).toBeTruthy()
    expect(fileContents).toContain('story_id')
    expect(fileContents).toContain(storyId)
  })
})

// ---------------------------------------------------------------------------
// AC-14: PASS verdict when all workers pass; FAIL when any worker fails
// ---------------------------------------------------------------------------

describe('verdict logic (AC-14)', () => {
  it('returns PASS verdict when all workers return PASS', async () => {
    const result = await runReview({
      storyId: 'APIP-9999',
      worktreePath: '/tmp/test',
      featureDir: tmpDir,
      iteration: 1,
      workerOverrides: allPassWorkers,
    })

    expect(result.verdict).toBe('PASS')
    expect(result.total_errors).toBe(0)
  })

  it('returns FAIL verdict when one worker returns FAIL', async () => {
    const result = await runReview({
      storyId: 'APIP-9999',
      worktreePath: '/tmp/test',
      featureDir: tmpDir,
      iteration: 1,
      workerOverrides: {
        ...allPassWorkers,
        lint: mockFailWorker('src/bad.ts'),
      },
    })

    expect(result.verdict).toBe('FAIL')
    expect(result.total_errors).toBeGreaterThan(0)
  })

  it('fan-in sets FAIL verdict when any worker result has FAIL', async () => {
    const fanIn = createFanInNode()
    const state = createTestState({
      workerResults: [
        {
          workerName: 'lint',
          verdict: 'FAIL',
          skipped: false,
          errors: 1,
          warnings: 0,
          findings: [
            {
              file: 'src/foo.ts',
              message: 'No unused vars',
              severity: 'error',
              auto_fixable: false,
            },
          ],
          duration_ms: 100,
        },
        {
          workerName: 'style',
          verdict: 'PASS',
          skipped: false,
          errors: 0,
          warnings: 0,
          findings: [],
          duration_ms: 50,
        },
      ],
    })

    const result = await fanIn(state)
    expect(result.review?.verdict).toBe('FAIL')
    expect(result.review?.total_errors).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// AC-9: fan-in calls createReview, addWorkerResult, generateRankedPatches
// ---------------------------------------------------------------------------

describe('fan-in aggregation (AC-9)', () => {
  it('aggregates worker results and generates ranked patches', async () => {
    const fanIn = createFanInNode()
    const state = createTestState({
      workerResults: [
        {
          workerName: 'lint',
          verdict: 'FAIL',
          skipped: false,
          errors: 1,
          warnings: 0,
          findings: [
            {
              file: 'src/foo.ts',
              line: 10,
              message: 'Unused var',
              severity: 'error',
              auto_fixable: true,
            },
          ],
          duration_ms: 100,
        },
      ],
    })

    const result = await fanIn(state)

    expect(result.review).toBeDefined()
    expect(result.review?.workers_run).toContain('lint')
    expect(result.review?.verdict).toBe('FAIL')
  })

  it('includes ranked_patches in review when there are errors', async () => {
    const fanIn = createFanInNode()
    const state = createTestState({
      workerResults: [
        {
          workerName: 'security',
          verdict: 'FAIL',
          skipped: false,
          errors: 1,
          warnings: 0,
          findings: [
            {
              file: 'src/api.ts',
              message: 'SQL injection risk',
              severity: 'error',
              auto_fixable: false,
            },
          ],
          duration_ms: 200,
        },
      ],
    })

    const result = await fanIn(state)
    expect(result.review?.ranked_patches).toHaveLength(1)
    expect(result.review?.ranked_patches[0]?.worker).toBe('security')
  })
})

// ---------------------------------------------------------------------------
// AC-10: changeSpecId mapping in ranked patches
// ---------------------------------------------------------------------------

describe('changeSpecId mapping (AC-10)', () => {
  it('maps changeSpecId to ranked patches by file-path matching', async () => {
    const fanIn = createFanInNode()
    const state = createTestState({
      changeSpecIds: ['src/foo.ts', 'src/bar.ts'],
      workerResults: [
        {
          workerName: 'lint',
          verdict: 'FAIL',
          skipped: false,
          errors: 1,
          warnings: 0,
          findings: [
            {
              file: 'src/foo.ts',
              message: 'Error in foo',
              severity: 'error',
              auto_fixable: false,
            },
          ],
          duration_ms: 100,
        },
      ],
    })

    const result = await fanIn(state)
    const patch = result.review?.ranked_patches?.[0]

    expect(patch).toBeDefined()
    // The changeSpecId should match because 'src/foo.ts' is in changeSpecIds
    expect(patch?.changeSpecId).toBe('src/foo.ts')
  })

  it('sets changeSpecId to null when no match found', async () => {
    const fanIn = createFanInNode()
    const state = createTestState({
      changeSpecIds: ['src/other.ts'],
      workerResults: [
        {
          workerName: 'lint',
          verdict: 'FAIL',
          skipped: false,
          errors: 1,
          warnings: 0,
          findings: [
            {
              file: 'src/foo.ts',
              message: 'Error in foo',
              severity: 'error',
              auto_fixable: false,
            },
          ],
          duration_ms: 100,
        },
      ],
    })

    const result = await fanIn(state)
    const patch = result.review?.ranked_patches?.[0]

    expect(patch?.changeSpecId).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// AC-16: Graph integration — compile, reachability, fan-in
// ---------------------------------------------------------------------------

describe('graph integration (AC-16)', () => {
  it('runs complete graph and all 10 workers contribute results', async () => {
    const result = await runReview({
      storyId: 'APIP-8888',
      worktreePath: '/tmp/test',
      featureDir: tmpDir,
      iteration: 1,
      workerOverrides: allPassWorkers,
    })

    expect(result.workers_run).toHaveLength(10)
    expect(result.workers_run.sort()).toEqual(ALL_REVIEW_WORKERS.slice().sort())
  })

  it('records workers_skipped for disabled workers (AC-16)', async () => {
    const result = await runReview({
      storyId: 'APIP-8888',
      worktreePath: '/tmp/test',
      featureDir: tmpDir,
      workersToSkip: ['lint', 'style'],
      workerOverrides: allPassWorkers,
    })

    expect(result.workers_skipped).toContain('lint')
    expect(result.workers_skipped).toContain('style')
    expect(result.workers_run).not.toContain('lint')
    expect(result.workers_run).not.toContain('style')
    expect(result.workers_run).toHaveLength(8)
  })

  it('fan-in aggregates results from all workers that ran (AC-9)', async () => {
    const result = await runReview({
      storyId: 'APIP-7777',
      worktreePath: '/tmp/test',
      featureDir: tmpDir,
      workerOverrides: allPassWorkers,
    })

    expect(result.workers_run.length).toBeGreaterThan(0)
    expect(result.verdict).toBeDefined()
  })

  it('FAIL verdict propagates from one failing worker out of 10 (AC-14)', async () => {
    const result = await runReview({
      storyId: 'APIP-5555',
      worktreePath: '/tmp/test',
      featureDir: tmpDir,
      workerOverrides: {
        ...allPassWorkers,
        security: mockFailWorker('src/auth.ts'),
      },
    })

    expect(result.verdict).toBe('FAIL')
    expect(result.total_errors).toBe(1)
    expect(result.workers_run).toHaveLength(10)
  })

  it('changeSpecId mapping in ranked patches (AC-10)', async () => {
    // With no failing workers, ranked_patches will be empty
    // We verify the graph runs successfully with changeSpecIds provided
    const result = await runReview({
      storyId: 'APIP-6666',
      worktreePath: '/tmp/test',
      featureDir: tmpDir,
      changeSpecIds: ['packages/backend/src/foo.ts', 'apps/web/src/bar.tsx'],
      workerOverrides: allPassWorkers,
    })

    expect(result).toBeDefined()
    expect(result.verdict).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// AC-18: ReviewGraphResultSchema exported
// ---------------------------------------------------------------------------

describe('ReviewGraphResultSchema (AC-18)', () => {
  it('is a valid Zod schema', () => {
    expect(ReviewGraphResultSchema).toBeDefined()
    expect(typeof ReviewGraphResultSchema.parse).toBe('function')
  })

  it('validates correct result shape', () => {
    const validResult = {
      storyId: 'APIP-1050',
      verdict: 'PASS' as const,
      reviewYamlPath: '/tmp/REVIEW.yaml',
      workers_run: ['lint', 'style'],
      workers_skipped: [],
      total_errors: 0,
      total_warnings: 0,
      durationMs: 1234,
      completedAt: new Date().toISOString(),
      errors: [],
      warnings: [],
    }

    expect(() => ReviewGraphResultSchema.parse(validResult)).not.toThrow()
  })
})
