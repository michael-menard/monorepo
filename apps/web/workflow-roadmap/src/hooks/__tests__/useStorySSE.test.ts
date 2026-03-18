/**
 * useStorySSE hook tests
 *
 * Verifies the hook opens an EventSource, dispatches cache invalidation
 * on story_state_changed events, and cleans up on unmount.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useStorySSE } from '../useStorySSE'

// ── Mock react-redux ────────────────────────────────────────────────────────

const mockDispatch = vi.fn()
vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}))

// ── Mock EventSource ────────────────────────────────────────────────────────

type EventSourceListener = (event: { data: string }) => void

class MockEventSource {
  static instances: MockEventSource[] = []
  url: string
  listeners = new Map<string, EventSourceListener[]>()
  closed = false

  constructor(url: string) {
    this.url = url
    MockEventSource.instances.push(this)
  }

  addEventListener(event: string, handler: EventSourceListener) {
    const existing = this.listeners.get(event) || []
    existing.push(handler)
    this.listeners.set(event, existing)
  }

  close() {
    this.closed = true
  }

  // Test helper: simulate a server event
  _emit(event: string, data: string) {
    const handlers = this.listeners.get(event) || []
    for (const handler of handlers) {
      handler({ data })
    }
  }
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('useStorySSE', () => {
  beforeEach(() => {
    MockEventSource.instances = []
    mockDispatch.mockClear()
    vi.stubGlobal('EventSource', MockEventSource)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('opens an EventSource to the stories endpoint', () => {
    renderHook(() => useStorySSE())

    expect(MockEventSource.instances).toHaveLength(1)
    expect(MockEventSource.instances[0].url).toBe('/api/v1/events/stories')
  })

  it('dispatches cache invalidation on story_state_changed event', () => {
    renderHook(() => useStorySSE())

    const es = MockEventSource.instances[0]
    const payload = JSON.stringify({
      storyId: 'TEST-001',
      fromState: 'ready',
      toState: 'in_progress',
      updatedAt: '2026-03-17T00:00:00.000Z',
    })

    act(() => {
      es._emit('story_state_changed', payload)
    })

    expect(mockDispatch).toHaveBeenCalledOnce()
    const action = mockDispatch.mock.calls[0][0]

    // RTK Query invalidateTags returns an action with type containing 'invalidateTags'
    expect(action.type).toContain('invalidateTags')
    expect(action.payload).toEqual([
      'Stories',
      'Plans',
      { type: 'Story', id: 'TEST-001' },
    ])
  })

  it('invalidates the specific story by ID from the payload', () => {
    renderHook(() => useStorySSE())

    const es = MockEventSource.instances[0]

    act(() => {
      es._emit(
        'story_state_changed',
        JSON.stringify({ storyId: 'ORCH-2010', fromState: 'elab', toState: 'ready' }),
      )
    })

    const action = mockDispatch.mock.calls[0][0]
    expect(action.payload).toContainEqual({ type: 'Story', id: 'ORCH-2010' })
  })

  it('closes EventSource on unmount', () => {
    const { unmount } = renderHook(() => useStorySSE())
    const es = MockEventSource.instances[0]

    expect(es.closed).toBe(false)
    unmount()
    expect(es.closed).toBe(true)
  })

  it('does not dispatch on unrelated events', () => {
    renderHook(() => useStorySSE())

    const es = MockEventSource.instances[0]

    // The hook only listens to 'story_state_changed', not 'heartbeat'
    // Since we didn't register a heartbeat listener, this is a no-op
    act(() => {
      es._emit('heartbeat', '')
    })

    expect(mockDispatch).not.toHaveBeenCalled()
  })
})
