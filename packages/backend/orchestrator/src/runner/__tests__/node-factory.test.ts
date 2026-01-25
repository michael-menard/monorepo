import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ZodError } from 'zod'
import { createInitialState, type GraphState } from '../../state/index.js'
import { createNodeMetricsCollector } from '../metrics.js'
import { createLLMNode, createNode, createSimpleNode, createToolNode } from '../node-factory.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

describe('createNode', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('configuration validation', () => {
    it('throws error for empty node name', () => {
      expect(() => createNode({ name: '' }, async () => ({}))).toThrow('Node name is required')
    })

    it('throws error for whitespace-only node name', () => {
      expect(() => createNode({ name: '   ' }, async () => ({}))).toThrow('Node name is required')
    })

    it('throws error for invalid maxAttempts', () => {
      expect(() =>
        createNode({ name: 'test', retry: { maxAttempts: 0 } }, async () => ({})),
      ).toThrow('Invalid retry configuration: maxAttempts must be at least 1')
    })

    it('throws error for negative backoffMs', () => {
      expect(() =>
        createNode({ name: 'test', retry: { backoffMs: -1 } }, async () => ({})),
      ).toThrow('Invalid retry configuration: backoffMs must be non-negative')
    })

    it('accepts valid configuration', () => {
      expect(() =>
        createNode(
          { name: 'test', retry: { maxAttempts: 3, backoffMs: 1000 } },
          async () => ({}),
        ),
      ).not.toThrow()
    })
  })

  describe('happy path execution', () => {
    it('executes node and returns result', async () => {
      const state = createInitialState({ epicPrefix: 'wrkf', storyId: 'wrkf-1020' })
      const node = createNode({ name: 'test-node' }, async () => ({
        routingFlags: { proceed: true },
      }))

      const result = await node(state)

      expect(result.routingFlags).toEqual({ proceed: true })
    })

    it('supports sync implementations', async () => {
      const state = createInitialState({ epicPrefix: 'wrkf', storyId: 'wrkf-1020' })
      const node = createNode({ name: 'test-node' }, () => ({
        routingFlags: { proceed: true },
      }))

      const result = await node(state)

      expect(result.routingFlags).toEqual({ proceed: true })
    })

    it('passes state and config to implementation', async () => {
      const state = createInitialState({ epicPrefix: 'wrkf', storyId: 'wrkf-1020' })
      const config = { tags: ['test'] }
      const implementation = vi.fn().mockResolvedValue({ routingFlags: { proceed: true } })

      const node = createNode({ name: 'test-node' }, implementation)
      await node(state, config)

      expect(implementation).toHaveBeenCalledWith(state, config)
    })
  })

  describe('error handling', () => {
    it('captures error in state.errors', async () => {
      const state = createInitialState({ epicPrefix: 'wrkf', storyId: 'wrkf-1020' })
      const node = createNode(
        { name: 'test-node', retry: { maxAttempts: 1 } },
        async () => {
          throw new Error('Test error')
        },
      )

      const result = await node(state)

      expect(result.errors).toBeDefined()
      expect(result.errors).toHaveLength(1)
      expect(result.errors?.[0].message).toBe('Test error')
    })

    it('does not throw to caller', async () => {
      const state = createInitialState({ epicPrefix: 'wrkf', storyId: 'wrkf-1020' })
      const node = createNode(
        { name: 'test-node', retry: { maxAttempts: 1 } },
        async () => {
          throw new Error('Test error')
        },
      )

      await expect(node(state)).resolves.toBeDefined()
    })

    it('sets blocked flag on non-retryable error', async () => {
      const state = createInitialState({ epicPrefix: 'wrkf', storyId: 'wrkf-1020' })
      const node = createNode(
        { name: 'test-node', retry: { maxAttempts: 1 } },
        async () => {
          throw new ZodError([])
        },
      )

      const result = await node(state)

      expect(result.errors?.[0].recoverable).toBe(false)
    })

    it('throws error when handler returns undefined', async () => {
      const state = createInitialState({ epicPrefix: 'wrkf', storyId: 'wrkf-1020' })
      const node = createNode(
        { name: 'test-node', retry: { maxAttempts: 1 } },
        async () => undefined as unknown as Partial<GraphState>,
      )

      const result = await node(state)

      expect(result.errors).toBeDefined()
      expect(result.errors?.[0].message).toContain('must return a state update')
    })
  })

  describe('retry behavior', () => {
    it('retries on retryable errors', async () => {
      const state = createInitialState({ epicPrefix: 'wrkf', storyId: 'wrkf-1020' })
      const implementation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockResolvedValue({ routingFlags: { proceed: true } })

      const node = createNode(
        { name: 'test-node', retry: { maxAttempts: 2, jitterFactor: 0 } },
        implementation,
      )

      const promise = node(state)
      await vi.advanceTimersByTimeAsync(1000)
      const result = await promise

      expect(implementation).toHaveBeenCalledTimes(2)
      expect(result.routingFlags).toEqual({ proceed: true })
    })

    it('sets blocked on retry exhaustion', async () => {
      const state = createInitialState({ epicPrefix: 'wrkf', storyId: 'wrkf-1020' })
      let callCount = 0
      const node = createNode(
        { name: 'test-node', retry: { maxAttempts: 2, jitterFactor: 0 } },
        async () => {
          callCount++
          throw new Error('Always fails')
        },
      )

      const promise = node(state)
      await vi.advanceTimersByTimeAsync(1000)
      const result = await promise

      expect(callCount).toBe(2)
      expect(result.routingFlags?.blocked).toBe(true)
    })

    it('does not retry non-retryable errors', async () => {
      const state = createInitialState({ epicPrefix: 'wrkf', storyId: 'wrkf-1020' })
      const implementation = vi.fn().mockRejectedValue(new ZodError([]))

      const node = createNode(
        { name: 'test-node', retry: { maxAttempts: 3, jitterFactor: 0 } },
        implementation,
      )

      await node(state)

      expect(implementation).toHaveBeenCalledTimes(1)
    })

    it('calls onRetryAttempt callback', async () => {
      const state = createInitialState({ epicPrefix: 'wrkf', storyId: 'wrkf-1020' })
      const onRetryAttempt = vi.fn()

      const node = createNode(
        {
          name: 'test-node',
          retry: { maxAttempts: 2, jitterFactor: 0 },
          onRetryAttempt,
        },
        vi.fn()
          .mockRejectedValueOnce(new Error('Fail'))
          .mockResolvedValue({ routingFlags: { proceed: true } }),
      )

      const promise = node(state)
      await vi.advanceTimersByTimeAsync(1000)
      await promise

      expect(onRetryAttempt).toHaveBeenCalledWith(1, expect.any(Error), expect.any(Number))
    })
  })

  describe('timeout behavior', () => {
    it('times out slow operations', async () => {
      const state = createInitialState({ epicPrefix: 'wrkf', storyId: 'wrkf-1020' })

      const node = createNode(
        { name: 'test-node', retry: { maxAttempts: 1, timeoutMs: 1000 } },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 5000))
          return { routingFlags: { proceed: true } }
        },
      )

      const promise = node(state)
      await vi.advanceTimersByTimeAsync(1000)
      const result = await promise

      expect(result.errors).toBeDefined()
      expect(result.errors?.[0].message).toContain('timeout')
    })

    it('calls onTimeout callback', async () => {
      const state = createInitialState({ epicPrefix: 'wrkf', storyId: 'wrkf-1020' })
      const onTimeout = vi.fn()

      const node = createNode(
        {
          name: 'test-node',
          retry: { maxAttempts: 1, timeoutMs: 1000 },
          onTimeout,
        },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 5000))
          return { routingFlags: { proceed: true } }
        },
      )

      const promise = node(state)
      await vi.advanceTimersByTimeAsync(1000)
      await promise

      expect(onTimeout).toHaveBeenCalledWith('test-node', expect.any(Object))
    })
  })

  describe('circuit breaker behavior', () => {
    it('opens circuit after threshold failures', async () => {
      const state = createInitialState({ epicPrefix: 'wrkf', storyId: 'wrkf-1020' })

      const node = createNode(
        {
          name: 'test-node',
          retry: { maxAttempts: 1 },
          circuitBreaker: { failureThreshold: 2, recoveryTimeoutMs: 60000 },
        },
        async () => {
          throw new Error('Always fails')
        },
      )

      // First two failures
      await node(state)
      await node(state)

      // Third call should be blocked by circuit breaker
      const result = await node(state)

      expect(result.errors?.[0].code).toBe('CIRCUIT_OPEN')
    })

    it('allows recovery after timeout', async () => {
      const state = createInitialState({ epicPrefix: 'wrkf', storyId: 'wrkf-1020' })
      let callCount = 0

      const node = createNode(
        {
          name: 'test-node',
          retry: { maxAttempts: 1 },
          circuitBreaker: { failureThreshold: 2, recoveryTimeoutMs: 1000 },
        },
        async () => {
          callCount++
          if (callCount <= 2) {
            throw new Error('Fail')
          }
          return { routingFlags: { proceed: true } }
        },
      )

      // Open the circuit
      await node(state)
      await node(state)

      // Wait for recovery
      await vi.advanceTimersByTimeAsync(1000)

      // Should be able to execute again
      const result = await node(state)

      expect(result.routingFlags?.proceed).toBe(true)
    })
  })
})

describe('createSimpleNode', () => {
  it('creates node with single attempt', async () => {
    const state = createInitialState({ epicPrefix: 'wrkf', storyId: 'wrkf-1020' })
    const implementation = vi.fn().mockResolvedValue({ routingFlags: { proceed: true } })

    const node = createSimpleNode('simple-node', implementation)
    await node(state)

    expect(implementation).toHaveBeenCalledTimes(1)
  })
})

describe('createLLMNode', () => {
  it('creates node with LLM retry config', async () => {
    const state = createInitialState({ epicPrefix: 'wrkf', storyId: 'wrkf-1020' })

    // Just verify it creates successfully and executes - skip timing tests
    const implementation = vi.fn().mockResolvedValue({ routingFlags: { proceed: true } })

    const node = createLLMNode('llm-node', implementation)
    const result = await node(state)

    expect(implementation).toHaveBeenCalledTimes(1)
    expect(result.routingFlags).toEqual({ proceed: true })
  })
})

describe('createToolNode', () => {
  it('creates node with tool retry config', async () => {
    const state = createInitialState({ epicPrefix: 'wrkf', storyId: 'wrkf-1020' })

    // Just verify it creates successfully and executes
    const implementation = vi.fn().mockResolvedValue({ routingFlags: { proceed: true } })

    const node = createToolNode('tool-node', implementation)
    const result = await node(state)

    expect(implementation).toHaveBeenCalledTimes(1)
    expect(result.routingFlags).toEqual({ proceed: true })
  })
})

// WRKF-1021: Metrics collector integration tests (AC-6, AC-7, AC-11)
describe('metricsCollector integration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('records success metrics on successful execution (AC-6)', async () => {
    const state = createInitialState({ epicPrefix: 'wrkf', storyId: 'wrkf-1021' })
    const collector = createNodeMetricsCollector()

    const node = createNode(
      { name: 'test-node', metricsCollector: collector },
      async () => ({ routingFlags: { proceed: true } }),
    )

    await node(state)

    const metrics = collector.getNodeMetrics('test-node')
    expect(metrics.totalExecutions).toBe(1)
    expect(metrics.successCount).toBe(1)
    expect(metrics.failureCount).toBe(0)
    expect(metrics.lastExecutionMs).toBeGreaterThanOrEqual(0)
  })

  it('records failure metrics on failed execution (AC-6)', async () => {
    const state = createInitialState({ epicPrefix: 'wrkf', storyId: 'wrkf-1021' })
    const collector = createNodeMetricsCollector()

    const node = createNode(
      { name: 'test-node', retry: { maxAttempts: 1 }, metricsCollector: collector },
      async () => {
        throw new Error('Test failure')
      },
    )

    await node(state)

    const metrics = collector.getNodeMetrics('test-node')
    expect(metrics.totalExecutions).toBe(1)
    expect(metrics.successCount).toBe(0)
    expect(metrics.failureCount).toBe(1)
  })

  it('records retry metrics on retry attempts (AC-6)', async () => {
    const state = createInitialState({ epicPrefix: 'wrkf', storyId: 'wrkf-1021' })
    const collector = createNodeMetricsCollector()

    const implementation = vi
      .fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockResolvedValue({ routingFlags: { proceed: true } })

    const node = createNode(
      {
        name: 'test-node',
        retry: { maxAttempts: 2, jitterFactor: 0 },
        metricsCollector: collector,
      },
      implementation,
    )

    const promise = node(state)
    await vi.advanceTimersByTimeAsync(1000)
    await promise

    const metrics = collector.getNodeMetrics('test-node')
    expect(metrics.retryCount).toBe(1) // One retry attempt was made
    expect(metrics.successCount).toBe(1) // Final success
  })

  it('works without metricsCollector (AC-7)', async () => {
    const state = createInitialState({ epicPrefix: 'wrkf', storyId: 'wrkf-1021' })

    // No metricsCollector provided - should still work
    const node = createNode(
      { name: 'test-node' },
      async () => ({ routingFlags: { proceed: true } }),
    )

    const result = await node(state)

    expect(result.routingFlags?.proceed).toBe(true)
  })

  it('tracks error categories correctly (AC-11)', async () => {
    const state = createInitialState({ epicPrefix: 'wrkf', storyId: 'wrkf-1021' })
    const collector = createNodeMetricsCollector()

    // Timeout error
    const timeoutNode = createNode(
      {
        name: 'timeout-node',
        retry: { maxAttempts: 1, timeoutMs: 100 },
        metricsCollector: collector,
      },
      async () => {
        await new Promise(resolve => setTimeout(resolve, 5000))
        return { routingFlags: { proceed: true } }
      },
    )

    const promise = timeoutNode(state)
    await vi.advanceTimersByTimeAsync(100)
    await promise

    const metrics = collector.getNodeMetrics('timeout-node')
    expect(metrics.failureCount).toBe(1)
    expect(metrics.timeoutErrors).toBe(1)
  })

  it('tracks metrics across multiple executions (AC-11)', async () => {
    const state = createInitialState({ epicPrefix: 'wrkf', storyId: 'wrkf-1021' })
    const collector = createNodeMetricsCollector()

    const node = createNode(
      { name: 'multi-exec-node', metricsCollector: collector },
      async () => ({ routingFlags: { proceed: true } }),
    )

    // Execute multiple times
    await node(state)
    await node(state)
    await node(state)

    const metrics = collector.getNodeMetrics('multi-exec-node')
    expect(metrics.totalExecutions).toBe(3)
    expect(metrics.successCount).toBe(3)
    expect(metrics.avgExecutionMs).toBeGreaterThanOrEqual(0)
  })
})
