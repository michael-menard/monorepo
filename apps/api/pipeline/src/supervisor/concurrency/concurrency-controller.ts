/**
 * ConcurrencyController — manages active worktree slots.
 *
 * AC-4: tryAcquireSlot returns true when a free slot is available and registers
 *       the slot; returns false when all slots are occupied.
 * AC-8: Each slot holds an isolated NodeCircuitBreaker instance.
 * gap-5: Slot Map value is { worktreePath: string; breaker: NodeCircuitBreaker }.
 *
 * @module supervisor/concurrency/concurrency-controller
 */

import { NodeCircuitBreaker } from '@repo/orchestrator'
import type { ConcurrencyConfig } from '../__types__/concurrency-config.js'

/**
 * Active slot entry stored in the slot map.
 * gap-5 decision: value is { worktreePath, breaker }.
 */
export interface ActiveSlot {
  worktreePath: string
  breaker: NodeCircuitBreaker
}

/**
 * Manages concurrent worktree slot allocation.
 *
 * - tryAcquireSlot: atomic check-and-set (safe within single Node.js process)
 * - releaseSlot: called in finally block of worktree lifecycle
 * - activeSlots: current count (for integration test assertions)
 * - getSlot: retrieve slot metadata (worktreePath, breaker) by storyId
 */
export class ConcurrencyController {
  private readonly slots = new Map<string, ActiveSlot>()
  private readonly config: ConcurrencyConfig

  constructor(config: ConcurrencyConfig) {
    this.config = config
  }

  /**
   * Attempts to acquire a concurrency slot for the given story.
   *
   * Returns true and registers the slot when capacity is available.
   * Returns false when maxWorktrees slots are already occupied.
   * BullMQ caller should use job.moveToDelayed() on false.
   *
   * @param storyId - Story identifier
   * @param worktreePath - Pre-generated worktree path for this story
   * @returns true if slot was acquired, false if at capacity
   */
  tryAcquireSlot(storyId: string, worktreePath: string): boolean {
    if (this.slots.size >= this.config.maxWorktrees) {
      return false
    }

    const breaker = new NodeCircuitBreaker({
      failureThreshold: this.config.worktreeCircuitBreaker.failureThreshold,
      recoveryTimeoutMs: this.config.worktreeCircuitBreaker.recoveryTimeoutMs,
    })

    this.slots.set(storyId, { worktreePath, breaker })
    return true
  }

  /**
   * Releases the concurrency slot for the given story.
   * Safe to call even if the slot is not registered (no-op).
   * Must be called in a finally block to guarantee release.
   *
   * @param storyId - Story identifier
   */
  releaseSlot(storyId: string): void {
    this.slots.delete(storyId)
  }

  /**
   * Returns the current number of active slots.
   */
  activeSlots(): number {
    return this.slots.size
  }

  /**
   * Returns the slot entry for a given storyId, or undefined if not active.
   */
  getSlot(storyId: string): ActiveSlot | undefined {
    return this.slots.get(storyId)
  }

  /**
   * Returns all active story IDs and their slot metadata.
   * Used by WorktreeConflictDetector to inspect in-flight file paths.
   */
  getActiveSlots(): Map<string, ActiveSlot> {
    return new Map(this.slots)
  }

  /**
   * Returns the configured maxWorktrees limit.
   */
  getMaxWorktrees(): number {
    return this.config.maxWorktrees
  }
}
