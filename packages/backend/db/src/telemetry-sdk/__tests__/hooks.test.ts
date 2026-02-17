/**
 * Hook Functions Integration Tests (INFR-0050 AC-1, AC-2, AC-10)
 * Test cases: HOOK-001 through HOOK-007
 *
 * Note: These tests use mocked DB operations.
 * Full integration tests with testcontainers would be in a separate CI-only suite.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { withStepTracking, withStateTracking } from '../hooks'
import { createBufferState } from '../utils/buffer'
import type { TelemetrySdkConfig } from '../__types__/index'

// Mock @repo/observability
vi.mock('@repo/observability', () => ({
  getCurrentSpan: vi.fn(() => null),
}))

// Mock batch insert
vi.mock('../batch-insert', () => ({
  insertWorkflowEventsBatch: vi.fn(() => Promise.resolve()),
}))

// Mock workflow events helpers
vi.mock('../../workflow-events/helpers', () => ({
  createStepCompletedEvent: vi.fn((params) => ({
    eventId: 'mock-uuid',
    eventType: 'step_completed',
    payload: {
      step_name: params.stepName,
      duration_ms: params.durationMs,
      status: params.status,
      tokens_used: params.tokensUsed,
      model: params.model,
      error_message: params.errorMessage,
    },
    correlationId: params.correlationId,
    source: params.source,
  })),
  createItemStateChangedEvent: vi.fn((params) => ({
    eventId: 'mock-uuid',
    eventType: 'item_state_changed',
    itemId: params.itemId,
    payload: {
      from_state: params.fromState,
      to_state: params.toState,
      item_id: params.itemId,
      item_type: params.itemType,
      reason: params.reason,
    },
    correlationId: params.correlationId,
    source: params.source,
  })),
}))

const createMockConfig = (overrides?: Partial<TelemetrySdkConfig>): TelemetrySdkConfig => ({
  source: 'test',
  enableBuffering: true,
  bufferSize: 100,
  flushIntervalMs: 5000,
  overflowStrategy: 'drop-oldest',
  ...overrides,
})

describe('withStepTracking Hook', () => {
  let bufferStateRef = { current: createBufferState() }

  beforeEach(() => {
    bufferStateRef = { current: createBufferState() }
    vi.clearAllMocks()
  })

  it('HOOK-001: should execute operation and emit step_completed event on success', async () => {
    const config = createMockConfig()
    const mockOperation = vi.fn(async () => 'result')

    const result = await withStepTracking('test-step', mockOperation, {}, config, bufferStateRef)

    expect(result).toBe('result')
    expect(mockOperation).toHaveBeenCalledOnce()
    expect(bufferStateRef.current.events.length).toBe(1)
  })

  it('HOOK-002: should emit step_completed event with error status on failure', async () => {
    const config = createMockConfig()
    const mockError = new Error('Test error')
    const mockOperation = vi.fn(async () => {
      throw mockError
    })

    await expect(
      withStepTracking('test-step', mockOperation, {}, config, bufferStateRef),
    ).rejects.toThrow('Test error')

    expect(bufferStateRef.current.events.length).toBe(1)
  })

  it('HOOK-003: should measure duration accurately', async () => {
    const config = createMockConfig()
    const mockOperation = vi.fn(async () => {
      // Simulate some work
      await new Promise((resolve) => setTimeout(resolve, 100))
      return 'result'
    })

    await withStepTracking('test-step', mockOperation, {}, config, bufferStateRef)

    expect(bufferStateRef.current.events.length).toBe(1)
    const event = bufferStateRef.current.events[0].event
    expect(event.payload).toHaveProperty('duration_ms')
    expect(typeof event.payload.duration_ms).toBe('number')
    expect(event.payload.duration_ms).toBeGreaterThan(0)
  })

  it('HOOK-004: should capture tokens and model in event payload', async () => {
    const config = createMockConfig()
    const mockOperation = vi.fn(async () => 'result')

    await withStepTracking(
      'test-step',
      mockOperation,
      { tokensUsed: 500, model: 'sonnet' },
      config,
      bufferStateRef,
    )

    expect(bufferStateRef.current.events.length).toBe(1)
    const event = bufferStateRef.current.events[0].event
    expect(event.payload.tokens_used).toBe(500)
    expect(event.payload.model).toBe('sonnet')
  })

  it('HOOK-005: should bypass buffer when buffering disabled', async () => {
    const config = createMockConfig({ enableBuffering: false })
    const mockOperation = vi.fn(async () => 'result')

    await withStepTracking('test-step', mockOperation, {}, config, bufferStateRef)

    // Event should not be in buffer (sent immediately)
    expect(bufferStateRef.current.events.length).toBe(0)
  })
})

describe('withStateTracking Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('HOOK-006: should emit item_state_changed event immediately', async () => {
    const config = createMockConfig()

    await withStateTracking('STORY-001', 'backlog', 'in-progress', {}, config)

    // Event should be emitted immediately (not buffered)
    // Verify by checking the mock was called
    const { insertWorkflowEventsBatch } = await import('../batch-insert')
    expect(insertWorkflowEventsBatch).toHaveBeenCalledOnce()
  })

  it('HOOK-007: should include reason and itemType in payload', async () => {
    const config = createMockConfig()

    await withStateTracking(
      'STORY-001',
      'backlog',
      'in-progress',
      { reason: 'User started work', itemType: 'story' },
      config,
    )

    const { createItemStateChangedEvent } = await import('../../workflow-events/helpers')
    expect(createItemStateChangedEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: 'STORY-001',
        fromState: 'backlog',
        toState: 'in-progress',
        reason: 'User started work',
        itemType: 'story',
      }),
    )
  })
})
