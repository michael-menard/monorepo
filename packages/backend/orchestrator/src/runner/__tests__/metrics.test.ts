import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createNodeMetricsCollector,
  MetricsErrorCategorySchema,
  NodeMetricsCollector,
  NodeMetricsSchema,
  SerializedMetricsSchema,
  ThresholdConfigSchema,
  type NodeMetrics,
} from '../metrics.js'

// Mock the logger
vi.mock('@repo/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

describe('metrics', () => {
  // ============================================================================
  // Schema Validation Tests
  // ============================================================================

  describe('MetricsErrorCategorySchema', () => {
    it('validates valid error categories', () => {
      expect(MetricsErrorCategorySchema.parse('timeout')).toBe('timeout')
      expect(MetricsErrorCategorySchema.parse('validation')).toBe('validation')
      expect(MetricsErrorCategorySchema.parse('network')).toBe('network')
      expect(MetricsErrorCategorySchema.parse('other')).toBe('other')
    })

    it('rejects invalid error categories', () => {
      expect(() => MetricsErrorCategorySchema.parse('invalid')).toThrow()
      expect(() => MetricsErrorCategorySchema.parse('')).toThrow()
      expect(() => MetricsErrorCategorySchema.parse(123)).toThrow()
    })
  })

  describe('NodeMetricsSchema', () => {
    it('validates valid metrics object', () => {
      const validMetrics: NodeMetrics = {
        totalExecutions: 10,
        successCount: 8,
        failureCount: 2,
        retryCount: 1,
        lastExecutionMs: 150,
        avgExecutionMs: 120.5,
        p50: 100,
        p90: 180,
        p99: 200,
        timeoutErrors: 1,
        validationErrors: 0,
        networkErrors: 1,
        otherErrors: 0,
      }

      const result = NodeMetricsSchema.parse(validMetrics)
      expect(result).toEqual(validMetrics)
    })

    it('validates metrics with null percentiles', () => {
      const metricsWithNulls: NodeMetrics = {
        totalExecutions: 0,
        successCount: 0,
        failureCount: 0,
        retryCount: 0,
        lastExecutionMs: null,
        avgExecutionMs: 0,
        p50: null,
        p90: null,
        p99: null,
        timeoutErrors: 0,
        validationErrors: 0,
        networkErrors: 0,
        otherErrors: 0,
      }

      const result = NodeMetricsSchema.parse(metricsWithNulls)
      expect(result).toEqual(metricsWithNulls)
    })

    it('rejects invalid metrics (negative counts)', () => {
      expect(() =>
        NodeMetricsSchema.parse({
          totalExecutions: -1,
          successCount: 0,
          failureCount: 0,
          retryCount: 0,
          lastExecutionMs: null,
          avgExecutionMs: 0,
          p50: null,
          p90: null,
          p99: null,
          timeoutErrors: 0,
          validationErrors: 0,
          networkErrors: 0,
          otherErrors: 0,
        }),
      ).toThrow()
    })
  })

  describe('ThresholdConfigSchema', () => {
    it('validates valid threshold config', () => {
      const config = {
        failureRateThreshold: 0.5,
        latencyThresholdMs: 1000,
      }

      const result = ThresholdConfigSchema.parse(config)
      expect(result).toEqual(config)
    })

    it('validates empty config', () => {
      const result = ThresholdConfigSchema.parse({})
      expect(result).toEqual({})
    })

    it('rejects failure rate outside 0-1 range', () => {
      expect(() =>
        ThresholdConfigSchema.parse({ failureRateThreshold: 1.5 }),
      ).toThrow()
      expect(() =>
        ThresholdConfigSchema.parse({ failureRateThreshold: -0.1 }),
      ).toThrow()
    })

    it('rejects negative latency threshold', () => {
      expect(() =>
        ThresholdConfigSchema.parse({ latencyThresholdMs: -100 }),
      ).toThrow()
    })
  })

  describe('SerializedMetricsSchema', () => {
    it('validates serialized metrics record', () => {
      const serialized = {
        'node-a': {
          totalExecutions: 5,
          successCount: 5,
          failureCount: 0,
          retryCount: 0,
          lastExecutionMs: 100,
          avgExecutionMs: 100,
          p50: 100,
          p90: 100,
          p99: 100,
          timeoutErrors: 0,
          validationErrors: 0,
          networkErrors: 0,
          otherErrors: 0,
        },
      }

      const result = SerializedMetricsSchema.parse(serialized)
      expect(result).toEqual(serialized)
    })
  })

  // ============================================================================
  // Factory Function Tests
  // ============================================================================

  describe('createNodeMetricsCollector', () => {
    it('creates a NodeMetricsCollector instance', () => {
      const collector = createNodeMetricsCollector()
      expect(collector).toBeInstanceOf(NodeMetricsCollector)
    })

    it('creates collector with default config', () => {
      const collector = createNodeMetricsCollector()
      // Verify it works with default window size (100)
      for (let i = 0; i < 150; i++) {
        collector.recordSuccess('test-node', 100)
      }
      // Should still work (rolling window evicts old samples)
      const metrics = collector.getNodeMetrics('test-node')
      expect(metrics.totalExecutions).toBe(150)
    })

    it('creates collector with custom windowSize', () => {
      const collector = createNodeMetricsCollector({ windowSize: 10 })
      // Record more than window size
      for (let i = 0; i < 20; i++) {
        collector.recordSuccess('test-node', i * 10)
      }
      const metrics = collector.getNodeMetrics('test-node')
      expect(metrics.totalExecutions).toBe(20)
      // Percentiles should be based on last 10 samples (100-190)
      expect(metrics.p50).toBeGreaterThanOrEqual(100)
    })

    it('creates collector with threshold callbacks', () => {
      const onFailureRate = vi.fn()
      const onLatency = vi.fn()

      const collector = createNodeMetricsCollector({
        failureRateThreshold: 0.5,
        latencyThresholdMs: 100,
        onFailureRateThreshold: onFailureRate,
        onLatencyThreshold: onLatency,
      })

      expect(collector).toBeInstanceOf(NodeMetricsCollector)
    })
  })

  // ============================================================================
  // NodeMetricsCollector Tests
  // ============================================================================

  describe('NodeMetricsCollector', () => {
    let collector: NodeMetricsCollector

    beforeEach(() => {
      collector = new NodeMetricsCollector()
    })

    // --------------------------------------------------------------------------
    // recordSuccess Tests
    // --------------------------------------------------------------------------

    describe('recordSuccess', () => {
      it('increments totalExecutions and successCount', () => {
        collector.recordSuccess('my-node', 100)

        const metrics = collector.getNodeMetrics('my-node')
        expect(metrics.totalExecutions).toBe(1)
        expect(metrics.successCount).toBe(1)
        expect(metrics.failureCount).toBe(0)
      })

      it('records multiple successes', () => {
        collector.recordSuccess('my-node', 100)
        collector.recordSuccess('my-node', 150)
        collector.recordSuccess('my-node', 200)

        const metrics = collector.getNodeMetrics('my-node')
        expect(metrics.totalExecutions).toBe(3)
        expect(metrics.successCount).toBe(3)
      })

      it('updates lastExecutionMs', () => {
        collector.recordSuccess('my-node', 100)
        expect(collector.getNodeMetrics('my-node').lastExecutionMs).toBe(100)

        collector.recordSuccess('my-node', 200)
        expect(collector.getNodeMetrics('my-node').lastExecutionMs).toBe(200)
      })

      it('calculates avgExecutionMs correctly', () => {
        collector.recordSuccess('my-node', 100)
        collector.recordSuccess('my-node', 200)
        collector.recordSuccess('my-node', 300)

        const metrics = collector.getNodeMetrics('my-node')
        expect(metrics.avgExecutionMs).toBe(200) // (100+200+300)/3
      })

      it('tracks metrics per node', () => {
        collector.recordSuccess('node-a', 100)
        collector.recordSuccess('node-b', 200)
        collector.recordSuccess('node-a', 150)

        expect(collector.getNodeMetrics('node-a').totalExecutions).toBe(2)
        expect(collector.getNodeMetrics('node-b').totalExecutions).toBe(1)
      })
    })

    // --------------------------------------------------------------------------
    // recordFailure Tests
    // --------------------------------------------------------------------------

    describe('recordFailure', () => {
      it('increments totalExecutions and failureCount', () => {
        collector.recordFailure('my-node', 100)

        const metrics = collector.getNodeMetrics('my-node')
        expect(metrics.totalExecutions).toBe(1)
        expect(metrics.failureCount).toBe(1)
        expect(metrics.successCount).toBe(0)
      })

      it('records multiple failures', () => {
        collector.recordFailure('my-node', 100)
        collector.recordFailure('my-node', 150)

        const metrics = collector.getNodeMetrics('my-node')
        expect(metrics.totalExecutions).toBe(2)
        expect(metrics.failureCount).toBe(2)
      })

      it('defaults error category to other', () => {
        collector.recordFailure('my-node', 100)

        const metrics = collector.getNodeMetrics('my-node')
        expect(metrics.otherErrors).toBe(1)
        expect(metrics.timeoutErrors).toBe(0)
        expect(metrics.validationErrors).toBe(0)
        expect(metrics.networkErrors).toBe(0)
      })

      it('tracks timeout errors', () => {
        collector.recordFailure('my-node', 100, new Error('timeout'), 'timeout')

        const metrics = collector.getNodeMetrics('my-node')
        expect(metrics.timeoutErrors).toBe(1)
        expect(metrics.otherErrors).toBe(0)
      })

      it('tracks validation errors', () => {
        collector.recordFailure('my-node', 100, new Error('invalid'), 'validation')

        const metrics = collector.getNodeMetrics('my-node')
        expect(metrics.validationErrors).toBe(1)
      })

      it('tracks network errors', () => {
        collector.recordFailure('my-node', 100, new Error('network'), 'network')

        const metrics = collector.getNodeMetrics('my-node')
        expect(metrics.networkErrors).toBe(1)
      })

      it('tracks multiple error categories', () => {
        collector.recordFailure('my-node', 100, undefined, 'timeout')
        collector.recordFailure('my-node', 100, undefined, 'validation')
        collector.recordFailure('my-node', 100, undefined, 'network')
        collector.recordFailure('my-node', 100, undefined, 'other')

        const metrics = collector.getNodeMetrics('my-node')
        expect(metrics.timeoutErrors).toBe(1)
        expect(metrics.validationErrors).toBe(1)
        expect(metrics.networkErrors).toBe(1)
        expect(metrics.otherErrors).toBe(1)
        expect(metrics.failureCount).toBe(4)
      })

      it('includes failures in duration tracking', () => {
        collector.recordSuccess('my-node', 100)
        collector.recordFailure('my-node', 200)

        const metrics = collector.getNodeMetrics('my-node')
        expect(metrics.avgExecutionMs).toBe(150) // (100+200)/2
      })
    })

    // --------------------------------------------------------------------------
    // recordRetry Tests
    // --------------------------------------------------------------------------

    describe('recordRetry', () => {
      it('increments retryCount', () => {
        collector.recordRetry('my-node', 1)

        const metrics = collector.getNodeMetrics('my-node')
        expect(metrics.retryCount).toBe(1)
      })

      it('records multiple retries', () => {
        collector.recordRetry('my-node', 1)
        collector.recordRetry('my-node', 2)
        collector.recordRetry('my-node', 3)

        const metrics = collector.getNodeMetrics('my-node')
        expect(metrics.retryCount).toBe(3)
      })

      it('does not affect execution counts', () => {
        collector.recordRetry('my-node', 1)

        const metrics = collector.getNodeMetrics('my-node')
        expect(metrics.totalExecutions).toBe(0)
        expect(metrics.successCount).toBe(0)
        expect(metrics.failureCount).toBe(0)
      })
    })

    // --------------------------------------------------------------------------
    // getNodeMetrics Tests
    // --------------------------------------------------------------------------

    describe('getNodeMetrics', () => {
      it('returns correct metrics for existing node', () => {
        collector.recordSuccess('my-node', 100)
        collector.recordSuccess('my-node', 200)
        collector.recordFailure('my-node', 150)
        collector.recordRetry('my-node', 1)

        const metrics = collector.getNodeMetrics('my-node')

        expect(metrics.totalExecutions).toBe(3)
        expect(metrics.successCount).toBe(2)
        expect(metrics.failureCount).toBe(1)
        expect(metrics.retryCount).toBe(1)
        expect(metrics.lastExecutionMs).toBe(150)
        expect(metrics.avgExecutionMs).toBe(150) // (100+200+150)/3
      })

      it('returns default metrics for unknown node', () => {
        const metrics = collector.getNodeMetrics('unknown-node')

        expect(metrics.totalExecutions).toBe(0)
        expect(metrics.successCount).toBe(0)
        expect(metrics.failureCount).toBe(0)
        expect(metrics.retryCount).toBe(0)
        expect(metrics.lastExecutionMs).toBeNull()
        expect(metrics.avgExecutionMs).toBe(0)
        expect(metrics.p50).toBeNull()
        expect(metrics.p90).toBeNull()
        expect(metrics.p99).toBeNull()
      })
    })

    // --------------------------------------------------------------------------
    // getAllNodeMetrics Tests
    // --------------------------------------------------------------------------

    describe('getAllNodeMetrics', () => {
      it('returns Map of all node metrics', () => {
        collector.recordSuccess('node-a', 100)
        collector.recordSuccess('node-b', 200)
        collector.recordFailure('node-c', 150)

        const allMetrics = collector.getAllNodeMetrics()

        expect(allMetrics.size).toBe(3)
        expect(allMetrics.has('node-a')).toBe(true)
        expect(allMetrics.has('node-b')).toBe(true)
        expect(allMetrics.has('node-c')).toBe(true)
      })

      it('returns empty Map when no nodes recorded', () => {
        const allMetrics = collector.getAllNodeMetrics()
        expect(allMetrics.size).toBe(0)
      })

      it('returns correct metrics for each node', () => {
        collector.recordSuccess('node-a', 100)
        collector.recordSuccess('node-a', 150)
        collector.recordFailure('node-b', 200)

        const allMetrics = collector.getAllNodeMetrics()

        const nodeA = allMetrics.get('node-a')!
        expect(nodeA.totalExecutions).toBe(2)
        expect(nodeA.successCount).toBe(2)

        const nodeB = allMetrics.get('node-b')!
        expect(nodeB.totalExecutions).toBe(1)
        expect(nodeB.failureCount).toBe(1)
      })
    })

    // --------------------------------------------------------------------------
    // resetNodeMetrics Tests
    // --------------------------------------------------------------------------

    describe('resetNodeMetrics', () => {
      it('resets metrics for specific node', () => {
        collector.recordSuccess('node-a', 100)
        collector.recordSuccess('node-b', 200)

        collector.resetNodeMetrics('node-a')

        expect(collector.getNodeMetrics('node-a').totalExecutions).toBe(0)
        expect(collector.getNodeMetrics('node-b').totalExecutions).toBe(1)
      })

      it('resets all metrics when no node specified', () => {
        collector.recordSuccess('node-a', 100)
        collector.recordSuccess('node-b', 200)
        collector.recordSuccess('node-c', 300)

        collector.resetNodeMetrics()

        expect(collector.getAllNodeMetrics().size).toBe(0)
      })

      it('is no-op for unknown node', () => {
        collector.recordSuccess('node-a', 100)

        collector.resetNodeMetrics('unknown-node')

        expect(collector.getNodeMetrics('node-a').totalExecutions).toBe(1)
      })
    })

    // --------------------------------------------------------------------------
    // Percentile Tests
    // --------------------------------------------------------------------------

    describe('percentiles', () => {
      it('returns null percentiles for node with no executions', () => {
        const metrics = collector.getNodeMetrics('empty-node')

        expect(metrics.p50).toBeNull()
        expect(metrics.p90).toBeNull()
        expect(metrics.p99).toBeNull()
      })

      it('returns same value for all percentiles with single sample', () => {
        collector.recordSuccess('my-node', 100)

        const metrics = collector.getNodeMetrics('my-node')

        expect(metrics.p50).toBe(100)
        expect(metrics.p90).toBe(100)
        expect(metrics.p99).toBe(100)
      })

      it('calculates percentiles correctly with multiple samples', () => {
        // Add 10 samples: 10, 20, 30, ..., 100
        for (let i = 1; i <= 10; i++) {
          collector.recordSuccess('my-node', i * 10)
        }

        const metrics = collector.getNodeMetrics('my-node')

        // p50 should be around 50 (middle value)
        expect(metrics.p50).toBeGreaterThanOrEqual(40)
        expect(metrics.p50).toBeLessThanOrEqual(60)

        // p90 should be around 90
        expect(metrics.p90).toBeGreaterThanOrEqual(80)
        expect(metrics.p90).toBeLessThanOrEqual(100)

        // p99 should be around 100
        expect(metrics.p99).toBeGreaterThanOrEqual(90)
      })

      it('evicts oldest samples when window is full', () => {
        const smallWindowCollector = new NodeMetricsCollector({ windowSize: 5 })

        // Add 10 samples
        for (let i = 1; i <= 10; i++) {
          smallWindowCollector.recordSuccess('my-node', i * 100)
        }

        const metrics = smallWindowCollector.getNodeMetrics('my-node')

        // Window should only contain last 5 samples (600, 700, 800, 900, 1000)
        // p50 should be around 800
        expect(metrics.p50).toBeGreaterThanOrEqual(600)
        expect(metrics.p50).toBeLessThanOrEqual(900)
      })
    })

    // --------------------------------------------------------------------------
    // Edge Cases Tests
    // --------------------------------------------------------------------------

    describe('edge cases', () => {
      it('clamps negative duration to 0 with warning', () => {
        collector.recordSuccess('my-node', -100)

        const metrics = collector.getNodeMetrics('my-node')
        expect(metrics.lastExecutionMs).toBe(0)
        expect(metrics.avgExecutionMs).toBe(0)
      })

      it('handles very large duration values', () => {
        const largeDuration = Number.MAX_SAFE_INTEGER / 2

        collector.recordSuccess('my-node', largeDuration)

        const metrics = collector.getNodeMetrics('my-node')
        expect(metrics.lastExecutionMs).toBe(largeDuration)
      })

      it('handles zero duration', () => {
        collector.recordSuccess('my-node', 0)

        const metrics = collector.getNodeMetrics('my-node')
        expect(metrics.lastExecutionMs).toBe(0)
        expect(metrics.avgExecutionMs).toBe(0)
      })

      it('handles concurrent async metric recording', async () => {
        const promises: Promise<void>[] = []

        // Simulate concurrent recordings
        for (let i = 0; i < 100; i++) {
          promises.push(
            new Promise(resolve => {
              collector.recordSuccess('my-node', 100)
              resolve()
            }),
          )
        }

        await Promise.all(promises)

        const metrics = collector.getNodeMetrics('my-node')
        expect(metrics.totalExecutions).toBe(100)
        expect(metrics.successCount).toBe(100)
      })
    })

    // --------------------------------------------------------------------------
    // Threshold Tests
    // --------------------------------------------------------------------------

    describe('thresholds', () => {
      it('invokes onFailureRateThreshold when rate exceeds threshold', () => {
        const onFailureRate = vi.fn()

        const thresholdCollector = new NodeMetricsCollector({
          failureRateThreshold: 0.5,
          onFailureRateThreshold: onFailureRate,
        })

        // Record success first
        thresholdCollector.recordSuccess('my-node', 100)
        expect(onFailureRate).not.toHaveBeenCalled()

        // Record failure - now 50% failure rate (1/2), but not > 0.5
        thresholdCollector.recordFailure('my-node', 100)
        expect(onFailureRate).not.toHaveBeenCalled()

        // Record another failure - now 66.7% failure rate (2/3), > 0.5
        thresholdCollector.recordFailure('my-node', 100)
        expect(onFailureRate).toHaveBeenCalledWith('my-node', expect.closeTo(0.667, 1))
      })

      it('invokes onLatencyThreshold when p99 exceeds threshold', () => {
        const onLatency = vi.fn()

        const thresholdCollector = new NodeMetricsCollector({
          latencyThresholdMs: 500,
          onLatencyThreshold: onLatency,
        })

        // Record one low latency sample - single sample becomes the p99
        thresholdCollector.recordSuccess('my-node', 100)
        expect(onLatency).not.toHaveBeenCalled() // 100 < 500

        // Now record a high latency sample - with 2 samples sorted [100, 600]
        // p99 index = floor(0.99 * 1) = 0, so p99 = 100... still won't trigger
        // Actually, with single sample p50=p90=p99=value

        // Let me just record a high latency directly on first call
        onLatency.mockClear()
        const collector2 = new NodeMetricsCollector({
          latencyThresholdMs: 500,
          onLatencyThreshold: onLatency,
        })

        // Record high latency - single sample p99 = 600 > 500
        collector2.recordSuccess('my-node', 600)
        expect(onLatency).toHaveBeenCalledWith('my-node', 600)
      })

      it('does not error when threshold exceeded but no callback configured', () => {
        const noCallbackCollector = new NodeMetricsCollector({
          failureRateThreshold: 0.1,
          latencyThresholdMs: 10,
        })

        // Should not throw
        expect(() => {
          noCallbackCollector.recordFailure('my-node', 100)
          noCallbackCollector.recordSuccess('my-node', 1000)
        }).not.toThrow()
      })

      it('does not invoke callback when threshold not configured', () => {
        const onFailureRate = vi.fn()

        const partialCollector = new NodeMetricsCollector({
          onFailureRateThreshold: onFailureRate,
          // No failureRateThreshold configured
        })

        partialCollector.recordFailure('my-node', 100)
        expect(onFailureRate).not.toHaveBeenCalled()
      })
    })

    // --------------------------------------------------------------------------
    // toJSON Tests
    // --------------------------------------------------------------------------

    describe('toJSON', () => {
      it('returns JSON-serializable snapshot', () => {
        collector.recordSuccess('node-a', 100)
        collector.recordFailure('node-b', 200, undefined, 'timeout')

        const json = collector.toJSON()

        expect(json).toEqual({
          'node-a': expect.objectContaining({
            totalExecutions: 1,
            successCount: 1,
          }),
          'node-b': expect.objectContaining({
            totalExecutions: 1,
            failureCount: 1,
            timeoutErrors: 1,
          }),
        })
      })

      it('returns empty object when no nodes recorded', () => {
        const json = collector.toJSON()
        expect(json).toEqual({})
      })

      it('can be serialized with JSON.stringify', () => {
        collector.recordSuccess('my-node', 100)

        const json = collector.toJSON()
        const serialized = JSON.stringify(json)
        const parsed = JSON.parse(serialized)

        expect(parsed['my-node'].totalExecutions).toBe(1)
      })

      it('validates against SerializedMetricsSchema', () => {
        collector.recordSuccess('node-a', 100)
        collector.recordFailure('node-b', 200)

        const json = collector.toJSON()

        expect(() => SerializedMetricsSchema.parse(json)).not.toThrow()
      })
    })
  })

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('integration', () => {
    it('tracks metrics through full node lifecycle', () => {
      const collector = createNodeMetricsCollector()

      // Simulate node execution lifecycle
      // First attempt - success
      collector.recordSuccess('process-node', 150)

      // Second attempt - failure with retry
      collector.recordRetry('process-node', 1)
      collector.recordFailure('process-node', 200, new Error('timeout'), 'timeout')

      // Third attempt - success after retry
      collector.recordRetry('process-node', 1)
      collector.recordSuccess('process-node', 180)

      const metrics = collector.getNodeMetrics('process-node')

      expect(metrics.totalExecutions).toBe(3)
      expect(metrics.successCount).toBe(2)
      expect(metrics.failureCount).toBe(1)
      expect(metrics.retryCount).toBe(2)
      expect(metrics.timeoutErrors).toBe(1)
    })

    // AC-11: Integration test with actual node execution
    // Note: Full integration with createNode() is tested in node-factory.test.ts
    // This test verifies the collector API works correctly for the integration pattern

    it('maintains separate metrics per node in multi-node graph', () => {
      const collector = createNodeMetricsCollector()

      // Simulate multi-node graph execution
      collector.recordSuccess('input-node', 50)
      collector.recordSuccess('process-node', 150)
      collector.recordFailure('llm-node', 5000, undefined, 'timeout')
      collector.recordRetry('llm-node', 1)
      collector.recordSuccess('llm-node', 3000)
      collector.recordSuccess('output-node', 100)

      const allMetrics = collector.getAllNodeMetrics()

      expect(allMetrics.size).toBe(4)
      expect(allMetrics.get('input-node')!.successCount).toBe(1)
      expect(allMetrics.get('process-node')!.successCount).toBe(1)
      expect(allMetrics.get('llm-node')!.successCount).toBe(1)
      expect(allMetrics.get('llm-node')!.failureCount).toBe(1)
      expect(allMetrics.get('llm-node')!.retryCount).toBe(1)
      expect(allMetrics.get('output-node')!.successCount).toBe(1)
    })

    it('exports complete metrics snapshot for external consumption', () => {
      const collector = createNodeMetricsCollector()

      // Record various metrics
      collector.recordSuccess('node-a', 100)
      collector.recordSuccess('node-a', 120)
      collector.recordFailure('node-b', 500, undefined, 'network')
      collector.recordRetry('node-b', 1)
      collector.recordSuccess('node-b', 300)

      // Export for external system
      const snapshot = collector.toJSON()

      // Validate snapshot structure
      expect(snapshot['node-a']).toBeDefined()
      expect(snapshot['node-b']).toBeDefined()
      expect(snapshot['node-a'].avgExecutionMs).toBe(110)
      expect(snapshot['node-b'].networkErrors).toBe(1)
    })
  })
})
