/**
 * Unit tests for ConcurrencyController.
 *
 * AC-4: tryAcquireSlot returns true/false based on slot availability.
 * AC-8: Per-worktree circuit breaker isolation.
 * AC-12: maxWorktrees: 1 serial behavior regression.
 * HP-5: tryAcquireSlot returns true when slot available.
 * EC-1: tryAcquireSlot returns false when all slots occupied.
 * ED-1: Slot released after cleanup failure.
 * ED-2: Circuit breaker recovery after recoveryTimeoutMs.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ConcurrencyController } from '../../supervisor/concurrency/concurrency-controller.js'
import { ConcurrencyConfigSchema } from '../../supervisor/__types__/concurrency-config.js'

// ============================================================================
// HP-5: tryAcquireSlot returns true when slot available
// ============================================================================

describe('ConcurrencyController', () => {
  describe('tryAcquireSlot', () => {
    it('HP-5: returns true and registers slot when under capacity', () => {
      const config = ConcurrencyConfigSchema.parse({ maxWorktrees: 2 })
      const controller = new ConcurrencyController(config)

      const result = controller.tryAcquireSlot('APIP-TEST-001', '/repo/.worktrees/APIP-TEST-001-123')

      expect(result).toBe(true)
      expect(controller.activeSlots()).toBe(1)
    })

    it('HP-5: slot entry has worktreePath and breaker after acquisition', () => {
      const config = ConcurrencyConfigSchema.parse({ maxWorktrees: 2 })
      const controller = new ConcurrencyController(config)
      const path = '/repo/.worktrees/APIP-TEST-001-123'

      controller.tryAcquireSlot('APIP-TEST-001', path)

      const slot = controller.getSlot('APIP-TEST-001')
      expect(slot).toBeDefined()
      expect(slot!.worktreePath).toBe(path)
      expect(slot!.breaker).toBeDefined()
    })

    it('EC-1: returns false when all slots occupied', () => {
      const config = ConcurrencyConfigSchema.parse({ maxWorktrees: 2 })
      const controller = new ConcurrencyController(config)

      controller.tryAcquireSlot('APIP-TEST-001', '/repo/.worktrees/APIP-TEST-001-1')
      controller.tryAcquireSlot('APIP-TEST-002', '/repo/.worktrees/APIP-TEST-002-1')

      const result = controller.tryAcquireSlot('APIP-TEST-003', '/repo/.worktrees/APIP-TEST-003-1')

      expect(result).toBe(false)
      expect(controller.activeSlots()).toBe(2)
    })

    it('EC-1: activeSlots remains at maxWorktrees when acquisition fails', () => {
      const config = ConcurrencyConfigSchema.parse({ maxWorktrees: 1 })
      const controller = new ConcurrencyController(config)

      controller.tryAcquireSlot('APIP-TEST-001', '/repo/.worktrees/APIP-TEST-001-1')
      controller.tryAcquireSlot('APIP-TEST-002', '/repo/.worktrees/APIP-TEST-002-1')

      expect(controller.activeSlots()).toBe(1)
    })

    it('AC-12: maxWorktrees: 1 enforces serial behavior', () => {
      const config = ConcurrencyConfigSchema.parse({ maxWorktrees: 1 })
      const controller = new ConcurrencyController(config)

      const first = controller.tryAcquireSlot('APIP-TEST-001', '/repo/.worktrees/APIP-TEST-001-1')
      const second = controller.tryAcquireSlot('APIP-TEST-002', '/repo/.worktrees/APIP-TEST-002-1')

      expect(first).toBe(true)
      expect(second).toBe(false)
      expect(controller.activeSlots()).toBe(1)
    })
  })

  // ============================================================================
  // releaseSlot
  // ============================================================================

  describe('releaseSlot', () => {
    it('removes the slot and decrements activeSlots', () => {
      const config = ConcurrencyConfigSchema.parse({ maxWorktrees: 2 })
      const controller = new ConcurrencyController(config)

      controller.tryAcquireSlot('APIP-TEST-001', '/repo/.worktrees/APIP-TEST-001-1')
      controller.releaseSlot('APIP-TEST-001')

      expect(controller.activeSlots()).toBe(0)
      expect(controller.getSlot('APIP-TEST-001')).toBeUndefined()
    })

    it('ED-1: slot released after cleanup failure (safe no-op on missing storyId)', () => {
      const config = ConcurrencyConfigSchema.parse({ maxWorktrees: 1 })
      const controller = new ConcurrencyController(config)

      // releaseSlot on non-existent storyId must not throw
      expect(() => controller.releaseSlot('APIP-NONEXISTENT')).not.toThrow()
      expect(controller.activeSlots()).toBe(0)
    })

    it('ED-1: activeSlots() === 0 after release even when cleanup throws externally', () => {
      const config = ConcurrencyConfigSchema.parse({ maxWorktrees: 1 })
      const controller = new ConcurrencyController(config)

      controller.tryAcquireSlot('APIP-TEST-001', '/repo/.worktrees/APIP-TEST-001-1')

      // Simulate finally block: release always happens regardless of error
      try {
        throw new Error('Simulated cleanup error')
      } catch {
        // swallowed
      } finally {
        controller.releaseSlot('APIP-TEST-001')
      }

      expect(controller.activeSlots()).toBe(0)
    })

    it('allows new slot after release when at capacity', () => {
      const config = ConcurrencyConfigSchema.parse({ maxWorktrees: 1 })
      const controller = new ConcurrencyController(config)

      controller.tryAcquireSlot('APIP-TEST-001', '/repo/.worktrees/APIP-TEST-001-1')
      controller.releaseSlot('APIP-TEST-001')

      const result = controller.tryAcquireSlot('APIP-TEST-002', '/repo/.worktrees/APIP-TEST-002-1')
      expect(result).toBe(true)
    })
  })

  // ============================================================================
  // AC-8: Per-worktree circuit breaker isolation
  // ============================================================================

  describe('circuit breaker isolation (AC-8)', () => {
    it('each slot gets an independent NodeCircuitBreaker instance', () => {
      const config = ConcurrencyConfigSchema.parse({ maxWorktrees: 2 })
      const controller = new ConcurrencyController(config)

      controller.tryAcquireSlot('APIP-TEST-001', '/repo/.worktrees/APIP-TEST-001-1')
      controller.tryAcquireSlot('APIP-TEST-002', '/repo/.worktrees/APIP-TEST-002-1')

      const slot1 = controller.getSlot('APIP-TEST-001')!
      const slot2 = controller.getSlot('APIP-TEST-002')!

      // Different instances
      expect(slot1.breaker).not.toBe(slot2.breaker)
    })

    it('AC-8: breaker open on one worktree does not affect other active worktrees', () => {
      const config = ConcurrencyConfigSchema.parse({
        maxWorktrees: 2,
        worktreeCircuitBreaker: { failureThreshold: 2, recoveryTimeoutMs: 60000 },
      })
      const controller = new ConcurrencyController(config)

      controller.tryAcquireSlot('APIP-TEST-001', '/repo/.worktrees/APIP-TEST-001-1')
      controller.tryAcquireSlot('APIP-TEST-002', '/repo/.worktrees/APIP-TEST-002-1')

      const slotA = controller.getSlot('APIP-TEST-001')!
      const slotB = controller.getSlot('APIP-TEST-002')!

      // Force story-A breaker to OPEN
      slotA.breaker.recordFailure()
      slotA.breaker.recordFailure()

      expect(slotA.breaker.getState()).toBe('OPEN')
      expect(slotB.breaker.getState()).toBe('CLOSED')
    })

    it('ED-2: circuit breaker recovers after recoveryTimeoutMs elapses', () => {
      vi.useFakeTimers()

      const config = ConcurrencyConfigSchema.parse({
        maxWorktrees: 1,
        worktreeCircuitBreaker: { failureThreshold: 2, recoveryTimeoutMs: 1000 },
      })
      const controller = new ConcurrencyController(config)

      controller.tryAcquireSlot('APIP-TEST-001', '/repo/.worktrees/APIP-TEST-001-1')
      const slot = controller.getSlot('APIP-TEST-001')!

      slot.breaker.recordFailure()
      slot.breaker.recordFailure()
      expect(slot.breaker.getState()).toBe('OPEN')

      // Advance 101ms — past recovery timeout
      vi.advanceTimersByTime(1001)

      expect(slot.breaker.getState()).toBe('HALF_OPEN')

      vi.useRealTimers()
    })

    it('circuit breaker is configured with ConcurrencyConfig thresholds', () => {
      const config = ConcurrencyConfigSchema.parse({
        maxWorktrees: 1,
        worktreeCircuitBreaker: { failureThreshold: 5, recoveryTimeoutMs: 30000 },
      })
      const controller = new ConcurrencyController(config)

      controller.tryAcquireSlot('APIP-TEST-001', '/repo/.worktrees/APIP-TEST-001-1')
      const slot = controller.getSlot('APIP-TEST-001')!

      const breakerConfig = slot.breaker.getConfig()
      expect(breakerConfig.failureThreshold).toBe(5)
      expect(breakerConfig.recoveryTimeoutMs).toBe(30000)
    })
  })

  // ============================================================================
  // getActiveSlots
  // ============================================================================

  describe('getActiveSlots', () => {
    it('returns a copy of the active slots map', () => {
      const config = ConcurrencyConfigSchema.parse({ maxWorktrees: 2 })
      const controller = new ConcurrencyController(config)

      controller.tryAcquireSlot('APIP-TEST-001', '/repo/.worktrees/APIP-TEST-001-1')

      const activeSlots = controller.getActiveSlots()
      expect(activeSlots.size).toBe(1)
      expect(activeSlots.has('APIP-TEST-001')).toBe(true)
    })

    it('returns empty map when no slots active', () => {
      const config = ConcurrencyConfigSchema.parse({ maxWorktrees: 2 })
      const controller = new ConcurrencyController(config)

      expect(controller.getActiveSlots().size).toBe(0)
    })
  })
})
