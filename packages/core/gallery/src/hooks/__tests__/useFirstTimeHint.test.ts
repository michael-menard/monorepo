import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFirstTimeHint } from '../useFirstTimeHint'

const createLocalStorageMock = () => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
}

describe('useFirstTimeHint', () => {
  const originalLocalStorage = globalThis.localStorage

  beforeEach(() => {
    // @ts-expect-error - test override
    globalThis.localStorage = createLocalStorageMock()
    vi.clearAllMocks()
  })

  afterAll(() => {
    if (originalLocalStorage) {
      // @ts-expect-error - restore
      globalThis.localStorage = originalLocalStorage
    }
  })

  it('shows hint when no dismissal stored', () => {
    const { result } = renderHook(() => useFirstTimeHint())

    const [showHint] = result.current
    expect(showHint).toBe(true)
  })

  it('hides hint when dismissal stored', () => {
    globalThis.localStorage.setItem('gallery_tooltip_dismissed', 'true')

    const { result } = renderHook(() => useFirstTimeHint())

    const [showHint] = result.current
    expect(showHint).toBe(false)
  })

  it('dismissHint sets storage flag and hides hint', () => {
    const { result } = renderHook(() => useFirstTimeHint())

    act(() => {
      const [, dismissHint] = result.current
      dismissHint()
    })

    const [showHint] = result.current
    expect(showHint).toBe(false)
    expect(globalThis.localStorage.getItem('gallery_tooltip_dismissed')).toBe('true')
  })
})
