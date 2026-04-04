/**
 * preflight_checks node tests (pipeline-orchestrator)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import {
  createPreflightChecksNode,
  isModelAvailable,
  type HealthCheckerFn,
  type ProcessSpawnerFn,
  type ModelPullerFn,
  type SleepFn,
} from '../preflight-checks.js'

// ============================================================================
// Helpers
// ============================================================================

const noopSleep: SleepFn = async () => {}

function makeHealthChecker(responses: Array<string[] | null | Error>): HealthCheckerFn {
  let callIndex = 0
  return async () => {
    const response = responses[callIndex] ?? responses[responses.length - 1]
    callIndex++
    if (response instanceof Error) throw response
    return response
  }
}

// ============================================================================
// isModelAvailable tests
// ============================================================================

describe('isModelAvailable', () => {
  it('returns true for exact match', () => {
    expect(isModelAvailable(['qwen2.5-coder:14b', 'llama3:8b'], 'qwen2.5-coder:14b')).toBe(true)
  })

  it('returns true for prefix match with variant suffix', () => {
    expect(
      isModelAvailable(['qwen2.5-coder:14b-fp16'], 'qwen2.5-coder:14b'),
    ).toBe(true)
  })

  it('returns false when model is not present', () => {
    expect(isModelAvailable(['llama3:8b'], 'qwen2.5-coder:14b')).toBe(false)
  })

  it('returns false for empty model list', () => {
    expect(isModelAvailable([], 'qwen2.5-coder:14b')).toBe(false)
  })
})

// ============================================================================
// createPreflightChecksNode tests — Ollama already running
// ============================================================================

describe('createPreflightChecksNode — Ollama already running', () => {
  it('returns ollamaAvailable=true when health check passes and model present', async () => {
    const node = createPreflightChecksNode(
      { requiredModel: 'qwen2.5-coder:14b' },
      {
        healthChecker: makeHealthChecker([['qwen2.5-coder:14b', 'llama3:8b']]),
        processSpawner: vi.fn(),
        modelPuller: vi.fn(),
        sleep: noopSleep,
      },
    )

    const result = await node()
    expect(result.ollamaAvailable).toBe(true)
    expect(result.ollamaModel).toBe('qwen2.5-coder:14b')
    expect(result.ollamaStarted).toBe(false)
    expect(result.modelPulled).toBe(false)
  })

  it('does not call processSpawner when Ollama is already up', async () => {
    const spawner = vi.fn()
    const node = createPreflightChecksNode(
      { requiredModel: 'qwen2.5-coder:14b' },
      {
        healthChecker: makeHealthChecker([['qwen2.5-coder:14b']]),
        processSpawner: spawner,
        modelPuller: vi.fn(),
        sleep: noopSleep,
      },
    )

    await node()
    expect(spawner).not.toHaveBeenCalled()
  })
})

// ============================================================================
// createPreflightChecksNode tests — Ollama needs start
// ============================================================================

describe('createPreflightChecksNode — Ollama needs start', () => {
  let spawner: ReturnType<typeof vi.fn>

  beforeEach(() => {
    spawner = vi.fn()
  })

  it('spawns ollama serve and polls until healthy', async () => {
    // First call: connection refused. Second call (after spawn): healthy.
    const node = createPreflightChecksNode(
      { requiredModel: 'qwen2.5-coder:14b', healthTimeoutMs: 5000, pollIntervalMs: 100 },
      {
        healthChecker: makeHealthChecker([
          new Error('ECONNREFUSED'),
          ['qwen2.5-coder:14b'],
        ]),
        processSpawner: spawner,
        modelPuller: vi.fn(),
        sleep: noopSleep,
      },
    )

    const result = await node()
    expect(spawner).toHaveBeenCalledOnce()
    expect(result.ollamaAvailable).toBe(true)
    expect(result.ollamaStarted).toBe(true)
    expect(result.ollamaModel).toBe('qwen2.5-coder:14b')
  })

  it('pulls model after spawn if model not present', async () => {
    const puller = vi.fn().mockResolvedValue(undefined)
    const node = createPreflightChecksNode(
      { requiredModel: 'qwen2.5-coder:14b', healthTimeoutMs: 5000, pollIntervalMs: 100 },
      {
        healthChecker: makeHealthChecker([
          new Error('ECONNREFUSED'),
          ['llama3:8b'], // Model not present after startup
        ]),
        processSpawner: spawner,
        modelPuller: puller,
        sleep: noopSleep,
      },
    )

    const result = await node()
    expect(puller).toHaveBeenCalledWith('qwen2.5-coder:14b')
    expect(result.ollamaStarted).toBe(true)
    expect(result.modelPulled).toBe(true)
    expect(result.ollamaAvailable).toBe(true)
  })
})

// ============================================================================
// createPreflightChecksNode tests — Ollama unavailable
// ============================================================================

describe('createPreflightChecksNode — Ollama unavailable', () => {
  it('returns ollamaAvailable=false when Ollama never comes up', async () => {
    const spawner = vi.fn()
    // All health checks fail
    const node = createPreflightChecksNode(
      { requiredModel: 'qwen2.5-coder:14b', healthTimeoutMs: 100, pollIntervalMs: 10 },
      {
        healthChecker: makeHealthChecker([new Error('ECONNREFUSED')]),
        processSpawner: spawner,
        modelPuller: vi.fn(),
        sleep: noopSleep,
      },
    )

    const result = await node()
    expect(result.ollamaAvailable).toBe(false)
    expect(result.ollamaModel).toBeNull()
    expect(result.ollamaStarted).toBe(true)
  })

  it('returns ollamaAvailable=false when spawn itself fails', async () => {
    const node = createPreflightChecksNode(
      { requiredModel: 'qwen2.5-coder:14b' },
      {
        healthChecker: makeHealthChecker([new Error('ECONNREFUSED')]),
        processSpawner: () => {
          throw new Error('spawn ENOENT')
        },
        modelPuller: vi.fn(),
        sleep: noopSleep,
      },
    )

    const result = await node()
    expect(result.ollamaAvailable).toBe(false)
    expect(result.ollamaStarted).toBe(false)
  })
})

// ============================================================================
// createPreflightChecksNode tests — model needs pull
// ============================================================================

describe('createPreflightChecksNode — model needs pull', () => {
  it('pulls model when Ollama is up but model not loaded', async () => {
    const puller = vi.fn().mockResolvedValue(undefined)
    const node = createPreflightChecksNode(
      { requiredModel: 'qwen2.5-coder:14b' },
      {
        healthChecker: makeHealthChecker([['llama3:8b']]),
        processSpawner: vi.fn(),
        modelPuller: puller,
        sleep: noopSleep,
      },
    )

    const result = await node()
    expect(puller).toHaveBeenCalledWith('qwen2.5-coder:14b')
    expect(result.ollamaAvailable).toBe(true)
    expect(result.ollamaModel).toBe('qwen2.5-coder:14b')
    expect(result.modelPulled).toBe(true)
    expect(result.ollamaStarted).toBe(false)
  })

  it('returns ollamaAvailable=true but ollamaModel=null when pull fails', async () => {
    const puller = vi.fn().mockRejectedValue(new Error('network timeout'))
    const node = createPreflightChecksNode(
      { requiredModel: 'qwen2.5-coder:14b' },
      {
        healthChecker: makeHealthChecker([['llama3:8b']]),
        processSpawner: vi.fn(),
        modelPuller: puller,
        sleep: noopSleep,
      },
    )

    const result = await node()
    expect(result.ollamaAvailable).toBe(true)
    expect(result.ollamaModel).toBeNull()
    expect(result.modelPulled).toBe(false)
  })
})

// ============================================================================
// Idempotency
// ============================================================================

describe('createPreflightChecksNode — idempotency', () => {
  it('returns same result when called multiple times', async () => {
    const node = createPreflightChecksNode(
      { requiredModel: 'qwen2.5-coder:14b' },
      {
        healthChecker: makeHealthChecker([['qwen2.5-coder:14b']]),
        processSpawner: vi.fn(),
        modelPuller: vi.fn(),
        sleep: noopSleep,
      },
    )

    const result1 = await node()
    const result2 = await node()
    expect(result1).toEqual(result2)
    expect(result1.ollamaAvailable).toBe(true)
  })
})

// ============================================================================
// Config defaults
// ============================================================================

describe('createPreflightChecksNode — config defaults', () => {
  it('uses default config values when none provided', async () => {
    const node = createPreflightChecksNode(
      {},
      {
        healthChecker: makeHealthChecker([['qwen2.5-coder:14b']]),
        processSpawner: vi.fn(),
        modelPuller: vi.fn(),
        sleep: noopSleep,
      },
    )

    const result = await node()
    expect(result.ollamaAvailable).toBe(true)
    expect(result.ollamaModel).toBe('qwen2.5-coder:14b')
  })
})
