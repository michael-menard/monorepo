/**
 * Buffer Logic Tests (INFR-0050 AC-3, AC-9)
 * Test cases: BUF-001 through BUF-006
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createBufferState,
  addEventToBuffer,
  getEventsToFlush,
  markFlushComplete,
  shouldFlushBySize,
  shouldFlushByInterval,
  hasEventsToFlush,
} from '../utils/buffer'
import type { TelemetrySdkConfig } from '../__types__/index'
import { randomUUID } from 'crypto'

const createMockConfig = (overrides?: Partial<TelemetrySdkConfig>): TelemetrySdkConfig => ({
  source: 'test',
  enableBuffering: true,
  bufferSize: 100,
  flushIntervalMs: 5000,
  overflowStrategy: 'drop-oldest',
  ...overrides,
})

const createMockEvent = () => ({
  eventId: randomUUID(),
  eventType: 'step_completed' as const,
  ts: new Date(),
  payload: { step_name: 'test', duration_ms: 100, status: 'success' as const },
})

describe('Buffer State Management', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('BUF-001: should auto-flush when buffer size threshold reached', () => {
    const config = createMockConfig({ bufferSize: 3 })
    let state = createBufferState()

    // Add events up to threshold
    state = addEventToBuffer(state, createMockEvent(), config)
    state = addEventToBuffer(state, createMockEvent(), config)
    state = addEventToBuffer(state, createMockEvent(), config)

    expect(shouldFlushBySize(state, config)).toBe(true)
    expect(state.events.length).toBe(3)
  })

  it('BUF-002: should auto-flush when time interval elapsed', () => {
    const config = createMockConfig({ flushIntervalMs: 5000 })
    let state = createBufferState()

    // Add one event
    state = addEventToBuffer(state, createMockEvent(), config)

    // Not enough time elapsed
    vi.advanceTimersByTime(3000)
    expect(shouldFlushByInterval(state, config)).toBe(false)

    // Advance past interval
    vi.advanceTimersByTime(3000)
    expect(shouldFlushByInterval(state, config)).toBe(true)
  })

  it('BUF-003: should drop oldest event on overflow with drop-oldest strategy', () => {
    const config = createMockConfig({ bufferSize: 2, overflowStrategy: 'drop-oldest' })
    let state = createBufferState()

    const event1 = createMockEvent()
    const event2 = createMockEvent()
    const event3 = createMockEvent()

    // Fill buffer
    state = addEventToBuffer(state, event1, config)
    state = addEventToBuffer(state, event2, config)

    // Buffer is full, should drop oldest
    state = addEventToBuffer(state, event3, config)

    expect(state.events.length).toBe(2)
    expect(state.events[0].event.eventId).toBe(event2.eventId) // event1 was dropped
    expect(state.events[1].event.eventId).toBe(event3.eventId)
  })

  it('BUF-004: should throw error on overflow with error strategy', () => {
    const config = createMockConfig({ bufferSize: 2, overflowStrategy: 'error' })
    let state = createBufferState()

    state = addEventToBuffer(state, createMockEvent(), config)
    state = addEventToBuffer(state, createMockEvent(), config)

    expect(() => addEventToBuffer(state, createMockEvent(), config)).toThrow(
      'Buffer overflow: buffer size limit 2 reached',
    )
  })

  it('BUF-005: should block event on overflow with block strategy', () => {
    const config = createMockConfig({ bufferSize: 2, overflowStrategy: 'block' })
    let state = createBufferState()

    state = addEventToBuffer(state, createMockEvent(), config)
    state = addEventToBuffer(state, createMockEvent(), config)

    // Buffer is full, should not add event
    const blockedEvent = createMockEvent()
    const newState = addEventToBuffer(state, blockedEvent, config)

    expect(newState.events.length).toBe(2)
    expect(newState.events.find((e) => e.event.eventId === blockedEvent.eventId)).toBeUndefined()
  })

  it('BUF-006: should handle concurrent additions safely', () => {
    const config = createMockConfig()
    let state = createBufferState()

    // Simulate concurrent additions
    const events = Array.from({ length: 10 }, createMockEvent)
    events.forEach((event) => {
      state = addEventToBuffer(state, event, config)
    })

    expect(state.events.length).toBe(10)
    expect(state.events.every((e) => events.some((ev) => ev.eventId === e.event.eventId))).toBe(
      true,
    )
  })

  it('BUF-007: should get events to flush and mark as flushing', () => {
    const config = createMockConfig()
    let state = createBufferState()

    state = addEventToBuffer(state, createMockEvent(), config)
    state = addEventToBuffer(state, createMockEvent(), config)

    const [eventsToFlush, newState] = getEventsToFlush(state)

    expect(eventsToFlush.length).toBe(2)
    expect(newState.events.length).toBe(0)
    expect(newState.isFlushing).toBe(true)
  })

  it('BUF-008: should mark flush complete and reset flushing state', () => {
    let state = createBufferState()
    state.isFlushing = true

    state = markFlushComplete(state)

    expect(state.isFlushing).toBe(false)
  })

  it('BUF-009: should correctly report if buffer has events', () => {
    let state = createBufferState()

    expect(hasEventsToFlush(state)).toBe(false)

    state = addEventToBuffer(state, createMockEvent(), createMockConfig())

    expect(hasEventsToFlush(state)).toBe(true)
  })
})
