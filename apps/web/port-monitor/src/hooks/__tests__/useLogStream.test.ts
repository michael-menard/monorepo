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

const { useLogStream } = await import('../useLogStream')

describe('useLogStream', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty lines when key is null', () => {
    const { result } = renderHook(() => useLogStream(null))
    expect(result.current.lines).toEqual([])
  })

  it('creates EventSource with correct URL', () => {
    renderHook(() => useLogStream('MAIN_APP_PORT'))
    expect(EventSource).toHaveBeenCalledWith('/api/v1/ports/MAIN_APP_PORT/logs')
  })

  it('closes EventSource on unmount', () => {
    const { unmount } = renderHook(() => useLogStream('MAIN_APP_PORT'))
    unmount()
    expect(mockEventSource.close).toHaveBeenCalled()
  })

  it('parses log events', () => {
    const { result } = renderHook(() => useLogStream('MAIN_APP_PORT'))

    // Find the 'log' event handler
    const logHandler = mockEventSource.addEventListener.mock.calls.find(
      (call: [string, unknown]) => call[0] === 'log',
    )?.[1] as (event: { data: string }) => void

    expect(logHandler).toBeDefined()

    act(() => {
      logHandler({
        data: JSON.stringify({
          timestamp: '2026-01-01T00:00:00.000Z',
          stream: 'stdout',
          text: 'hello',
        }),
      })
    })

    expect(result.current.lines).toHaveLength(1)
    expect(result.current.lines[0].text).toBe('hello')
  })
})
