import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

let mockEventSource: {
  addEventListener: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
  onerror: null | (() => void)
}

vi.stubGlobal('EventSource', vi.fn().mockImplementation(() => {
  mockEventSource = {
    addEventListener: vi.fn(),
    close: vi.fn(),
    onerror: null,
  }
  return mockEventSource
}))

const { useOrchestration } = await import('../useOrchestration')

describe('useOrchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts not running', () => {
    const { result } = renderHook(() => useOrchestration())
    expect(result.current.isRunning).toBe(false)
    expect(result.current.events).toEqual([])
  })

  it('creates EventSource on run', () => {
    const { result } = renderHook(() => useOrchestration())
    act(() => {
      result.current.run('start-all')
    })
    expect(EventSource).toHaveBeenCalledWith('/api/v1/ports/start-all')
    expect(result.current.isRunning).toBe(true)
  })

  it('creates EventSource with filter', () => {
    const { result } = renderHook(() => useOrchestration())
    act(() => {
      result.current.run('stop-all', 'backend')
    })
    expect(EventSource).toHaveBeenCalledWith('/api/v1/ports/stop-all?filter=backend')
  })

  it('cancels running orchestration', () => {
    const { result } = renderHook(() => useOrchestration())
    act(() => {
      result.current.run('start-all')
    })
    act(() => {
      result.current.cancel()
    })
    expect(result.current.isRunning).toBe(false)
    expect(mockEventSource.close).toHaveBeenCalled()
  })
})
