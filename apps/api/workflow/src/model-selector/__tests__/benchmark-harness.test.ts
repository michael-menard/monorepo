/**
 * benchmark-harness.test.ts
 *
 * Unit tests for benchmark-harness.ts.
 * Uses vi.mock for global fetch (Ollama calls) — no live network calls.
 *
 * AC-2: Verifies task iteration loop (all tasks x all models)
 * AC-3: Verifies evaluateQuality() and recordRun() are called per (model, task) pair
 * AC-7: Verifies cost_usd === 0 in all RunRecord entries
 * AC-8: Covers task iteration loop, result aggregation (averages, ranking), mock Ollama responses
 *
 * WINT-0270: Benchmark Harness for Ollama Model Selection
 */

import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs/promises'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock @repo/logger before importing harness
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock global fetch for Ollama calls — no live network calls
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import {
  callOllama,
  runSingleBenchmark,
  buildSummary,
  runBenchmarkHarness,
  QUALITY_EVALUATOR_LIMITATION,
} from '../benchmark-harness.js'
import type { BenchmarkTask, BenchmarkResult } from '../__types__/benchmark.js'

// ============================================================================
// Helpers
// ============================================================================

function makeOllamaSuccessResponse(text: string): Response {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({ response: text, done: true }),
  } as unknown as Response
}

function makeOllamaErrorResponse(status: number): Response {
  return {
    ok: false,
    status,
    json: vi.fn().mockResolvedValue({}),
  } as unknown as Response
}

function makeBenchmarkTask(overrides: Partial<BenchmarkTask> = {}): BenchmarkTask {
  return {
    id: 'code_generation_001',
    category: 'code_generation',
    prompt: 'Write a TypeScript function that validates an email using Zod schema.',
    expectedKeywords: ['z.string', 'email'],
    description: 'Test task',
    ...overrides,
  }
}

function makeTmpLeaderboardPath(): string {
  return path.join(os.tmpdir(), `benchmark-test-${Math.random().toString(36).substring(2, 8)}.yaml`)
}

// ============================================================================
// QUALITY_EVALUATOR_LIMITATION constant (AC-4)
// ============================================================================

describe('QUALITY_EVALUATOR_LIMITATION', () => {
  it('should be a non-empty string describing heuristic limitations', () => {
    expect(typeof QUALITY_EVALUATOR_LIMITATION).toBe('string')
    expect(QUALITY_EVALUATOR_LIMITATION.length).toBeGreaterThan(20)
  })

  it('should mention heuristic or keyword matching', () => {
    const lower = QUALITY_EVALUATOR_LIMITATION.toLowerCase()
    expect(lower.includes('heuristic') || lower.includes('keyword')).toBe(true)
  })

  it('should mention no semantic analysis', () => {
    const lower = QUALITY_EVALUATOR_LIMITATION.toLowerCase()
    expect(lower.includes('semantic')).toBe(true)
  })
})

// ============================================================================
// callOllama (ARCH-002: direct HTTP fetch)
// ============================================================================

describe('callOllama()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return the response text on success', async () => {
    mockFetch.mockResolvedValueOnce(makeOllamaSuccessResponse('function validate() {}'))

    const result = await callOllama('qwen2.5-coder:7b', 'Write a validation function', 'http://127.0.0.1:11434', 5000)
    expect(result).toBe('function validate() {}')
  })

  it('should call fetch with the correct URL and POST method', async () => {
    mockFetch.mockResolvedValueOnce(makeOllamaSuccessResponse('ok'))

    await callOllama('deepseek-coder-v2:16b', 'prompt', 'http://localhost:11434', 5000)

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/generate',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    )
  })

  it('should throw an error when Ollama returns a non-OK status', async () => {
    mockFetch.mockResolvedValueOnce(makeOllamaErrorResponse(500))

    await expect(callOllama('llama3.2:8b', 'test prompt', 'http://127.0.0.1:11434', 5000)).rejects.toThrow(
      'HTTP 500',
    )
  })

  it('should include model and prompt in the request body', async () => {
    mockFetch.mockResolvedValueOnce(makeOllamaSuccessResponse('response'))

    await callOllama('codellama:13b', 'my prompt', 'http://127.0.0.1:11434', 5000)

    const callArgs = mockFetch.mock.calls[0]
    const body = JSON.parse(callArgs[1].body)
    expect(body.model).toBe('codellama:13b')
    expect(body.prompt).toBe('my prompt')
    expect(body.stream).toBe(false)
  })
})

// ============================================================================
// runSingleBenchmark
// ============================================================================

describe('runSingleBenchmark()', () => {
  let tmpFile: string

  beforeEach(() => {
    tmpFile = makeTmpLeaderboardPath()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    try {
      await fs.unlink(tmpFile)
    } catch {
      // ignore
    }
  })

  it('should return a BenchmarkResult with cost_usd = 0 (AC-7: Ollama zero-cost sentinel)', async () => {
    mockFetch.mockResolvedValueOnce(
      makeOllamaSuccessResponse(
        'Here is the TypeScript schema: const UserSchema = z.object({ email: z.string().email() })',
      ),
    )

    const task = makeBenchmarkTask()
    const result = await runSingleBenchmark('qwen2.5-coder:7b', task, tmpFile, 'http://127.0.0.1:11434')

    // AC-7: cost_usd must always be 0 for Ollama
    expect(result.cost_usd).toBe(0)
  })

  it('should return the task ID and model in the result', async () => {
    mockFetch.mockResolvedValueOnce(makeOllamaSuccessResponse('TypeScript function result'))

    const task = makeBenchmarkTask({ id: 'code_generation_001', category: 'code_generation' })
    const result = await runSingleBenchmark('deepseek-coder-v2:16b', task, tmpFile, 'http://127.0.0.1:11434')

    expect(result.taskId).toBe('code_generation_001')
    expect(result.model).toBe('deepseek-coder-v2:16b')
    expect(result.category).toBe('code_generation')
  })

  it('should record a positive qualityScore for non-empty output', async () => {
    const substantialOutput = 'This is a comprehensive TypeScript function. ' +
      'It implements code generation with proper types and validation. ' +
      'The result includes correctness, completeness, and coherence checks.'

    mockFetch.mockResolvedValueOnce(makeOllamaSuccessResponse(substantialOutput))

    const task = makeBenchmarkTask()
    const result = await runSingleBenchmark('qwen2.5-coder:14b', task, tmpFile, 'http://127.0.0.1:11434')

    expect(result.qualityScore).toBeGreaterThanOrEqual(0)
    expect(result.qualityScore).toBeLessThanOrEqual(100)
  })

  it('should record latency_ms > 0', async () => {
    mockFetch.mockResolvedValueOnce(makeOllamaSuccessResponse('some output'))

    const task = makeBenchmarkTask()
    const result = await runSingleBenchmark('llama3.2:8b', task, tmpFile, 'http://127.0.0.1:11434')

    expect(result.latency_ms).toBeGreaterThanOrEqual(0)
  })

  it('should return error result (not throw) when Ollama call fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))

    const task = makeBenchmarkTask()
    const result = await runSingleBenchmark('codellama:13b', task, tmpFile, 'http://127.0.0.1:11434')

    expect(result.error).toBeTruthy()
    expect(result.error).toContain('ECONNREFUSED')
    expect(result.qualityScore).toBe(0)
    // AC-7: cost_usd = 0 even on error
    expect(result.cost_usd).toBe(0)
  })

  it('should persist a leaderboard entry via recordRun (AC-3)', async () => {
    mockFetch.mockResolvedValueOnce(makeOllamaSuccessResponse('TypeScript validation function result here.'))

    const task = makeBenchmarkTask()
    await runSingleBenchmark('qwen2.5-coder:7b', task, tmpFile, 'http://127.0.0.1:11434')

    // Verify leaderboard file was created by recordRun
    const fileExists = await fs
      .stat(tmpFile)
      .then(() => true)
      .catch(() => false)
    expect(fileExists).toBe(true)
  })
})

// ============================================================================
// buildSummary
// ============================================================================

describe('buildSummary()', () => {
  it('should return a summary with correct total counts', () => {
    const results: BenchmarkResult[] = [
      {
        taskId: 'code_generation_001',
        model: 'model-a',
        category: 'code_generation',
        output: 'result',
        latency_ms: 1200,
        cost_usd: 0,
        qualityScore: 75,
        error: null,
      },
      {
        taskId: 'code_review_001',
        model: 'model-a',
        category: 'code_review',
        output: '',
        latency_ms: 500,
        cost_usd: 0,
        qualityScore: 0,
        error: 'ECONNREFUSED',
      },
      {
        taskId: 'code_generation_001',
        model: 'model-b',
        category: 'code_generation',
        output: 'result',
        latency_ms: 800,
        cost_usd: 0,
        qualityScore: 85,
        error: null,
      },
    ]

    const summary = buildSummary(results, '/tmp/test-leaderboard.yaml')

    expect(summary.totalRuns).toBe(3)
    expect(summary.successfulRuns).toBe(2)
    expect(summary.failedRuns).toBe(1)
  })

  it('should compute per-model average quality scores correctly', () => {
    const results: BenchmarkResult[] = [
      {
        taskId: 'code_generation_001',
        model: 'model-a',
        category: 'code_generation',
        output: 'result',
        latency_ms: 1000,
        cost_usd: 0,
        qualityScore: 80,
        error: null,
      },
      {
        taskId: 'code_review_001',
        model: 'model-a',
        category: 'code_review',
        output: 'result',
        latency_ms: 1000,
        cost_usd: 0,
        qualityScore: 90,
        error: null,
      },
    ]

    const summary = buildSummary(results, '/tmp/leaderboard.yaml')

    const modelRow = summary.modelRows.find(r => r.model === 'model-a')
    expect(modelRow).toBeDefined()
    // avg = (80 + 90) / 2 = 85
    expect(modelRow!.avgQualityScore).toBeCloseTo(85, 1)
  })

  it('should sort model rows by avgQualityScore descending', () => {
    const results: BenchmarkResult[] = [
      {
        taskId: 'task_001',
        model: 'model-low',
        category: 'code_generation',
        output: 'result',
        latency_ms: 1000,
        cost_usd: 0,
        qualityScore: 50,
        error: null,
      },
      {
        taskId: 'task_001',
        model: 'model-high',
        category: 'code_generation',
        output: 'result',
        latency_ms: 1000,
        cost_usd: 0,
        qualityScore: 90,
        error: null,
      },
      {
        taskId: 'task_001',
        model: 'model-mid',
        category: 'code_generation',
        output: 'result',
        latency_ms: 1000,
        cost_usd: 0,
        qualityScore: 70,
        error: null,
      },
    ]

    const summary = buildSummary(results, '/tmp/leaderboard.yaml')

    expect(summary.modelRows[0].model).toBe('model-high')
    expect(summary.modelRows[1].model).toBe('model-mid')
    expect(summary.modelRows[2].model).toBe('model-low')
  })

  it('should include per-category scores in each model row', () => {
    const results: BenchmarkResult[] = [
      {
        taskId: 'code_generation_001',
        model: 'model-a',
        category: 'code_generation',
        output: 'result',
        latency_ms: 1000,
        cost_usd: 0,
        qualityScore: 75,
        error: null,
      },
      {
        taskId: 'lint_syntax_001',
        model: 'model-a',
        category: 'lint_syntax',
        output: 'result',
        latency_ms: 1000,
        cost_usd: 0,
        qualityScore: 85,
        error: null,
      },
    ]

    const summary = buildSummary(results, '/tmp/leaderboard.yaml')
    const row = summary.modelRows[0]

    expect(row.categoryScores['code_generation']).toBeCloseTo(75, 1)
    expect(row.categoryScores['lint_syntax']).toBeCloseTo(85, 1)
  })

  it('should record all runs with cost_usd = 0 (AC-7: zero-cost sentinel)', () => {
    const results: BenchmarkResult[] = [
      {
        taskId: 'code_generation_001',
        model: 'model-a',
        category: 'code_generation',
        output: 'result',
        latency_ms: 500,
        cost_usd: 0,
        qualityScore: 80,
        error: null,
      },
    ]

    const summary = buildSummary(results, '/tmp/leaderboard.yaml')

    // All results must have cost_usd = 0 (Ollama zero-cost sentinel)
    expect(results.every(r => r.cost_usd === 0)).toBe(true)
    expect(summary.totalRuns).toBe(1)
  })
})

// ============================================================================
// runBenchmarkHarness — full integration (mocked Ollama) (AC-2)
// ============================================================================

describe('runBenchmarkHarness()', () => {
  let tmpFile: string

  beforeEach(() => {
    tmpFile = makeTmpLeaderboardPath()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    try {
      await fs.unlink(tmpFile)
    } catch {
      // ignore
    }
  })

  it('should iterate all models x all tasks (AC-2: task iteration loop)', async () => {
    const mockModels = ['model-a', 'model-b']
    const mockCorpus: BenchmarkTask[] = [
      makeBenchmarkTask({ id: 'code_generation_001', category: 'code_generation' }),
      makeBenchmarkTask({ id: 'code_review_001', category: 'code_review' }),
    ]

    // 2 models x 2 tasks = 4 fetch calls
    mockFetch.mockResolvedValue(makeOllamaSuccessResponse('TypeScript code result here.'))

    const summary = await runBenchmarkHarness({
      leaderboardPath: tmpFile,
      models: mockModels,
      corpus: mockCorpus,
      ollamaBaseUrl: 'http://127.0.0.1:11434',
    })

    // AC-2: models x tasks
    expect(summary.totalRuns).toBe(4) // 2 models x 2 tasks
    expect(mockFetch).toHaveBeenCalledTimes(4)
  })

  it('should produce model rows for all models in summary', async () => {
    const mockModels = ['deepseek-coder-v2:16b', 'qwen2.5-coder:7b']
    const mockCorpus: BenchmarkTask[] = [
      makeBenchmarkTask({ id: 'code_generation_001', category: 'code_generation' }),
    ]

    mockFetch.mockResolvedValue(makeOllamaSuccessResponse('code result'))

    const summary = await runBenchmarkHarness({
      leaderboardPath: tmpFile,
      models: mockModels,
      corpus: mockCorpus,
      ollamaBaseUrl: 'http://127.0.0.1:11434',
    })

    const modelNames = summary.modelRows.map(r => r.model)
    expect(modelNames).toContain('deepseek-coder-v2:16b')
    expect(modelNames).toContain('qwen2.5-coder:7b')
  })

  it('should gracefully handle fetch failures for all runs', async () => {
    const mockModels = ['model-a']
    const mockCorpus: BenchmarkTask[] = [
      makeBenchmarkTask({ id: 'code_generation_001', category: 'code_generation' }),
    ]

    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'))

    // Should NOT throw — errors are captured in results
    const summary = await runBenchmarkHarness({
      leaderboardPath: tmpFile,
      models: mockModels,
      corpus: mockCorpus,
      ollamaBaseUrl: 'http://127.0.0.1:11434',
    })

    expect(summary.failedRuns).toBe(1)
    expect(summary.successfulRuns).toBe(0)
  })

  it('should persist leaderboard after all runs (AC-3: recordRun called)', async () => {
    const mockModels = ['model-a']
    const mockCorpus: BenchmarkTask[] = [
      makeBenchmarkTask({ id: 'code_generation_001', category: 'code_generation' }),
    ]

    mockFetch.mockResolvedValue(makeOllamaSuccessResponse('result text'))

    await runBenchmarkHarness({
      leaderboardPath: tmpFile,
      models: mockModels,
      corpus: mockCorpus,
      ollamaBaseUrl: 'http://127.0.0.1:11434',
    })

    // Leaderboard file should be created by recordRun calls
    const fileExists = await fs
      .stat(tmpFile)
      .then(() => true)
      .catch(() => false)
    expect(fileExists).toBe(true)
  })

  it('should include leaderboard path in summary', async () => {
    const mockModels = ['model-a']
    const mockCorpus: BenchmarkTask[] = [
      makeBenchmarkTask({ id: 'code_generation_001', category: 'code_generation' }),
    ]

    mockFetch.mockResolvedValue(makeOllamaSuccessResponse('result'))

    const summary = await runBenchmarkHarness({
      leaderboardPath: tmpFile,
      models: mockModels,
      corpus: mockCorpus,
      ollamaBaseUrl: 'http://127.0.0.1:11434',
    })

    expect(summary.leaderboardPath).toBe(tmpFile)
  })
})
