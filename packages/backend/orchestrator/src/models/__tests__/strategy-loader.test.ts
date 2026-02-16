/**
 * strategy-loader.test.ts
 *
 * Unit tests for strategy loader, validation, caching, and graph analysis.
 * Covers AC-1, AC-9, AC-10.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  loadStrategy,
  clearStrategyCache,
  analyzeEscalationPaths,
  StrategySchema,
  type Strategy,
} from '../strategy-loader.js'
import { logger } from '@repo/logger'

// Mock logger to avoid console spam
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('strategy-loader', () => {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  const fixturesDir = resolve(__dirname, 'fixtures')

  beforeEach(() => {
    clearStrategyCache()
    vi.clearAllMocks()
  })

  describe('AC-1: Strategy Configuration Loader', () => {
    it('should load and parse valid strategy YAML with 4 tiers', async () => {
      const strategyPath = resolve(fixturesDir, 'valid-strategy.yaml')
      const strategy = await loadStrategy({ strategyPath })

      expect(strategy.tiers).toHaveLength(4)
      expect(strategy.tiers[0].name).toBe('Critical Decision')
      expect(strategy.tiers[0].tier).toBe(0)
      expect(strategy.task_types).toBeDefined()
      expect(strategy.escalation_triggers).toBeDefined()
    })

    it('should cache strategy after first load with 30s TTL', async () => {
      const strategyPath = resolve(fixturesDir, 'valid-strategy.yaml')

      const strategy1 = await loadStrategy({ strategyPath })
      const strategy2 = await loadStrategy({ strategyPath })

      // Should use cache (same reference)
      expect(strategy2).toBe(strategy1)
      expect(logger.info).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        event: 'strategy_cache_hit',
      }))
    })

    it('should bypass cache with forceReload option', async () => {
      const strategyPath = resolve(fixturesDir, 'valid-strategy.yaml')

      const strategy1 = await loadStrategy({ strategyPath })
      const strategy2 = await loadStrategy({ strategyPath, forceReload: true })

      // Should reload (different references due to spread)
      expect(strategy1.strategy_version).toBe(strategy2.strategy_version)
      expect(logger.info).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        event: 'strategy_load_start',
        force_reload: true,
      }))
    })

    it('should fall back to embedded defaults if YAML missing', async () => {
      const strategy = await loadStrategy({ strategyPath: '/nonexistent/path.yaml' })

      expect(strategy.tiers).toHaveLength(4)
      expect(strategy.strategy_version).toBe('0.0.0-fallback')
      expect(logger.warn).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        event: 'strategy_file_missing',
        using_defaults: true,
      }))
    })

    it('should parse task type mappings correctly', async () => {
      const strategyPath = resolve(fixturesDir, 'valid-strategy.yaml')
      const strategy = await loadStrategy({ strategyPath })

      const setupTask = strategy.task_types.find(t => t.type === 'setup_validation')
      expect(setupTask).toBeDefined()
      expect(setupTask?.recommended_tier).toBe(3)

      const gapTask = strategy.task_types.find(t => t.type === 'gap_analysis')
      expect(gapTask).toBeDefined()
      expect(gapTask?.recommended_tier).toBe(1)
    })
  })

  describe('AC-9: Zod Schema Definition', () => {
    it('should validate complete strategy structure with Zod', async () => {
      const strategyPath = resolve(fixturesDir, 'valid-strategy.yaml')
      const strategy = await loadStrategy({ strategyPath })

      // Should parse without throwing
      const parsed = StrategySchema.parse(strategy)
      expect(parsed.tiers).toHaveLength(4)
      expect(parsed.strategy_version).toBe('1.0.0-test')
    })

    it('should reject invalid schema with clear error message', async () => {
      const strategyPath = resolve(fixturesDir, 'invalid-schema.yaml')

      await expect(loadStrategy({ strategyPath })).rejects.toThrow(/Strategy must define exactly 4 tiers/)
      expect(logger.error).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        event: 'strategy_validation_failed',
      }))
    })

    it('should validate tier schema with required fields', async () => {
      const strategyPath = resolve(fixturesDir, 'valid-strategy.yaml')
      const strategy = await loadStrategy({ strategyPath })

      const tier0 = strategy.tiers[0]
      expect(tier0).toMatchObject({
        tier: 0,
        name: expect.any(String),
        description: expect.any(String),
        models: {
          primary: expect.arrayContaining([
            expect.objectContaining({
              provider: expect.any(String),
              model: expect.any(String),
              cost_per_1m_tokens: expect.any(Number),
            }),
          ]),
          fallback: expect.any(Array),
        },
        use_cases: expect.any(Array),
        quality_expectations: expect.any(String),
        latency_tolerance: expect.any(String),
      })
    })

    it('should validate escalation trigger schema', async () => {
      const strategyPath = resolve(fixturesDir, 'valid-strategy.yaml')
      const strategy = await loadStrategy({ strategyPath })

      expect(strategy.escalation_triggers.quality).toBeDefined()
      expect(strategy.escalation_triggers.cost).toBeDefined()
      expect(strategy.escalation_triggers.failure).toBeDefined()
      expect(strategy.escalation_triggers.human).toBeDefined()

      const qualityTrigger = strategy.escalation_triggers.quality[0]
      expect(qualityTrigger).toMatchObject({
        trigger: expect.any(String),
        description: expect.any(String),
        action: expect.any(String),
      })
    })
  })

  describe('AC-10: Escalation Graph Validator', () => {
    it('should validate escalation paths terminate at Tier 0 or human', async () => {
      const strategyPath = resolve(fixturesDir, 'valid-strategy.yaml')
      const strategy = await loadStrategy({ strategyPath })

      const graphValidation = analyzeEscalationPaths(strategy)
      expect(graphValidation.valid).toBe(true)
      expect(graphValidation.circularPaths).toHaveLength(0)

      // All paths should terminate
      graphValidation.paths.forEach(path => {
        expect(['tier0', 'human']).toContain(path.terminatesAt)
      })
    })

    it('should detect circular escalation paths', async () => {
      const strategyPath = resolve(fixturesDir, 'circular-escalation.yaml')

      await expect(loadStrategy({ strategyPath })).rejects.toThrow(/Circular escalation path/)
      expect(logger.error).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        event: 'escalation_graph_invalid',
      }))
    })

    it('should build escalation graph from triggers', async () => {
      const strategyPath = resolve(fixturesDir, 'valid-strategy.yaml')
      const strategy = await loadStrategy({ strategyPath })

      const graphValidation = analyzeEscalationPaths(strategy)
      expect(graphValidation.paths.length).toBeGreaterThan(0)

      // Should find quality escalation path
      const qualityPath = graphValidation.paths.find(p => p.trigger === 'gate_failure')
      expect(qualityPath).toBeDefined()
    })

    it('should validate no circular dependencies in escalation graph', async () => {
      const strategyPath = resolve(fixturesDir, 'valid-strategy.yaml')
      const strategy = await loadStrategy({ strategyPath })

      expect(strategy.escalationGraphValid).toBe(true)
    })
  })

  describe('Cache TTL and Invalidation', () => {
    it('should respect 30s cache TTL', async () => {
      vi.useFakeTimers()
      const strategyPath = resolve(fixturesDir, 'valid-strategy.yaml')

      await loadStrategy({ strategyPath })
      vi.clearAllMocks()

      // Within TTL - should use cache
      vi.advanceTimersByTime(20000) // 20s
      await loadStrategy({ strategyPath })
      expect(logger.info).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        event: 'strategy_cache_hit',
      }))

      vi.clearAllMocks()

      // After TTL - should reload
      vi.advanceTimersByTime(15000) // Total 35s > 30s TTL
      await loadStrategy({ strategyPath })
      expect(logger.info).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        event: 'strategy_load_start',
      }))

      vi.useRealTimers()
    })
  })

  describe('Edge Cases', () => {
    it('should handle minimal strategy with no task types', async () => {
      const strategyPath = resolve(fixturesDir, 'minimal-strategy.yaml')
      const strategy = await loadStrategy({ strategyPath })

      expect(strategy.tiers).toHaveLength(4)
      expect(strategy.task_types).toHaveLength(0)
      expect(strategy.escalation_triggers.quality).toHaveLength(0)
    })

    it('should clear cache on explicit clearStrategyCache call', async () => {
      const strategyPath = resolve(fixturesDir, 'valid-strategy.yaml')

      await loadStrategy({ strategyPath })
      clearStrategyCache()

      vi.clearAllMocks()
      await loadStrategy({ strategyPath })

      expect(logger.info).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        event: 'strategy_load_start',
      }))
    })
  })
})
